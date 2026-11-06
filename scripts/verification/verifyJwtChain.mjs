import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createRuntime, exampleRoot, fixtureSecrets, fixtureUpstream, handles, publicData, withoutRuntimeLogs, validateDefinitions} from '../../test/support/jwt-chain-runtime.mjs';

const runtimePath = process.env.APIEASE_RUNTIME_PATH;
const liveProvider = process.argv.includes('--live-provider');
if (!runtimePath) throw new Error('Set APIEASE_RUNTIME_PATH to a local APIEase source checkout.');
const credentials = liveProvider ? {username: process.env.JWT_DEMO_USERNAME, password: process.env.JWT_DEMO_PASSWORD} : fixtureSecrets;
if (!credentials.username || !credentials.password) throw new Error('Set JWT_DEMO_USERNAME and JWT_DEMO_PASSWORD for the live provider check.');
for (const result of await validateDefinitions(runtimePath)) assert.equal(result.isValid, true, JSON.stringify(result.fieldErrors));

const report = {
  checkedAt: new Date().toISOString(),
  runtimeCommit: execFileSync('git', ['-C', runtimePath, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
  runtimeTrackedChanges: Boolean(execFileSync('git', ['-C', runtimePath, 'status', '--porcelain', '--untracked-files=no'], {encoding: 'utf8'}).trim()),
  mode: liveProvider ? 'APIEase source runtime with live DummyJSON' : 'APIEase source runtime with controlled upstream fixtures',
  liveShopifyOrDeployedAPIEaseVerified: false,
  resourceSha256: {},
  runtimeSourceSha256: {},
  checks: {},
  storefrontReady: false,
};
for (const handle of Object.values(handles)) {
  report.resourceSha256[handle] = createHash('sha256').update(await readFile(path.join(exampleRoot, 'resources/requests', `${handle}.json`))).digest('hex');
}
for (const source of [
  'backend/integration/caller.js',
  'backend/integration/callDispatcher.js',
  'backend/integration/parameterResolver.js',
  'backend/service/caller/nextApiEaseCallParameterService.js',
  'backend/service/caller/nextRequestService.js',
  'backend/service/caller/apiEaseCallValidator.js',
  'backend/service/caller/callHistoryService.js',
  'backend/service/caller/responseOverrides.js',
  'backend/service/caller/ProtectedValueRuntimeService.js',
  'backend/service/trigger/storefront/storefrontAppProxyExecutionPolicyService.js',
  'backend/service/http/httpCallService.js',
  'app/service/requests/requestExecutionHttpResponse.js',
]) {
  report.runtimeSourceSha256[source] = createHash('sha256').update(await readFile(path.join(runtimePath, source))).digest('hex');
}

async function probe(options, input, check) {
  return withoutRuntimeLogs(async () => {
    const runtime = await createRuntime({runtimePath, credentials, ...options});
    try { return await check(await runtime.execute(input), runtime.calls); }
    finally { runtime.close(); }
  });
}

await probe({...(liveProvider ? {} : {upstream: fixtureUpstream()})}, {}, (response, calls) => {
  assert.equal(calls.length, 2);
  assert.equal(response.body.status, 200);
  const products = response.body.data.products;
  assert.ok(Array.isArray(products) && products.length > 0 && products.length <= 3);
  for (const product of products) {
    assert.deepEqual(Object.keys(product).sort(), ['id', 'price', 'title']);
    assert.equal(typeof product.title, 'string');
    assert.equal(typeof product.price, 'number');
  }
  const final = JSON.stringify(response);
  const token = calls[1].parameters.headers.Authorization.replace(/^Bearer /, '');
  assert.ok(token && !token.includes('{'));
  for (const value of [credentials.password, token]) assert.ok(!final.includes(value));
  assert.ok(!/accessToken|refreshToken|authorization/i.test(final));
  assert.equal(response.headers['set-cookie'], undefined);
  if (!liveProvider) assert.deepEqual(response.body.data, publicData);
  report.checks.finalDataOnlyOnSuccess = true;
  report.checks.productCount = products.length;
});

if (!liveProvider) {
  report.checks.internalResourcesRejectPublicCalls = true;
  for (const handle of Object.values(handles)) {
    await probe({upstream: fixtureUpstream()}, {handle, storefront: true}, (response, calls) => {
      report.checks.internalResourcesRejectPublicCalls &&= response.body.status === 403 && calls.length === 0;
    });
  }
  await probe({upstream: fixtureUpstream(), publicHandles: [handles.auth]}, {storefront: true}, response => {
    report.checks.publicEntryCanUseInternalContinuation = response.body.status === 200;
  });
  await probe({upstream: fixtureUpstream(), publicHandles: Object.values(handles)}, {storefront: true, query: {
    headersEmbedded: JSON.stringify({Authorization: 'Bearer caller-controlled'}),
    bodyEmbedded: JSON.stringify({password: 'caller-controlled'}),
    queryParamsEmbedded: JSON.stringify({limit: 100}),
    systemParamsEmbedded: JSON.stringify({VERIFY_SSL_CERT: 'false'}),
  }}, (_response, calls) => {
    report.checks.untrustedOverridesBlocked = calls.length === 0 || calls.every(call =>
      call.parameters.body?.password !== 'caller-controlled' &&
      call.parameters.headers.Authorization !== 'Bearer caller-controlled' &&
      call.parameters.queryParams.limit !== 100 && call.parameters.system.VERIFY_SSL_CERT !== 'false');
  });
  await probe({upstream: fixtureUpstream({dataFailure: true, echoTokenInFailure: true}), publicHandles: Object.values(handles)},
    {storefront: true}, response => {
      report.checks.upstreamErrorSecretsRemoved = !JSON.stringify(response).includes(fixtureSecrets.accessToken);
    });
  await probe({upstream: fixtureUpstream({authFailure: true}), publicHandles: Object.values(handles)},
    {storefront: true}, (response, calls) => {
      report.checks.authenticationFailureStopsChain = calls.length === 1;
      report.checks.internalWarningsRemoved = !response.body.warnings?.length;
    });
  report.storefrontReady = report.checks.internalResourcesRejectPublicCalls &&
    report.checks.publicEntryCanUseInternalContinuation && report.checks.untrustedOverridesBlocked &&
    report.checks.upstreamErrorSecretsRemoved && report.checks.authenticationFailureStopsChain && report.checks.internalWarningsRemoved;
} else {
  for (const [name, headers] of [
    ['missingTokenRejected', {}],
    ['invalidTokenRejected', {Authorization: 'Bearer invalid-verification-token'}],
  ]) {
    const response = await fetch('https://dummyjson.com/auth/products?limit=3&select=title,price', {
      headers, signal: AbortSignal.timeout(15000),
    });
    await response.arrayBuffer();
    assert.equal(response.status, 401);
    report.checks[name] = true;
  }
}
console.log(JSON.stringify(report, null, 2));
// A successful provider smoke check is not public-storefront acceptance.
if (!liveProvider && !report.storefrontReady) process.exitCode = 2;
