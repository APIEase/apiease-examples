# Source Store Requests for the Product Import Lifecycle

<!-- apiease-kb:start -->
These requests run in the source store, represented by
`store-apiease-admin-staging.myshopify.com`. They create deterministic test
fixtures, read only the run-owned eligible products, and clean up explicit source
IDs. The source reader is also the reusable starting point for complete product
assembly with provenance and all required variant/image pages.

The provided workflow requires APIEase in both stores. Configure this package
through Apex in the source environment; give Apex separate instructions in the
destination environment for the importer. See [setup choices and Apex instructions](../README.md#setup-choices-and-apex-instructions)
for the handoff and the alternative using one APIEase environment with an external
Shopify Admin API token.

The seed creates three titles beginning with the exact case-sensitive prefix
`Staging Products` and one nonmatch. It includes a two-option, three-variant
product, decimal prices `12.34`, `27.95`, and `0.99`, zero and nonzero inventory,
descriptions, and real public image URLs. The fourth product is not imported.
Fixture handles are `pi-<runId>-1` through `pi-<runId>-4`; SKUs use
`PI-<runId>-<fixture>-<variant>`.

Repeated seeding requires an exact owned handle, matching fields/options/variants/
inventory/image count and alt text, and ready media before returning `skipped`.
An existing foreign-owned handle fails. This recovery behavior belongs to the
source version of `product-import-create-one`; it must not be replaced with the
destination version merely because the handle matches.

See the [connected workflow](../README.md) for the shared continuation, authorization,
mapping, recovery, cleanup, and verification contracts. All listed dependencies
are included in this role package; handles resolve inside this store.

## Request catalogue

Liquid inputs in braces use `liquidParamsEmbedded`. HTTP input names in the table
are fields of object-valued `bodyEmbedded.variables`; the stored query remains
in the saved request. HTTP responses preserve the native HTTP/GraphQL envelope.
The create/delete leaves are internal building blocks: their own requests do not
perform the ownership, selection, or duplicate checks provided by the coordinators.

| Request | Type | Input | Responsibility and output |
| --- | --- | --- | --- |
| [seed-product-import-test](resources/requests/seed-product-import-test.json) | liquid | `{runId}`; then `{runId,state}` | Seed four fixtures; return resumable state and totals. |
| [read-product-import-test](resources/requests/read-product-import-test.json) | liquid | `{runId}` | Complete eligible source envelope; empty success differs from failure. |
| [cleanup-product-import-test](resources/requests/cleanup-product-import-test.json) | liquid | `{runId,shop,products}` | Per-ID `deleted`, `absent`, `refused`, or `uncertain` rows. |
| [product-import-workflow](resources/requests/product-import-workflow.json) | liquid | `{runId,products,maximum?}` or `{runId,state}` | One duplicate-page step, possible creation, or media observation; ordered rows and totals. |
| [product-import-create-one](resources/requests/product-import-create-one.json) | liquid | `{runId,product,duplicateState?}` | One row with prerequisites, duplicate evidence, outcome and any destination ID. |
| [product-import-shop-context](resources/requests/product-import-shop-context.json) | http | No variables | Native GraphQL shop identity and current app access scopes. |
| [product-import-map-input](resources/requests/product-import-map-input.json) | liquid | `{product,locationId,marker}` | `{success,input,error}` with draft `ProductSetInput` and no source IDs. |
| [product-import-duplicates](resources/requests/product-import-duplicates.json) | liquid | `{product,state?}` | `{success,complete,handleProductId,skuVariantId,pages,state,error}`; one page per call. |
| [product-import-catalog-sku-page](resources/requests/product-import-catalog-sku-page.json) | http | `after?` | Native catalog variant IDs/SKUs and page info; page size 20, ordered by ID. |
| [product-import-create](resources/requests/product-import-create.json) | http | `input` | Native synchronous `productSet` result, product identity and `userErrors`. |
| [product-import-ownership](resources/requests/product-import-ownership.json) | http | `productId` | Native shop identity and product ID/handle/tags, or null product. |
| [product-import-owned-page](resources/requests/product-import-owned-page.json) | http | `query`, `after?` | Native tag-search candidates and page info; callers must compare exact tags. |
| [product-import-complete-product](resources/requests/product-import-complete-product.json) | liquid | `{productId}` | `{success,product,pages,error}` with all detail, variants and images. |
| [product-import-media-observation](resources/requests/product-import-media-observation.json) | liquid | `{productId,expectedImages}` | `{success,ready,...}` after a complete media traversal; never sleeps internally. |
| [product-import-delete](resources/requests/product-import-delete.json) | http | `productId` | Native `productDelete` result and `userErrors`; call only through verified cleanup. |
| [read-product-page](resources/requests/read-product-page.json) | http | `after?` | Native product IDs/titles/handles and page info; one page of 2. |
| [read-product-detail-page](resources/requests/read-product-detail-page.json) | http | `productId` | Native product fields/options, null product, or GraphQL error. |
| [read-product-variant-page](resources/requests/read-product-variant-page.json) | http | `productId`, `after?` | Native variants: IDs, SKUs, prices, selected options, sellable inventory and tracking; page size 2. |
| [read-product-image-page](resources/requests/read-product-image-page.json) | http | `productId`, `after?` | Native image IDs, URLs, nullable alt text and page info; page size 2. |
| [read-product-media-page](resources/requests/read-product-media-page.json) | http | `productId`, `after?` | Native media types/statuses/errors and image data; page size 2. |
| [read-default-location](resources/requests/read-default-location.json) | http | No variables | Native primary/default location ID, null, or errors. |
| [match-title-prefix](resources/requests/match-title-prefix.json) | liquid | `{title,prefix}` | `{success,matches,error}`; literal, case-sensitive prefix comparison. |
| [filter-products-exact-handle](resources/requests/filter-products-exact-handle.json) | liquid | `{products,expectedHandle}` | `{success,products,error}`; preserve complete matching objects and order. |
| [match-exact-handle](resources/requests/match-exact-handle.json) | liquid | `{candidateHandle,expectedHandle}` | `{success,matches,error}`; whole nonempty strings compared exactly. |
| [filter-variants-exact-sku](resources/requests/filter-variants-exact-sku.json) | liquid | `{variants,expectedSku}` | `{success,variants,error}`; preserve complete exact matches and order. |
| [match-exact-sku](resources/requests/match-exact-sku.json) | liquid | `{candidateSku,expectedSku}` | `{success,matches,error}`; null/empty candidate is a valid nonmatch to nonempty expected SKU. |

## Saved-request dependencies

The following arrows are same-store Liquid calls, not deployment order or cross-store
credential sharing. Include the transitive dependencies when borrowing a helper.

```text
seed-product-import-test -> product-import-workflow
read-product-import-test -> product-import-shop-context, product-import-owned-page, match-title-prefix, product-import-complete-product
cleanup-product-import-test -> product-import-shop-context, product-import-ownership, product-import-delete
product-import-workflow -> product-import-shop-context, product-import-ownership, product-import-media-observation, product-import-create-one
product-import-create-one -> product-import-shop-context, read-default-location, product-import-map-input, product-import-duplicates, product-import-ownership, product-import-complete-product, product-import-create
product-import-duplicates -> read-product-page, filter-products-exact-handle, product-import-catalog-sku-page, filter-variants-exact-sku
product-import-complete-product -> read-product-detail-page, read-product-variant-page, read-product-image-page
product-import-media-observation -> read-product-media-page
filter-products-exact-handle -> match-exact-handle
filter-variants-exact-sku -> match-exact-sku
```

## Reading and cleanup

Run the seed continuation until all four fixtures are verified ready. After the
owned-product search has settled, invoke `read-product-import-test` with the same
run ID. It first checks exact run tags, applies the title matcher, and assembles
every selected product. Pass its successful `data` envelope to the destination
importer, preserving per-product provenance. A partial reader failure is not a
usable import source.

Clean up source products separately using this package's
`cleanup-product-import-test`, the source shop identity, and explicit source IDs
from the persisted manifest. Never send destination IDs or use title-prefix
selection as deletion authority. The complete lifecycle needs source product and
inventory read/write access; a reader-only adaptation needs the grants required
by its selected fields and does not need the seed/delete requests.

<!-- apiease-kb:end -->

## Installation boundary

Copy selected resources into the project bound to this role, adapt the shop
identities consistently as described in the overview, and validate before an
authorized apply. Configure credentials and permissions in that project. These
files contain no synchronization baseline, store binding, scheduled trigger, or
durable runner.
