const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {test} = require('node:test');
const {
  SOURCE_ROOT, buildKnowledgeBase, generateKnowledgeBaseText, extractReadme, canonicalizeLinks,
} = require('../scripts/knowledgebase/buildApiEaseExamplesKnowledgeBase');

const run = promisify(execFile);
const repoRoot = path.resolve(__dirname, '..');
const builder = path.join(repoRoot, 'scripts/knowledgebase/buildApiEaseExamplesKnowledgeBase.js');
const start = '<!-- apiease-kb:start -->';
const end = '<!-- apiease-kb:end -->';
const hostname = 'store-apiease-admin-local.myshopify.com';
const requestFile = 'resources/requests/lookup.json';
const widgetFile = 'resources/widgets/display.json';
const example = 'examples/shopify/fixture';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-examples-kb-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  async function write(relative, text) {
    const file = path.join(root, relative);
    await fs.mkdir(path.dirname(file), {recursive: true});
    await fs.writeFile(file, text);
  }
  async function manifest(entries = [{path: example, files: ['README.md', requestFile, widgetFile]}]) {
    await write('docs/knowledgebase/examples.json', JSON.stringify({examples: entries}));
  }
  await fs.copyFile(path.join(repoRoot, 'apiease.config.js'), path.join(root, 'apiease.config.js'));
  await manifest();
  await fs.mkdir(path.join(root, 'scripts/knowledgebase'), {recursive: true});
  await fs.copyFile(builder, path.join(root, 'scripts/knowledgebase/buildApiEaseExamplesKnowledgeBase.js'));
  await write(`${example}/README.md`, [
    '# Fixture title', 'Excluded introduction.', start,
    '## First block', `Visit https://${hostname}/admin/api/2026-10/graphql.json?q=1#result`,
    `The development host is ${hostname}.`,
    '[Request](resources/requests/lookup.json#details)',
    '```js', `const url = "https://${hostname}/apps/apiease";`,
    'const example = "[literal](../unchanged.md)";', '```', end,
    '## Excluded installation', 'Do not include this setup text.', start,
    '## Second block', 'Included response and requirements.', end, 'Excluded references.',
  ].join('\n'));
  await write(`${example}/${requestFile}`, JSON.stringify({
    name: 'Lookup', handle: 'lookup', resourceType: 'request',
    address: `https://${hostname}/admin/api/2026-10/graphql.json?x=1#fragment`,
    other: 'https://another-shop.myshopify.com/path',
    nested: `https://sub.${hostname}/path`, suffixed: `https://${hostname}.example.com/path`,
    code: `const url = "https://${hostname}/";`,
  }, null, 2));
  await write(`${example}/${widgetFile}`, '{"name":"Display", "resourceType":"widget"}');
  await write(`${example}/resources/requests/unselected.json`, 'not valid JSON');
  await write(`${example}/answer.md`, 'Excluded community answer.');
  await write(`${example}/create-resources.sh`, 'Excluded installer.');
  await write('examples/unselected/README.md', `# Never selected\n${start}\nHidden example\n${end}`);
  return {root, write, manifest, output: path.join(root, 'docs/knowledgebase/apiEaseExamplesConsolidated.md')};
}

