const fs = require('node:fs/promises');
const path = require('node:path');
const {randomUUID} = require('node:crypto');

const REPO_ROOT = path.resolve(__dirname, '../..');
const OUTPUT_NAME = 'apiEaseExamplesConsolidated.md';
// Canonical origin and branch, independent of a contributor's fork or checkout path.
const SOURCE_ROOT = 'https://github.com/APIEase/apiease-examples/blob/main/';

function normalizeDomain(text) {
  // Match the exact hostname, not another shop, subdomain, or hostname suffix.
  return text.replace(/(?<![\w.-])store-apiease-admin-local\.myshopify\.com(?![\w-]|\.[\w-])/g,
    'yourstore.myshopify.com');
}

function fail(file, message) {
  throw new Error(`${file}: ${message}`);
}

function validatePath(value, label) {
  if (typeof value !== 'string' || !value || /[\\\x00-\x1f\x7f]/.test(value)
    || value.split('/').some((part) => !part || part === '.' || part === '..')
    || /^[a-z]:/i.test(value)) {
    fail(label, 'expected a relative POSIX path without empty, dot, or parent segments');
  }
  return value;
}

function within(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..'
    && !relative.startsWith(`..${path.sep}`));
}

async function resolveInside(parent, relative, type, label = relative) {
  let resolved;
  try {
    resolved = await fs.realpath(path.join(parent, relative));
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') fail(label, `missing ${type}`);
    throw error;
  }
  if (!within(parent, resolved)) fail(label, 'path escapes its permitted directory (including symlinks)');
  const stat = await fs.stat(resolved);
  if (type === 'file' ? !stat.isFile() : !stat.isDirectory()) fail(label, `expected a ${type}`);
  return resolved;
}

async function readJson(file, label) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    fail(label, error.code === 'ENOENT' ? 'missing file' : `cannot read JSON: ${error.message}`);
  }
}

function onlyKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some((key) => !keys.includes(key))) {
    fail(label, `expected an object with only ${keys.join(', ')}`);
  }
}

async function selectedFiles(repoRoot) {
  const manifest = await readJson(path.join(repoRoot, 'docs/knowledgebase/examples.json'), 'examples.json');
  onlyKeys(manifest, ['examples'], 'examples.json');
  if (!Array.isArray(manifest.examples)) fail('examples.json', 'examples must be an array');

  const config = require(path.join(repoRoot, 'apiease.config.js')).resources;
  if (!config) fail('apiease.config.js', 'missing resources configuration');
  const resourceRoot = validatePath(config.rootDirectory, 'resources.rootDirectory');
  const resourceDirectories = ['requests', 'widgets', 'variables', 'functions'].map((type) =>
    `${resourceRoot}/${validatePath(config[`${type}Directory`], `resources.${type}Directory`)}`);
  const examplesRoot = await resolveInside(repoRoot, 'examples', 'directory');
  const seenExamples = new Set();
  const seenFiles = new Set();
  const files = [];

  for (const entry of manifest.examples) {
    onlyKeys(entry, ['path', 'files'], 'examples.json entry');
    const example = validatePath(entry.path, 'example path');
    if (!example.startsWith('examples/')) fail(example, 'example must be inside examples/');
    const exampleRoot = await resolveInside(examplesRoot, example.slice('examples/'.length), 'directory', example);
    if (seenExamples.has(exampleRoot)) fail(example, 'duplicate example selection');
    seenExamples.add(exampleRoot);
    if (!Array.isArray(entry.files) || !entry.files.length) fail(example, 'files must be a nonempty array');

    for (const selection of entry.files) {
      const file = validatePath(selection, `${example} file`);
      const label = `${example}/${file}`;
      const resourceDirectory = resourceDirectories.find((dir) => file.startsWith(`${dir}/`));
      if (file !== 'README.md' && !(resourceDirectory && file.endsWith('.json'))) {
        fail(label, 'select README.md or JSON inside a configured resource directory');
      }
      const filePath = await resolveInside(exampleRoot, file, 'file', label);
      if (resourceDirectory) {
        const permittedRoot = await resolveInside(exampleRoot, resourceDirectory, 'directory', label);
        if (!within(permittedRoot, filePath)) fail(label, 'resource path escapes its permitted directory');
      }
      if (seenFiles.has(filePath)) fail(label, 'duplicate file selection (including symlinks)');
      seenFiles.add(filePath);
      files.push({filePath, label, readme: file === 'README.md'});
    }
  }
  return files;
}

