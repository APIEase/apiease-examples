# Import Shopify Products Between Two Stores With Durable Continuations

<!-- apiease-kb:start -->
This connected example teaches how saved APIEase requests read complete products
from one Shopify store, prevent exact-handle or exact-SKU duplicates in another,
create draft products, observe populated images, and recover or clean up a test
run. Apex can borrow the readers, mapping, matching, continuation, and failure
handling patterns when implementing a merchant's requirements.

The reference scenario is a **test lifecycle**, not a general synchronization or
upsert service. Its `Staging Products` title prefix, exact run tag, four fixtures,
draft status, and default maximum of three are explicit example policies. Choose
the merchant's actual selection, inventory, publication, and duplicate policies
before adapting them. A catalogue example supplies knowledge, not authority to
create or delete products in a customer's store.

## Architecture and store boundaries

**As provided, this example requires APIEase to be installed in both the source
and destination Shopify stores.** Each store runs its own saved requests and
uses its own APIEase connection and Shopify permissions.

```text
Authenticated operator / durable caller
  -> Source project: seed fixtures -> read complete eligible products
  -> Destination project: import reader output -> observe images -> verify data
  -> Each project: cleanup only its recorded, run-owned test product IDs
```

The [source package](source/README.md) has 26 requests for the source store.
The [destination package](destination/README.md) has 26 active requests plus three
supplementary references. There are 28 unique active handles across the packages.
Each package contains its own dependencies; a Liquid `call` resolves a handle in
that same store. Do not merge both packages into one resource directory: several
identically named coordinators contain different store identity and recovery logic.

The operator passes the successful reader's data to the destination importer.
The importer does not fetch source data implicitly. Shopify HTTP leaves use
APIEase's automatic authentication for their bound shop, with no explicit
`X-Shopify-Access-Token` header. Source credentials never become destination
Shopify credentials. Product read/write and inventory read/write grants are
required for the complete lifecycle; `read_inventory` also permits the default
location read. Identity and location reads must succeed before writes.

The checked-in JSON preserves the verified source exactly, including public shop
identities and API version `2026-10`. Its source store is
`store-apiease-admin-staging.myshopify.com` and destination is
`store-apiease-admin-local.myshopify.com`. The examples bundle normalizes only the
destination hostname to `yourstore.myshopify.com`; the source hostname remains.
These are reference identities, not customer configuration. When adapting copies,
replace each role consistently in HTTP addresses, Liquid identity/provenance
checks, continuation shop values, cleanup inputs, and any connection headers.
Changing only the endpoint will correctly fail the remaining identity guards.
Confirm the installed shop and supported API version rather than assuming them.

## Setup choices and Apex instructions

### APIEase in both stores: the provided example

When helping a merchant use this example, Apex must explain the two-store
requirement and identify which store is the source and which is the destination.
The merchant must send Apex instructions separately in each store's APIEase
environment. One Apex conversation does not configure both environments or grant
access to the other store.

- In the source environment, instruct Apex to configure the source reader and
  its dependencies. Include fixture seeding and source cleanup only when running
  the test lifecycle described here.
- In the destination environment, instruct Apex to configure the importer and
  its dependencies, using the agreed source identity and reader response
  contract. Include destination cleanup for the test lifecycle.

Apex should give the merchant a concrete handoff for the other environment:
the source and destination shop domains, each role's required resources, and the
reader/importer input and output contracts. The authenticated caller must still
transfer the successful reader data and manage the continuations described below;
separate setup conversations do not provide that runtime orchestration.