test('explicit selection, block order, normalized output, and untouched source bytes', async (t) => {
  const f = await fixture(t);
  const sourcePaths = ['README.md', requestFile, widgetFile, 'resources/requests/unselected.json', 'answer.md', 'create-resources.sh'];
  const before = await Promise.all(sourcePaths.map((file) => fs.readFile(path.join(f.root, example, file))));
  const result = await buildKnowledgeBase({repoRoot: f.root});
  assert.equal(result.sectionCount, 3);
  assert.deepEqual(result.text.match(/^https:\/\/github[^\n]+/gm),
    ['README.md', requestFile, widgetFile].map((file) => `${SOURCE_ROOT}${example}/${file}`));
  assert.equal(result.text.match(/^# Fixture title$/gm).length, 1);
  assert.ok(result.text.indexOf('## First block') < result.text.indexOf('## Second block'));
  assert.match(result.text, /TITLE\nLookup \(request\)/);
  assert.match(result.text, /TITLE\nDisplay \(widget\)/);
  assert.match(result.text, /https:\/\/yourstore\.myshopify\.com\/admin\/api\/2026-10\/graphql\.json\?q=1#result/);
  assert.match(result.text, /const url = "https:\/\/yourstore\.myshopify\.com\/apps\/apiease"/);
  assert.ok(result.text.includes('The development host is yourstore.myshopify.com.'));
  assert.match(result.text, /\[literal\]\(\.\.\/unchanged\.md\)/);
  assert.ok(result.text.includes(`[Request](${SOURCE_ROOT}${example}/${requestFile}#details)`));
  assert.doesNotMatch(result.text, /Excluded|Hidden example|not valid JSON|apiease-kb:/);
  const jsonBlocks = [...result.text.matchAll(/```json\n([\s\S]*?)\n```/g)];
  const resource = JSON.parse(jsonBlocks[0][1]);
  assert.equal(resource.address, 'https://yourstore.myshopify.com/admin/api/2026-10/graphql.json?x=1#fragment');
  assert.equal(resource.other, 'https://another-shop.myshopify.com/path');
  assert.equal(resource.nested, `https://sub.${hostname}/path`);
  assert.equal(resource.suffixed, `https://${hostname}.example.com/path`);
  assert.equal(resource.code, 'const url = "https://yourstore.myshopify.com/";');
  for (let index = 0; index < sourcePaths.length; index += 1) {
    assert.deepEqual(await fs.readFile(path.join(f.root, example, sourcePaths[index])), before[index]);
  }
  assert.equal((await generateKnowledgeBaseText({repoRoot: f.root})).text, result.text);
  assert.equal((await buildKnowledgeBase({repoRoot: f.root})).text, result.text);
});

test('manifest order wins over directory order and README is never included implicitly', async (t) => {
  const f = await fixture(t);
  await f.write('examples/aaa/README.md', `# Earlier alphabetically\n${start}\nOther content\n${end}`);
  await f.manifest([
    {path: example, files: [widgetFile, requestFile]},
    {path: 'examples/aaa', files: ['README.md']},
  ]);
  const result = await generateKnowledgeBaseText({repoRoot: f.root});
  assert.deepEqual(result.text.match(/^https:\/\/github[^\n]+/gm), [
    `${SOURCE_ROOT}${example}/${widgetFile}`, `${SOURCE_ROOT}${example}/${requestFile}`,
    `${SOURCE_ROOT}examples/aaa/README.md`,
  ]);
  assert.doesNotMatch(result.text, /Fixture title|First block/);
  await f.manifest([]);
  assert.equal((await generateKnowledgeBaseText({repoRoot: f.root})).text, '');
});

test('multiple blocks omit outside text and markers, including with CRLF input', () => {
  const result = extractReadme(`# Title\r\nOutside\r\n${start}\r\nOne\r\n${end}\r\nSkip\r\n${start}\r\nTwo\r\n${end}`, 'README.md');
  assert.deepEqual(result, {title: 'Title', body: '# Title\n\nOne\n\nTwo'});
});

test('fenced and inline marker examples are literal, not curation directives', () => {
  const result = extractReadme([
    '# Title', '```markdown', start, 'Not included', end, '```',
    start, 'Included', '~~~~markdown', start, '```', end, '~~~~',
    `Literal \`${start}\` in prose.`, end,
  ].join('\n'), 'README.md');
  assert.doesNotMatch(result.body, /Not included/);
  assert.ok(result.body.includes(`~~~~markdown\n${start}\n\`\`\`\n${end}\n~~~~`));
  assert.ok(result.body.includes(`Literal \`${start}\` in prose.`));
  assert.throws(() => extractReadme(`# Title\n\`\`\`md\n${start}\nText\n${end}\n\`\`\``, 'README.md'), /no knowledge base blocks/);
});

test('a block beginning with indented code keeps its indentation and literal links', () => {
  const {body} = extractReadme(`# Title\n${start}\n\n    [Code](../literal.md)\n\n${end}`, 'README.md');
  assert.equal(body, '# Title\n\n    [Code](../literal.md)');
  assert.equal(canonicalizeLinks(body, `${SOURCE_ROOT}examples/README.md`), body);
});

for (const [label, input, expected] of [
  ['absent', 'Unmarked prose', /no knowledge base blocks/],
  ['unmatched start', `${start}\nText`, /unmatched start/],
  ['unmatched end', `${end}`, /unmatched end/],
  ['nested', `${start}\nText\n${start}\nMore\n${end}\n${end}`, /nested/],
  ['empty', `${start}\n \n${end}`, /empty/],
  ['comment-only', `${start}\n<!-- no knowledge -->\n${end}`, /empty/],
  ['inline start', `prefix ${start}\nText\n${end}`, /standalone/],
  ['inline end', `${start}\nText\n${end} suffix`, /standalone/],
  ['unknown marker', '<!-- apiease-kb:stop -->', /standalone/],
  ['title in block', `${start}\n# Other title\nText\n${end}`, /title outside/],
  ['unclosed fence', `${start}\nText\n\`\`\`js\n${end}`, /unmatched start/],
]) {
  test(`reject ${label} markers with file context`, () => {
    assert.throws(() => extractReadme(`# Title\n${input}`, 'examples/bad/README.md'),
      (error) => error.message.includes('examples/bad/README.md') && expected.test(error.message));
  });
}

test('rewrite prose destinations while preserving code, labels, link titles, and absolute URLs', () => {
  const source = `${SOURCE_ROOT}examples/shopify/fixture/README.md`;
  const markdown = [
    '[Inline](../other/README.md?mode=1#section "title")',
    '[Anchor](#response)', '[Root](/CUSTOM_README.md)',
    '[Angle](<assets/file name.png>)', '![Image](assets/diagram.png)',
    '[Parentheses](assets/a(b).md)', '[Escaped](assets/a\\(b\\).md)',
    '[Reference][ref]', '[ref]: ../other/README.md#anchor "Reference title"',
    '<a href="./other.md#html">HTML</a> <img src="assets/image.png">',
    '[Absolute](https://example.com/path#fragment)', '[Mail](mailto:hello@example.com)',
    '`[Inline code](../unchanged.md)`', '``[Ticks](./unchanged.md) ` inside``',
    '```md', '[Fenced](../unchanged.md)', '```',
    '~~~md', '[Tilde fence](../unchanged.md)', '~~~',
    '    [Indented](../unchanged.md)', '<!-- [Comment](../unchanged.md) -->',
  ].join('\n');
  const output = canonicalizeLinks(markdown, source);
  assert.ok(output.includes(`[Inline](${SOURCE_ROOT}examples/shopify/other/README.md?mode=1#section "title")`));
  assert.ok(output.includes(`[Anchor](${source}#response)`));
  assert.ok(output.includes(`[Root](${SOURCE_ROOT}CUSTOM_README.md)`));
  assert.ok(output.includes(`[Angle](<${SOURCE_ROOT}examples/shopify/fixture/assets/file%20name.png>)`));
  assert.ok(output.includes(`![Image](${SOURCE_ROOT}examples/shopify/fixture/assets/diagram.png)`));
  assert.equal(output.match(/assets\/a%28b%29.md/g).length, 2);
  assert.ok(output.includes(`[ref]: ${SOURCE_ROOT}examples/shopify/other/README.md#anchor "Reference title"`));
  assert.ok(output.includes(`<a href="${SOURCE_ROOT}examples/shopify/fixture/other.md#html">HTML</a>`));
  for (const line of markdown.split('\n').filter((line) => /unchanged|Absolute|Mail/.test(line))) {
    assert.ok(output.includes(line), `Changed code or absolute destination: ${line}`);
  }
});

for (const [label, entries, expected] of [
  ['duplicate examples', [{path: example, files: ['README.md']}, {path: example, files: [requestFile]}], /duplicate example/],
  ['duplicate files', [{path: example, files: ['README.md', 'README.md']}], /duplicate file/],
  ['missing file', [{path: example, files: ['resources/requests/missing.json']}], /missing file/],
  ['missing example', [{path: 'examples/missing', files: ['README.md']}], /missing directory/],
  ['parent example', [{path: 'examples/../../outside', files: ['README.md']}], /relative POSIX path/],
  ['parent file', [{path: example, files: ['../README.md']}], /relative POSIX path/],
  ['absolute example', [{path: '/tmp/example', files: ['README.md']}], /relative POSIX path/],
  ['absolute file', [{path: example, files: ['/tmp/README.md']}], /relative POSIX path/],
  ['backslashes', [{path: example, files: ['resources\\requests\\lookup.json']}], /relative POSIX path/],
  ['outside examples', [{path: 'docs/example', files: ['README.md']}], /inside examples/],
  ['resource traversal', [{path: example, files: ['resources/requests/../../README.md']}], /relative POSIX path/],
  ['unsupported answer', [{path: example, files: ['answer.md']}], /select README.md or JSON/],
  ['unsupported installer', [{path: example, files: ['create-resources.sh']}], /select README.md or JSON/],
  ['unsupported JSON directory', [{path: example, files: ['private/file.json']}], /configured resource directory/],
  ['empty files', [{path: example, files: []}], /nonempty array/],
]) {
  test(`manifest rejects ${label} and preserves the previous output`, async (t) => {
    const f = await fixture(t);
    const previous = await buildKnowledgeBase({repoRoot: f.root});
    await f.manifest(entries);
    await assert.rejects(buildKnowledgeBase({repoRoot: f.root}), expected);
    assert.equal(await fs.readFile(f.output, 'utf8'), previous.text);
  });
}

test('manifest schema, resource JSON, and late README validation fail before replacement', async (t) => {
  const f = await fixture(t);
  await buildKnowledgeBase({repoRoot: f.root});
  const previous = await fs.readFile(f.output);
  for (const bad of ['{', '{}', '[]', '{"examples": "all"}', '{"examples": [], "includeAll": true}']) {
    await f.write('docs/knowledgebase/examples.json', bad);
    await assert.rejects(buildKnowledgeBase({repoRoot: f.root}));
    assert.deepEqual(await fs.readFile(f.output), previous);
  }
  await f.manifest();
  await f.write(`${example}/${widgetFile}`, '{bad json}');
  await assert.rejects(buildKnowledgeBase({repoRoot: f.root}), /display.json.*cannot read JSON/);
  assert.deepEqual(await fs.readFile(f.output), previous);
  await f.manifest([{path: example, files: [requestFile, 'README.md']}]);
  await f.write(`${example}/README.md`, '# No blocks\nDo not silently include this.');
  await assert.rejects(buildKnowledgeBase({repoRoot: f.root}), /no knowledge base blocks/);
  assert.deepEqual(await fs.readFile(f.output), previous);
});

test('symlink escapes and aliases are rejected at example, file, and resource boundaries', async (t) => {
  const f = await fixture(t);
  await f.write('private/README.md', `# Outside\n${start}\nSecret\n${end}`);
  await fs.symlink(path.join(f.root, 'private'), path.join(f.root, 'examples/escape'));
  await f.manifest([{path: 'examples/escape', files: ['README.md']}]);
  await assert.rejects(generateKnowledgeBaseText({repoRoot: f.root}), /escapes/);
  await fs.symlink(path.join(f.root, 'private/README.md'), path.join(f.root, example, 'resources/requests/escape.json'));
  await f.manifest([{path: example, files: ['resources/requests/escape.json']}]);
  await assert.rejects(generateKnowledgeBaseText({repoRoot: f.root}), /escapes/);
  await fs.symlink(path.join(f.root, example, widgetFile), path.join(f.root, example, 'resources/requests/widget-alias.json'));
  await f.manifest([{path: example, files: ['resources/requests/widget-alias.json']}]);
  await assert.rejects(generateKnowledgeBaseText({repoRoot: f.root}), /resource path escapes/);
  await fs.symlink(path.join(f.root, example, requestFile), path.join(f.root, example, 'resources/requests/alias.json'));
  await f.manifest([{path: example, files: [requestFile, 'resources/requests/alias.json']}]);
  await assert.rejects(generateKnowledgeBaseText({repoRoot: f.root}), /duplicate file/);
  await fs.symlink(path.join(f.root, example), path.join(f.root, 'examples/alias'));
  await f.manifest([{path: example, files: [requestFile]}, {path: 'examples/alias', files: [widgetFile]}]);
  await assert.rejects(generateKnowledgeBaseText({repoRoot: f.root}), /duplicate example/);
});

test('CLI build/check works outside the repo; missing and stale checks write nothing', async (t) => {
  const f = await fixture(t);
  const script = path.join(f.root, 'scripts/knowledgebase/buildApiEaseExamplesKnowledgeBase.js');
  const cli = (...args) => run(process.execPath, [script, ...args], {cwd: os.tmpdir()});
  const directory = path.dirname(f.output);
  const initialFiles = await fs.readdir(directory);
  await assert.rejects(cli('--check'), (error) => error.code === 1 && /missing or stale/.test(error.stderr));
  assert.deepEqual(await fs.readdir(directory), initialFiles);
  assert.match((await cli()).stdout, /built \(3 file\(s\)\)/);
  const previous = await fs.readFile(f.output);
  const before = await fs.stat(f.output);
  assert.match((await cli('--check')).stdout, /is current/);
  assert.equal((await fs.stat(f.output)).mtimeMs, before.mtimeMs);
  await f.write(`${example}/${widgetFile}`, '{"name":"Changed", "resourceType":"widget"}');
  await assert.rejects(cli('--check'), (error) => error.code === 1 && /missing or stale/.test(error.stderr));
  assert.deepEqual(await fs.readFile(f.output), previous);
  assert.equal((await fs.stat(f.output)).mtimeMs, before.mtimeMs);
  await cli();
  await cli('--check');
  await assert.rejects(cli('--unknown'), (error) => error.code === 1 && /Usage:/.test(error.stderr));
  assert.equal((await fs.readdir(directory)).filter((file) => file.endsWith('.tmp')).length, 0);
});

test('real bundle enrolls discount and product-import knowledge and excludes setup/reference material', async () => {
  const result = await generateKnowledgeBaseText();
  const selected = JSON.parse(await fs.readFile(path.join(repoRoot, 'docs/knowledgebase/examples.json'), 'utf8'));
  assert.deepEqual(selected.examples.map((entry) => entry.path), [
    'examples/shopify/discount-codes/details',
    'examples/shopify/products/import-between-stores',
    'examples/shopify/products/import-between-stores/source',
    'examples/shopify/products/import-between-stores/destination',
  ]);
  assert.equal(result.sectionCount, 62);
  const sources = result.text.match(/^https:\/\/github[^\n]+/gm);
  assert.deepEqual(sources, selected.examples.flatMap((entry) => entry.files.map((file) =>
    `${SOURCE_ROOT}${entry.path}/${file}`)));
  assert.doesNotMatch(result.text, /Beginner-friendly steps|Official links|When to extend|Installation boundary|Use these examples in a project|apiease-kb:|answer\.md|create-resources\.sh|store-apiease-admin-local/);
  assert.match(result.text, /read_discounts/);
  assert.match(result.text, /Configure the Storefront App Proxy trigger separately/);
  assert.match(result.text, /Authorization stays server-side/);
  assert.match(result.text, /yourstore\.myshopify\.com/);
  assert.match(result.text, /store-apiease-admin-staging\.myshopify\.com/);
  assert.match(result.text, /same entry point with/);
  assert.match(result.text, /not an atomic/);
  assert.match(result.text, /Supplementary references outside the active cycle/);
  assert.match(result.text, /https:\/\/github\.com\/APIEase\/apiease-examples\/blob\/main\/examples\/shopify\/products\/import-between-stores\/source\/resources\/requests\/seed-product-import-test\.json/);
});
