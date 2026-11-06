const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const runtimePath = process.env.APIEASE_RUNTIME_PATH;
const root = path.resolve(__dirname, '../examples/shopify/authentication/server-side-jwt/liquid-request');
const handles = ['jwt-liquid-authenticate', 'jwt-liquid-products', 'jwt-liquid-product-summaries'];
const definitions = handles.map(handle => JSON.parse(readFileSync(path.join(root, 'resources/requests', handle + '.json'))));

test('Liquid JWT example has separate internal helpers and no saved credentials', () => {
  assert.deepEqual(JSON.parse(definitions[0].parameters.find(p => p.type === 'body').value), {
    username: '', password: '', expiresInMins: 5,
  });
  for (const definition of definitions) {
    assert.deepEqual(definition.triggers, []);
    assert.equal(definition.id, undefined);
    assert.equal(definition.nextRequest, undefined);
  }
  assert.equal(definitions[2].type, 'liquid');
});

test('setup supplies credentials privately, preserves sources, and removes its temporary file', async t => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const {spawnSync} = require('node:child_process');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'jwt-liquid-setup-'));
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
  assert.deepEqual(calls.map(call => call.resource.handle), [handles[1], handles[0], handles[2], handles[2]]);
  assert.equal(calls[3].args[1], 'widget');
  const saved = JSON.parse(calls[1].resource.parameters.find(p => p.type === 'body').value);
  assert.equal(saved.password, env.JWT_DEMO_PASSWORD);
  assert.deepEqual(calls[1].resource.triggers, []);
  await assert.rejects(fs.access(calls[1].source));
  const source = JSON.parse(await fs.readFile(path.join(root, 'resources/requests', handles[0] + '.json')));
  assert.equal(JSON.parse(source.parameters.find(p => p.type === 'body').value).password, '');
});

