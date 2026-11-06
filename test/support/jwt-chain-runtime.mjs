import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const exampleRoot = fileURLToPath(new URL('../../examples/shopify/authentication/server-side-jwt/chained-requests/', import.meta.url));
export const handles = {auth: 'jwt-chain-authenticate', products: 'jwt-chain-products'};
export const fixtureSecrets = {
  username: 'fixture-service-account', password: 'fixture-password-never-return',
  accessToken: 'fixture-header.fixture-claims.fixture-signature',
  refreshToken: 'fixture-refresh-token-never-return',
};
export const publicData = {
  products: [{id: 1, title: 'Sample product', price: 9.99}], total: 1, skip: 0, limit: 3,
};

export async function readDefinitions() {
  return Promise.all(Object.values(handles).map(async handle => JSON.parse(
    await readFile(path.join(exampleRoot, 'resources/requests', `${handle}.json`), 'utf8'),
  )));
}

export async function validateDefinitions(runtimePath) {
  // APIEase's schema loader resolves contracts from cwd. Isolate that assumption
  // in a child process rather than changing this test process's working directory.
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `
    import fs from 'node:fs';
    import Validator from './backend/service/resources/request/PublicRequestUpdateContractValidator.js';
    const validator = new Validator();
    const requests = JSON.parse(fs.readFileSync(0, 'utf8'));
    console.log(JSON.stringify(requests.map(request => ({handle: request.handle,
      ...validator.validate({requestId: request.handle, request})}))));
  `], {cwd: runtimePath, input: JSON.stringify(await readDefinitions()), encoding: 'utf8'}));
}

