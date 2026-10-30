# Destination Store Requests for the Product Import Lifecycle

<!-- apiease-kb:start -->
These requests run in the destination store, represented by
`store-apiease-admin-local.myshopify.com`. The importer takes the successful source
reader's complete data object as `source`; it does not call the source store by
itself. Both the envelope and each eligible row must identify the expected source
shop, run ID, and marker. The per-row title must still begin with `Staging Products`.

The provided workflow requires APIEase in both stores. Configure this package
through Apex in the destination environment; give Apex separate instructions in
the source environment for the reader. See [setup choices and Apex instructions](../README.md#setup-choices-and-apex-instructions)
for the handoff and the alternative using one APIEase environment with an external
Shopify Admin API token.

The initial call is `{runId, source, maximum?}` through `liquidParamsEmbedded`;
subsequent calls supply `{runId, state}` unchanged. A positive integer maximum
defaults to three selected attempts. An exact whole handle or any nonempty exact
SKU anywhere in the destination catalog causes a skip, including matches on
products unrelated to this test run. Every catalog page is still checked.

The destination `product-import-create-one` skips an exact handle instead of
recovering and checking source fixtures. Its source provenance and title checks
also differ from the source package. Keep this version with the destination
coordinator and cleanup identity checks.

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
| [import-product-import-test](resources/requests/import-product-import-test.json) | liquid | `{runId,source,maximum?}`; then `{runId,state}` | Validate source envelope and import selected attempts. |
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
| [product-import-inventory-page](resources/requests/product-import-inventory-page.json) | http | `productId`, `locationId`, `after?` | Native tracked inventory and location `available` quantities for independent readback. |
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
import-product-import-test -> product-import-workflow
cleanup-product-import-test -> product-import-shop-context, product-import-ownership, product-import-delete
product-import-workflow -> product-import-shop-context, product-import-ownership, product-import-media-observation, product-import-create-one
product-import-create-one -> product-import-shop-context, match-title-prefix, read-default-location, product-import-map-input, product-import-duplicates, product-import-create
product-import-duplicates -> read-product-page, filter-products-exact-handle, product-import-catalog-sku-page, filter-variants-exact-sku
product-import-complete-product -> read-product-detail-page, read-product-variant-page, read-product-image-page
product-import-media-observation -> read-product-media-page
filter-products-exact-handle -> match-exact-handle
filter-variants-exact-sku -> match-exact-sku
```

## Independent verification

After a created row reports ready media, use `product-import-complete-product`
to compare destination title, handle, description, options, variants, prices,
SKUs and images to the source. Use `product-import-inventory-page` with the ID
returned by `read-default-location` to compare tracked `available` quantities.
These verification requests are included even though they are not called by the
import entry point. The paginated readers also support before/after fingerprints
of unrelated products. Persist every created ID before making these extra reads.

Cleanup accepts `{runId, shop, products:[{productId,shop,runId,marker}]}` for this
destination only. Include partial creations and reconcile uncertain writes. A
duplicate match is not by itself ownership: do not add unrelated skipped products
to a deletion manifest merely because they share a handle or SKU.

## Supplementary references outside the active cycle

These three requests were mentioned with the workflow and are copied for reference.
They are not required by the verified importer.

| Request | Use and boundary |
| --- | --- |
| [read-catalog-variant-page](resources/requests/read-catalog-variant-page.json) | A simple two-variant catalog page reader using `bodyEmbedded.variables.after`. The active duplicate scan uses the separate 20-row helper. |
| [filter-product-list](resources/requests/filter-product-list.json) | Filters supplied `{products,prefix}` through `match-title-prefix`, preserving complete objects. It does not fetch products or enforce run ownership. The matcher is included here. |
| [staging-product-import-connection](resources/requests/staging-product-import-connection.json) | Optional authenticated HTTP call to the source APIEase remote caller; defaults to `read-product-import-test`. Requires manual configuration of its Sensitive APIEase key field. |

The connection retains `value:{"mode":"preserve"}` for `x-apiease-api-key`. On a
new resource this defers credential entry; it neither contains nor transfers the
verified shop's key. Configure a source APIEase key securely in the authenticated
request editor, plus the actual source APIEase endpoint and shop header. This
is not a Shopify access token. The bridge still requires APIEase and the source
requests in the source store; it does not implement the single-environment,
direct-Shopify alternative. Pass the run input as serialized
`liquidParamsEmbedded` in `queryParamsEmbedded`, and validate both the outer HTTP
and inner remote-caller response before using the reader data. Its source
description retains historical `stageApiPath` deployment wording; the actual
address is a fixed `/api/remote/caller/call` endpoint, not a project-deployment
relay. The verified cycle used separate secure connections directly, so it does
not establish end-to-end execution through this optional bridge.

<!-- apiease-kb:end -->

## Installation boundary

Copy selected resources into the project bound to this role, adapt the shop
identities consistently as described in the overview, and validate before an
authorized apply. Configure credentials and permissions in that project. These
files contain no synchronization baseline, store binding, scheduled trigger, or
durable runner.