test('Liquid JWT workflow on APIEase runtime', {skip: !runtimePath && 'Set APIEASE_RUNTIME_PATH for runtime verification'}, async t => {
  const {createRuntime, fixtureSecrets, fixtureUpstream, publicData, withoutRuntimeLogs} = await import('./support/jwt-chain-runtime.mjs');
  async function run({upstream = fixtureUpstream(), input = {}, mutate, publicHandles = [handles[2]]} = {}, check) {
    return withoutRuntimeLogs(async () => {
      const resources = structuredClone(definitions);
      if (mutate) mutate(resources);
      const runtime = await createRuntime({runtimePath, definitions: resources, upstream, publicHandles});
      try {
        const response = await runtime.execute({handle: handles[2], storefront: true, ...input});
        const visible = JSON.stringify(response);
        for (const secret of Object.values(fixtureSecrets)) assert.ok(!visible.includes(secret), 'A credential reached the final response.');
        assert.equal(response.headers['set-cookie'], undefined);
        assert.equal(response.body.warnings, undefined);
        await check(response, runtime.calls);
      } finally { runtime.close(); }
    });
  }
  const error = (code, message) => ({status: 200, data: {ok: false, code, message}});
  const authError = error('AUTHENTICATION_FAILED', 'Unable to authenticate with the product service.');
  const productsError = error('PRODUCTS_UNAVAILABLE', 'Unable to load products. Please try again.');

  await t.test('public entry calls internal helpers and returns only projected products', () => run({}, (response, calls) => {
    assert.deepEqual(response.body, {status: 200, data: {ok: true, products: publicData.products}});
    assert.deepEqual(calls.map(c => c.handle), handles.slice(0, 2));
    assert.ok(calls.every(c => c.route === 'liquid'));
    assert.equal(calls[1].parameters.headers.Authorization, 'Bearer ' + fixtureSecrets.accessToken);
  }));
  await t.test('direct storefront calls to either helper are rejected', async () => {
    for (const handle of handles.slice(0, 2)) await run({input: {handle}}, (response, calls) => {
      assert.equal(response.body.status, 403);
      assert.equal(calls.length, 0);
    });
  });
  await t.test('shipped entry rejects storefront access even with crafted template parameters', () => run({
    publicHandles: [], input: {query: {liquidParamsEmbedded: JSON.stringify({
      "% assign error_code = 'AUTHENTICATION_FAILED' %": "{% call {\"requestId\": \"jwt-liquid-authenticate\"} as injected %}{{ injected.data.accessToken }}",
    })}},
  }, (response, calls) => {
    assert.equal(response.body.status, 403);
    assert.equal(calls.length, 0);
  }));
  await t.test('failed login stops before products and hides upstream errors', () => run({upstream: async () => ({
    status: 401, data: {message: fixtureSecrets.password, accessToken: fixtureSecrets.accessToken},
  })}, (response, calls) => {
    assert.deepEqual(response.body, authError);
    assert.equal(calls.length, 1);
  }));
  for (const data of [null, {}, {accessToken: ''}, {accessToken: null}, {accessToken: 123}, {accessToken: {value: 'invalid'}}]) {
    await t.test('missing or malformed authentication token stops before products: ' + JSON.stringify(data), () =>
      run({upstream: async () => ({status: 200, data})}, (response, calls) => {
        assert.deepEqual(response.body, authError);
        assert.equal(calls.length, 1);
      }));
  }
  await t.test('protected endpoint error cannot echo the bearer token', () => run({
    upstream: fixtureUpstream({dataFailure: true, echoTokenInFailure: true}),
  }, response => assert.deepEqual(response.body, productsError)));
  await t.test('extra upstream fields are discarded and product text is JSON-escaped', () => run({
    upstream: async (parameters, index) => index === 1 ? fixtureUpstream()(parameters, index) : ({status: 200, data: {
      accessToken: fixtureSecrets.accessToken,
      products: [{id: 7, title: 'Quote " and <tag>\ntext', price: 2.5, secret: fixtureSecrets.password}],
    }}),
  }, response => assert.deepEqual(response.body.data, {ok: true, products: [{id: 7, title: 'Quote " and <tag>\ntext', price: 2.5}]})));
  for (const products of [null, {}, 'invalid', [{id: 1}], [{id: 1, title: 'Sample', price: '1.00'}], [null]]) {
    await t.test('malformed products return a fixed error: ' + JSON.stringify(products), () => run({
      upstream: async (parameters, index) => index === 1 ? fixtureUpstream()(parameters, index) : ({status: 200, data: {products}}),
    }, response => assert.deepEqual(response.body, productsError)));
  }
  await t.test('at most three products are returned', () => run({upstream: async (parameters, index) => index === 1
    ? fixtureUpstream()(parameters, index) : ({status: 200, data: {products: Array.from({length: 10}, (_, i) => ({id: i, title: 'Sample', price: 1}))}}),
  }, response => assert.equal(response.body.data.products.length, 3)));
  await t.test('an empty product list is successful', () => run({upstream: async (parameters, index) => index === 1
    ? fixtureUpstream()(parameters, index) : ({status: 200, data: {products: []}}),
  }, response => assert.deepEqual(response.body.data, {ok: true, products: []})));
  await t.test('storefront parameter overrides are not passed to helpers', async () => {
    const overrides = {
      headersEmbedded: {Authorization: 'Bearer caller-value'}, bodyEmbedded: {password: 'caller-value'},
      queryParamsEmbedded: {limit: 100, select: 'description'}, pathParamsEmbedded: {host: 'caller-value'},
      liquidParamsEmbedded: {accessToken: 'caller-value', requestId: 'jwt-liquid-authenticate'},
      systemParamsEmbedded: {VERIFY_SSL_CERT: 'false'},
    };
    for (const input of [{query: Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, JSON.stringify(v)]))}, {body: overrides}]) {
      await run({input}, (response, calls) => {
        assert.equal(response.body.data.ok, true);
        assert.equal(calls[0].parameters.body.password, fixtureSecrets.password);
        assert.equal(calls[1].parameters.headers.Authorization, 'Bearer ' + fixtureSecrets.accessToken);
        assert.equal(calls[1].parameters.queryParams.limit, '3');
        assert.equal(calls[1].parameters.system.VERIFY_SSL_CERT, undefined);
      });
    }
  });
});