// Track fenced and indented code before looking for curation comments or prose links.
function markdownLines(text) {
  let fence = null;
  return text.split('\n').map((line) => {
    if (fence) {
      if (new RegExp(`^ {0,3}${fence.character}{${fence.length},}[ \\t]*$`).test(line)) fence = null;
      return {line, code: true};
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opening && !(opening[1][0] === '`' && opening[2].includes('`'))) {
      fence = {character: opening[1][0], length: opening[1].length};
      return {line, code: true};
    }
    return {line, code: /^(?: {4}|\t)/.test(line)};
  });
}

function escaped(text, index) {
  let slashes = 0;
  while (text[--index] === '\\') slashes += 1;
  return slashes % 2 === 1;
}

function maskCode(text) {
  const blank = (value) => value.replace(/[^\n]/g, ' ');
  let masked = markdownLines(text).map(({line, code}) => code ? blank(line) : line).join('\n');
  // Inline code spans can cross line boundaries and can use multiple backticks.
  const ticks = /`+/g;
  let match;
  while ((match = ticks.exec(masked))) {
    if (escaped(masked, match.index)) continue;
    const closing = new RegExp(`(?<!\x60)\x60{${match[0].length}}(?!\x60)`, 'g');
    closing.lastIndex = ticks.lastIndex;
    const end = closing.exec(masked);
    if (!end) continue;
    const stop = end.index + end[0].length;
    masked = masked.slice(0, match.index) + blank(masked.slice(match.index, stop)) + masked.slice(stop);
    ticks.lastIndex = stop;
  }
  return masked;
}

function extractReadme(raw, file) {
  const text = raw.replace(/\r\n?/g, '\n');
  const visible = maskCode(text).split('\n');
  const blocks = [];
  let active = null;
  let title = null;
  let startLine;
  text.split('\n').forEach((line, index) => {
    const prose = visible[index];
    const marker = prose.match(/^ {0,3}<!-- apiease-kb:(start|end) -->[ \t]*$/);
    const location = `${file}:${index + 1}`;
    if (!marker && /<!--\s*apiease-kb:/.test(prose)) {
      fail(location, 'markers must be standalone <!-- apiease-kb:start --> or <!-- apiease-kb:end --> comments');
    }
    if (marker) {
      if (marker[1] === 'start') {
        if (active !== null) fail(location, 'nested knowledge base block');
        active = [];
        startLine = index + 1;
      } else {
        if (active === null) fail(location, 'unmatched end marker');
        // Trim blank lines, not indentation belonging to a code example.
        while (active.length && !active[0].trim()) active.shift();
        while (active.length && !active.at(-1).trim()) active.pop();
        const block = active.join('\n');
        if (!block.replace(/<!--[\s\S]*?-->/g, '').trim()) fail(location, 'empty knowledge base block');
        blocks.push(block);
        active = null;
      }
      return;
    }
    if (/^ {0,3}#\s+\S/.test(prose)) {
      if (active !== null) fail(location, 'keep the top-level title outside knowledge base blocks');
      if (title !== null) fail(location, 'expected only one top-level title');
      title = line.trim().replace(/^#\s+/, '').replace(/\s+#+\s*$/, '').trim();
    }
    if (active !== null) active.push(line);
  });
  if (active !== null) fail(`${file}:${startLine}`, 'unmatched start marker (check for an unclosed code fence)');
  if (!blocks.length) fail(file, 'README has no knowledge base blocks; whole-file inclusion is never allowed');
  if (!title) fail(file, 'README needs a top-level # title outside the blocks');
  return {title, body: `# ${title}\n\n${blocks.join('\n\n')}`};
}

// A small Markdown destination scanner: inline links/images and reference definitions.
// Edits only destination offsets, leaving code, labels, whitespace, and titles intact.
function destinationAt(text, index) {
  if (text[index] === '<') {
    const end = text.indexOf('>', index + 1);
    if (end === -1 || text.slice(index, end).includes('\n')) return null;
    return {start: index + 1, end, after: end + 1};
  }
  const start = index;
  let depth = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === '\\') { index += 2; continue; }
    if (/\s/.test(char)) break;
    if (char === '(') depth += 1;
    if (char === ')') {
      if (depth === 0) break;
      depth -= 1;
    }
    index += 1;
  }
  return index > start && depth === 0 ? {start, end: index, after: index} : null;
}

