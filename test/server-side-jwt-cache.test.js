const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const runtimePath = process.env.APIEASE_RUNTIME_PATH;
const root = path.resolve(__dirname, '../examples/shopify/authentication/server-side-jwt/liquid-cached-request');
const handles = ['jwt-cache-authenticate', 'jwt-cache-products', 'jwt-cache-read', 'jwt-cache-write', 'jwt-cache-product-summaries'];
const cacheHandle = 'jwt-cache-dummyjson';
const definitions = handles.map(h => JSON.parse(readFileSync(path.join(root, 'resources/requests', h + '.json'))));
const now = 1804543200;

test('cached JWT resources contain no credentials or public triggers', () => {
  assert.deepEqual(JSON.parse(definitions[0].parameters.find(p => p.type === 'body').value), {
    username: '', password: '', expiresInMins: 5,
  });
  for (const definition of definitions) {
    assert.deepEqual(definition.triggers, []);
    assert.equal(definition.id, undefined);
    assert.equal(definition.nextRequest, undefined);
  }
  const variable = JSON.parse(readFileSync(path.join(root, 'resources/variables', cacheHandle + '.json')));
  assert.equal(variable.value, '');
  assert.equal(variable.sensitive, true);
});

test('setup supplies credentials privately, preserves sources, and removes its temporary file', async t => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const {spawnSync} = require('node:child_process');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'jwt-cache-setup-'));
  t.after(() => fs.rm(temporary, {recursive: true, force: true}));
  await fs.writeFile(path.join(temporary, 'apiease'), `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const source = args[args.indexOf('--file') + 1];
const resource = JSON.parse(fs.readFileSync(source, 'utf8'));
fs.appendFileSync(path.join(process.env.JWT_TEST_OUTPUT, 'calls.jsonl'), JSON.stringify({args, source, resource}) + '\\n');
console.log('Created resource.');
`, {mode: 0o700});
  const env = {...process.env, PATH: temporary + ':' + process.env.PATH, JWT_TEST_OUTPUT: temporary,
    JWT_DEMO_USERNAME: '', JWT_DEMO_PASSWORD: ''};
  const setup = path.join(root, 'create-resources.sh');
  const refused = spawnSync('bash', [setup, 'fixture.myshopify.com'], {env, encoding: 'utf8'});
  assert.equal(refused.status, 1);
  await assert.rejects(fs.access(path.join(temporary, 'calls.jsonl')));
  env.JWT_DEMO_USERNAME = 'fixture-setup-user';
  env.JWT_DEMO_PASSWORD = 'fixture-setup-password';
  const created = spawnSync('bash', [setup, 'fixture.myshopify.com'], {env, encoding: 'utf8'});
  assert.equal(created.status, 0, created.stderr);
  assert.ok(!(created.stdout + created.stderr).includes(env.JWT_DEMO_PASSWORD));
  const calls = (await fs.readFile(path.join(temporary, 'calls.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(calls.map(call => call.resource.handle), [cacheHandle, handles[1], handles[0], handles[2], handles[3], handles[4]]);
  assert.equal(calls[0].args[1], 'variable');
  assert.equal(calls[0].resource.value, '');
  assert.equal(calls[0].resource.sensitive, true);
  assert.ok(calls.slice(1).every(call => call.args[1] === 'request'));
  const saved = JSON.parse(calls[2].resource.parameters.find(p => p.type === 'body').value);
  assert.equal(saved.password, env.JWT_DEMO_PASSWORD);
  assert.deepEqual(calls[2].resource.triggers, []);
  await assert.rejects(fs.access(calls[2].source));
  const source = JSON.parse(await fs.readFile(path.join(root, 'resources/requests', handles[0] + '.json')));
  assert.equal(JSON.parse(source.parameters.find(p => p.type === 'body').value).password, '');
});

test('persisted JWT caching on APIEase runtime', {skip: !runtimePath && 'Set APIEASE_RUNTIME_PATH for runtime verification'}, async t => {
  const {createRuntime, fixtureSecrets, publicData, withoutRuntimeLogs} = await import('./support/jwt-chain-runtime.mjs');
  const validCache = (overrides = {}) => ({accessToken: fixtureSecrets.accessToken,
    issuedAt: now - 60, expiresAt: now + 240, context: 'dummyjson-demo-products-v1', ...overrides});
  function store(initial, {readFailure = false, writeFailure = false} = {}) {
    const values = new Map(initial === undefined ? [] : [['fixture.myshopify.com', structuredClone(initial)]]);
    const writes = [];
    return {values, writes,
      async getVariables(shop) {
        if (readFailure) throw new Error(fixtureSecrets.password);
        return {[cacheHandle]: structuredClone(values.get(shop.myshopifyDomain))};
      },
      async setVariablesFromLatestAuthority(shop, args) {
        if (writeFailure) throw new Error(fixtureSecrets.password);
        assert.equal(args.length, 1);
        assert.equal(args[0].handle, cacheHandle);
        assert.equal(args[0].sensitive, true);
        writes.push(structuredClone(args[0]));
        values.set(shop.myshopifyDomain, structuredClone(args[0].value));
      },
    };
  }
  const ordinaryUpstream = async parameters => parameters.address.endsWith('/auth/login')
    ? {status: 200, data: {accessToken: fixtureSecrets.accessToken, refreshToken: fixtureSecrets.refreshToken}}
    : {status: 200, data: publicData};
  async function run({initial, storage = store(initial), upstream = ordinaryUpstream, input = {}, shopDomain} = {}, check) {
    return withoutRuntimeLogs(async () => {
      const runtime = await createRuntime({runtimePath, definitions, upstream, shopVariablesService: storage, nowSeconds: now, shopDomain});
      try {
        const response = await runtime.execute({handle: handles[4], ...input});
        const visible = JSON.stringify(response);
        for (const secret of Object.values(fixtureSecrets)) assert.ok(!visible.includes(secret), 'Secret reached the final response.');
        assert.equal(response.headers['set-cookie'], undefined);
        assert.equal(response.body.warnings, undefined);
        await check(response, runtime.calls, storage);
      } finally { runtime.close(); }
    });
  }
  const success = response => assert.deepEqual(response.body, {status: 200, data: {ok: true, products: publicData.products}});
  const failure = (response, code) => {
    assert.equal(response.body.status, 200);
    assert.equal(response.body.data.ok, false);
    assert.equal(response.body.data.code, code);
    assert.deepEqual(Object.keys(response.body.data).sort(), ['code', 'message', 'ok']);
  };
  await t.test('cache miss persists one sensitive record and a separate execution reuses it', async () => {
    const storage = store();
    await run({storage}, (response, calls) => {
      success(response);
      assert.deepEqual(calls.map(c => c.handle), handles.slice(0, 2));
      assert.deepEqual(storage.values.get('fixture.myshopify.com'), validCache({issuedAt: now, expiresAt: now + 300}));
    });
    await run({storage}, (response, calls) => {
      success(response);
      assert.deepEqual(calls.map(c => c.handle), [handles[1]]);
      assert.equal(storage.writes.length, 1);
    });
  });
  const invalidStates = [
    ['empty', ''], ['missing fields', {}], ['null', null], ['string record', 'invalid'],
    ['blank token', validCache({accessToken: '  '})], ['nonstring token', validCache({accessToken: 4})],
    ['missing expiry', {accessToken: fixtureSecrets.accessToken}],
    ['text expiry', validCache({expiresAt: String(now + 240)})],
    ['expired', validCache({issuedAt: now - 301, expiresAt: now - 1})],
    ['within safety margin', validCache({issuedAt: now - 271, expiresAt: now + 29})],
    ['at safety boundary', validCache({issuedAt: now - 270, expiresAt: now + 30})],
    ['future issue time', validCache({issuedAt: now + 1, expiresAt: now + 301})],
    ['inconsistent lifetime', validCache({expiresAt: now + 5000})],
    ['different authorization context', validCache({context: 'other-account-or-audience'})],
  ];
  for (const [name, initial] of invalidStates) await t.test(name + ' causes reauthentication', () => run({initial}, (response, calls, storage) => {
    success(response);
    assert.deepEqual(calls.map(c => c.handle), handles.slice(0, 2));
    assert.equal(storage.writes.length, 1);
  }));
  await t.test('token just outside the safety margin is reused', () => run({
    initial: validCache({issuedAt: now - 269, expiresAt: now + 31}),
  }, (response, calls, storage) => {
    success(response);
    assert.deepEqual(calls.map(c => c.handle), [handles[1]]);
    assert.equal(storage.writes.length, 0);
  }));
  await t.test('401 clears cached token, renews once, and retries the product GET', () => run({initial: validCache(),
    upstream: async (p, index) => index === 1 ? {status: 401, data: {message: fixtureSecrets.accessToken}} : ordinaryUpstream(p),
  }, (response, calls, storage) => {
    success(response);
    assert.deepEqual(calls.map(c => c.handle), [handles[1], handles[0], handles[1]]);
    assert.equal(storage.writes[0].value, '');
    assert.equal(storage.writes.length, 2);
  }));
  await t.test('repeated 401 stops after one retry and leaves an empty cache', () => run({
    upstream: async p => p.address.endsWith('/auth/login') ? ordinaryUpstream(p) : {status: 401, data: {message: fixtureSecrets.accessToken}},
  }, (response, calls, storage) => {
    failure(response, 'PRODUCTS_UNAVAILABLE');
    assert.deepEqual(calls.map(c => c.handle), [handles[0], handles[1], handles[0], handles[1]]);
    assert.equal(storage.values.get('fixture.myshopify.com'), '');
  }));
  for (const status of [403, 404, 429, 500]) await t.test(status + ' does not renew or retry', () => run({initial: validCache(),
    upstream: async () => ({status, data: {message: fixtureSecrets.accessToken}}),
  }, (response, calls, storage) => {
    failure(response, 'PRODUCTS_UNAVAILABLE');
    assert.equal(calls.length, 1);
    assert.equal(storage.writes.length, 0);
  }));
  for (const data of [null, {}, {accessToken: ''}, {accessToken: 123}]) await t.test('malformed login is not cached: ' + JSON.stringify(data), () => run({
    upstream: async () => ({status: 200, data}),
  }, (response, calls, storage) => {
    failure(response, 'AUTHENTICATION_FAILED');
    assert.equal(calls.length, 1);
    assert.equal(storage.writes.length, 0);
  }));
  await t.test('failed renewal cannot reuse a rejected token', () => run({initial: validCache(),
    upstream: async () => ({status: 401, data: {message: fixtureSecrets.password}}),
  }, (response, calls, storage) => {
    failure(response, 'AUTHENTICATION_FAILED');
    assert.deepEqual(calls.map(c => c.handle), [handles[1], handles[0]]);
    assert.equal(storage.values.get('fixture.myshopify.com'), '');
  }));
  for (const operation of ['readFailure', 'writeFailure']) await t.test('cache ' + operation + ' fails with a fixed error', () => run({
    storage: store(undefined, {[operation]: true}),
  }, (response, calls) => {
    failure(response, 'CACHE_UNAVAILABLE');
    assert.equal(calls.length, operation === 'readFailure' ? 0 : 1);
  }));
  await t.test('malformed product fields are not rendered', () => run({initial: validCache(),
    upstream: async () => ({status: 200, data: {products: [{id: 1, title: 'Sample'}], accessToken: fixtureSecrets.accessToken}}),
  }, response => failure(response, 'PRODUCTS_UNAVAILABLE')));
  await t.test('only selected fields are serialized, with JSON escaping and a three-product limit', () => run({initial: validCache(),
    upstream: async () => ({status: 200, data: {products: Array.from({length: 5}, (_, id) => ({id, title: 'A "quote"\n', price: 1, accessToken: fixtureSecrets.accessToken}))}}),
  }, response => assert.deepEqual(response.body.data, {ok: true, products: Array.from({length: 3}, (_, id) => ({id, title: 'A "quote"\n', price: 1}))})));
  await t.test('same cache handle in another shop cannot reuse the first shop token', async () => {
    const storage = store(validCache());
    await run({storage, shopDomain: 'other.myshopify.com'}, (response, calls) => {
      success(response);
      assert.deepEqual(calls.map(c => c.handle), handles.slice(0, 2));
      assert.equal(storage.values.size, 2);
    });
  });
  await t.test('concurrent misses may both authenticate; each uses its own token and the final record stays complete', async () => {
    await withoutRuntimeLogs(async () => {
      const storage = store();
      const tokens = new Set();
      let release;
      const bothAuthenticated = new Promise(resolve => {release = resolve;});
      const upstream = async p => {
        if (p.address.endsWith('/auth/login')) {
          const token = 'concurrent-private-token-' + tokens.size;
          tokens.add(token);
          if (tokens.size === 2) release();
          await bothAuthenticated;
          return {status: 200, data: {accessToken: token}};
        }
        assert.ok(tokens.has(p.headers.Authorization.slice(7)));
        return {status: 200, data: publicData};
      };
      const runtimes = await Promise.all([1, 2].map(() => createRuntime({runtimePath, definitions, upstream, shopVariablesService: storage, nowSeconds: now})));
      try {
        const responses = await Promise.all(runtimes.map(runtime => runtime.execute({handle: handles[4]})));
        responses.forEach(success);
        assert.equal(storage.writes.length, 2);
        const saved = storage.values.get('fixture.myshopify.com');
        assert.ok(tokens.has(saved.accessToken));
        assert.equal(saved.expiresAt - saved.issuedAt, 300);
        assert.ok(!JSON.stringify(responses).includes('concurrent-private-token'));
      } finally { runtimes.forEach(runtime => runtime.close()); }
    });
  });
  await t.test('all supplied requests reject direct storefront access', async () => {
    for (const handle of handles) await run({input: {handle, storefront: true}}, (response, calls, storage) => {
      assert.equal(response.body.status, 403);
      assert.equal(calls.length, 0);
      assert.equal(storage.writes.length, 0);
    });
  });
  await t.test('ordinary caller overrides cannot change cache selection or helper inputs', () => run({input: {body: {
    systemParamsEmbedded: {arguments: [{handle: 'other-cache'}]},
    liquidParamsEmbedded: {token: 'caller-token', cache_context: 'caller-context', safety_margin_seconds: -1},
    bodyEmbedded: {password: 'caller-password'}, headersEmbedded: {Authorization: 'Bearer caller-token'},
    queryParamsEmbedded: {limit: 100},
  }}}, (response, calls, storage) => {
    success(response);
    assert.equal(calls[0].parameters.body.password, fixtureSecrets.password);
    assert.equal(calls[1].parameters.headers.Authorization, 'Bearer ' + fixtureSecrets.accessToken);
    assert.equal(calls[1].parameters.queryParams.limit, '3');
    assert.equal(storage.writes[0].handle, cacheHandle);
  }));
});
