const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');

const root = path.resolve(__dirname, '..');
const example = 'examples/shopify/products/import-between-stores';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/knowledgebase/examples.json')));
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'test/evidence/product-import-catalogue.json')));

function requests(role) {
  const directory = path.join(root, example, role, 'resources/requests');
  return new Map(fs.readdirSync(directory).filter((f) => f.endsWith('.json')).map((file) => {
    const resource = JSON.parse(fs.readFileSync(path.join(directory, file)));
    assert.equal(file, resource.handle + '.json');
    return [resource.handle, resource];
  }));
}

test('both store recipes enroll complete same-store dependency graphs and all listed requests', () => {
  const activeHandles = new Set();
  for (const role of ['source', 'destination']) {
    const resources = requests(role);
    const inventory = evidence.roleInventories[role];
    const expected = [...inventory.active, ...inventory.supplementary];
    assert.equal(inventory.active.length, 26);
    assert.deepEqual([...resources.keys()].sort(), [...expected].sort());
    inventory.active.forEach((handle) => activeHandles.add(handle));
    const selection = manifest.examples.find((entry) => entry.path === `${example}/${role}`);
    assert.deepEqual(selection.files, ['README.md', ...expected.map((h) => `resources/requests/${h}.json`)]);
    for (const [handle, resource] of resources) {
      const children = [...(resource.liquid || '').matchAll(/"requestId"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
      for (const child of children) assert.ok(resources.has(child), `${role}/${handle} needs ${child}`);
    }
  }
  assert.equal(activeHandles.size, 28);
  assert.deepEqual([...activeHandles].sort(), [...evidence.activeUniqueHandles].sort());
  const source = requests('source');
  const destination = requests('destination');
  assert.ok(source.has('seed-product-import-test') && source.has('read-product-import-test'));
  assert.ok(!source.has('import-product-import-test'));
  assert.ok(destination.has('import-product-import-test') && !destination.has('seed-product-import-test'));
  for (const handle of ['product-import-create-one', 'product-import-workflow', 'cleanup-product-import-test']) {
    assert.notEqual(source.get(handle).liquid, destination.get(handle).liquid,
      `${handle} must retain its distinct shop-specific source`);
  }
});

test('catalogue requests retain server-side auth boundaries and all guide links resolve', () => {
  for (const role of ['source', 'destination']) {
    for (const resource of requests(role).values()) {
      assert.equal(resource.resourceType, 'request');
      assert.ok(!Object.hasOwn(resource, 'id'), 'Server-owned IDs do not belong in examples');
      assert.deepEqual(resource.triggers, []);
      for (const parameter of resource.parameters) {
        assert.notEqual(parameter.name?.toLowerCase(), 'x-shopify-access-token');
        if (parameter.sensitive) assert.deepEqual(parameter.value, {mode: 'preserve'});
      }
      if (resource.type === 'http' && resource.address.endsWith('/graphql.json')) {
        assert.equal(resource.method, 'POST');
        const body = resource.parameters.find((p) => p.type === 'body');
        assert.equal(typeof body.value, 'string');
        assert.equal(typeof JSON.parse(body.value).query, 'string');
      }
    }
  }
  for (const relative of ['README.md', 'source/README.md', 'destination/README.md']) {
    const file = path.join(root, example, relative);
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      assert.ok(fs.existsSync(path.resolve(path.dirname(file), target)), `${relative}: ${target}`);
    }
  }
});