function canonicalizeLinks(body, sourceUrl) {
  const visible = maskCode(body).replace(/<!--[\s\S]*?-->/g, (value) => value.replace(/[^\n]/g, ' '));
  const replacements = new Map();
  function add(destination) {
    if (!destination) return;
    const {start, end} = destination;
    const target = body.slice(start, end).replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, '$1');
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) return;
    const url = target.startsWith('/')
      ? new URL(target.slice(1), SOURCE_ROOT).href
      : new URL(target, sourceUrl).href;
    // Parentheses and spaces must remain safe in an unbracketed Markdown destination.
    replacements.set(start, {start, end, url: url.replace(/\(/g, '%28').replace(/\)/g, '%29')});
  }
  for (const match of visible.matchAll(/\]\(\s*/g)) {
    if (escaped(visible, match.index) || !visible.slice(0, match.index).includes('[')) continue;
    const destination = destinationAt(visible, match.index + match[0].length);
    if (destination && /^(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^\n)]*\)))?\s*\)/.test(visible.slice(destination.after))) {
      add(destination);
    }
  }
  for (const match of visible.matchAll(/^ {0,3}\[[^\]\n]+\]:[ \t]*(?:\n[ \t]*)?/gm)) {
    add(destinationAt(visible, match.index + match[0].length));
  }
  // HTML links/images in prose are also relative to the original README.
  for (const tag of visible.matchAll(/<(?:a|img)\b[^>]*>/gi)) {
    for (const attribute of tag[0].matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)) {
      const start = tag.index + attribute.index + attribute[0].indexOf(attribute[1]) + 1;
      add({start, end: start + attribute[2].length});
    }
  }
  for (const {start, end, url} of [...replacements.values()].sort((a, b) => b.start - a.start)) {
    body = body.slice(0, start) + url + body.slice(end);
  }
  return body;
}

async function generateKnowledgeBaseText({repoRoot = REPO_ROOT} = {}) {
  repoRoot = await fs.realpath(repoRoot);
  const files = await selectedFiles(repoRoot);
  const sections = [];
  for (const {filePath, label, readme} of files) {
    const sourceUrl = SOURCE_ROOT + label.split('/').map(encodeURIComponent).join('/');
    const raw = await fs.readFile(filePath, 'utf8');
    let title;
    let body;
    if (readme) {
      ({title, body} = extractReadme(raw, label));
      body = canonicalizeLinks(body, sourceUrl);
    } else {
      const resource = await readJson(filePath, label);
      if (!resource || typeof resource !== 'object' || Array.isArray(resource)) fail(label, 'expected a resource JSON object');
      const name = typeof resource.name === 'string' && resource.name.trim()
        ? resource.name.trim() : path.basename(label, '.json');
      const kind = typeof resource.resourceType === 'string' && resource.resourceType.trim()
        ? resource.resourceType.trim() : path.posix.basename(path.posix.dirname(label));
      title = `${name} (${kind})`.replace(/\s+/g, ' ');
      body = `\`\`\`json\n${raw.replace(/\r\n?/g, '\n').trim()}\n\`\`\``;
    }
    sections.push(['SOURCE', sourceUrl, '', 'TITLE', normalizeDomain(title), '', 'CONTENT', normalizeDomain(body), ''].join('\n'));
  }
  return {
    outputPath: path.join(repoRoot, 'docs/knowledgebase', OUTPUT_NAME),
    sectionCount: files.length,
    text: sections.join('\n'),
  };
}

async function buildKnowledgeBase({check = false, repoRoot = REPO_ROOT} = {}) {
  // Complete validation and rendering before even opening an output file for writing.
  const result = await generateKnowledgeBaseText({repoRoot});
  const {outputPath, text} = result;
  if (check) {
    let existing = null;
    try { existing = await fs.readFile(outputPath, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (existing !== text) throw new Error('Examples knowledge base is missing or stale. Run node scripts/knowledgebase/buildApiEaseExamplesKnowledgeBase.js');
  } else {
    const temporaryPath = `${outputPath}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporaryPath, text, {encoding: 'utf8', flag: 'wx'});
      await fs.rename(temporaryPath, outputPath);
    } finally {
      await fs.rm(temporaryPath, {force: true});
    }
  }
  return result;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check') || args.length > 1) {
    console.error('Usage: node scripts/knowledgebase/buildApiEaseExamplesKnowledgeBase.js [--check]');
    process.exitCode = 1;
  } else {
    buildKnowledgeBase({check: args.includes('--check')}).then(({sectionCount}) => {
      console.log(`Examples knowledge base ${args.includes('--check') ? 'is current' : 'built'} (${sectionCount} file(s)).`);
    }).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  }
}

module.exports = {SOURCE_ROOT, buildKnowledgeBase, generateKnowledgeBaseText, extractReadme, canonicalizeLinks};