The optional [source APIEase connection](destination/README.md#supplementary-references-outside-the-active-cycle)
calls a saved request in the source APIEase installation using a source APIEase
API key. It still requires APIEase in both stores and separate source setup.

### APIEase in one store: an adaptation using an external Shopify token

Alternatively, all saved requests and orchestration can run in one APIEase
environment, with HTTP requests calling the other store's Shopify Admin API
directly. That external store does not need APIEase installed. For example, run
the importer in the destination environment and configure source readers there
to call the source store directly; the reverse arrangement is also possible.

The merchant must obtain a Shopify **Admin API access token for the external
store**, issued through an app authorized for that store with the permissions
needed by the selected operations. Follow Shopify's [access-token guidance](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens)
for the app's token acquisition and renewal requirements. Configure that token
as a Sensitive `X-Shopify-Access-Token` header on each HTTP request targeting the
external store. Requests to the installed store can continue using
[APIEase's automatic authentication](https://docs.apiease.com/docs/general/shopify-api/automatic-vs-overridden-shopify-access-tokens).
The installed store's automatic token does not authenticate the external store,
and an APIEase API key is not a Shopify Admin API access token. Apex should direct
the merchant to enter the token securely in the request editor, not in chat or
resource source files.

This is an alternative architecture, not a ready-to-run mode of the supplied
JSON or a verified path of this example. Apex must adapt the requests and their
dependencies for one environment: use distinct handles for source and destination
operations, update all Liquid call references and shop identity/provenance checks,
and configure the external endpoints and tokens. Preserve role-specific state
and cleanup boundaries. Do not merge the packages unchanged or assume changing
only an endpoint supplies cross-store authentication. Apex can prepare this
adaptation in the chosen environment; the merchant still obtains and configures
the external store's token separately.

## Operator contracts

Inputs below are objects supplied through `liquidParamsEmbedded`. Liquid reads
them from `apiEaseParameters.liquidParams`. An invocation returns a native wrapper;
check its status before inspecting the request's `data` payload.

| Handle | Store | Initial input | Result |
| --- | --- | --- | --- |
| `seed-product-import-test` | Source | `{runId}` | Four deterministic draft fixtures, resumable state, outcomes and totals. |
| `read-product-import-test` | Source | `{runId}` | Complete source/run provenance, eligible products, ownership counts and page counts. |
| `import-product-import-test` | Destination | `{runId, source, maximum?}` | Ordered rows, source/destination IDs, resumable state and totals; `source` is the reader's successful data object. |
| `cleanup-product-import-test` | Each separately | `{runId, shop, products:[{productId, shop, runId, marker}]}` | Per-ID deletion, absence, refusal or uncertainty and cleanup totals. |

Use a unique `runId` of 8–48 lowercase ASCII letters, digits, or hyphens. The exact
ownership marker is `apiease-product-import:<runId>`. Handles and SKUs derive from
the run ID. Use one writer per run; the scan-then-create sequence is not an atomic
uniqueness constraint against other concurrent writers.

The reader succeeds with `products:[]` when nothing qualifies. It fails without a
complete product collection if any required product, variant, or image page fails.
Its successful data has this shape (the empty-result example is complete):

```json
{
  "success": true,
  "complete": true,
  "sourceShop": "store-apiease-admin-staging.myshopify.com",
  "runId": "example-run-001",
  "marker": "apiease-product-import:example-run-001",
  "products": [],
  "counts": {"owned": 0, "eligible": 0},
  "pages": {"products": 1, "variants": 0, "images": 0},
  "error": null
}
```

Each nonempty product carries `sourceShop`, `runId`, `marker`, source `id`, title,
handle, description HTML, option names/values, variants with SKU/decimal price/
sellable inventory/selected options, and images with URLs and nullable alt text.
Retain this provenance when passing the complete response to the importer.

## Continuations and outcomes

Seed and import return `success`, `done`, `retryAfterSeconds`, `totals`, `state`,
and `error`. The state carries `shop`, `runId`, `marker`, `maximum`, selected
`products`, `index`, `polls`, `checking`, `active`, and ordered `rows`. Continue the
same entry point with `{runId, state: previous.data.state}` until `done:true`.
Persist the entire state unchanged after every response; do not manufacture or
truncate it, reuse it for another run, or expose it as an unauthenticated write API.

- A non-null `state.checking` means one catalog page was checked. The product
  has not consumed an attempt or reached creation. Continue its saved scan state.
- `state.active.destinationId` is returned immediately after a creation response,
  before image readiness. Persist that ID, its shop, run ID, marker and creation
  outcome before the next invocation. An active recovered seed fixture has
  `writeAttempted:false`; track its recovery separately from original creation.
- Wait the returned `retryAfterSeconds` (3 seconds) before observing active media.
  A complete media observation follows every media page. After at most 20
  observations, readiness failure leaves an `incomplete` row with its ID retained.
- Final rows contain `outcome`, `reason`, `sourceId`, `destinationId`, `shop`,
  `runId`, `marker`, `handle`, `writeAttempted`, `duplicateEvidence`, and
  `mutationErrors`. Outcomes distinguish `created`, `skipped`, `failed`,
  `incomplete`, and `uncertain`. `checking` and `pending` are intermediate states.
- Totals are `selected`, `attempted`, `created`, `skipped`, and `failed`.
  Incomplete and uncertain rows count as failed. `maximum` must be a positive
  integer, defaults to 3, and limits selected attempts, including skips.

`success:true` means a usable result was returned. `done:true` means selected work
has finished; neither guarantees all rows succeeded. A `created` row requires ready
images. Repeated seeding verifies owned fixture fields and readiness, then returns
`skipped`, without counting recovery as new creation.

## Reusable data and matching rules

`product-import-complete-product` assembles detail, variant, and image readers.
The HTTP readers store fixed GraphQL queries in serialized unnamed body parameters;
callers supply object-valued `bodyEmbedded.variables`. Native GraphQL data is under
`result.data.data`; check native status, top-level GraphQL errors, required shapes,
and mutation `userErrors` before dependent work. Every required connection must
end with a valid terminal page; missing or repeating cursors are failures.

`product-import-duplicates` scans the entire destination product and variant
catalog for each selected product, including unrelated products. A whole exact
handle or any exact nonempty SKU causes a skip. Comparisons are case-sensitive;
null/empty candidate SKUs do not match a nonempty expected SKU. Matches remain
provisional until all pages succeed, so a later page failure prevents a write
even when an earlier page matched. The typed exact-value prefilter avoids nested
matcher calls for unrelated SKU rows without skipping their validation.

`product-import-map-input` copies title, handle, description HTML, options, variant
associations, SKUs, decimal price strings, image URLs, and alt text into a draft
`productSet` input. It omits source Shopify IDs and includes the exact ownership
tag in the initial mutation. Each variant's source total sellable
`inventoryQuantity` becomes tracked `available` inventory at the destination's
default location. This is not a per-location inventory transfer or reservation.
No updates, publication, synchronization schedule, or metafield copying are
implemented by this example.

## Durable caller and cleanup responsibilities

The saved requests own mapping, matching, mutations, and readiness decisions. A
caller must invoke them, persist intents/responses/IDs, schedule continuations,
and reconcile uncertain outcomes. No background job or database collection is
created by these JSON files. A plain sequence of four single calls is insufficient.

Before cleanup, use the paginated owned-product reader to reconcile candidates,
then compare returned tags exactly. Shopify's tag search lagged writes during
verification. The test caller waited for two identical expected owned sets at
three-second intervals, with at most 20 attempts; it still attempted recorded IDs
if a reconciliation read failed. Those settling and persistence steps belong to
the caller, not to the saved cleanup request.

Call cleanup separately for each shop with explicit manifest entries, preferably
one ID per invocation for prompt recording. Existing products must have the exact
run marker; mismatched shop or ownership is refused. Already absent IDs succeed.
Each deletion is followed by a direct read verifying absence. Independent entries
continue after failures. A title prefix alone never authorizes deletion.

Creation is not automatically retried. A timeout or lost response can leave a
creation running; the verified runtime's 15-second timeout did not cancel its
underlying work. Preserve the pending intent, establish completion, reconcile
ownership/handles, and retain returned IDs before deciding what to do next. An
immediate empty search is not proof no product was created. Final cleanup must
remain unresolved while creation may still continue. Bounded retries of read-only
verification requests do not authorize retrying mutations.

## Performance and verification limits

Fixture product, variant, image, and media pages deliberately use size 2. The
catalog SKU helper uses size 20. Each duplicate continuation reads one catalog
page; compact page-ID history bounds transport growth relative to storing every
full cursor, and completed scan state is discarded. The remote caller used in
verification accepts serialized runtime groups in URL query parameters, not a
POST JSON body. Large payloads can still exceed transport or runtime limits.
Complete-product assembly, the source reader, and a full media observation each
remain within one invocation, so they are not unbounded bulk-export examples.

The measured local import took roughly 80–90 seconds per selected product. A
three-product batch with two creations and one skip took about 4 minutes 20
seconds; repeating all three skips took about 4 minutes 30 seconds. Repeated full
catalog scans dominate this cost. These are observations from a small test
catalog, not throughput guarantees. Do not silently change full-traversal policy
or assume cached absence remains valid when optimizing a merchant implementation.

On 2026-10-30, the original saved-request cycle seeded four real source products,
selected three, imported three destination products with five variants and five
ready images, and verified fields plus quantities `0, 0, 8, 9, 0` at the default
location. Product/variant/image pagination, maximum counting, exact-handle skips,
a controlled handle variation exercising SKU-only skips against the real catalog,
repeat import, and repeat seed were verified. Cleanup removed all seven products;
11 pre-existing destination and 15 source product fingerprints were unchanged.
Four images were byte-identical; one visually matched with small decoded-pixel
differences (mean channel difference 0.0091/255, PSNR 64.27 dB).

Twenty controlled saved-Liquid tests separately covered prerequisite failures,
later-page failures, malformed rows, partial/uncertain creation, bounded polling,
and cleanup refusals. Query syntax was also checked. These failure tests were not
live fault injection. The catalogue resources are byte-preserved copies of those
sources; copying and bundling them does not deploy them, transfer credentials, or
repeat live verification on another store.
<!-- apiease-kb:end -->

## Use these examples in a project

1. Choose the required resources and their dependency closure from the role
   READMEs. For the connected demonstration, use one separately bound project per
   store and keep their operational metadata independent.
2. Copy the selected role's JSON into that project's configured request directory.
   Adapt the role-specific identities and policies described above in the copies.
3. Select the appropriate secure APIEase connection with `--environment <name>`
   on each supported CLI invocation. Inspect the shop identity, permissions, and
   pending changes; run `apiease validate` before an authorized apply.
4. Use an authenticated durable caller implementing the continuation and manifest
   contract. Keep the run manifest until cleanup and uncertain outcomes are resolved.

The catalogue intentionally contains source and explanations, not a credentialed
deployment script. [Copy provenance and summarized original verification](../../../../test/evidence/product-import-catalogue.json)
are kept as repository test evidence; only the selected READMEs and resource JSON
enter the examples knowledge base.

The [catalogue validation record](../../../../test/evidence/product-import-catalogue-validation.json)
confirms 55 byte-identical canonical copies, 26 parsed GraphQL queries, complete
role dependencies, and 38 passing focused tests. The full repository run passed
46 tests and reproduced one pre-existing discount-code endpoint expectation
failure from unchanged `HEAD` files. This catalogue copy made no live-store writes.
