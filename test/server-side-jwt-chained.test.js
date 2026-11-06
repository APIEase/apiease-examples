const assert = require('node:assert/strict');
const {test} = require('node:test');
const runtimePath = process.env.APIEASE_RUNTIME_PATH;

test('setup requires credentials and keeps the rendered secret body out of source and output', async t => {
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const os = require('node:os');
  const {spawnSync} = require('node:child_process');
  const {exampleRoot} = await import('./support/jwt-chain-runtime.mjs');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'jwt-chain-setup-test-'));
  t.after(() => fs.rm(temporary, {recursive: true, force: true}));
  const fakeCli = path.join(temporary, 'apiease');
  await fs.writeFile(fakeCli, `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const source = args[args.indexOf('--file') + 1];
const resource = JSON.parse(fs.readFileSync(source, 'utf8'));
fs.writeFileSync(path.join(process.env.JWT_TEST_OUTPUT, resource.handle + '.json'), JSON.stringify(resource));
fs.appendFileSync(path.join(process.env.JWT_TEST_OUTPUT, 'calls.jsonl'), JSON.stringify({args, source}) + '\\n');
console.log('Resource created.');
`, {mode: 0o700});
  const script = path.join(exampleRoot, 'create-resources.sh');
  const sourcePath = path.join(exampleRoot, 'resources/requests/jwt-chain-authenticate.json');
  const original = await fs.readFile(sourcePath, 'utf8');
  const env = {...process.env, PATH: `${temporary}:${process.env.PATH}`, JWT_TEST_OUTPUT: temporary,
    JWT_DEMO_USERNAME: '', JWT_DEMO_PASSWORD: ''};
  const refused = spawnSync('bash', [script, 'fixture.myshopify.com'], {env, encoding: 'utf8'});
  assert.equal(refused.status, 1);
  await assert.rejects(fs.access(path.join(temporary, 'calls.jsonl')));
  env.JWT_DEMO_USERNAME = 'fixture-setup-user';
  env.JWT_DEMO_PASSWORD = 'fixture-setup-password';
  const created = spawnSync('bash', [script, 'fixture.myshopify.com'], {env, encoding: 'utf8'});
  assert.equal(created.status, 0, created.stderr);
  assert.ok(!(created.stdout + created.stderr).includes(env.JWT_DEMO_PASSWORD));
  const calls = (await fs.readFile(path.join(temporary, 'calls.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(calls.length, 2);
  assert.match(calls[0].source, /jwt-chain-products\.json$/);
  await assert.rejects(fs.access(calls[1].source), 'Rendered credential file must be removed after setup.');
  const authentication = JSON.parse(await fs.readFile(path.join(temporary, 'jwt-chain-authenticate.json'), 'utf8'));
  assert.deepEqual(JSON.parse(authentication.parameters.find(parameter => parameter.type === 'body').value), {
    username: env.JWT_DEMO_USERNAME, password: env.JWT_DEMO_PASSWORD, expiresInMins: 5,
  });
  assert.deepEqual(authentication.triggers, []);
  assert.equal(await fs.readFile(sourcePath, 'utf8'), original);
});

test('JWT chain ships without public triggers or credentials', async () => {
  const {readDefinitions, handles} = await import('./support/jwt-chain-runtime.mjs');
  const [authentication, products] = await readDefinitions();
  assert.equal(authentication.nextRequest, handles.products);
  for (const request of [authentication, products]) {
    assert.deepEqual(request.triggers, []);
    assert.equal(request.id, undefined);
    assert.equal(new URL(request.address).origin, 'https://dummyjson.com');
  }
  const body = authentication.parameters.find(parameter => parameter.type === 'body');
  assert.deepEqual(JSON.parse(body.value), {username: '', password: '', expiresInMins: 5});
  assert.equal(body.sensitive, true);
});

test('JWT chain on actual APIEase runtime modules', {skip: !runtimePath && 'Set APIEASE_RUNTIME_PATH for runtime verification'}, async t => {
  const {createRuntime, fixtureUpstream, fixtureSecrets, handles, publicData, withoutRuntimeLogs, validateDefinitions} =
    await import('./support/jwt-chain-runtime.mjs');
  await t.test('resource definitions pass the current public CRUD schema', async () => {
    for (const result of await validateDefinitions(runtimePath)) assert.equal(result.isValid, true, JSON.stringify(result.fieldErrors));
  });
  async function run(options, execute, check) {
    await withoutRuntimeLogs(async () => {
      const runtime = await createRuntime({runtimePath, upstream: fixtureUpstream(), ...options});
      try { await check(await runtime.execute(execute), runtime.calls); }
      finally { runtime.close(); }
    });
  }
  function noSecrets(response) {
    const serialized = JSON.stringify(response);
    for (const secret of Object.values(fixtureSecrets)) assert.ok(!serialized.includes(secret));
    assert.equal(Object.hasOwn(response.body.data || {}, 'accessToken'), false);
    assert.equal(Object.hasOwn(response.body.data || {}, 'refreshToken'), false);
    assert.equal(response.headers['set-cookie'], undefined);
  }

  await t.test('authentication feeds the JWT to the protected request and only final data is returned', async () => {
    await run({}, {}, (response, calls) => {
      assert.deepEqual(calls.map(call => call.handle), [handles.auth, handles.products]);
      assert.equal(calls[0].parameters.body.password, fixtureSecrets.password);
      assert.equal(calls[1].parameters.headers.Authorization, `Bearer ${fixtureSecrets.accessToken}`);
      assert.deepEqual(response.body, {status: 200, data: publicData});
      noSecrets(response);
    });
  });
  await t.test('checked-in resources reject direct storefront access before any upstream call', async () => {
    for (const handle of Object.values(handles)) {
      await run({}, {handle, storefront: true}, (response, calls) => {
        assert.equal(response.body.status, 403);
        assert.equal(calls.length, 0);
        noSecrets(response);
      });
    }
  });
  await t.test('ordinary authentication failure does not return the authentication payload', async () => {
    await run({upstream: fixtureUpstream({authFailure: true})}, {}, (response, calls) => {
      assert.equal(response.body.status, 401);
      assert.equal(calls.length, 2, 'Current runtime continues after failed authentication.');
      assert.equal(response.body.warnings[0].code, 'UNRESOLVED_VARIABLE');
      noSecrets(response);
    });
  });
  await t.test('ordinary protected API failure retains its status without credentials', async () => {
    await run({upstream: fixtureUpstream({dataFailure: true})}, {}, response => {
      assert.equal(response.body.status, 502);
      noSecrets(response);
    });
  });
  await t.test('characterization: publishing only the entry does not authorize the internal continuation', async () => {
    await run({publicHandles: [handles.auth]}, {storefront: true}, (response, calls) => {
      assert.equal(response.body.status, 403);
      assert.equal(calls.length, 1);
      noSecrets(response);
    });
  });
  await t.test('characterization: with both triggers, the final response is returned without an intermediate token', async () => {
    await run({publicHandles: Object.values(handles)}, {storefront: true, query: {nextRequest: ''}}, response => {
      assert.deepEqual(response.body, {status: 200, data: publicData});
      noSecrets(response);
    });
  });
  await t.test('characterization: caller overrides reach both requests and can weaken TLS settings', async () => {
    await run({publicHandles: Object.values(handles)}, {storefront: true, query: {
      headersEmbedded: JSON.stringify({Authorization: 'Bearer caller-controlled'}),
      bodyEmbedded: JSON.stringify({password: 'caller-controlled'}),
      queryParamsEmbedded: JSON.stringify({limit: 100, select: 'description'}),
      systemParamsEmbedded: JSON.stringify({VERIFY_SSL_CERT: 'false', APIEASE_RESPONSE_CODE_OVERRIDE: '202'}),
    }}, (response, calls) => {
      assert.equal(calls[0].parameters.body.password, 'caller-controlled');
      assert.equal(calls[1].parameters.headers.Authorization, 'Bearer caller-controlled');
      assert.equal(calls[1].parameters.queryParams.limit, 100);
      assert.equal(calls[1].parameters.system.VERIFY_SSL_CERT, 'false');
      assert.equal(response.status, 202);
      assert.equal(response.body.status, 202, 'Caller can override a failed API result status.');
    });
  });
  await t.test('characterization: upstream error bodies are not sanitized by chaining', async () => {
    await run({publicHandles: Object.values(handles), upstream: fixtureUpstream({dataFailure: true, echoTokenInFailure: true})},
      {storefront: true}, response => {
        assert.equal(response.body.status, 502);
        assert.equal(response.body.data.debug.authorization, `Bearer ${fixtureSecrets.accessToken}`);
      });
  });
});