// Uses the actual APIEase caller, parameter resolver, chain continuation, trigger
// policy, response overrides and HTTP response builder. Persistence, Shopify
// sessions, billing, and upstream responses are injected; no deployed shop is used.
export async function createRuntime({runtimePath, publicHandles = [], upstream, credentials = fixtureSecrets, definitions} = {}) {
  if (!runtimePath) throw new Error('APIEASE_RUNTIME_PATH must point to an APIEase source checkout with dependencies installed.');
  const load = async relative => import(pathToFileURL(path.resolve(runtimePath, relative)).href);
  const [Caller, ParameterResolver, CallDispatcher, NextParameters, NextRequest,
    Validator, Policy, CallHistory, HttpService, httpResponse, constants,
    LiquidWrapper, LiquidService, LiquidLimit, LiquidController, LiquidDispatcher, CallerService] = await Promise.all([
    'backend/integration/caller.js',
    'backend/integration/parameterResolver.js',
    'backend/integration/callDispatcher.js',
    'backend/service/caller/nextApiEaseCallParameterService.js',
    'backend/service/caller/nextRequestService.js',
    'backend/service/caller/apiEaseCallValidator.js',
    'backend/service/trigger/storefront/storefrontAppProxyExecutionPolicyService.js',
    'backend/service/caller/callHistoryService.js',
    'backend/service/http/httpCallService.js',
    'app/service/requests/requestExecutionHttpResponse.js',
    'backend/common/constants.js',
    'backend/service/liquid/liquidWrapper.js',
    'backend/service/liquid/liquidService.js',
    'backend/service/liquid/liquidLimitService.js',
    'backend/service/liquid/liquidCallController.js',
    'backend/service/liquid/liquidCallDispatcher.js',
    'backend/service/caller/callerService.js',
  ].map(load));

  definitions = structuredClone(definitions || await readDefinitions());
  definitions[0].parameters.find(parameter => parameter.type === 'body').value = JSON.stringify({
    username: credentials.username, password: credentials.password, expiresInMins: 5,
  });
  const records = new Map(definitions.map(definition => [definition.handle, {value: {
    ...definition, id: definition.handle,
    triggers: publicHandles.includes(definition.handle) ? [{type: 'storefrontAppProxy', storefrontAppProxy: {}}] : [],
  }}]));
  const getter = {async getRequestToCall({requestId, requestedCallName}) {
    const record = records.get(requestId || requestedCallName);
    if (!record) throw new Error('Request not found.');
    return structuredClone(record);
  }};
  const setter = {async addRuntimeApiEaseCallParameters(parameters) {
    parameters.shop = {myshopifyDomain: 'fixture.myshopify.com'};
    parameters.apiEaseShop = parameters.shop;
    parameters.session = {};
    parameters.nextAppUsageState = {};
    parameters.nextRequestParameters ??= {};
    parameters.requestId = parameters.req.query.requestId;
    parameters.requestToCall ??= await getter.getRequestToCall(parameters);
  }};
  const resolver = new ParameterResolver.default();
  const policy = new Policy.default({requestMaintenanceMutationService: {}});
  const validator = new Validator.default(resolver, {}, {isDevelopmentShop: () => true}, policy);
  const calls = [];
  const service = new HttpService.default();
  const dispatchHttpCall = async (_admin, parameters, httpParameters) => {
    calls.push({handle: parameters.requestToCall.value.handle, route: parameters.route, parameters: structuredClone(httpParameters)});
    if (upstream) {
      const response = await upstream(httpParameters, calls.length);
      return service.buildConciseResponse(response, httpParameters);
    }
    return service.executeHttpCall(httpParameters);
  };
  const registration = {async registerCall() {}};
  const liquidLimits = new LiquidLimit.default(1000000, 100000, 2000000);
  const liquid = new LiquidService.default(new LiquidWrapper.default(1000).createSafeLiquidEngine(), liquidLimits);
  const liquidDispatcher = new LiquidDispatcher.default(new LiquidController.default(liquid));
  const dispatcher = new CallDispatcher.default({dispatchHttpCall}, null, liquidDispatcher, null, resolver, registration);
  const caller = new Caller.default(null, dispatcher, registration, resolver, setter, validator, getter,
    new CallHistory.default(), new NextParameters.default(new NextRequest.default(), getter));
  liquid.registerLiquidTag(new CallerService.default(caller), liquidLimits);

  return {
    calls,
    async execute({handle = handles.auth, storefront = false, query = {}, body} = {}) {
      const payload = await caller.apiEaseCall({
        req: {query: {...query, requestId: handle, shop: 'fixture.myshopify.com'}, ...(body ? {body} : {})},
        route: storefront ? constants.APP_PROXY : constants.REMOTE,
        checkCustomerId: storefront,
      });
      // Shopify signature verification is outside this harness. The tested request
      // begins after that verification, at the actual runtime's App Proxy gate.
      const response = httpResponse.buildRequestExecutionHttpResponse(payload, {method: 'GET'});
      return {status: response.status, headers: Object.fromEntries(response.headers), body: await response.json()};
    },
    close() { service.httpsAgentVerify.destroy(); service.httpsAgentNoVerify.destroy(); },
  };
}

export function fixtureUpstream({authFailure = false, dataFailure = false, echoTokenInFailure = false} = {}) {
  return async parameters => {
    if (parameters.address.endsWith('/auth/login')) {
      if (authFailure) return {status: 401, data: {message: 'Invalid credentials'}};
      return {status: 200, data: {accessToken: fixtureSecrets.accessToken, refreshToken: fixtureSecrets.refreshToken},
        headers: {'set-cookie': `accessToken=${fixtureSecrets.accessToken}`}};
    }
    if (parameters.headers.Authorization !== `Bearer ${fixtureSecrets.accessToken}`) {
      return {status: 401, data: {message: 'Invalid access token'}};
    }
    if (dataFailure) return {status: 502, data: {message: 'Upstream unavailable',
      ...(echoTokenInFailure ? {debug: {authorization: parameters.headers.Authorization}} : {})}};
    return {status: 200, data: structuredClone(publicData)};
  };
}

// Actual runtime logging can include private responses. Verification captures it
// in memory and never prints it; this does not change deployed runtime logging.
export async function withoutRuntimeLogs(callback) {
  const originals = Object.fromEntries(['log', 'info', 'warn', 'error', 'debug'].map(key => [key, console[key]]));
  try {
    for (const key of Object.keys(originals)) console[key] = () => {};
    return await callback();
  } finally {
    Object.assign(console, originals);
  }
}
