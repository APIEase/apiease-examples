# Custom README

This repository contains APIEase examples. Its curated knowledge base packages selected explanations and resource definitions so Apex can borrow concrete patterns when building store needs. The current selection includes the [Shopify discount-code details example](examples/shopify/discount-codes/details/README.md) and the [connected product import lifecycle](examples/shopify/products/import-between-stores/README.md).

The product-import catalogue includes all 28 active workflow handles and three supplementary references from the verified staging-to-local work. Its [source package](examples/shopify/products/import-between-stores/source/README.md) contains 26 requests; its [destination package](examples/shopify/products/import-between-stores/destination/README.md) contains 26 active requests plus the three supplementary requests. These 55 JSON files preserve the original sources byte for byte. Duplicate handles across packages are intentional: each store needs its own dependencies and several coordinators have different identity and recovery logic. Do not merge both packages into one project.

The marked explanations cover contracts, dependencies, fixture-specific policies, caller-owned persistence, duplicate-scan cost, image readiness, and cleanup recovery. They distinguish the original successful live cycle from controlled failure tests and catalogue-only checks. [Copy provenance and verification summary](test/evidence/product-import-catalogue.json) remain outside the generated knowledge base; the reusable explanations and every selected request are enrolled explicitly. Store bindings, secure configuration, and raw run manifests are not copied.

## Build and check the examples knowledge base

Use Node.js 18 or newer; no dependency installation is required. From the repository root:

```bash
node scripts/knowledgebase/buildApiEaseExamplesKnowledgeBase.js
node --test test/examples-knowledgebase.test.js
node scripts/knowledgebase/buildApiEaseExamplesKnowledgeBase.js --check
```

You can also use `npm run knowledge:build` to build the examples bundle and `npm run knowledge:check` to check it.

Knowledge base content lives in `docs/knowledgebase/`, alongside the imported product documentation. The builder reads [docs/knowledgebase/examples.json](docs/knowledgebase/examples.json) and writes [docs/knowledgebase/apiEaseExamplesConsolidated.md](docs/knowledgebase/apiEaseExamplesConsolidated.md). Never edit the generated bundle manually. Rebuild and check after changing selected content, markers, the manifest, or the builder. Run all repository tests with `node --test test/*.test.js`.

The bundle follows the public docs consolidation format: one `SOURCE`, `TITLE`, and `CONTENT` section per selected file, in manifest order. Sources point to `https://github.com/APIEase/apiease-examples/blob/main/`, the repository's canonical origin and main branch. The builder pins that base so forks, source archives, working directories, and local Git configuration do not change generated content.

README content contains its top-level heading once, then its marked blocks in document order, separated by blank lines. Resource files appear in JSON fences and have titles derived from their display name and resource type. Relative prose links (including reference definitions, images, and HTML link/image attributes) resolve against the original file, preserving query strings and fragments. Root-relative file links resolve against the repository root. Absolute links and code examples are preserved.

Generation replaces the exact development hostname `store-apiease-admin-local.myshopify.com` with `yourstore.myshopify.com` in emitted README prose, code examples, and resource JSON. It preserves the surrounding URL, API version, and code, leaves other Shopify domains alone, and never modifies source resource files.

`--check` regenerates the expected content in memory, compares it byte for byte, and exits unsuccessfully if the bundle is missing or stale. It writes nothing. A normal build validates all selections and content before atomically replacing the bundle, so a validation failure preserves the previous output. Neither mode uses timestamps or machine-specific paths in the bundle.

## Curate README content

Keep one top-level `#` title outside the markers. Put paired comments on their own lines, outside fenced code:

```markdown
# Example title

<!-- apiease-kb:start -->
Explain the problem, resource roles, execution flow, inputs, responses,
and relevant requirements or limitations here.
<!-- apiease-kb:end -->

## Installation
Keep setup instructions outside included blocks.

<!-- apiease-kb:start -->
## Response examples
Additional subject-specific knowledge can live in a later block.
<!-- apiease-kb:end -->
```

Multiple blocks are supported; nested, unmatched, or empty blocks fail validation. Markers inside fenced code are literal examples, not directives. A selected README without blocks fails instead of importing the whole document. Keep reference-link definitions needed by included prose inside included blocks.

Include useful constraints such as access scopes, server-side authorization, separate trigger configuration, supported resource types, and response limits. Move these into an included explanation if they are buried in installation steps or “Important notes.” Keep the original README readable and avoid duplicating information solely for the bundle. Installation walkthroughs, generic reminders, promotional content, and reference-link collections stay outside the blocks.

## Add or remove examples

1. Curate the example's README with markers and review its resource files.
2. Add an entry to `docs/knowledgebase/examples.json`. Its `path` must be a directory below `examples/`, relative to the repository root. Its `files` array lists `README.md` and/or individual JSON paths relative to that example, under resource directories defined in `apiease.config.js`.
3. Order entries and files as they should appear in the bundle. Only explicitly listed files participate. Markers alone never enroll an example; new examples, other resources, `answer.md`, and `create-resources.sh` are not automatically included.
4. To remove a file, delete its selection; to remove an example, delete its manifest entry. Source examples can remain in the repository. An empty `examples` array produces an empty bundle.
5. Rebuild, run the focused tests, run `--check`, and review the manifest/source changes together with the generated diff.

Paths use forward slashes and may not contain absolute, empty, `.` or `..` segments. Missing files, duplicate selections (including symlink aliases), invalid JSON, and paths or symlinks escaping permitted directories fail with a diagnostic.

The manifest enrolls the discount-code details README, two requests and widget, plus the product-import overview, both role READMEs and all 55 request files. Importing this bundle into `../apiease` and wiring it into the assistant remain separate consumer-integration work.
