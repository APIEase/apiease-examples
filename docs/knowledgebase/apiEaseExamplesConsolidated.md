SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/discount-codes/details/README.md

TITLE
Lookup Shopify Discount Code Details From A Theme Extension

CONTENT
# Lookup Shopify Discount Code Details From A Theme Extension

This example shows how a Shopify storefront or theme extension can look up discount code details without calling the Shopify Admin API from browser-delivered code.

Theme extensions run in the storefront. Storefront JavaScript and Liquid are inspectable by customers, so they should not contain Shopify Admin API access tokens. This example sends only the discount code from the storefront to APIEase through Shopify App Proxy. APIEase runs the Shopify Admin GraphQL request server-side and returns safe display data.

The widget follows APIEase's documented runtime embedded Liquid parameter pattern and sends only the entered discount code to the Liquid request.

Architecture:

```text
Theme Extension -> Shopify App Proxy -> APIEase -> Shopify Admin GraphQL
```

## What this example does

- Adds a storefront widget with a discount code text input, lookup button, loading state, error state, not-found state, and successful result display.
- Creates a storefront-facing Liquid request that accepts only the discount code through `liquidParamsEmbedded`.
- Creates an internal HTTP request that calls Shopify Admin GraphQL `codeDiscountNodeByCode`.
- Uses APIEase automatic shop access token behavior for the Shopify Admin API request. No Shopify Admin API token, APIEase API key, or private credential appears in the widget code.
- Returns display-oriented JSON with common fields and queried details for basic, buy-X-get-Y, and free-shipping code discounts.

## Resource roles

- [Admin GraphQL request](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/discount-codes/details/resources/requests/lookup-shopify-discount-code-admin-graphql.json), handle `lookup-shopify-discount-code-admin-graphql`: the internal HTTP request containing the fixed GraphQL query.
- [Discount details request](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/discount-codes/details/resources/requests/lookup-shopify-discount-code-details.json), handle `lookup-shopify-discount-code-details`: the storefront-facing Liquid request that validates the input and shapes the response.
- [Discount details widget](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/discount-codes/details/resources/widgets/lookup-shopify-discount-code-details.json), handle `lookup-shopify-discount-code-details`: the reusable storefront UI.

## Execution flow and inputs

1. The widget trims the entered discount code and rejects an empty input.
2. It calls `apiease.runRequest('lookup-shopify-discount-code-details', { liquidParamsEmbedded: { code: code } })`. The widget helper supplies the runtime input through Shopify App Proxy; the Liquid request reads it from `apiEaseParameters.liquidParams.code`.
3. The Liquid request also checks for a missing or empty code. For a nonempty code, it calls `lookup-shopify-discount-code-admin-graphql`, passing the code in `bodyEmbedded.variables.code`.
4. The internal HTTP request posts its fixed `codeDiscountNodeByCode(code: $code)` query to the shop's Admin GraphQL endpoint. APIEase supplies the shop access token on the server.
5. The Liquid request handles HTTP failures, GraphQL errors, and a missing discount, or returns display fields for the matching discount.
6. The widget reads the returned data, parsing it if it is a JSON string, and renders the result or error message.

## Requirements and limitations

- Use Shopify Admin GraphQL for discount definition lookup. The input is a discount code string, not a discount node ID.
- The shop access token requires `read_discounts`. Product and collection display fields may also require the related Shopify Admin API read access.
- The Admin API endpoint must match the installed shop domain for APIEase's automatic shop access token injection. Authorization stays server-side. If an explicit `X-Shopify-Access-Token` override is needed, store it as a sensitive APIEase request parameter; never deliver it in theme code or widget JavaScript.
- Configure the Storefront App Proxy trigger separately in APIEase admin on the storefront-facing Liquid request. The public resource create API rejects that trigger in request payloads, so omit any exported `storefrontAppProxy` trigger when creating or updating through that API. The internal HTTP request has no storefront trigger.
- App Proxy calls are publicly callable through Shopify's proxy. Only return discount information that is appropriate for storefront visitors; the response includes the queried discount details.
- This retrieves discount definitions; it does not prove that a code applies to a particular customer, product, or cart. The query has fields for basic, buy-X-get-Y, and free-shipping code discounts; other types need additional query and response handling.
- Product and collection lists are limited to the first 10 entries in the query and are not paginated. The example does not enumerate all discounts or look up automatic discounts.

## Why this is safe

The browser only sends:

```json
{ "code": "SAVE10" }
```

The GraphQL query, Shopify Admin API endpoint, and shop access token behavior stay inside APIEase. The internal Admin GraphQL HTTP request does not have a storefront trigger, so the widget cannot directly execute arbitrary Admin API calls.

## Response shape

Successful lookup responses are shaped like:

```json
{
  "ok": true,
  "found": true,
  "code": "SAVE10",
  "title": "10% off Diamond Ring #1",
  "type": "DiscountCodeBasic",
  "status": "ACTIVE",
  "startsAt": "2026-01-01T00:00:00Z",
  "endsAt": null,
  "usageLimit": null,
  "usageCount": 3,
  "valueSummary": "10% off selected products",
  "minimumRequirement": "None",
  "appliesToAllItems": false,
  "eligibleProducts": [],
  "eligibleCollections": [],
  "rawType": "DiscountCodeBasic"
}
```

The success example shows the common display fields. The response also includes `details`, the queried `codeDiscount` object. Each eligible product has `id`, `title`, `handle`, and `url`; each eligible collection has `id`, `title`, and `handle`.

Not-found responses are shaped like:

```json
{
  "ok": true,
  "found": false,
  "code": "BADCODE",
  "message": "No discount code was found for BADCODE."
}
```

Error responses are shaped like:

```json
{
  "ok": false,
  "found": false,
  "code": "SAVE10",
  "message": "Unable to lookup discount code."
}
```

An empty input returns `ok: false`, `found: false`, and `message: "Enter a discount code."` without a `code` field. A GraphQL failure uses a Shopify-specific error message and also includes an `errors` array.

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/discount-codes/details/resources/requests/lookup-shopify-discount-code-admin-graphql.json

TITLE
Lookup Shopify Discount Code Admin GraphQL (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "formatVersion": 1,
  "handle": "lookup-shopify-discount-code-admin-graphql",
  "method": "POST",
  "name": "Lookup Shopify Discount Code Admin GraphQL",
  "parameters": [
    {
      "name": "Accept",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query DiscountCodeLookup($code: String!) { codeDiscountNodeByCode(code: $code) { id codeDiscount { __typename ... on DiscountCodeBasic { title status startsAt endsAt usageLimit asyncUsageCount shortSummary summary codes(first: 10) { nodes { code } } customerGets { value { __typename ... on DiscountPercentage { percentage } ... on DiscountAmount { amount { amount currencyCode } appliesOnEachItem } } items { __typename ... on DiscountProducts { products(first: 10) { nodes { id title handle onlineStoreUrl } } } ... on DiscountCollections { collections(first: 10) { nodes { id title handle } } } ... on AllDiscountItems { allItems } } } minimumRequirement { __typename ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount currencyCode } } ... on DiscountMinimumQuantity { greaterThanOrEqualToQuantity } } } ... on DiscountCodeBxgy { title status startsAt endsAt usageLimit asyncUsageCount summary codes(first: 10) { nodes { code } } customerGets { value { __typename ... on DiscountPercentage { percentage } ... on DiscountAmount { amount { amount currencyCode } appliesOnEachItem } } items { __typename ... on DiscountProducts { products(first: 10) { nodes { id title handle onlineStoreUrl } } } ... on DiscountCollections { collections(first: 10) { nodes { id title handle } } } ... on AllDiscountItems { allItems } } } } ... on DiscountCodeFreeShipping { title status startsAt endsAt usageLimit asyncUsageCount shortSummary summary codes(first: 10) { nodes { code } } minimumRequirement { __typename ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount currencyCode } } ... on DiscountMinimumQuantity { greaterThanOrEqualToQuantity } } } } } }\",\"variables\":{\"code\":\"\"}}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/discount-codes/details/resources/requests/lookup-shopify-discount-code-details.json

TITLE
Lookup Shopify Discount Code Details (request)

CONTENT
```json
{
  "contractVersion": 1,
  "formatVersion": 1,
  "handle": "lookup-shopify-discount-code-details",
  "liquid": "{% assign discount_code = '' %}\n{% assign api_ease_parameters_json = apiEaseParameters | json %}\n{% assign liquid_params_json = '{}' %}\n{% if api_ease_parameters_json contains '\"liquidParams\"' %}\n  {% assign liquid_params_json = apiEaseParameters.liquidParams | json %}\n{% endif %}\n{% if liquid_params_json contains '\"code\":' %}\n  {% assign discount_code = apiEaseParameters.liquidParams.code | default: '' | strip %}\n{% endif %}\n{% if discount_code == '' %}\n{\n  \"ok\": false,\n  \"found\": false,\n  \"message\": \"Enter a discount code.\"\n}\n{% else %}\n{% call {\n  \"requestId\": \"lookup-shopify-discount-code-admin-graphql\",\n  \"bodyEmbedded\": {\n    \"variables\": {\n      \"code\": {{ discount_code | json }}\n    }\n  }\n} as lookup_response %}\n{% assign lookup_json = lookup_response | json %}\n{% if lookup_response.status != 200 %}\n{\n  \"ok\": false,\n  \"found\": false,\n  \"code\": {{ discount_code | json }},\n  \"message\": \"Unable to lookup discount code.\"\n}\n{% elsif lookup_json contains '\"errors\"' %}\n{\n  \"ok\": false,\n  \"found\": false,\n  \"code\": {{ discount_code | json }},\n  \"message\": \"Shopify returned an error while looking up the discount code.\",\n  \"errors\": {{ lookup_response.data.errors | json }}\n}\n{% elsif lookup_json contains '\"codeDiscountNodeByCode\"' %}\n{% assign discount_node = lookup_response.data.data.codeDiscountNodeByCode %}\n{% if discount_node == nil %}\n{\n  \"ok\": true,\n  \"found\": false,\n  \"code\": {{ discount_code | json }},\n  \"message\": \"No discount code was found for {{ discount_code }}.\"\n}\n{% else %}\n{% assign discount = discount_node.codeDiscount %}\n{% assign discount_json = discount | json %}\n{% assign value_summary = discount.summary | default: '' %}\n{% if discount_json contains '\"shortSummary\"' %}\n  {% assign short_summary = discount.shortSummary | default: '' %}\n  {% if short_summary != '' %}\n    {% assign value_summary = short_summary %}\n  {% endif %}\n{% endif %}\n{% assign minimum_requirement = 'None' %}\n{% if discount_json contains '\"greaterThanOrEqualToSubtotal\"' %}\n  {% assign minimum_subtotal = discount.minimumRequirement.greaterThanOrEqualToSubtotal %}\n  {% capture minimum_requirement %}Minimum subtotal {{ minimum_subtotal.amount }} {{ minimum_subtotal.currencyCode }}{% endcapture %}\n{% elsif discount_json contains '\"greaterThanOrEqualToQuantity\"' %}\n  {% assign minimum_quantity = discount.minimumRequirement.greaterThanOrEqualToQuantity %}\n  {% capture minimum_requirement %}Minimum quantity {{ minimum_quantity }}{% endcapture %}\n{% endif %}\n{\n  \"ok\": true,\n  \"found\": true,\n  \"code\": {{ discount_code | json }},\n  \"title\": {{ discount.title | json }},\n  \"type\": {{ discount.__typename | json }},\n  \"status\": {{ discount.status | json }},\n  \"startsAt\": {{ discount.startsAt | json }},\n  \"endsAt\": {{ discount.endsAt | json }},\n  \"usageLimit\": {{ discount.usageLimit | json }},\n  \"usageCount\": {{ discount.asyncUsageCount | json }},\n  \"valueSummary\": {{ value_summary | strip | json }},\n  \"minimumRequirement\": {{ minimum_requirement | strip | json }},\n  \"appliesToAllItems\": {% if discount_json contains '\"allItems\":true' %}true{% else %}false{% endif %},\n  \"eligibleProducts\": [\n    {% if discount_json contains '\"products\"' %}\n      {% for product in discount.customerGets.items.products.nodes %}\n        {% assign product_url = product.onlineStoreUrl | default: '' %}\n        {% if product_url == '' %}\n          {% capture product_url %}/products/{{ product.handle }}{% endcapture %}\n        {% endif %}\n        {% if forloop.first == false %},{% endif %}\n        {\n          \"id\": {{ product.id | json }},\n          \"title\": {{ product.title | json }},\n          \"handle\": {{ product.handle | json }},\n          \"url\": {{ product_url | strip | json }}\n        }\n      {% endfor %}\n    {% endif %}\n  ],\n  \"eligibleCollections\": [\n    {% if discount_json contains '\"collections\"' %}\n      {% for collection in discount.customerGets.items.collections.nodes %}\n        {% if forloop.first == false %},{% endif %}\n        {\n          \"id\": {{ collection.id | json }},\n          \"title\": {{ collection.title | json }},\n          \"handle\": {{ collection.handle | json }}\n        }\n      {% endfor %}\n    {% endif %}\n  ],\n  \"rawType\": {{ discount.__typename | json }},\n  \"details\": {{ discount | json }}\n}\n{% endif %}\n{% else %}\n{\n  \"ok\": false,\n  \"found\": false,\n  \"code\": {{ discount_code | json }},\n  \"message\": \"Unable to lookup discount code.\"\n}\n{% endif %}\n{% endif %}",
  "name": "Lookup Shopify Discount Code Details",
  "parameters": [],
  "resourceType": "request",
  "triggers": [
    {
      "storefrontAppProxy": {},
      "type": "storefrontAppProxy"
    }
  ],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/discount-codes/details/resources/widgets/lookup-shopify-discount-code-details.json

TITLE
Lookup Shopify Discount Code Details (widget)

CONTENT
```json
{
  "adminTarget": "",
  "adminText": "",
  "adminUi": "",
  "contractVersion": 1,
  "disableJavascript": false,
  "externalJavascriptUrls": [],
  "formatVersion": 1,
  "handle": "lookup-shopify-discount-code-details",
  "javascript": "(function () {\n  const root = document.querySelector('[data-apiease-discount-code-lookup]');\n  if (!root) return;\n\n  const form = root.querySelector('[data-role=\"form\"]');\n  const input = root.querySelector('[data-role=\"code-input\"]');\n  const button = root.querySelector('[data-role=\"submit-button\"]');\n  const status = root.querySelector('[data-role=\"status\"]');\n  const result = root.querySelector('[data-role=\"result\"]');\n  const requestId = root.getAttribute('data-request-id') || 'lookup-shopify-discount-code-details';\n\n  function setStatus(message, state) {\n    status.textContent = message || '';\n    status.setAttribute('data-state', state || '');\n  }\n\n  function setLoading(isLoading) {\n    input.disabled = isLoading;\n    button.disabled = isLoading;\n    button.textContent = isLoading ? 'Looking up...' : 'Lookup Discount';\n  }\n\n  function clearResult() {\n    result.replaceChildren();\n  }\n\n  function appendRow(list, label, value) {\n    const term = document.createElement('dt');\n    term.textContent = label;\n    const description = document.createElement('dd');\n    description.textContent = value == null || value === '' ? 'None' : String(value);\n    list.append(term, description);\n  }\n\n  function formatDate(value) {\n    if (!value) return 'None';\n    const date = new Date(value);\n    if (Number.isNaN(date.getTime())) return value;\n    return date.toLocaleString();\n  }\n\n  function normalizePayload(jsonResponse) {\n    const data = jsonResponse && Object.prototype.hasOwnProperty.call(jsonResponse, 'data')\n      ? jsonResponse.data\n      : jsonResponse;\n\n    if (typeof data === 'string') {\n      try {\n        return JSON.parse(data);\n      } catch (error) {\n        return { ok: false, message: 'Unable to parse APIEase response.' };\n      }\n    }\n\n    return data || { ok: false, message: 'No response was returned.' };\n  }\n\n  function appendItems(container, title, items) {\n    if (!Array.isArray(items) || items.length === 0) return;\n\n    const heading = document.createElement('h3');\n    heading.textContent = title;\n    const list = document.createElement('ul');\n\n    items.forEach(function (item) {\n      const listItem = document.createElement('li');\n      if (item.url) {\n        const link = document.createElement('a');\n        link.href = item.url;\n        link.textContent = item.title || item.handle || item.id;\n        listItem.append(link);\n      } else {\n        listItem.textContent = item.title || item.handle || item.id;\n      }\n      list.append(listItem);\n    });\n\n    container.append(heading, list);\n  }\n\n  function appendRawDetails(container, detailsPayload) {\n    if (!detailsPayload || typeof detailsPayload !== 'object') return;\n\n    const details = document.createElement('details');\n    const summary = document.createElement('summary');\n    const pre = document.createElement('pre');\n\n    summary.textContent = 'Raw discount details';\n    pre.textContent = JSON.stringify(detailsPayload, null, 2);\n    details.append(summary, pre);\n    container.append(details);\n  }\n\n  function renderPayload(payload) {\n    clearResult();\n\n    if (!payload.ok) {\n      setStatus(payload.message || 'Unable to lookup discount code.', 'error');\n      return;\n    }\n\n    if (!payload.found) {\n      setStatus(payload.message || 'No discount code was found.', 'error');\n      return;\n    }\n\n    setStatus('Discount code found.', 'success');\n\n    const panel = document.createElement('div');\n    panel.className = 'apiease-discount-lookup__panel';\n    const list = document.createElement('dl');\n\n    appendRow(list, 'Discount code', payload.code);\n    appendRow(list, 'Discount title', payload.title);\n    appendRow(list, 'Status', payload.status);\n    appendRow(list, 'Discount type', payload.type);\n    appendRow(list, 'Starts at', formatDate(payload.startsAt));\n    appendRow(list, 'Ends at', formatDate(payload.endsAt));\n    appendRow(list, 'Usage count', payload.usageCount);\n    appendRow(list, 'Usage limit', payload.usageLimit);\n    appendRow(list, 'Value', payload.valueSummary);\n    appendRow(list, 'Minimum requirement', payload.minimumRequirement);\n    appendRow(list, 'Applies to all items', payload.appliesToAllItems ? 'Yes' : 'No');\n\n    panel.append(list);\n    appendItems(panel, 'Eligible products', payload.eligibleProducts);\n    appendItems(panel, 'Eligible collections', payload.eligibleCollections);\n    appendRawDetails(panel, payload.details);\n    result.append(panel);\n  }\n\n  form.addEventListener('submit', async function (event) {\n    event.preventDefault();\n\n    const code = input.value.trim();\n    clearResult();\n\n    if (!code) {\n      setStatus('Enter a discount code.', 'error');\n      input.focus();\n      return;\n    }\n\n    setLoading(true);\n    setStatus('Looking up discount code...', '');\n\n    try {\n      const response = await apiease.runRequest(requestId, {\n        liquidParamsEmbedded: { code: code }\n      });\n\n      if (response.status < 200 || response.status >= 300) {\n        setStatus(\n          response.errorMessage || 'Unable to lookup discount code.',\n          'error'\n        );\n        return;\n      }\n\n      renderPayload(normalizePayload(response));\n    } catch (error) {\n      setStatus(\n        error.message || 'Unable to lookup discount code.',\n        'error'\n      );\n    } finally {\n      setLoading(false);\n    }\n  });\n\n})();",
  "liquid": "<section class=\"apiease-discount-lookup\" data-apiease-discount-code-lookup data-request-id=\"lookup-shopify-discount-code-details\"><style>.apiease-discount-lookup{font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:24px;border:1px solid #d8dde6;border-radius:8px;background:#fff;color:#1f2933}.apiease-discount-lookup h2{margin:0 0 8px;font-size:24px;line-height:1.25}.apiease-discount-lookup p{margin:0 0 18px;color:#52616b}.apiease-discount-lookup form{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}.apiease-discount-lookup label{display:block;font-weight:700;margin-bottom:6px}.apiease-discount-lookup input{min-width:240px;flex:1;border:1px solid #aab4c0;border-radius:6px;padding:10px 12px;font-size:16px}.apiease-discount-lookup button{border:0;border-radius:6px;background:#1f6feb;color:#fff;padding:11px 16px;font-size:16px;font-weight:700;cursor:pointer}.apiease-discount-lookup button:disabled{opacity:.65;cursor:wait}.apiease-discount-lookup__status{margin-top:16px;font-weight:700}.apiease-discount-lookup__status[data-state=\"error\"]{color:#b42318}.apiease-discount-lookup__status[data-state=\"success\"]{color:#067647}.apiease-discount-lookup__result{margin-top:16px}.apiease-discount-lookup dl{display:grid;grid-template-columns:minmax(130px,180px) 1fr;gap:8px 14px;margin:0}.apiease-discount-lookup dt{font-weight:700;color:#344054}.apiease-discount-lookup dd{margin:0;color:#101828;overflow-wrap:anywhere}.apiease-discount-lookup ul{margin:8px 0 0 20px;padding:0}.apiease-discount-lookup details{margin-top:14px}.apiease-discount-lookup summary{cursor:pointer;font-weight:700}.apiease-discount-lookup pre{white-space:pre-wrap;overflow:auto;background:#fff;border:1px solid #d8dde6;border-radius:6px;padding:10px}.apiease-discount-lookup__panel{border:1px solid #d8dde6;border-radius:8px;padding:14px;background:#f8fafc}</style><h2>Lookup Shopify Discount Code Details</h2><p>Enter a discount code to retrieve server-side discount details from Shopify Admin GraphQL without exposing an Admin API token in the storefront.</p><form data-role=\"form\"><div><label for=\"apiease-discount-code-input\">Discount code</label><input id=\"apiease-discount-code-input\" type=\"text\" autocomplete=\"off\" data-role=\"code-input\" placeholder=\"SAVE10\"></div><button type=\"submit\" data-role=\"submit-button\">Lookup Discount</button></form><div class=\"apiease-discount-lookup__status\" data-role=\"status\" aria-live=\"polite\"></div><div class=\"apiease-discount-lookup__result\" data-role=\"result\"></div></section>",
  "name": "Lookup Shopify Discount Code Details",
  "resourceType": "widget",
  "type": "storefront"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/README.md

TITLE
Import Shopify Products Between Two Stores With Durable Continuations

CONTENT
# Import Shopify Products Between Two Stores With Durable Continuations

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

```text
Authenticated operator / durable caller
  -> Source project: seed fixtures -> read complete eligible products
  -> Destination project: import reader output -> observe images -> verify data
  -> Each project: cleanup only its recorded, run-owned test product IDs
```

The [source package](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/README.md) has 26 requests for the source store.
The [destination package](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/README.md) has 26 active requests plus three
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
`yourstore.myshopify.com`. The examples bundle normalizes only the
destination hostname to `yourstore.myshopify.com`; the source hostname remains.
These are reference identities, not customer configuration. When adapting copies,
replace each role consistently in HTTP addresses, Liquid identity/provenance
checks, continuation shop values, cleanup inputs, and any connection headers.
Changing only the endpoint will correctly fail the remaining identity guards.
Confirm the installed shop and supported API version rather than assuming them.

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

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/README.md

TITLE
Source Store Requests for the Product Import Lifecycle

CONTENT
# Source Store Requests for the Product Import Lifecycle

These requests run in the source store, represented by
`store-apiease-admin-staging.myshopify.com`. They create deterministic test
fixtures, read only the run-owned eligible products, and clean up explicit source
IDs. The source reader is also the reusable starting point for complete product
assembly with provenance and all required variant/image pages.

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

See the [connected workflow](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/README.md) for the shared continuation, authorization,
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
| [seed-product-import-test](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/seed-product-import-test.json) | liquid | `{runId}`; then `{runId,state}` | Seed four fixtures; return resumable state and totals. |
| [read-product-import-test](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-product-import-test.json) | liquid | `{runId}` | Complete eligible source envelope; empty success differs from failure. |
| [cleanup-product-import-test](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/cleanup-product-import-test.json) | liquid | `{runId,shop,products}` | Per-ID `deleted`, `absent`, `refused`, or `uncertain` rows. |
| [product-import-workflow](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-workflow.json) | liquid | `{runId,products,maximum?}` or `{runId,state}` | One duplicate-page step, possible creation, or media observation; ordered rows and totals. |
| [product-import-create-one](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-create-one.json) | liquid | `{runId,product,duplicateState?}` | One row with prerequisites, duplicate evidence, outcome and any destination ID. |
| [product-import-shop-context](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-shop-context.json) | http | No variables | Native GraphQL shop identity and current app access scopes. |
| [product-import-map-input](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-map-input.json) | liquid | `{product,locationId,marker}` | `{success,input,error}` with draft `ProductSetInput` and no source IDs. |
| [product-import-duplicates](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-duplicates.json) | liquid | `{product,state?}` | `{success,complete,handleProductId,skuVariantId,pages,state,error}`; one page per call. |
| [product-import-catalog-sku-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-catalog-sku-page.json) | http | `after?` | Native catalog variant IDs/SKUs and page info; page size 20, ordered by ID. |
| [product-import-create](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-create.json) | http | `input` | Native synchronous `productSet` result, product identity and `userErrors`. |
| [product-import-ownership](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-ownership.json) | http | `productId` | Native shop identity and product ID/handle/tags, or null product. |
| [product-import-owned-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-owned-page.json) | http | `query`, `after?` | Native tag-search candidates and page info; callers must compare exact tags. |
| [product-import-complete-product](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-complete-product.json) | liquid | `{productId}` | `{success,product,pages,error}` with all detail, variants and images. |
| [product-import-media-observation](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-media-observation.json) | liquid | `{productId,expectedImages}` | `{success,ready,...}` after a complete media traversal; never sleeps internally. |
| [product-import-delete](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-delete.json) | http | `productId` | Native `productDelete` result and `userErrors`; call only through verified cleanup. |
| [read-product-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-product-page.json) | http | `after?` | Native product IDs/titles/handles and page info; one page of 2. |
| [read-product-detail-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-product-detail-page.json) | http | `productId` | Native product fields/options, null product, or GraphQL error. |
| [read-product-variant-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-product-variant-page.json) | http | `productId`, `after?` | Native variants: IDs, SKUs, prices, selected options, sellable inventory and tracking; page size 2. |
| [read-product-image-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-product-image-page.json) | http | `productId`, `after?` | Native image IDs, URLs, nullable alt text and page info; page size 2. |
| [read-product-media-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-product-media-page.json) | http | `productId`, `after?` | Native media types/statuses/errors and image data; page size 2. |
| [read-default-location](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-default-location.json) | http | No variables | Native primary/default location ID, null, or errors. |
| [match-title-prefix](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/match-title-prefix.json) | liquid | `{title,prefix}` | `{success,matches,error}`; literal, case-sensitive prefix comparison. |
| [filter-products-exact-handle](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/filter-products-exact-handle.json) | liquid | `{products,expectedHandle}` | `{success,products,error}`; preserve complete matching objects and order. |
| [match-exact-handle](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/match-exact-handle.json) | liquid | `{candidateHandle,expectedHandle}` | `{success,matches,error}`; whole nonempty strings compared exactly. |
| [filter-variants-exact-sku](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/filter-variants-exact-sku.json) | liquid | `{variants,expectedSku}` | `{success,variants,error}`; preserve complete exact matches and order. |
| [match-exact-sku](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/match-exact-sku.json) | liquid | `{candidateSku,expectedSku}` | `{success,matches,error}`; null/empty candidate is a valid nonmatch to nonempty expected SKU. |

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

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/seed-product-import-test.json

TITLE
seed product import test (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Seeds four deterministic draft staging fixtures: three Staging Products titles, one nonmatch, run-derived handles/SKUs and exact ownership tags. Continuations return each creation ID before bounded readiness checks. Repeated runs use complete duplicate scans and never blindly recreate.",
  "formatVersion": 1,
  "handle": "seed-product-import-test",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- assign runId = '' -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign runId = p.runId -%}\n{%- assign runLength = runId | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless runLength >= 8 and runLength <= 48 -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must be 8–48 lowercase letters, digits or hyphens\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign allowed = 'abcdefghijklmnopqrstuvwxyz0123456789-' -%}\n{%- assign chars = runId | split: '' -%}\n{%- for ch in chars -%}\n{%- unless allowed contains ch -%}\n{%- assign valid = false -%}\n{%- endunless -%}\n{%- endfor -%}\n{%- endif -%}\n{%- assign marker = 'apiease-product-import:' | append: runId -%}\n{%- assign hasState = p | has_key: 'state' -%}\n{%- if hasState -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-workflow\",\"liquidParamsEmbedded\":{\"runId\":{{ runId | json }},\"state\":{{ p.state | json }}}} as workflow -%}\n{%- if valid -%}\n{%- assign valid = workflow | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless workflow.status >= 200 and workflow.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless workflow.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- else -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-workflow\",\"liquidParamsEmbedded\":{\"runId\":{{ runId | json }},\"maximum\":4,\"products\":[{\"id\":null,\"title\":\"Staging Products Import Fixture 1\",\"handle\":\"pi-{{ runId }}-1\",\"descriptionHtml\":\"<p>Fixture 1: decimal prices, zero &amp; nonzero stock.</p>\",\"options\":[{\"name\":\"Title\",\"values\":[\"Default Title\"]}],\"variants\":[{\"sku\":\"PI-{{ runId }}-1-1\",\"price\":\"12.34\",\"inventoryQuantity\":0,\"selectedOptions\":[{\"name\":\"Title\",\"value\":\"Default Title\"}]}],\"images\":[{\"url\":\"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=320&q=80\",\"altText\":\"Fixture 1, image 1: \\\"color\\\" & detail\"}]},{\"id\":null,\"title\":\"Staging Products Import Fixture 2\",\"handle\":\"pi-{{ runId }}-2\",\"descriptionHtml\":\"<p>Fixture 2: decimal prices, zero &amp; nonzero stock.</p>\",\"options\":[{\"name\":\"Color\",\"values\":[\"Red\",\"Blue\"]},{\"name\":\"Size\",\"values\":[\"Small\",\"Large\"]}],\"variants\":[{\"sku\":\"PI-{{ runId }}-2-1\",\"price\":\"12.34\",\"inventoryQuantity\":0,\"selectedOptions\":[{\"name\":\"Color\",\"value\":\"Red\"},{\"name\":\"Size\",\"value\":\"Small\"}]},{\"sku\":\"PI-{{ runId }}-2-2\",\"price\":\"27.95\",\"inventoryQuantity\":8,\"selectedOptions\":[{\"name\":\"Color\",\"value\":\"Red\"},{\"name\":\"Size\",\"value\":\"Large\"}]},{\"sku\":\"PI-{{ runId }}-2-3\",\"price\":\"0.99\",\"inventoryQuantity\":9,\"selectedOptions\":[{\"name\":\"Color\",\"value\":\"Blue\"},{\"name\":\"Size\",\"value\":\"Small\"}]}],\"images\":[{\"url\":\"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=320&q=80\",\"altText\":\"Fixture 2, image 1: \\\"color\\\" & detail\"},{\"url\":\"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=320&q=80\",\"altText\":\"Fixture 2, image 2: \\\"color\\\" & detail\"},{\"url\":\"https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=320&q=80\",\"altText\":\"Fixture 2, image 3: \\\"color\\\" & detail\"}]},{\"id\":null,\"title\":\"Staging Products Import Fixture 3\",\"handle\":\"pi-{{ runId }}-3\",\"descriptionHtml\":\"<p>Fixture 3: decimal prices, zero &amp; nonzero stock.</p>\",\"options\":[{\"name\":\"Title\",\"values\":[\"Default Title\"]}],\"variants\":[{\"sku\":\"PI-{{ runId }}-3-1\",\"price\":\"12.34\",\"inventoryQuantity\":0,\"selectedOptions\":[{\"name\":\"Title\",\"value\":\"Default Title\"}]}],\"images\":[{\"url\":\"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=320&q=80\",\"altText\":\"Fixture 3, image 1: \\\"color\\\" & detail\"}]},{\"id\":null,\"title\":\"Other Products Import Fixture 4\",\"handle\":\"pi-{{ runId }}-4\",\"descriptionHtml\":\"<p>Fixture 4: decimal prices, zero &amp; nonzero stock.</p>\",\"options\":[{\"name\":\"Title\",\"values\":[\"Default Title\"]}],\"variants\":[{\"sku\":\"PI-{{ runId }}-4-1\",\"price\":\"12.34\",\"inventoryQuantity\":0,\"selectedOptions\":[{\"name\":\"Title\",\"value\":\"Default Title\"}]}],\"images\":[{\"url\":\"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=320&q=80\",\"altText\":\"Fixture 4, image 1: \\\"color\\\" & detail\"}]}]}} as workflow -%}\n{%- if valid -%}\n{%- assign valid = workflow | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless workflow.status >= 200 and workflow.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless workflow.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{{ workflow.data | json }}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "seed product import test",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-product-import-test.json

TITLE
read product import test (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Reads only exact run-owned staging products whose titles begin with case-sensitive Staging Products. Exhausts product, variant and image pages and returns complete source/run provenance. Empty selection succeeds; any incomplete traversal fails without partial products.",
  "formatVersion": 1,
  "handle": "read-product-import-test",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- assign runId = '' -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign runId = p.runId -%}\n{%- assign runLength = runId | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless runLength >= 8 and runLength <= 48 -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must be 8–48 lowercase letters, digits or hyphens\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign allowed = 'abcdefghijklmnopqrstuvwxyz0123456789-' -%}\n{%- assign chars = runId | split: '' -%}\n{%- for ch in chars -%}\n{%- unless allowed contains ch -%}\n{%- assign valid = false -%}\n{%- endunless -%}\n{%- endfor -%}\n{%- endif -%}\n{%- assign marker = 'apiease-product-import:' | append: runId -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-shop-context\"} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | has_key: 'myshopifyDomain' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop.myshopifyDomain | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"myshopifyDomain must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain == 'store-apiease-admin-staging.myshopify.com' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Authenticated shop identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- assign productsJSON = '' -%}\n{%- assign productPages = 0 -%}\n{%- assign selectedCount = 0 -%}\n{%- assign ownedCount = 0 -%}\n{%- assign variantPages = 0 -%}\n{%- assign imagePages = 0 -%}\n{%- assign query = 'tag:\"' | append: marker | append: '\"' -%}\n{%- assign hasMore = true -%}\n{%- assign cursor = nil -%}\n{%- assign cursors = '' | split: '' -%}\n{%- while hasMore and valid -%}\n{%- call {\"requestId\":\"product-import-owned-page\",\"bodyEmbedded\":{\"variables\":{\"query\":{{ query | json }},\"after\":{{ cursor | json }}}}} as page -%}\n{%- if valid -%}\n{%- assign valid = page | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless page.status >= 200 and page.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = page.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page.data.data | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page.data.data.products | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page.data.data.products | has_key: 'nodes' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page.data.data.products.nodes | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page.data.data.products | has_key: 'pageInfo' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page.data.data.products.pageInfo | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page.data.data.products.pageInfo | has_key: 'hasNextPage' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page.data.data.products.pageInfo.hasNextPage | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign hasMore = page.data.data.products.pageInfo.hasNextPage -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if hasMore -%}\n{%- if valid -%}\n{%- assign valid = page.data.data.products.pageInfo | has_key: 'endCursor' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = page.data.data.products.pageInfo.endCursor | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless page.data.data.products.pageInfo.endCursor != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"endCursor must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign cursor = page.data.data.products.pageInfo.endCursor -%}\n{%- if cursors contains cursor -%}\n{%- assign valid = false -%}\n{%- assign error = 'Repeated pagination cursor.' -%}\n{%- endif -%}\n{%- assign cursorSingle = page.data.data.products.pageInfo | map: 'endCursor' -%}\n{%- assign cursors = cursors | concat: cursorSingle -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign productPages = productPages | plus: 1 -%}\n{%- for candidate in page.data.data.products.nodes -%}\n{%- if valid -%}\n{%- assign valid = candidate | has_key: 'tags' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = candidate.tags | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if candidate.tags contains marker -%}\n{%- assign ownedCount = ownedCount | plus: 1 -%}\n{%- call {\"requestId\":\"match-title-prefix\",\"liquidParamsEmbedded\":{\"title\":{{ candidate.title | json }},\"prefix\":\"Staging Products\"}} as match -%}\n{%- if valid -%}\n{%- assign valid = match | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = match.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless match.status >= 200 and match.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = match | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = match.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = match.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = match.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless match.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if match.data.matches -%}\n{%- call {\"requestId\":\"product-import-complete-product\",\"liquidParamsEmbedded\":{\"productId\":{{ candidate.id | json }}}} as complete -%}\n{%- if valid -%}\n{%- assign valid = complete | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = complete.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless complete.status >= 200 and complete.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = complete | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = complete.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = complete.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = complete.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless complete.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign selectedCount = selectedCount | plus: 1 -%}\n{%- assign variantPages = variantPages | plus: complete.data.pages.variants -%}\n{%- assign imagePages = imagePages | plus: complete.data.pages.images -%}\n{%- capture entry -%}\n{\"sourceShop\":\"store-apiease-admin-staging.myshopify.com\",\"runId\":{{ runId | json }},\"marker\":{{ marker | json }},\"id\":{{ complete.data.product.id | json }},\"title\":{{ complete.data.product.title | json }},\"handle\":{{ complete.data.product.handle | json }},\"descriptionHtml\":{{ complete.data.product.descriptionHtml | json }},\"options\":{{ complete.data.product.options | json }},\"variants\":{{ complete.data.product.variants | json }},\"images\":{{ complete.data.product.images | json }}}{%- endcapture -%}\n{%- if productsJSON != '' -%}\n{%- assign productsJSON = productsJSON | append: ',' -%}\n{%- endif -%}\n{%- assign productsJSON = productsJSON | append: entry -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- endwhile -%}\n{%- if valid -%}\n{\"success\":true,\"complete\":true,\"sourceShop\":\"store-apiease-admin-staging.myshopify.com\",\"runId\":{{ runId | json }},\"marker\":{{ marker | json }},\"products\":[{{ productsJSON }}],\"counts\":{\"owned\":{{ ownedCount | json }},\"eligible\":{{ selectedCount | json }}},\"pages\":{\"products\":{{ productPages | json }},\"variants\":{{ variantPages | json }},\"images\":{{ imagePages | json }}},\"error\":null}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "read product import test",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/cleanup-product-import-test.json

TITLE
cleanup product import test (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Deletes explicit manifest IDs only after checking this shop, runId and exact ownership tag. Already absent is successful. Independent deletions continue after errors, with readback verification and uncertain outcomes retained. Invoke once per shop with the same persisted run manifest.",
  "formatVersion": 1,
  "handle": "cleanup-product-import-test",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- assign runId = '' -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign runId = p.runId -%}\n{%- assign runLength = runId | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless runLength >= 8 and runLength <= 48 -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must be 8–48 lowercase letters, digits or hyphens\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign allowed = 'abcdefghijklmnopqrstuvwxyz0123456789-' -%}\n{%- assign chars = runId | split: '' -%}\n{%- for ch in chars -%}\n{%- unless allowed contains ch -%}\n{%- assign valid = false -%}\n{%- endunless -%}\n{%- endfor -%}\n{%- endif -%}\n{%- assign marker = 'apiease-product-import:' | append: runId -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.shop | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.shop != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"shop must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.shop == 'store-apiease-admin-staging.myshopify.com' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Cleanup shop mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.products | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-shop-context\"} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | has_key: 'myshopifyDomain' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop.myshopifyDomain | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"myshopifyDomain must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain == 'store-apiease-admin-staging.myshopify.com' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Authenticated shop identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- assign rowsJSON = '' -%}\n{%- assign failed = 0 -%}\n{%- assign removed = 0 -%}\n{%- if valid -%}\n{%- for item in p.products -%}\n{%- assign valid = true -%}\n{%- assign outcome = 'refused' -%}\n{%- assign reason = 'Manifest or ownership mismatch.' -%}\n{%- assign id = nil -%}\n{%- if valid -%}\n{%- assign valid = item | has_key: 'productId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item.productId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless item.productId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"productId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item.shop | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless item.shop != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"shop must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item | has_key: 'marker' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item.marker | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless item.marker != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"marker must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless item.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless item.shop == 'store-apiease-admin-staging.myshopify.com' and item.marker == marker and item.runId == runId -%}\n{%- assign valid = false -%}\n{%- assign error = \"Manifest shop or ownership mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign id = item.productId -%}\n{%- call {\"requestId\":\"product-import-ownership\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ id | json }}}}} as before -%}\n{%- if valid -%}\n{%- assign valid = before | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = before.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless before.status >= 200 and before.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = before | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = before.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = before.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = before.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = before.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless before.data.data.shop.myshopifyDomain == 'store-apiease-admin-staging.myshopify.com' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Observed cleanup shop mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign exists = before.data.data | has_key: \"product\" -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless exists -%}\n{%- assign valid = false -%}\n{%- assign error = \"Unreadable product existence\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if before.data.data.product == nil -%}\n{%- assign outcome = 'absent' -%}\n{%- assign reason = 'Already absent.' -%}\n{%- else -%}\n{%- if valid -%}\n{%- assign valid = before.data.data.product | has_key: 'tags' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = before.data.data.product.tags | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless before.data.data.product.tags contains marker -%}\n{%- assign valid = false -%}\n{%- assign error = \"Exact run ownership marker does not match\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless before.data.data.product.id == id -%}\n{%- assign valid = false -%}\n{%- assign error = \"Product identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign outcome = 'uncertain' -%}\n{%- call {\"requestId\":\"product-import-delete\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ id | json }}}}} as deleted -%}\n{%- if valid -%}\n{%- assign valid = deleted | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless deleted.status >= 200 and deleted.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = deleted.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data.data | has_key: 'productDelete' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data.data.productDelete | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data.data.productDelete | has_key: 'userErrors' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data.data.productDelete.userErrors | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign deleteErrors = deleted.data.data.productDelete.userErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless deleteErrors == 0 and deleted.data.data.productDelete.deletedProductId == id -%}\n{%- assign valid = false -%}\n{%- assign error = \"Delete failed or returned an uncertain result\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-ownership\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ id | json }}}}} as after -%}\n{%- if valid -%}\n{%- assign valid = after | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless after.status >= 200 and after.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = after.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after.data.data | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after.data.data.product | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign outcome = 'deleted' -%}\n{%- assign reason = 'Deletion verified absent.' -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- unless valid -%}\n{%- assign reason = error -%}\n{%- assign failed = failed | plus: 1 -%}\n{%- else -%}\n{%- assign removed = removed | plus: 1 -%}\n{%- endunless -%}\n{%- capture row -%}\n{\"productId\":{{ id | json }},\"shop\":\"store-apiease-admin-staging.myshopify.com\",\"runId\":{{ runId | json }},\"marker\":{{ marker | json }},\"outcome\":{{ outcome | json }},\"reason\":{{ reason | json }}}{%- endcapture -%}\n{%- if rowsJSON != '' -%}\n{%- assign rowsJSON = rowsJSON | append: ',' -%}\n{%- endif -%}\n{%- assign rowsJSON = rowsJSON | append: row -%}\n{%- endfor -%}\n{%- assign valid = true -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"rows\":[{{ rowsJSON }}],\"totals\":{\"removedOrAbsent\":{{ removed | json }},\"failed\":{{ failed | json }}},\"error\":null}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "cleanup product import test",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-workflow.json

TITLE
product import workflow (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Runs a persisted continuation with one creation attempt or one full media observation per call. Defaults maximum to 3 selected attempts. Each returned state must be durably recorded before continuing after retryAfterSeconds. Maximum 20 media observations, no mutation retries.",
  "formatVersion": 1,
  "handle": "product-import-workflow",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign runId = p.runId -%}\n{%- assign runLength = runId | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless runLength >= 8 and runLength <= 48 -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must be 8–48 lowercase letters, digits or hyphens\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign allowed = 'abcdefghijklmnopqrstuvwxyz0123456789-' -%}\n{%- assign chars = runId | split: '' -%}\n{%- for ch in chars -%}\n{%- unless allowed contains ch -%}\n{%- assign valid = false -%}\n{%- endunless -%}\n{%- endfor -%}\n{%- endif -%}\n{%- assign marker = 'apiease-product-import:' | append: runId -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-shop-context\"} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | has_key: 'myshopifyDomain' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop.myshopifyDomain | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"myshopifyDomain must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain == 'store-apiease-admin-staging.myshopify.com' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Authenticated shop identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- assign rows = '' | split: '' -%}\n{%- assign products = '' | split: '' -%}\n{%- assign active = nil -%}\n{%- assign checking = nil -%}\n{%- assign index = 0 -%}\n{%- assign polls = 0 -%}\n{%- assign maximum = 3 -%}\n{%- assign newRow = nil -%}\n{%- assign hasState = p | has_key: 'state' -%}\n{%- if hasState -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'state' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.shop | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.shop != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"shop must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.shop == 'store-apiease-admin-staging.myshopify.com' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Continuation shop mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'marker' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.marker | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.marker != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"marker must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'active' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.runId == runId and p.state.marker == marker -%}\n{%- assign valid = false -%}\n{%- assign error = \"Continuation run mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.products | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'rows' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.rows | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'index' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.index | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'polls' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.polls | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'maximum' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.maximum | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign products = p.state.products -%}\n{%- assign rows = p.state.rows -%}\n{%- assign active = p.state.active -%}\n{%- assign index = p.state.index -%}\n{%- assign polls = p.state.polls -%}\n{%- assign maximum = p.state.maximum -%}\n{%- assign checking = p.state | map: 'checking' | first | default: nil -%}\n{%- endif -%}\n{%- else -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.products | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign products = p.products -%}\n{%- assign hasMaximum = p | has_key: 'maximum' -%}\n{%- if hasMaximum -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'maximum' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.maximum | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign maximum = p.maximum -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless maximum > 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"maximum must be a positive integer\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign products = products | slice: 0, maximum -%}\n{%- assign count = products | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless index >= 0 and index <= count -%}\n{%- assign valid = false -%}\n{%- assign error = \"Invalid continuation index\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless polls >= 0 and polls <= 20 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Invalid media polling counter\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if active != nil -%}\n{%- if valid -%}\n{%- assign valid = active | has_key: 'destinationId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active.destinationId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active.shop | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless active.shop != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"shop must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active | has_key: 'marker' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active.marker | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless active.marker != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"marker must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless active.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless active.shop == p.state.shop and active.marker == marker and active.runId == runId -%}\n{%- assign valid = false -%}\n{%- assign error = \"Active product provenance mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-ownership\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ active.destinationId | json }}}}} as own -%}\n{%- if valid -%}\n{%- assign valid = own | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless own.status >= 200 and own.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = own.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data.data | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data.data.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data.data.product | has_key: 'tags' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data.data.product.tags | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless own.data.data.product.tags contains marker -%}\n{%- assign valid = false -%}\n{%- assign error = \"Active product ownership mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign previousIndex = index | minus: 1 -%}\n{%- assign sourceProduct = products[previousIndex] -%}\n{%- assign expectedImages = sourceProduct.images | size -%}\n{%- call {\"requestId\":\"product-import-media-observation\",\"liquidParamsEmbedded\":{\"productId\":{{ active.destinationId | json }},\"expectedImages\":{{ expectedImages | json }}}} as observation -%}\n{%- if valid -%}\n{%- assign valid = observation | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless observation.status >= 200 and observation.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless observation.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation.data | has_key: 'ready' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation.data.ready | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign observedReady = observation.data.ready -%}\n{%- endif -%}\n{%- assign polls = polls | plus: 1 -%}\n{%- endif -%}\n{%- if valid and observedReady -%}\n{%- assign newRow = active -%}\n{%- assign finalOutcome = 'created' -%}\n{%- assign finalReason = 'Created and images ready.' -%}\n{%- unless active.writeAttempted -%}\n{%- assign finalOutcome = 'skipped' -%}\n{%- assign finalReason = 'Recovered fixture fields verified; images ready; no creation needed.' -%}\n{%- endunless -%}\n{%- assign active = nil -%}\n{%- elsif valid and polls < 20 -%}\n{%- assign error = '' -%}\n{%- else -%}\n{%- assign newRow = active -%}\n{%- assign finalOutcome = 'incomplete' -%}\n{%- assign finalReason = 'Media verification failed or exceeded 20 observations; product ID retained.' -%}\n{%- assign active = nil -%}\n{%- assign valid = true -%}\n{%- endif -%}\n{%- elsif index < count -%}\n{%- assign selectedProduct = products[index] -%}\n{%- call {\"requestId\":\"product-import-create-one\",\"liquidParamsEmbedded\":{\"runId\":{{ runId | json }},\"product\":{{ selectedProduct | json }},\"duplicateState\":{{ checking | json }}}} as attempt -%}\n{%- if valid -%}\n{%- assign valid = attempt | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless attempt.status >= 200 and attempt.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless attempt.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt.data | has_key: 'row' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt.data.row | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if attempt.data.row.outcome == 'checking' -%}\n{%- assign checking = attempt.data.row.duplicateEvidence.state -%}\n{%- else -%}\n{%- assign checking = nil -%}\n{%- assign index = index | plus: 1 -%}\n{%- assign polls = 0 -%}\n{%- if attempt.data.row.outcome == 'pending' -%}\n{%- assign active = attempt.data.row -%}\n{%- else -%}\n{%- assign newRow = attempt.data.row -%}\n{%- assign finalOutcome = newRow.outcome -%}\n{%- assign finalReason = newRow.reason -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- assign createdCount = 0 -%}\n{%- assign skippedCount = 0 -%}\n{%- assign failedCount = 0 -%}\n{%- for row in rows -%}\n{%- case row.outcome -%}\n{%- when 'created' -%}\n{%- assign createdCount = createdCount | plus: 1 -%}\n{%- when 'skipped' -%}\n{%- assign skippedCount = skippedCount | plus: 1 -%}\n{%- else -%}\n{%- assign failedCount = failedCount | plus: 1 -%}\n{%- endcase -%}\n{%- endfor -%}\n{%- if newRow != nil -%}\n{%- case finalOutcome -%}\n{%- when 'created' -%}\n{%- assign createdCount = createdCount | plus: 1 -%}\n{%- when 'skipped' -%}\n{%- assign skippedCount = skippedCount | plus: 1 -%}\n{%- else -%}\n{%- assign failedCount = failedCount | plus: 1 -%}\n{%- endcase -%}\n{%- endif -%}\n{%- assign done = false -%}\n{%- if index == count and active == nil -%}\n{%- assign done = true -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"done\":{{ done | json }},\"retryAfterSeconds\":3,\"totals\":{\"selected\":{{ count | json }},\"attempted\":{{ index | json }},\"created\":{{ createdCount | json }},\"skipped\":{{ skippedCount | json }},\"failed\":{{ failedCount | json }}},\"state\":{\"shop\":\"store-apiease-admin-staging.myshopify.com\",\"runId\":{{ runId | json }},\"marker\":{{ marker | json }},\"maximum\":{{ maximum | json }},\"products\":{{ products | json }},\"index\":{{ index | json }},\"polls\":{{ polls | json }},\"active\":{{ active | json }},\"checking\":{{ checking | json }},\"rows\":[{%- for row in rows -%}\n{{ row | json }}{%- unless forloop.last -%}\n,{%- endunless -%}\n{%- endfor -%}\n{%- if newRow != nil -%}\n{%- if rows.size > 0 -%}\n,{%- endif -%}\n{\"outcome\":{{ finalOutcome | json }},\"reason\":{{ finalReason | json }},\"sourceId\":{{ newRow.sourceId | json }},\"destinationId\":{{ newRow.destinationId | json }},\"shop\":{{ newRow.shop | json }},\"runId\":{{ runId | json }},\"marker\":{{ marker | json }},\"handle\":{{ newRow.handle | json }},\"writeAttempted\":{{ newRow.writeAttempted | json }},\"duplicateEvidence\":{{ newRow.duplicateEvidence | json }},\"mutationErrors\":{{ newRow.mutationErrors | json }}}{%- endif -%}\n]},\"error\":null}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "product import workflow",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-create-one.json

TITLE
product import create one (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Attempts one selected product only after identity, default location, mapping and full-catalog duplicate prerequisites succeed. Returns run ownership and any product ID before media observation. Never retries creation; partial and ambiguous outcomes remain explicit.",
  "formatVersion": 1,
  "handle": "product-import-create-one",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign runId = p.runId -%}\n{%- assign runLength = runId | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless runLength >= 8 and runLength <= 48 -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must be 8–48 lowercase letters, digits or hyphens\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign allowed = 'abcdefghijklmnopqrstuvwxyz0123456789-' -%}\n{%- assign chars = runId | split: '' -%}\n{%- for ch in chars -%}\n{%- unless allowed contains ch -%}\n{%- assign valid = false -%}\n{%- endunless -%}\n{%- endfor -%}\n{%- endif -%}\n{%- assign marker = 'apiease-product-import:' | append: runId -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product | is_type: 'object' -%}\n{%- endif -%}\n{%- assign productId = nil -%}\n{%- assign outcome = 'failed' -%}\n{%- assign reason = 'Prerequisite failed; no creation attempted.' -%}\n{%- assign sourceId = nil -%}\n{%- assign productHandle = nil -%}\n{%- assign writeAttempted = false -%}\n{%- assign duplicateEvidence = nil -%}\n{%- if valid -%}\n{%- assign sourceId = p.product | map: 'id' | first | default: nil -%}\n{%- assign productHandle = p.product | map: 'handle' | first | default: nil -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-shop-context\"} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | has_key: 'myshopifyDomain' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop.myshopifyDomain | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"myshopifyDomain must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain == 'store-apiease-admin-staging.myshopify.com' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Authenticated shop identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"read-default-location\"} as loc -%}\n{%- if valid -%}\n{%- assign valid = loc | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless loc.status >= 200 and loc.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = loc.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data.data | has_key: 'location' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data.data.location | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data.data.location | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data.data.location.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless loc.data.data.location.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-map-input\",\"liquidParamsEmbedded\":{\"product\":{{ p.product | json }},\"locationId\":{{ loc.data.data.location.id | json }},\"marker\":{{ marker | json }}}} as mapped -%}\n{%- if valid -%}\n{%- assign valid = mapped | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = mapped.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless mapped.status >= 200 and mapped.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = mapped | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = mapped.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = mapped.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = mapped.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless mapped.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign duplicateState = p | map: 'duplicateState' | first | default: nil -%}\n{%- call {\"requestId\":\"product-import-duplicates\",\"liquidParamsEmbedded\":{\"product\":{{ p.product | json }},\"state\":{{ duplicateState | json }}}} as duplicates -%}\n{%- if valid -%}\n{%- assign valid = duplicates | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = duplicates.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless duplicates.status >= 200 and duplicates.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = duplicates | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = duplicates.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = duplicates.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = duplicates.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless duplicates.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- assign duplicateEvidence = duplicates.data -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if duplicates.data.complete != true -%}\n{%- assign outcome = 'checking' -%}\n{%- assign reason = 'Catalog scan in progress; no creation attempted.' -%}\n{%- elsif duplicates.data.handleProductId != nil -%}\n{%- assign outcome = 'skipped' -%}\n{%- assign reason = 'exact_handle' -%}\n{%- assign productId = duplicates.data.handleProductId -%}\n{%- call {\"requestId\":\"product-import-ownership\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ productId | json }}}}} as existing -%}\n{%- if valid -%}\n{%- assign valid = existing | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = existing.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless existing.status >= 200 and existing.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = existing | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = existing.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = existing.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = existing.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = existing.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = existing.data.data | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = existing.data.data.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = existing.data.data.product | has_key: 'tags' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = existing.data.data.product.tags | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless existing.data.data.product.tags contains marker -%}\n{%- assign valid = false -%}\n{%- assign error = \"Existing seed handle is not owned by this run\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-complete-product\",\"liquidParamsEmbedded\":{\"productId\":{{ productId | json }}}} as recovered -%}\n{%- if valid -%}\n{%- assign valid = recovered | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = recovered.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless recovered.status >= 200 and recovered.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = recovered | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = recovered.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = recovered.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = recovered.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless recovered.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless recovered.data.product.title == p.product.title -%}\n{%- assign valid = false -%}\n{%- assign error = \"Recovered fixture title mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless recovered.data.product.handle == p.product.handle -%}\n{%- assign valid = false -%}\n{%- assign error = \"Recovered fixture handle mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless recovered.data.product.descriptionHtml == p.product.descriptionHtml -%}\n{%- assign valid = false -%}\n{%- assign error = \"Recovered fixture descriptionHtml mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign expectedOptions = p.product.options | json -%}\n{%- assign actualOptions = recovered.data.product.options | json -%}\n{%- assign expectedVariants = p.product.variants | size -%}\n{%- assign actualVariants = recovered.data.product.variants | size -%}\n{%- assign expectedImages = p.product.images | size -%}\n{%- assign actualImages = recovered.data.product.images | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless expectedOptions == actualOptions and expectedVariants == actualVariants and expectedImages == actualImages -%}\n{%- assign valid = false -%}\n{%- assign error = \"Recovered fixture collections mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for v in p.product.variants -%}\n{%- assign actualVariant = recovered.data.product.variants[forloop.index0] -%}\n{%- assign expectedSelected = v.selectedOptions | json -%}\n{%- assign actualSelected = actualVariant.selectedOptions | json -%}\n{%- if valid -%}\n{%- unless v.sku == actualVariant.sku and v.price == actualVariant.price and v.inventoryQuantity == actualVariant.inventoryQuantity and expectedSelected == actualSelected -%}\n{%- assign valid = false -%}\n{%- assign error = \"Recovered fixture variant mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- for im in p.product.images -%}\n{%- assign actualImage = recovered.data.product.images[forloop.index0] -%}\n{%- if valid -%}\n{%- unless im.altText == actualImage.altText -%}\n{%- assign valid = false -%}\n{%- assign error = \"Recovered fixture image alt mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign outcome = 'pending' -%}\n{%- assign reason = 'Recovered owned fixture; observe readiness before completing.' -%}\n{%- endif -%}\n{%- elsif duplicates.data.skuVariantId != nil -%}\n{%- assign outcome = 'skipped' -%}\n{%- assign reason = 'exact_sku' -%}\n{%- else -%}\n{%- assign writeAttempted = true -%}\n{%- assign outcome = 'uncertain' -%}\n{%- assign reason = 'Creation response uncertain; reconcile exact run marker and handle before retrying.' -%}\n{%- call {\"requestId\":\"product-import-create\",\"bodyEmbedded\":{\"variables\":{\"input\":{{ mapped.data.input | json }}}}} as created -%}\n{%- assign createData = created | map: 'data' | first | default: '' -%}\n{%- assign createGraph = createData | map: 'data' | first | default: '' -%}\n{%- assign operation = createGraph | map: 'productSet' | first | default: '' -%}\n{%- assign createdProduct = operation | map: 'product' | first | default: '' -%}\n{%- assign productId = createdProduct | map: 'id' | first | default: nil -%}\n{%- if valid -%}\n{%- assign valid = created | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless created.status >= 200 and created.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = created.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data.data | has_key: 'productSet' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data.data.productSet | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data.data.productSet | has_key: 'userErrors' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data.data.productSet.userErrors | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign mutationErrors = created.data.data.productSet.userErrors | size -%}\n{%- if mutationErrors > 0 -%}\n{%- assign valid = false -%}\n{%- assign error = 'Shopify rejected creation; inspect mutationErrors.' -%}\n{%- assign outcome = 'failed' -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = createdProduct | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = createdProduct.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless createdProduct.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = createdProduct | has_key: 'tags' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = createdProduct.tags | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless createdProduct.tags contains marker -%}\n{%- assign valid = false -%}\n{%- assign error = \"Created product ownership marker missing\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless createdProduct.handle == p.product.handle -%}\n{%- assign valid = false -%}\n{%- assign error = \"Created product handle mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign outcome = 'pending' -%}\n{%- assign reason = 'Created; media verification pending.' -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- unless valid -%}\n{%- unless writeAttempted -%}\n{%- assign outcome = 'failed' -%}\n{%- endunless -%}\n{%- if productId != nil and writeAttempted -%}\n{%- assign outcome = 'incomplete' -%}\n{%- endif -%}\n{%- assign reason = error -%}\n{%- endunless -%}\n{\"success\":true,\"row\":{\"outcome\":{{ outcome | json }},\"reason\":{{ reason | json }},\"sourceId\":{{ sourceId | json }},\"destinationId\":{{ productId | json }},\"shop\":\"store-apiease-admin-staging.myshopify.com\",\"runId\":{{ runId | json }},\"marker\":{{ marker | json }},\"handle\":{{ productHandle | json }},\"writeAttempted\":{{ writeAttempted | json }},\"duplicateEvidence\":{{ duplicateEvidence | json }},\"mutationErrors\":{%- if writeAttempted -%}\n{{ operation | map: \"userErrors\" | first | default: nil | json }}{%- else -%}\nnull{%- endif -%}\n},\"error\":null}",
  "name": "product import create one",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-shop-context.json

TITLE
product import shop context (request)

CONTENT
```json
{
  "address": "https://store-apiease-admin-staging.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads authenticated shop identity and currently granted app scopes before workflow writes. No credentials in source.",
  "formatVersion": 1,
  "handle": "product-import-shop-context",
  "method": "POST",
  "name": "product import shop context",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ImportShopContext { shop { id myshopifyDomain } currentAppInstallation { accessScopes { handle } } }\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-map-input.json

TITLE
product import map input (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Validates complete product rows and maps only creation fields; no Shopify source IDs are copied. Total sellable inventoryQuantity becomes available inventory at the supplied default location, with tracking enabled.",
  "formatVersion": 1,
  "handle": "product-import-map-input",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'locationId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.locationId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.locationId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"locationId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'marker' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.marker | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.marker != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"marker must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign product = p.product -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product | has_key: 'title' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product.title | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product | has_key: 'handle' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product.handle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product | has_key: 'descriptionHtml' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product.descriptionHtml | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product | has_key: 'options' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product.options | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product | has_key: 'variants' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product.variants | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product | has_key: 'images' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product.images | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign variantCount = product.variants | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless variantCount > 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Product needs variants\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for v in product.variants -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'sku' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = v.sku | is_type: 'string' -%}\n{%- assign nullValue = v.sku | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"sku must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'price' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.price | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless v.price != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"price must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'inventoryQuantity' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.inventoryQuantity | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'selectedOptions' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.selectedOptions | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for o in v.selectedOptions -%}\n{%- if valid -%}\n{%- assign valid = o | has_key: 'name' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = o.name | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless o.name != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"name must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = o | has_key: 'value' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = o.value | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless o.value != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"value must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- endfor -%}\n{%- for o in product.options -%}\n{%- if valid -%}\n{%- assign valid = o | has_key: 'name' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = o.name | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless o.name != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"name must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = o | has_key: 'values' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = o.values | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for value in o.values -%}\n{%- assign valueValid = value | is_type: 'string' -%}\n{%- if valid -%}\n{%- unless valueValid -%}\n{%- assign valid = false -%}\n{%- assign error = \"Option values must be strings\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- endfor -%}\n{%- for im in product.images -%}\n{%- if valid -%}\n{%- assign valid = im | has_key: 'url' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = im.url | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless im.url != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"url must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = im | has_key: 'altText' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = im.altText | is_type: 'string' -%}\n{%- assign nullValue = im.altText | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"altText must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"input\":{\"title\":{{ product.title | json }},\"handle\":{{ product.handle | json }},\"descriptionHtml\":{{ product.descriptionHtml | json }},\"status\":\"DRAFT\",\"tags\":[{{ p.marker | json }}],\"productOptions\":[{%- for o in product.options -%}\n{\"name\":{{ o.name | json }},\"values\":[{%- for value in o.values -%}\n{\"name\":{{ value | json }}}{%- unless forloop.last -%}\n,{%- endunless -%}\n{%- endfor -%}\n]}{%- unless forloop.last -%}\n,{%- endunless -%}\n{%- endfor -%}\n],\"variants\":[{%- for v in product.variants -%}\n{\"sku\":{{ v.sku | json }},\"price\":{{ v.price | json }},\"optionValues\":[{%- for o in v.selectedOptions -%}\n{\"optionName\":{{ o.name | json }},\"name\":{{ o.value | json }}}{%- unless forloop.last -%}\n,{%- endunless -%}\n{%- endfor -%}\n],\"inventoryItem\":{\"tracked\":true},\"inventoryQuantities\":[{\"locationId\":{{ p.locationId | json }},\"name\":\"available\",\"quantity\":{{ v.inventoryQuantity | json }}}]}{%- unless forloop.last -%}\n,{%- endunless -%}\n{%- endfor -%}\n],\"files\":[{%- for im in product.images -%}\n{\"originalSource\":{{ im.url | json }},\"alt\":{{ im.altText | json }},\"contentType\":\"IMAGE\"}{%- unless forloop.last -%}\n,{%- endunless -%}\n{%- endfor -%}\n]},\"error\":null}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "product import map input",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-duplicates.json

TITLE
product import duplicates (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Checks exact whole handles and every nonempty source SKU against the entire destination catalog through existing readers and matching filters. All pages must succeed before an absence or match is finalized.",
  "formatVersion": 1,
  "handle": "product-import-duplicates",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product | has_key: 'handle' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product.handle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.product.handle != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"handle must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product | has_key: 'variants' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product.variants | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for v in p.product.variants -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'sku' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = v.sku | is_type: 'string' -%}\n{%- assign nullValue = v.sku | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"sku must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- assign phase = 'products' -%}\n{%- assign cursor = nil -%}\n{%- assign cursors = '' | split: '' -%}\n{%- assign handleId = nil -%}\n{%- assign variantId = nil -%}\n{%- assign handlePages = 0 -%}\n{%- assign skuPages = 0 -%}\n{%- assign complete = false -%}\n{%- assign hasState = p | has_key: 'state' -%}\n{%- if valid -%}\n{%- assign sourceSkus = p.product.variants | map: 'sku' -%}\n{%- if hasState -%}\n{%- if p.state != nil -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'state' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'phase' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.phase | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.phase != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"phase must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'productHandle' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.productHandle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.productHandle != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"productHandle must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'sourceSkus' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.sourceSkus | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'cursors' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.cursors | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'handlePages' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.handlePages | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'skuPages' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.skuPages | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'cursor' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = p.state.cursor | is_type: 'string' -%}\n{%- assign nullValue = p.state.cursor | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"cursor must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'handleProductId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = p.state.handleProductId | is_type: 'string' -%}\n{%- assign nullValue = p.state.handleProductId | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"handleProductId must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'skuVariantId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = p.state.skuVariantId | is_type: 'string' -%}\n{%- assign nullValue = p.state.skuVariantId | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"skuVariantId must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign savedSkus = p.state.sourceSkus | json -%}\n{%- assign currentSkus = sourceSkus | json -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.productHandle == p.product.handle and savedSkus == currentSkus -%}\n{%- assign valid = false -%}\n{%- assign error = \"Duplicate continuation product mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.phase == 'products' or p.state.phase == 'variants' or p.state.phase == 'done' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Duplicate continuation phase invalid\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign phase = p.state.phase -%}\n{%- assign cursor = p.state.cursor -%}\n{%- assign cursors = p.state.cursors -%}\n{%- assign handleId = p.state.handleProductId -%}\n{%- assign variantId = p.state.skuVariantId -%}\n{%- assign handlePages = p.state.handlePages -%}\n{%- assign skuPages = p.state.skuPages -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if phase == 'products' -%}\n{%- call {\"requestId\":\"read-product-page\",\"bodyEmbedded\":{\"variables\":{\"after\":{{ cursor | json }}}}} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products | has_key: 'nodes' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products.nodes | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products | has_key: 'pageInfo' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products.pageInfo | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products.pageInfo | has_key: 'hasNextPage' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products.pageInfo.hasNextPage | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign hasMore = r.data.data.products.pageInfo.hasNextPage -%}\n{%- if hasMore -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products.pageInfo | has_key: 'endCursor' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products.pageInfo.endCursor | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.products.pageInfo.endCursor != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"endCursor must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.products.pageInfo.endCursor != cursor -%}\n{%- assign valid = false -%}\n{%- assign error = \"Pagination cursor did not advance\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign lastNode = r.data.data.products.nodes | last -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = lastNode | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = lastNode.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless lastNode.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign pageId = lastNode.id | split: '/' | last -%}\n{%- if cursors contains pageId -%}\n{%- assign valid = false -%}\n{%- assign error = 'Repeated pagination page.' -%}\n{%- endif -%}\n{%- assign singlePageId = pageId | split: ',' -%}\n{%- assign cursors = cursors | concat: singlePageId -%}\n{%- assign cursor = r.data.data.products.pageInfo.endCursor -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign handlePages = handlePages | plus: 1 -%}\n{%- call {\"requestId\":\"filter-products-exact-handle\",\"liquidParamsEmbedded\":{\"products\":{{ r.data.data.products.nodes | json }},\"expectedHandle\":{{ p.product.handle | json }}}} as matches -%}\n{%- if valid -%}\n{%- assign valid = matches | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless matches.status >= 200 and matches.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless matches.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data.products | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for m in matches.data.products -%}\n{%- if valid -%}\n{%- assign valid = m | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless m.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign handleId = m.id -%}\n{%- endif -%}\n{%- endfor -%}\n{%- unless hasMore -%}\n{%- assign phase = 'variants' -%}\n{%- assign cursor = nil -%}\n{%- assign cursors = '' | split: '' -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- elsif phase == 'variants' -%}\n{%- call {\"requestId\":\"product-import-catalog-sku-page\",\"bodyEmbedded\":{\"variables\":{\"after\":{{ cursor | json }}}}} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'productVariants' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants | has_key: 'nodes' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants.nodes | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants | has_key: 'pageInfo' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants.pageInfo | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants.pageInfo | has_key: 'hasNextPage' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants.pageInfo.hasNextPage | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign hasMore = r.data.data.productVariants.pageInfo.hasNextPage -%}\n{%- if hasMore -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants.pageInfo | has_key: 'endCursor' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants.pageInfo.endCursor | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.productVariants.pageInfo.endCursor != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"endCursor must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.productVariants.pageInfo.endCursor != cursor -%}\n{%- assign valid = false -%}\n{%- assign error = \"Pagination cursor did not advance\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign lastNode = r.data.data.productVariants.nodes | last -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = lastNode | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = lastNode.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless lastNode.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign pageId = lastNode.id | split: '/' | last -%}\n{%- if cursors contains pageId -%}\n{%- assign valid = false -%}\n{%- assign error = 'Repeated pagination page.' -%}\n{%- endif -%}\n{%- assign singlePageId = pageId | split: ',' -%}\n{%- assign cursors = cursors | concat: singlePageId -%}\n{%- assign cursor = r.data.data.productVariants.pageInfo.endCursor -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign skuPages = skuPages | plus: 1 -%}\n{%- for candidate in r.data.data.productVariants.nodes -%}\n{%- if valid -%}\n{%- assign valid = candidate | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = candidate.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless candidate.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = candidate | has_key: 'sku' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = candidate.sku | is_type: 'string' -%}\n{%- assign nullValue = candidate.sku | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"sku must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- for v in p.product.variants -%}\n{%- if v.sku != '' and v.sku != nil -%}\n{%- if valid -%}\n{%- assign candidates = r.data.data.productVariants.nodes | where: 'sku', v.sku -%}\n{%- assign candidateCount = candidates | size -%}\n{%- if candidateCount > 0 -%}\n{%- call {\"requestId\":\"filter-variants-exact-sku\",\"liquidParamsEmbedded\":{\"variants\":{{ candidates | json }},\"expectedSku\":{{ v.sku | json }}}} as matches -%}\n{%- if valid -%}\n{%- assign valid = matches | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless matches.status >= 200 and matches.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless matches.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data | has_key: 'variants' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data.variants | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for m in matches.data.variants -%}\n{%- if valid -%}\n{%- assign valid = m | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless m.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign variantId = m.id -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endfor -%}\n{%- unless hasMore -%}\n{%- assign phase = 'done' -%}\n{%- assign cursor = nil -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if phase == 'done' -%}\n{%- assign complete = true -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"complete\":{{ complete | json }},\"handleProductId\":{{ handleId | json }},\"skuVariantId\":{{ variantId | json }},\"pages\":{\"products\":{{ handlePages | json }},\"variants\":{{ skuPages | json }}},\"state\":{%- if complete -%}\nnull{%- else -%}\n{\"phase\":{{ phase | json }},\"productHandle\":{{ p.product.handle | json }},\"sourceSkus\":{{ sourceSkus | json }},\"cursor\":{{ cursor | json }},\"cursors\":{{ cursors | json }},\"handleProductId\":{{ handleId | json }},\"skuVariantId\":{{ variantId | json }},\"handlePages\":{{ handlePages | json }},\"skuPages\":{{ skuPages | json }}}{%- endif -%}\n,\"error\":null}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "product import duplicates",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-catalog-sku-page.json

TITLE
product import catalog sku page (request)

CONTENT
```json
{
  "address": "https://store-apiease-admin-staging.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads one bounded catalog SKU page for duplicate continuations. Uses 20 variants per page so large existing catalogs do not require oversized runtime state. Fixture variant/image readers retain their two-item pages.",
  "formatVersion": 1,
  "handle": "product-import-catalog-sku-page",
  "method": "POST",
  "name": "product import catalog sku page",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ImportCatalogSkus($after: String) { productVariants(first: 20, after: $after, sortKey: ID) { nodes { id sku } pageInfo { hasNextPage endCursor } } }\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-create.json

TITLE
product import create (request)

CONTENT
```json
{
  "address": "https://store-apiease-admin-staging.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Creation leaf used only after complete duplicate and prerequisite checks. Caller omits all source IDs, includes run ownership tags, and retains every returned ID even on incomplete outcomes.",
  "formatVersion": 1,
  "handle": "product-import-create",
  "method": "POST",
  "name": "product import create",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"mutation ImportCreate($input: ProductSetInput!) { productSet(input: $input, synchronous: true) { product { id handle tags } userErrors { field message code } } }\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-ownership.json

TITLE
product import ownership (request)

CONTENT
```json
{
  "address": "https://store-apiease-admin-staging.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads one recorded product and its exact ownership tags; preserves null for already absent products.",
  "formatVersion": 1,
  "handle": "product-import-ownership",
  "method": "POST",
  "name": "product import ownership",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ImportOwnership($productId: ID!) { shop { id myshopifyDomain } product(id: $productId) { id handle tags } }\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-owned-page.json

TITLE
product import owned page (request)

CONTENT
```json
{
  "address": "https://store-apiease-admin-staging.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads a small page of run-tag candidates. Callers must verify each returned exact tag and exhaust pagination.",
  "formatVersion": 1,
  "handle": "product-import-owned-page",
  "method": "POST",
  "name": "product import owned page",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ImportOwnedPage($query: String!, $after: String) { products(first: 2, after: $after, query: $query, sortKey: ID) { nodes { id title handle tags descriptionHtml options { name values } } pageInfo { hasNextPage endCursor } } }\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-complete-product.json

TITLE
product import complete product (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Assembles complete detail, variant and image data through the existing saved readers. Every connection must terminate with a valid nonrepeating cursor sequence. Errors never return partial products as complete.",
  "formatVersion": 1,
  "handle": "product-import-complete-product",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'productId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.productId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.productId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"productId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- assign variants = '' | split: '' -%}\n{%- assign images = '' | split: '' -%}\n{%- assign variantPages = 0 -%}\n{%- assign imagePages = 0 -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"read-product-detail-page\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ p.productId | json }}}}} as detail -%}\n{%- if valid -%}\n{%- assign valid = detail | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless detail.status >= 200 and detail.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = detail.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless detail.data.data.product.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product | has_key: 'title' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product.title | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless detail.data.data.product.title != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"title must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product | has_key: 'handle' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product.handle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless detail.data.data.product.handle != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"handle must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product | has_key: 'descriptionHtml' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product.descriptionHtml | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product | has_key: 'options' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product.options | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless detail.data.data.product.id == p.productId -%}\n{%- assign valid = false -%}\n{%- assign error = \"Product detail identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- assign hasMore = true -%}\n{%- assign cursor = nil -%}\n{%- assign cursors = '' | split: '' -%}\n{%- while hasMore and valid -%}\n{%- call {\"requestId\":\"read-product-variant-page\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ p.productId | json }},\"after\":{{ cursor | json }}}}} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.product.id == p.productId -%}\n{%- assign valid = false -%}\n{%- assign error = \"Page product identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product | has_key: 'variants' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants | has_key: 'nodes' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants.nodes | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants | has_key: 'pageInfo' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants.pageInfo | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants.pageInfo | has_key: 'hasNextPage' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants.pageInfo.hasNextPage | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign hasMore = r.data.data.product.variants.pageInfo.hasNextPage -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if hasMore -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants.pageInfo | has_key: 'endCursor' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants.pageInfo.endCursor | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.product.variants.pageInfo.endCursor != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"endCursor must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign cursor = r.data.data.product.variants.pageInfo.endCursor -%}\n{%- if cursors contains cursor -%}\n{%- assign valid = false -%}\n{%- assign error = 'Repeated pagination cursor.' -%}\n{%- endif -%}\n{%- assign cursorSingle = r.data.data.product.variants.pageInfo | map: 'endCursor' -%}\n{%- assign cursors = cursors | concat: cursorSingle -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign variants = variants | concat: r.data.data.product.variants.nodes -%}\n{%- assign variantPages = variantPages | plus: 1 -%}\n{%- endif -%}\n{%- endwhile -%}\n{%- assign hasMore = true -%}\n{%- assign cursor = nil -%}\n{%- assign cursors = '' | split: '' -%}\n{%- while hasMore and valid -%}\n{%- call {\"requestId\":\"read-product-image-page\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ p.productId | json }},\"after\":{{ cursor | json }}}}} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.product.id == p.productId -%}\n{%- assign valid = false -%}\n{%- assign error = \"Page product identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product | has_key: 'images' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images | has_key: 'nodes' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images.nodes | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images | has_key: 'pageInfo' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images.pageInfo | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images.pageInfo | has_key: 'hasNextPage' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images.pageInfo.hasNextPage | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign hasMore = r.data.data.product.images.pageInfo.hasNextPage -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if hasMore -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images.pageInfo | has_key: 'endCursor' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images.pageInfo.endCursor | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.product.images.pageInfo.endCursor != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"endCursor must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign cursor = r.data.data.product.images.pageInfo.endCursor -%}\n{%- if cursors contains cursor -%}\n{%- assign valid = false -%}\n{%- assign error = 'Repeated pagination cursor.' -%}\n{%- endif -%}\n{%- assign cursorSingle = r.data.data.product.images.pageInfo | map: 'endCursor' -%}\n{%- assign cursors = cursors | concat: cursorSingle -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign images = images | concat: r.data.data.product.images.nodes -%}\n{%- assign imagePages = imagePages | plus: 1 -%}\n{%- endif -%}\n{%- endwhile -%}\n{%- if valid -%}\n{%- for option in detail.data.data.product.options -%}\n{%- if valid -%}\n{%- assign valid = option | has_key: 'name' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = option.name | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless option.name != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"name must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = option | has_key: 'values' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = option.values | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for value in option.values -%}\n{%- assign valueValid = value | is_type: 'string' -%}\n{%- if valid -%}\n{%- unless valueValid -%}\n{%- assign valid = false -%}\n{%- assign error = \"Malformed option value\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- endfor -%}\n{%- for v in variants -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless v.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'sku' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = v.sku | is_type: 'string' -%}\n{%- assign nullValue = v.sku | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"sku must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'price' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.price | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless v.price != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"price must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'inventoryQuantity' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.inventoryQuantity | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'selectedOptions' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.selectedOptions | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for selected in v.selectedOptions -%}\n{%- if valid -%}\n{%- assign valid = selected | has_key: 'name' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = selected.name | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless selected.name != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"name must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = selected | has_key: 'value' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = selected.value | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless selected.value != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"value must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- endfor -%}\n{%- for im in images -%}\n{%- if valid -%}\n{%- assign valid = im | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = im.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless im.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = im | has_key: 'url' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = im.url | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless im.url != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"url must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = im | has_key: 'altText' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = im.altText | is_type: 'string' -%}\n{%- assign nullValue = im.altText | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"altText must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"product\":{\"id\":{{ p.productId | json }},\"title\":{{ detail.data.data.product.title | json }},\"handle\":{{ detail.data.data.product.handle | json }},\"descriptionHtml\":{{ detail.data.data.product.descriptionHtml | json }},\"options\":{{ detail.data.data.product.options | json }},\"variants\":{{ variants | json }},\"images\":{{ images | json }}},\"pages\":{\"variants\":{{ variantPages | json }},\"images\":{{ imagePages | json }}},\"error\":null}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "product import complete product",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-media-observation.json

TITLE
product import media observation (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Observes all media pages once, distinguishing pending, ready and failed images. The workflow returns a three-second continuation delay and a maximum of 20 observations; no busy polling or hidden timers.",
  "formatVersion": 1,
  "handle": "product-import-media-observation",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'productId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.productId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.productId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"productId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'expectedImages' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.expectedImages | is_type: 'integer' -%}\n{%- endif -%}\n{%- assign mediaCount = 0 -%}\n{%- assign ready = true -%}\n{%- assign pages = 0 -%}\n{%- assign hasMore = true -%}\n{%- assign cursor = nil -%}\n{%- assign cursors = '' | split: '' -%}\n{%- while hasMore and valid -%}\n{%- call {\"requestId\":\"read-product-media-page\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ p.productId | json }},\"after\":{{ cursor | json }}}}} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.product.id == p.productId -%}\n{%- assign valid = false -%}\n{%- assign error = \"Media product identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product | has_key: 'media' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media | has_key: 'nodes' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media.nodes | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media | has_key: 'pageInfo' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media.pageInfo | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media.pageInfo | has_key: 'hasNextPage' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media.pageInfo.hasNextPage | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign hasMore = r.data.data.product.media.pageInfo.hasNextPage -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if hasMore -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media.pageInfo | has_key: 'endCursor' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media.pageInfo.endCursor | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.product.media.pageInfo.endCursor != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"endCursor must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign cursor = r.data.data.product.media.pageInfo.endCursor -%}\n{%- if cursors contains cursor -%}\n{%- assign valid = false -%}\n{%- assign error = 'Repeated pagination cursor.' -%}\n{%- endif -%}\n{%- assign cursorSingle = r.data.data.product.media.pageInfo | map: 'endCursor' -%}\n{%- assign cursors = cursors | concat: cursorSingle -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign pages = pages | plus: 1 -%}\n{%- for m in r.data.data.product.media.nodes -%}\n{%- if valid -%}\n{%- assign valid = m | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.status | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless m.status != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"status must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m | has_key: 'mediaErrors' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.mediaErrors | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign mediaErrorCount = m.mediaErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless m.status != 'FAILED' and mediaErrorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Image processing failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if m.mediaContentType == 'IMAGE' -%}\n{%- assign mediaCount = mediaCount | plus: 1 -%}\n{%- if m.status != 'READY' -%}\n{%- assign ready = false -%}\n{%- else -%}\n{%- if valid -%}\n{%- assign valid = m | has_key: 'image' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.image | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.image | has_key: 'url' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.image.url | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless m.image.url != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"url must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- endwhile -%}\n{%- if valid -%}\n{%- if mediaCount != p.expectedImages -%}\n{%- assign ready = false -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"ready\":{{ ready | json }},\"imageCount\":{{ mediaCount | json }},\"pages\":{{ pages | json }},\"error\":null}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "product import media observation",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/product-import-delete.json

TITLE
product import delete (request)

CONTENT
```json
{
  "address": "https://store-apiease-admin-staging.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Deletes one explicit product ID after the cleanup coordinator checks shop identity and exact run ownership.",
  "formatVersion": 1,
  "handle": "product-import-delete",
  "method": "POST",
  "name": "product import delete",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"mutation ImportDelete($productId: ID!) { productDelete(input: {id: $productId}) { deletedProductId userErrors { field message } } }\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-product-page.json

TITLE
Read one page of products (request)

CONTENT
```json
{
  "address": "https://store-apiease-admin-staging.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads exactly one Shopify product page with a fixed page size of 2 and returns the native HTTP/GraphQL response, including errors. Optionally supply bodyEmbedded.variables.after with the previous endCursor unchanged; omitted or null reads the first page. Uses APIEase server-side Shopify authentication. No triggers or dependencies.",
  "formatVersion": 1,
  "handle": "read-product-page",
  "method": "POST",
  "name": "Read one page of products",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ReadProductPage($after: String) {\\n  products(first: 2, after: $after) {\\n    nodes {\\n      id\\n      title\\n      handle\\n    }\\n    pageInfo {\\n      hasNextPage\\n      endCursor\\n    }\\n  }\\n}\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-product-detail-page.json

TITLE
Read one product detail page by ID (request)

CONTENT
```json
{
  "address": "https://store-apiease-admin-staging.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads one Shopify product by the required bodyEmbedded.variables.productId with a fixed GraphQL query and returns the native HTTP/GraphQL response unchanged, including null products and errors. Selects id, title, handle, descriptionHtml, and option names and values in their returned order. Uses APIEase server-side Shopify authentication. Each invocation makes one Shopify request with no triggers, chaining, or dependencies.",
  "formatVersion": 1,
  "handle": "read-product-detail-page",
  "method": "POST",
  "name": "Read one product detail page by ID",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ReadProductDetailPage($productId: ID!) {\\n  product(id: $productId) {\\n    id\\n    title\\n    handle\\n    descriptionHtml\\n    options {\\n      name\\n      values\\n    }\\n  }\\n}\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-product-variant-page.json

TITLE
Read one page of a product’s variants (request)

CONTENT
```json
{
  "address": "https://store-apiease-admin-staging.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads exactly one page of variants belonging to the required bodyEmbedded.variables.productId, with optional after cursor and fixed page size 2. Returns parent and variant IDs, nullable SKU, decimal price, selected options, inventory quantity and inventory item tracking without conversion. Uses APIEase server-side Shopify authentication and returns the native HTTP/GraphQL response unchanged. Each invocation makes one Shopify request with no triggers, chaining or dependencies.",
  "formatVersion": 1,
  "handle": "read-product-variant-page",
  "method": "POST",
  "name": "Read one page of a product’s variants",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ReadProductVariantPage($productId: ID!, $after: String) {\\n  product(id: $productId) {\\n    id\\n    variants(first: 2, after: $after) {\\n      nodes {\\n        id\\n        sku\\n        price\\n        selectedOptions { name value }\\n        inventoryQuantity\\n        inventoryItem { id tracked }\\n      }\\n      pageInfo { hasNextPage endCursor }\\n    }\\n  }\\n}\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-product-image-page.json

TITLE
Read one page of a product’s images (request)

CONTENT
```json
{
  "address": "https://store-apiease-admin-staging.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads exactly one image connection page for the required bodyEmbedded.variables.productId, with optional after cursor and fixed page size 2. Returns the parent ID and ordered image IDs, URLs and nullable alt text through the supported 2026-10 images projection. Preserves empty collections, null products and errors. Uses APIEase server-side Shopify authentication and returns the native HTTP/GraphQL response unchanged. Each invocation makes one Shopify request with no triggers, chaining or dependencies.",
  "formatVersion": 1,
  "handle": "read-product-image-page",
  "method": "POST",
  "name": "Read one page of a product’s images",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ReadProductImagePage($productId: ID!, $after: String) {\\n  product(id: $productId) {\\n    id\\n    images(first: 2, after: $after) {\\n      nodes { id url altText }\\n      pageInfo { hasNextPage endCursor }\\n    }\\n  }\\n}\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-product-media-page.json

TITLE
Read one page of product media status (request)

CONTENT
```json
{
  "address": "https://store-apiease-admin-staging.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads exactly one media connection page for the required bodyEmbedded.variables.productId, with optional after cursor and fixed page size 2. Returns parent and media IDs, content type, processing status, media error codes and messages, and image URL and nullable alt text for MediaImage. Preserves all returned types and statuses without filtering, polling or deciding readiness. Uses APIEase server-side Shopify authentication and returns the native HTTP/GraphQL response unchanged. Each invocation makes one Shopify request with no triggers, chaining or dependencies.",
  "formatVersion": 1,
  "handle": "read-product-media-page",
  "method": "POST",
  "name": "Read one page of product media status",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ReadProductMediaPage($productId: ID!, $after: String) {\\n  product(id: $productId) {\\n    id\\n    media(first: 2, after: $after) {\\n      nodes {\\n        id\\n        mediaContentType\\n        status\\n        mediaErrors { code message }\\n        ... on MediaImage { image { url altText } }\\n      }\\n      pageInfo { hasNextPage endCursor }\\n    }\\n  }\\n}\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/read-default-location.json

TITLE
Read the default destination location (request)

CONTENT
```json
{
  "address": "https://store-apiease-admin-staging.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads the authenticated shop’s primary location ID using the Shopify location query without an ID argument. Takes no runtime inputs and preserves a null location or errors. Uses APIEase server-side Shopify authentication and returns the native HTTP/GraphQL response unchanged. Each invocation makes one Shopify request with no product or variant reads, triggers, chaining or dependencies.",
  "formatVersion": 1,
  "handle": "read-default-location",
  "method": "POST",
  "name": "Read the default destination location",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ReadDefaultLocation {\\n  location { id }\\n}\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/match-title-prefix.json

TITLE
Match a title against a literal prefix (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "title must be a string and prefix must be a nonempty string; both fields are required. Compares literal values case-sensitively without normalization. Reads liquidParamsEmbedded and returns success, matches, and error. No saved defaults, triggers, dependencies, or Shopify calls.",
  "formatVersion": 1,
  "handle": "match-title-prefix",
  "liquid": "{%- assign valid = true -%}\n{%- assign matches = false -%}\n{%- assign inputs = nil -%}\n{%- assign hasInputs = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInputs -%}\n  {%- assign inputs = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'title' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.title | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'prefix' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.prefix | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.prefix == '' -%}{%- assign valid = false -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign prefixLength = inputs.prefix | size -%}\n  {%- assign titlePrefix = inputs.title | slice: 0, prefixLength -%}\n  {%- if titlePrefix == inputs.prefix -%}{%- assign matches = true -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"matches\":{{ matches | json }},\"error\":null}\n{%- else -%}\n{\"success\":false,\"matches\":false,\"error\":\"title must be a string and prefix must be a nonempty string; both fields are required.\"}\n{%- endif -%}\n",
  "name": "Match a title against a literal prefix",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/filter-products-exact-handle.json

TITLE
Filter supplied products by exact handle (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Filters caller-supplied products by invoking only match-exact-handle for each handle, using liquidParamsEmbedded. Requires an array of objects and a nonempty expectedHandle string, including for empty arrays. Preserves complete matching objects, order, and repeats. Malformed input or an unusable matcher execution/result fails the whole filter with an empty list. No saved defaults, triggers, or Shopify calls.",
  "formatVersion": 1,
  "handle": "filter-products-exact-handle",
  "liquid": "{%- assign valid = true -%}\n{%- assign inputs = nil -%}\n{%- assign selected = '' | split: '' -%}\n{%- assign hasInputs = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInputs -%}\n  {%- assign inputs = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.products | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'expectedHandle' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.expectedHandle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.expectedHandle == '' -%}{%- assign valid = false -%}{%- endif -%}\n{%- endif -%}\n{%- assign error = 'products must be an array and expectedHandle must be a nonempty string; both fields are required.' -%}\n{%- if valid -%}\n  {%- for item in inputs.products -%}\n    {%- assign valid = item | has_key: 'handle' -%}\n    {%- assign error = 'Each products item must be an object with a valid handle field.' -%}\n    {%- if valid -%}\n      {%- call {\"requestId\":\"match-exact-handle\",\"liquidParamsEmbedded\":{\"candidateHandle\":{{ item.handle | json }},\"expectedHandle\":{{ inputs.expectedHandle | json }}}} as matcherResult -%}\n      {%- assign error = 'The match-exact-handle call failed or returned an unusable result.' -%}\n      {%- assign valid = matcherResult | has_key: 'status' -%}\n      {%- if valid -%}\n        {%- assign valid = matcherResult.status | is_type: 'integer' -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- if matcherResult.status < 200 or matcherResult.status >= 300 -%}{%- assign valid = false -%}{%- endif -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign valid = matcherResult | has_key: 'data' -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign hasSuccess = matcherResult.data | has_key: 'success' -%}\n        {%- assign hasMatches = matcherResult.data | has_key: 'matches' -%}\n        {%- assign hasError = matcherResult.data | has_key: 'error' -%}\n        {%- unless hasSuccess and hasMatches and hasError -%}{%- assign valid = false -%}{%- endunless -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign successIsBoolean = matcherResult.data.success | is_type: 'boolean' -%}\n        {%- assign matchesIsBoolean = matcherResult.data.matches | is_type: 'boolean' -%}\n        {%- assign errorIsNull = matcherResult.data.error | is_type: 'null' -%}\n        {%- unless successIsBoolean and matchesIsBoolean and errorIsNull and matcherResult.data.success == true -%}{%- assign valid = false -%}{%- endunless -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- if matcherResult.data.matches -%}\n          {%- assign singleton = inputs.products | slice: forloop.index0, 1 -%}\n          {%- assign selected = selected | concat: singleton -%}\n        {%- endif -%}\n      {%- endif -%}\n    {%- endif -%}\n    {%- unless valid -%}{%- break -%}{%- endunless -%}\n  {%- endfor -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"products\":{{ selected | json }},\"error\":null}\n{%- else -%}\n{\"success\":false,\"products\":[],\"error\":{{ error | json }}}\n{%- endif -%}\n",
  "name": "Filter supplied products by exact handle",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/match-exact-handle.json

TITLE
Match two handles exactly (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "candidateHandle and expectedHandle must both be present nonempty strings. Compares literal values case-sensitively without normalization. Reads liquidParamsEmbedded and returns success, matches, and error. No saved defaults, triggers, dependencies, or Shopify calls.",
  "formatVersion": 1,
  "handle": "match-exact-handle",
  "liquid": "{%- assign valid = true -%}\n{%- assign matches = false -%}\n{%- assign inputs = nil -%}\n{%- assign hasInputs = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInputs -%}\n  {%- assign inputs = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'candidateHandle' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.candidateHandle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.candidateHandle == '' -%}{%- assign valid = false -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'expectedHandle' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.expectedHandle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.expectedHandle == '' -%}{%- assign valid = false -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.candidateHandle == inputs.expectedHandle -%}{%- assign matches = true -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"matches\":{{ matches | json }},\"error\":null}\n{%- else -%}\n{\"success\":false,\"matches\":false,\"error\":\"candidateHandle and expectedHandle must both be present nonempty strings.\"}\n{%- endif -%}\n",
  "name": "Match two handles exactly",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/filter-variants-exact-sku.json

TITLE
Filter supplied variants by exact SKU (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Filters caller-supplied variants by invoking only match-exact-sku for each sku, using liquidParamsEmbedded. Requires an array of objects and a nonempty expectedSku string, including for empty arrays. Preserves complete matching objects, order, and repeats. Malformed input or an unusable matcher execution/result fails the whole filter with an empty list. No saved defaults, triggers, or Shopify calls.",
  "formatVersion": 1,
  "handle": "filter-variants-exact-sku",
  "liquid": "{%- assign valid = true -%}\n{%- assign inputs = nil -%}\n{%- assign selected = '' | split: '' -%}\n{%- assign hasInputs = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInputs -%}\n  {%- assign inputs = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'variants' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.variants | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'expectedSku' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.expectedSku | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.expectedSku == '' -%}{%- assign valid = false -%}{%- endif -%}\n{%- endif -%}\n{%- assign error = 'variants must be an array and expectedSku must be a nonempty string; both fields are required.' -%}\n{%- if valid -%}\n  {%- for item in inputs.variants -%}\n    {%- assign valid = item | has_key: 'sku' -%}\n    {%- assign error = 'Each variants item must be an object with a valid sku field.' -%}\n    {%- if valid -%}\n      {%- call {\"requestId\":\"match-exact-sku\",\"liquidParamsEmbedded\":{\"candidateSku\":{{ item.sku | json }},\"expectedSku\":{{ inputs.expectedSku | json }}}} as matcherResult -%}\n      {%- assign error = 'The match-exact-sku call failed or returned an unusable result.' -%}\n      {%- assign valid = matcherResult | has_key: 'status' -%}\n      {%- if valid -%}\n        {%- assign valid = matcherResult.status | is_type: 'integer' -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- if matcherResult.status < 200 or matcherResult.status >= 300 -%}{%- assign valid = false -%}{%- endif -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign valid = matcherResult | has_key: 'data' -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign hasSuccess = matcherResult.data | has_key: 'success' -%}\n        {%- assign hasMatches = matcherResult.data | has_key: 'matches' -%}\n        {%- assign hasError = matcherResult.data | has_key: 'error' -%}\n        {%- unless hasSuccess and hasMatches and hasError -%}{%- assign valid = false -%}{%- endunless -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign successIsBoolean = matcherResult.data.success | is_type: 'boolean' -%}\n        {%- assign matchesIsBoolean = matcherResult.data.matches | is_type: 'boolean' -%}\n        {%- assign errorIsNull = matcherResult.data.error | is_type: 'null' -%}\n        {%- unless successIsBoolean and matchesIsBoolean and errorIsNull and matcherResult.data.success == true -%}{%- assign valid = false -%}{%- endunless -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- if matcherResult.data.matches -%}\n          {%- assign singleton = inputs.variants | slice: forloop.index0, 1 -%}\n          {%- assign selected = selected | concat: singleton -%}\n        {%- endif -%}\n      {%- endif -%}\n    {%- endif -%}\n    {%- unless valid -%}{%- break -%}{%- endunless -%}\n  {%- endfor -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"variants\":{{ selected | json }},\"error\":null}\n{%- else -%}\n{\"success\":false,\"variants\":[],\"error\":{{ error | json }}}\n{%- endif -%}\n",
  "name": "Filter supplied variants by exact SKU",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/source/resources/requests/match-exact-sku.json

TITLE
Match a nonempty SKU exactly (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "candidateSku must be present as a string or null; expectedSku must be a present nonempty string. Compares literal values case-sensitively without normalization. Reads liquidParamsEmbedded and returns success, matches, and error. No saved defaults, triggers, dependencies, or Shopify calls.",
  "formatVersion": 1,
  "handle": "match-exact-sku",
  "liquid": "{%- assign valid = true -%}\n{%- assign matches = false -%}\n{%- assign inputs = nil -%}\n{%- assign hasInputs = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInputs -%}\n  {%- assign inputs = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'candidateSku' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.candidateSku | is_type: 'string' -%}\n  {%- assign isNull = inputs.candidateSku | is_type: 'null' -%}\n  {%- if isNull -%}{%- assign valid = true -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'expectedSku' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.expectedSku | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.expectedSku == '' -%}{%- assign valid = false -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.candidateSku == inputs.expectedSku -%}{%- assign matches = true -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"matches\":{{ matches | json }},\"error\":null}\n{%- else -%}\n{\"success\":false,\"matches\":false,\"error\":\"candidateSku must be present as a string or null; expectedSku must be a present nonempty string.\"}\n{%- endif -%}\n",
  "name": "Match a nonempty SKU exactly",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/README.md

TITLE
Destination Store Requests for the Product Import Lifecycle

CONTENT
# Destination Store Requests for the Product Import Lifecycle

These requests run in the destination store, represented by
`yourstore.myshopify.com`. The importer takes the successful source
reader's complete data object as `source`; it does not call the source store by
itself. Both the envelope and each eligible row must identify the expected source
shop, run ID, and marker. The per-row title must still begin with `Staging Products`.

The initial call is `{runId, source, maximum?}` through `liquidParamsEmbedded`;
subsequent calls supply `{runId, state}` unchanged. A positive integer maximum
defaults to three selected attempts. An exact whole handle or any nonempty exact
SKU anywhere in the destination catalog causes a skip, including matches on
products unrelated to this test run. Every catalog page is still checked.

The destination `product-import-create-one` skips an exact handle instead of
recovering and checking source fixtures. Its source provenance and title checks
also differ from the source package. Keep this version with the destination
coordinator and cleanup identity checks.

See the [connected workflow](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/README.md) for the shared continuation, authorization,
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
| [import-product-import-test](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/import-product-import-test.json) | liquid | `{runId,source,maximum?}`; then `{runId,state}` | Validate source envelope and import selected attempts. |
| [cleanup-product-import-test](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/cleanup-product-import-test.json) | liquid | `{runId,shop,products}` | Per-ID `deleted`, `absent`, `refused`, or `uncertain` rows. |
| [product-import-workflow](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-workflow.json) | liquid | `{runId,products,maximum?}` or `{runId,state}` | One duplicate-page step, possible creation, or media observation; ordered rows and totals. |
| [product-import-create-one](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-create-one.json) | liquid | `{runId,product,duplicateState?}` | One row with prerequisites, duplicate evidence, outcome and any destination ID. |
| [product-import-shop-context](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-shop-context.json) | http | No variables | Native GraphQL shop identity and current app access scopes. |
| [product-import-map-input](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-map-input.json) | liquid | `{product,locationId,marker}` | `{success,input,error}` with draft `ProductSetInput` and no source IDs. |
| [product-import-duplicates](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-duplicates.json) | liquid | `{product,state?}` | `{success,complete,handleProductId,skuVariantId,pages,state,error}`; one page per call. |
| [product-import-catalog-sku-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-catalog-sku-page.json) | http | `after?` | Native catalog variant IDs/SKUs and page info; page size 20, ordered by ID. |
| [product-import-create](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-create.json) | http | `input` | Native synchronous `productSet` result, product identity and `userErrors`. |
| [product-import-ownership](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-ownership.json) | http | `productId` | Native shop identity and product ID/handle/tags, or null product. |
| [product-import-owned-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-owned-page.json) | http | `query`, `after?` | Native tag-search candidates and page info; callers must compare exact tags. |
| [product-import-complete-product](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-complete-product.json) | liquid | `{productId}` | `{success,product,pages,error}` with all detail, variants and images. |
| [product-import-media-observation](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-media-observation.json) | liquid | `{productId,expectedImages}` | `{success,ready,...}` after a complete media traversal; never sleeps internally. |
| [product-import-inventory-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-inventory-page.json) | http | `productId`, `locationId`, `after?` | Native tracked inventory and location `available` quantities for independent readback. |
| [product-import-delete](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-delete.json) | http | `productId` | Native `productDelete` result and `userErrors`; call only through verified cleanup. |
| [read-product-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-product-page.json) | http | `after?` | Native product IDs/titles/handles and page info; one page of 2. |
| [read-product-detail-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-product-detail-page.json) | http | `productId` | Native product fields/options, null product, or GraphQL error. |
| [read-product-variant-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-product-variant-page.json) | http | `productId`, `after?` | Native variants: IDs, SKUs, prices, selected options, sellable inventory and tracking; page size 2. |
| [read-product-image-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-product-image-page.json) | http | `productId`, `after?` | Native image IDs, URLs, nullable alt text and page info; page size 2. |
| [read-product-media-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-product-media-page.json) | http | `productId`, `after?` | Native media types/statuses/errors and image data; page size 2. |
| [read-default-location](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-default-location.json) | http | No variables | Native primary/default location ID, null, or errors. |
| [match-title-prefix](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/match-title-prefix.json) | liquid | `{title,prefix}` | `{success,matches,error}`; literal, case-sensitive prefix comparison. |
| [filter-products-exact-handle](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/filter-products-exact-handle.json) | liquid | `{products,expectedHandle}` | `{success,products,error}`; preserve complete matching objects and order. |
| [match-exact-handle](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/match-exact-handle.json) | liquid | `{candidateHandle,expectedHandle}` | `{success,matches,error}`; whole nonempty strings compared exactly. |
| [filter-variants-exact-sku](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/filter-variants-exact-sku.json) | liquid | `{variants,expectedSku}` | `{success,variants,error}`; preserve complete exact matches and order. |
| [match-exact-sku](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/match-exact-sku.json) | liquid | `{candidateSku,expectedSku}` | `{success,matches,error}`; null/empty candidate is a valid nonmatch to nonempty expected SKU. |

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
| [read-catalog-variant-page](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-catalog-variant-page.json) | A simple two-variant catalog page reader using `bodyEmbedded.variables.after`. The active duplicate scan uses the separate 20-row helper. |
| [filter-product-list](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/filter-product-list.json) | Filters supplied `{products,prefix}` through `match-title-prefix`, preserving complete objects. It does not fetch products or enforce run ownership. The matcher is included here. |
| [staging-product-import-connection](https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/staging-product-import-connection.json) | Optional authenticated HTTP call to the source APIEase remote caller; defaults to `read-product-import-test`. Requires manual configuration of its Sensitive APIEase key field. |

The connection retains `value:{"mode":"preserve"}` for `x-apiease-api-key`. On a
new resource this defers credential entry; it neither contains nor transfers the
verified shop's key. Configure a source APIEase key securely in the authenticated
request editor, plus the actual source APIEase endpoint and shop header. This
is not a Shopify access token. Pass the run input as serialized
`liquidParamsEmbedded` in `queryParamsEmbedded`, and validate both the outer HTTP
and inner remote-caller response before using the reader data. Its source
description retains historical `stageApiPath` deployment wording; the actual
address is a fixed `/api/remote/caller/call` endpoint, not a project-deployment
relay. The verified cycle used separate secure connections directly, so it does
not establish end-to-end execution through this optional bridge.

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/import-product-import-test.json

TITLE
import product import test (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Imports a complete real-staging reader envelope into local using a durable continuation. Validates source/run provenance, checks whole-catalog exact handle/SKU duplicates, preserves product fields and total sellable inventory, and records IDs before bounded image polling.",
  "formatVersion": 1,
  "handle": "import-product-import-test",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- assign runId = '' -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign runId = p.runId -%}\n{%- assign runLength = runId | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless runLength >= 8 and runLength <= 48 -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must be 8–48 lowercase letters, digits or hyphens\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign allowed = 'abcdefghijklmnopqrstuvwxyz0123456789-' -%}\n{%- assign chars = runId | split: '' -%}\n{%- for ch in chars -%}\n{%- unless allowed contains ch -%}\n{%- assign valid = false -%}\n{%- endunless -%}\n{%- endfor -%}\n{%- endif -%}\n{%- assign marker = 'apiease-product-import:' | append: runId -%}\n{%- assign hasState = p | has_key: 'state' -%}\n{%- if hasState -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-workflow\",\"liquidParamsEmbedded\":{\"runId\":{{ runId | json }},\"state\":{{ p.state | json }}}} as workflow -%}\n{%- if valid -%}\n{%- assign valid = workflow | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless workflow.status >= 200 and workflow.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless workflow.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- else -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'source' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.source | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.source | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.source.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.source | has_key: 'complete' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.source.complete | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.source.success == true and p.source.complete == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Reader did not complete successfully\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.source | has_key: 'sourceShop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.source.sourceShop | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.source.sourceShop != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"sourceShop must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.source | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.source.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.source.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.source | has_key: 'marker' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.source.marker | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.source.marker != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"marker must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.source.sourceShop == 'store-apiease-admin-staging.myshopify.com' and p.source.runId == runId and p.source.marker == marker -%}\n{%- assign valid = false -%}\n{%- assign error = \"Source provenance mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.source | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.source.products | is_type: 'array' -%}\n{%- endif -%}\n{%- assign maximum = 3 -%}\n{%- if valid -%}\n{%- assign hasMaximum = p | has_key: 'maximum' -%}\n{%- if hasMaximum -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'maximum' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.maximum | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign maximum = p.maximum -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-workflow\",\"liquidParamsEmbedded\":{\"runId\":{{ runId | json }},\"maximum\":{{ maximum | json }},\"products\":{{ p.source.products | json }}}} as workflow -%}\n{%- if valid -%}\n{%- assign valid = workflow | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless workflow.status >= 200 and workflow.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = workflow.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless workflow.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{{ workflow.data | json }}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "import product import test",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/cleanup-product-import-test.json

TITLE
cleanup product import test (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Deletes explicit manifest IDs only after checking this shop, runId and exact ownership tag. Already absent is successful. Independent deletions continue after errors, with readback verification and uncertain outcomes retained. Invoke once per shop with the same persisted run manifest.",
  "formatVersion": 1,
  "handle": "cleanup-product-import-test",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- assign runId = '' -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign runId = p.runId -%}\n{%- assign runLength = runId | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless runLength >= 8 and runLength <= 48 -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must be 8–48 lowercase letters, digits or hyphens\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign allowed = 'abcdefghijklmnopqrstuvwxyz0123456789-' -%}\n{%- assign chars = runId | split: '' -%}\n{%- for ch in chars -%}\n{%- unless allowed contains ch -%}\n{%- assign valid = false -%}\n{%- endunless -%}\n{%- endfor -%}\n{%- endif -%}\n{%- assign marker = 'apiease-product-import:' | append: runId -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.shop | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.shop != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"shop must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.shop == 'yourstore.myshopify.com' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Cleanup shop mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.products | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-shop-context\"} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | has_key: 'myshopifyDomain' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop.myshopifyDomain | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"myshopifyDomain must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain == 'yourstore.myshopify.com' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Authenticated shop identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- assign rowsJSON = '' -%}\n{%- assign failed = 0 -%}\n{%- assign removed = 0 -%}\n{%- if valid -%}\n{%- for item in p.products -%}\n{%- assign valid = true -%}\n{%- assign outcome = 'refused' -%}\n{%- assign reason = 'Manifest or ownership mismatch.' -%}\n{%- assign id = nil -%}\n{%- if valid -%}\n{%- assign valid = item | has_key: 'productId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item.productId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless item.productId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"productId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item.shop | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless item.shop != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"shop must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item | has_key: 'marker' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item.marker | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless item.marker != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"marker must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = item.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless item.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless item.shop == 'yourstore.myshopify.com' and item.marker == marker and item.runId == runId -%}\n{%- assign valid = false -%}\n{%- assign error = \"Manifest shop or ownership mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign id = item.productId -%}\n{%- call {\"requestId\":\"product-import-ownership\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ id | json }}}}} as before -%}\n{%- if valid -%}\n{%- assign valid = before | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = before.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless before.status >= 200 and before.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = before | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = before.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = before.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = before.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = before.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless before.data.data.shop.myshopifyDomain == 'yourstore.myshopify.com' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Observed cleanup shop mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign exists = before.data.data | has_key: \"product\" -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless exists -%}\n{%- assign valid = false -%}\n{%- assign error = \"Unreadable product existence\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if before.data.data.product == nil -%}\n{%- assign outcome = 'absent' -%}\n{%- assign reason = 'Already absent.' -%}\n{%- else -%}\n{%- if valid -%}\n{%- assign valid = before.data.data.product | has_key: 'tags' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = before.data.data.product.tags | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless before.data.data.product.tags contains marker -%}\n{%- assign valid = false -%}\n{%- assign error = \"Exact run ownership marker does not match\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless before.data.data.product.id == id -%}\n{%- assign valid = false -%}\n{%- assign error = \"Product identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign outcome = 'uncertain' -%}\n{%- call {\"requestId\":\"product-import-delete\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ id | json }}}}} as deleted -%}\n{%- if valid -%}\n{%- assign valid = deleted | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless deleted.status >= 200 and deleted.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = deleted.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data.data | has_key: 'productDelete' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data.data.productDelete | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data.data.productDelete | has_key: 'userErrors' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = deleted.data.data.productDelete.userErrors | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign deleteErrors = deleted.data.data.productDelete.userErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless deleteErrors == 0 and deleted.data.data.productDelete.deletedProductId == id -%}\n{%- assign valid = false -%}\n{%- assign error = \"Delete failed or returned an uncertain result\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-ownership\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ id | json }}}}} as after -%}\n{%- if valid -%}\n{%- assign valid = after | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless after.status >= 200 and after.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = after.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after.data.data | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = after.data.data.product | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign outcome = 'deleted' -%}\n{%- assign reason = 'Deletion verified absent.' -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- unless valid -%}\n{%- assign reason = error -%}\n{%- assign failed = failed | plus: 1 -%}\n{%- else -%}\n{%- assign removed = removed | plus: 1 -%}\n{%- endunless -%}\n{%- capture row -%}\n{\"productId\":{{ id | json }},\"shop\":\"yourstore.myshopify.com\",\"runId\":{{ runId | json }},\"marker\":{{ marker | json }},\"outcome\":{{ outcome | json }},\"reason\":{{ reason | json }}}{%- endcapture -%}\n{%- if rowsJSON != '' -%}\n{%- assign rowsJSON = rowsJSON | append: ',' -%}\n{%- endif -%}\n{%- assign rowsJSON = rowsJSON | append: row -%}\n{%- endfor -%}\n{%- assign valid = true -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"rows\":[{{ rowsJSON }}],\"totals\":{\"removedOrAbsent\":{{ removed | json }},\"failed\":{{ failed | json }}},\"error\":null}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "cleanup product import test",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-workflow.json

TITLE
product import workflow (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Runs a persisted continuation with one creation attempt or one full media observation per call. Defaults maximum to 3 selected attempts. Each returned state must be durably recorded before continuing after retryAfterSeconds. Maximum 20 media observations, no mutation retries.",
  "formatVersion": 1,
  "handle": "product-import-workflow",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign runId = p.runId -%}\n{%- assign runLength = runId | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless runLength >= 8 and runLength <= 48 -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must be 8–48 lowercase letters, digits or hyphens\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign allowed = 'abcdefghijklmnopqrstuvwxyz0123456789-' -%}\n{%- assign chars = runId | split: '' -%}\n{%- for ch in chars -%}\n{%- unless allowed contains ch -%}\n{%- assign valid = false -%}\n{%- endunless -%}\n{%- endfor -%}\n{%- endif -%}\n{%- assign marker = 'apiease-product-import:' | append: runId -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-shop-context\"} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | has_key: 'myshopifyDomain' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop.myshopifyDomain | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"myshopifyDomain must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain == 'yourstore.myshopify.com' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Authenticated shop identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- assign rows = '' | split: '' -%}\n{%- assign products = '' | split: '' -%}\n{%- assign active = nil -%}\n{%- assign checking = nil -%}\n{%- assign index = 0 -%}\n{%- assign polls = 0 -%}\n{%- assign maximum = 3 -%}\n{%- assign newRow = nil -%}\n{%- assign hasState = p | has_key: 'state' -%}\n{%- if hasState -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'state' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.shop | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.shop != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"shop must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.shop == 'yourstore.myshopify.com' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Continuation shop mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'marker' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.marker | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.marker != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"marker must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'active' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.runId == runId and p.state.marker == marker -%}\n{%- assign valid = false -%}\n{%- assign error = \"Continuation run mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.products | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'rows' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.rows | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'index' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.index | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'polls' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.polls | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'maximum' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.maximum | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign products = p.state.products -%}\n{%- assign rows = p.state.rows -%}\n{%- assign active = p.state.active -%}\n{%- assign index = p.state.index -%}\n{%- assign polls = p.state.polls -%}\n{%- assign maximum = p.state.maximum -%}\n{%- assign checking = p.state | map: 'checking' | first | default: nil -%}\n{%- endif -%}\n{%- else -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.products | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign products = p.products -%}\n{%- assign hasMaximum = p | has_key: 'maximum' -%}\n{%- if hasMaximum -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'maximum' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.maximum | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign maximum = p.maximum -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless maximum > 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"maximum must be a positive integer\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign products = products | slice: 0, maximum -%}\n{%- assign count = products | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless index >= 0 and index <= count -%}\n{%- assign valid = false -%}\n{%- assign error = \"Invalid continuation index\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless polls >= 0 and polls <= 20 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Invalid media polling counter\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if active != nil -%}\n{%- if valid -%}\n{%- assign valid = active | has_key: 'destinationId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active.destinationId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active.shop | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless active.shop != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"shop must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active | has_key: 'marker' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active.marker | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless active.marker != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"marker must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = active.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless active.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless active.shop == p.state.shop and active.marker == marker and active.runId == runId -%}\n{%- assign valid = false -%}\n{%- assign error = \"Active product provenance mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-ownership\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ active.destinationId | json }}}}} as own -%}\n{%- if valid -%}\n{%- assign valid = own | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless own.status >= 200 and own.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = own.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data.data | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data.data.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data.data.product | has_key: 'tags' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = own.data.data.product.tags | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless own.data.data.product.tags contains marker -%}\n{%- assign valid = false -%}\n{%- assign error = \"Active product ownership mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign previousIndex = index | minus: 1 -%}\n{%- assign sourceProduct = products[previousIndex] -%}\n{%- assign expectedImages = sourceProduct.images | size -%}\n{%- call {\"requestId\":\"product-import-media-observation\",\"liquidParamsEmbedded\":{\"productId\":{{ active.destinationId | json }},\"expectedImages\":{{ expectedImages | json }}}} as observation -%}\n{%- if valid -%}\n{%- assign valid = observation | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless observation.status >= 200 and observation.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless observation.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation.data | has_key: 'ready' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = observation.data.ready | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign observedReady = observation.data.ready -%}\n{%- endif -%}\n{%- assign polls = polls | plus: 1 -%}\n{%- endif -%}\n{%- if valid and observedReady -%}\n{%- assign newRow = active -%}\n{%- assign finalOutcome = 'created' -%}\n{%- assign finalReason = 'Created and images ready.' -%}\n{%- unless active.writeAttempted -%}\n{%- assign finalOutcome = 'skipped' -%}\n{%- assign finalReason = 'Recovered fixture fields verified; images ready; no creation needed.' -%}\n{%- endunless -%}\n{%- assign active = nil -%}\n{%- elsif valid and polls < 20 -%}\n{%- assign error = '' -%}\n{%- else -%}\n{%- assign newRow = active -%}\n{%- assign finalOutcome = 'incomplete' -%}\n{%- assign finalReason = 'Media verification failed or exceeded 20 observations; product ID retained.' -%}\n{%- assign active = nil -%}\n{%- assign valid = true -%}\n{%- endif -%}\n{%- elsif index < count -%}\n{%- assign selectedProduct = products[index] -%}\n{%- call {\"requestId\":\"product-import-create-one\",\"liquidParamsEmbedded\":{\"runId\":{{ runId | json }},\"product\":{{ selectedProduct | json }},\"duplicateState\":{{ checking | json }}}} as attempt -%}\n{%- if valid -%}\n{%- assign valid = attempt | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless attempt.status >= 200 and attempt.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless attempt.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt.data | has_key: 'row' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = attempt.data.row | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if attempt.data.row.outcome == 'checking' -%}\n{%- assign checking = attempt.data.row.duplicateEvidence.state -%}\n{%- else -%}\n{%- assign checking = nil -%}\n{%- assign index = index | plus: 1 -%}\n{%- assign polls = 0 -%}\n{%- if attempt.data.row.outcome == 'pending' -%}\n{%- assign active = attempt.data.row -%}\n{%- else -%}\n{%- assign newRow = attempt.data.row -%}\n{%- assign finalOutcome = newRow.outcome -%}\n{%- assign finalReason = newRow.reason -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- assign createdCount = 0 -%}\n{%- assign skippedCount = 0 -%}\n{%- assign failedCount = 0 -%}\n{%- for row in rows -%}\n{%- case row.outcome -%}\n{%- when 'created' -%}\n{%- assign createdCount = createdCount | plus: 1 -%}\n{%- when 'skipped' -%}\n{%- assign skippedCount = skippedCount | plus: 1 -%}\n{%- else -%}\n{%- assign failedCount = failedCount | plus: 1 -%}\n{%- endcase -%}\n{%- endfor -%}\n{%- if newRow != nil -%}\n{%- case finalOutcome -%}\n{%- when 'created' -%}\n{%- assign createdCount = createdCount | plus: 1 -%}\n{%- when 'skipped' -%}\n{%- assign skippedCount = skippedCount | plus: 1 -%}\n{%- else -%}\n{%- assign failedCount = failedCount | plus: 1 -%}\n{%- endcase -%}\n{%- endif -%}\n{%- assign done = false -%}\n{%- if index == count and active == nil -%}\n{%- assign done = true -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"done\":{{ done | json }},\"retryAfterSeconds\":3,\"totals\":{\"selected\":{{ count | json }},\"attempted\":{{ index | json }},\"created\":{{ createdCount | json }},\"skipped\":{{ skippedCount | json }},\"failed\":{{ failedCount | json }}},\"state\":{\"shop\":\"yourstore.myshopify.com\",\"runId\":{{ runId | json }},\"marker\":{{ marker | json }},\"maximum\":{{ maximum | json }},\"products\":{{ products | json }},\"index\":{{ index | json }},\"polls\":{{ polls | json }},\"active\":{{ active | json }},\"checking\":{{ checking | json }},\"rows\":[{%- for row in rows -%}\n{{ row | json }}{%- unless forloop.last -%}\n,{%- endunless -%}\n{%- endfor -%}\n{%- if newRow != nil -%}\n{%- if rows.size > 0 -%}\n,{%- endif -%}\n{\"outcome\":{{ finalOutcome | json }},\"reason\":{{ finalReason | json }},\"sourceId\":{{ newRow.sourceId | json }},\"destinationId\":{{ newRow.destinationId | json }},\"shop\":{{ newRow.shop | json }},\"runId\":{{ runId | json }},\"marker\":{{ marker | json }},\"handle\":{{ newRow.handle | json }},\"writeAttempted\":{{ newRow.writeAttempted | json }},\"duplicateEvidence\":{{ newRow.duplicateEvidence | json }},\"mutationErrors\":{{ newRow.mutationErrors | json }}}{%- endif -%}\n]},\"error\":null}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "product import workflow",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-create-one.json

TITLE
product import create one (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Attempts one selected product only after identity, default location, mapping and full-catalog duplicate prerequisites succeed. Returns run ownership and any product ID before media observation. Never retries creation; partial and ambiguous outcomes remain explicit.",
  "formatVersion": 1,
  "handle": "product-import-create-one",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign runId = p.runId -%}\n{%- assign runLength = runId | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless runLength >= 8 and runLength <= 48 -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must be 8–48 lowercase letters, digits or hyphens\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign allowed = 'abcdefghijklmnopqrstuvwxyz0123456789-' -%}\n{%- assign chars = runId | split: '' -%}\n{%- for ch in chars -%}\n{%- unless allowed contains ch -%}\n{%- assign valid = false -%}\n{%- endunless -%}\n{%- endfor -%}\n{%- endif -%}\n{%- assign marker = 'apiease-product-import:' | append: runId -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product | is_type: 'object' -%}\n{%- endif -%}\n{%- assign productId = nil -%}\n{%- assign outcome = 'failed' -%}\n{%- assign reason = 'Prerequisite failed; no creation attempted.' -%}\n{%- assign sourceId = nil -%}\n{%- assign productHandle = nil -%}\n{%- assign writeAttempted = false -%}\n{%- assign duplicateEvidence = nil -%}\n{%- if valid -%}\n{%- assign sourceId = p.product | map: 'id' | first | default: nil -%}\n{%- assign productHandle = p.product | map: 'handle' | first | default: nil -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-shop-context\"} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'shop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop | has_key: 'myshopifyDomain' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.shop.myshopifyDomain | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"myshopifyDomain must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.shop.myshopifyDomain == 'yourstore.myshopify.com' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Authenticated shop identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product | has_key: 'sourceShop' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product.sourceShop | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.product.sourceShop != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"sourceShop must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product | has_key: 'runId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product.runId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.product.runId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"runId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product | has_key: 'marker' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product.marker | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.product.marker != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"marker must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.product.sourceShop == 'store-apiease-admin-staging.myshopify.com' and p.product.runId == runId and p.product.marker == marker -%}\n{%- assign valid = false -%}\n{%- assign error = \"Source row provenance mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"match-title-prefix\",\"liquidParamsEmbedded\":{\"title\":{{ p.product.title | json }},\"prefix\":\"Staging Products\"}} as titleMatch -%}\n{%- if valid -%}\n{%- assign valid = titleMatch | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = titleMatch.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless titleMatch.status >= 200 and titleMatch.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = titleMatch | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = titleMatch.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = titleMatch.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = titleMatch.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless titleMatch.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless titleMatch.data.matches == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Source title is ineligible\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"read-default-location\"} as loc -%}\n{%- if valid -%}\n{%- assign valid = loc | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless loc.status >= 200 and loc.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = loc.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data.data | has_key: 'location' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data.data.location | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data.data.location | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = loc.data.data.location.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless loc.data.data.location.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"product-import-map-input\",\"liquidParamsEmbedded\":{\"product\":{{ p.product | json }},\"locationId\":{{ loc.data.data.location.id | json }},\"marker\":{{ marker | json }}}} as mapped -%}\n{%- if valid -%}\n{%- assign valid = mapped | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = mapped.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless mapped.status >= 200 and mapped.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = mapped | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = mapped.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = mapped.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = mapped.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless mapped.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign duplicateState = p | map: 'duplicateState' | first | default: nil -%}\n{%- call {\"requestId\":\"product-import-duplicates\",\"liquidParamsEmbedded\":{\"product\":{{ p.product | json }},\"state\":{{ duplicateState | json }}}} as duplicates -%}\n{%- if valid -%}\n{%- assign valid = duplicates | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = duplicates.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless duplicates.status >= 200 and duplicates.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = duplicates | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = duplicates.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = duplicates.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = duplicates.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless duplicates.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- assign duplicateEvidence = duplicates.data -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if duplicates.data.complete != true -%}\n{%- assign outcome = 'checking' -%}\n{%- assign reason = 'Catalog scan in progress; no creation attempted.' -%}\n{%- elsif duplicates.data.handleProductId != nil -%}\n{%- assign outcome = 'skipped' -%}\n{%- assign reason = 'exact_handle' -%}\n{%- assign productId = duplicates.data.handleProductId -%}\n{%- elsif duplicates.data.skuVariantId != nil -%}\n{%- assign outcome = 'skipped' -%}\n{%- assign reason = 'exact_sku' -%}\n{%- else -%}\n{%- assign writeAttempted = true -%}\n{%- assign outcome = 'uncertain' -%}\n{%- assign reason = 'Creation response uncertain; reconcile exact run marker and handle before retrying.' -%}\n{%- call {\"requestId\":\"product-import-create\",\"bodyEmbedded\":{\"variables\":{\"input\":{{ mapped.data.input | json }}}}} as created -%}\n{%- assign createData = created | map: 'data' | first | default: '' -%}\n{%- assign createGraph = createData | map: 'data' | first | default: '' -%}\n{%- assign operation = createGraph | map: 'productSet' | first | default: '' -%}\n{%- assign createdProduct = operation | map: 'product' | first | default: '' -%}\n{%- assign productId = createdProduct | map: 'id' | first | default: nil -%}\n{%- if valid -%}\n{%- assign valid = created | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless created.status >= 200 and created.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = created.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data.data | has_key: 'productSet' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data.data.productSet | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data.data.productSet | has_key: 'userErrors' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = created.data.data.productSet.userErrors | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign mutationErrors = created.data.data.productSet.userErrors | size -%}\n{%- if mutationErrors > 0 -%}\n{%- assign valid = false -%}\n{%- assign error = 'Shopify rejected creation; inspect mutationErrors.' -%}\n{%- assign outcome = 'failed' -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = createdProduct | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = createdProduct.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless createdProduct.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = createdProduct | has_key: 'tags' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = createdProduct.tags | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless createdProduct.tags contains marker -%}\n{%- assign valid = false -%}\n{%- assign error = \"Created product ownership marker missing\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless createdProduct.handle == p.product.handle -%}\n{%- assign valid = false -%}\n{%- assign error = \"Created product handle mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign outcome = 'pending' -%}\n{%- assign reason = 'Created; media verification pending.' -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- unless valid -%}\n{%- unless writeAttempted -%}\n{%- assign outcome = 'failed' -%}\n{%- endunless -%}\n{%- if productId != nil and writeAttempted -%}\n{%- assign outcome = 'incomplete' -%}\n{%- endif -%}\n{%- assign reason = error -%}\n{%- endunless -%}\n{\"success\":true,\"row\":{\"outcome\":{{ outcome | json }},\"reason\":{{ reason | json }},\"sourceId\":{{ sourceId | json }},\"destinationId\":{{ productId | json }},\"shop\":\"yourstore.myshopify.com\",\"runId\":{{ runId | json }},\"marker\":{{ marker | json }},\"handle\":{{ productHandle | json }},\"writeAttempted\":{{ writeAttempted | json }},\"duplicateEvidence\":{{ duplicateEvidence | json }},\"mutationErrors\":{%- if writeAttempted -%}\n{{ operation | map: \"userErrors\" | first | default: nil | json }}{%- else -%}\nnull{%- endif -%}\n},\"error\":null}",
  "name": "product import create one",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-shop-context.json

TITLE
product import shop context (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads authenticated shop identity and currently granted app scopes before workflow writes. No credentials in source.",
  "formatVersion": 1,
  "handle": "product-import-shop-context",
  "method": "POST",
  "name": "product import shop context",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ImportShopContext { shop { id myshopifyDomain } currentAppInstallation { accessScopes { handle } } }\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-map-input.json

TITLE
product import map input (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Validates complete product rows and maps only creation fields; no Shopify source IDs are copied. Total sellable inventoryQuantity becomes available inventory at the supplied default location, with tracking enabled.",
  "formatVersion": 1,
  "handle": "product-import-map-input",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'locationId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.locationId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.locationId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"locationId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'marker' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.marker | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.marker != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"marker must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign product = p.product -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product | has_key: 'title' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product.title | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product | has_key: 'handle' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product.handle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product | has_key: 'descriptionHtml' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product.descriptionHtml | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product | has_key: 'options' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product.options | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product | has_key: 'variants' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product.variants | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product | has_key: 'images' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = product.images | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign variantCount = product.variants | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless variantCount > 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Product needs variants\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for v in product.variants -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'sku' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = v.sku | is_type: 'string' -%}\n{%- assign nullValue = v.sku | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"sku must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'price' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.price | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless v.price != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"price must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'inventoryQuantity' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.inventoryQuantity | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'selectedOptions' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.selectedOptions | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for o in v.selectedOptions -%}\n{%- if valid -%}\n{%- assign valid = o | has_key: 'name' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = o.name | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless o.name != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"name must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = o | has_key: 'value' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = o.value | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless o.value != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"value must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- endfor -%}\n{%- for o in product.options -%}\n{%- if valid -%}\n{%- assign valid = o | has_key: 'name' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = o.name | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless o.name != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"name must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = o | has_key: 'values' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = o.values | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for value in o.values -%}\n{%- assign valueValid = value | is_type: 'string' -%}\n{%- if valid -%}\n{%- unless valueValid -%}\n{%- assign valid = false -%}\n{%- assign error = \"Option values must be strings\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- endfor -%}\n{%- for im in product.images -%}\n{%- if valid -%}\n{%- assign valid = im | has_key: 'url' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = im.url | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless im.url != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"url must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = im | has_key: 'altText' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = im.altText | is_type: 'string' -%}\n{%- assign nullValue = im.altText | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"altText must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"input\":{\"title\":{{ product.title | json }},\"handle\":{{ product.handle | json }},\"descriptionHtml\":{{ product.descriptionHtml | json }},\"status\":\"DRAFT\",\"tags\":[{{ p.marker | json }}],\"productOptions\":[{%- for o in product.options -%}\n{\"name\":{{ o.name | json }},\"values\":[{%- for value in o.values -%}\n{\"name\":{{ value | json }}}{%- unless forloop.last -%}\n,{%- endunless -%}\n{%- endfor -%}\n]}{%- unless forloop.last -%}\n,{%- endunless -%}\n{%- endfor -%}\n],\"variants\":[{%- for v in product.variants -%}\n{\"sku\":{{ v.sku | json }},\"price\":{{ v.price | json }},\"optionValues\":[{%- for o in v.selectedOptions -%}\n{\"optionName\":{{ o.name | json }},\"name\":{{ o.value | json }}}{%- unless forloop.last -%}\n,{%- endunless -%}\n{%- endfor -%}\n],\"inventoryItem\":{\"tracked\":true},\"inventoryQuantities\":[{\"locationId\":{{ p.locationId | json }},\"name\":\"available\",\"quantity\":{{ v.inventoryQuantity | json }}}]}{%- unless forloop.last -%}\n,{%- endunless -%}\n{%- endfor -%}\n],\"files\":[{%- for im in product.images -%}\n{\"originalSource\":{{ im.url | json }},\"alt\":{{ im.altText | json }},\"contentType\":\"IMAGE\"}{%- unless forloop.last -%}\n,{%- endunless -%}\n{%- endfor -%}\n]},\"error\":null}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "product import map input",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-duplicates.json

TITLE
product import duplicates (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Checks exact whole handles and every nonempty source SKU against the entire destination catalog through existing readers and matching filters. All pages must succeed before an absence or match is finalized.",
  "formatVersion": 1,
  "handle": "product-import-duplicates",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product | has_key: 'handle' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product.handle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.product.handle != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"handle must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product | has_key: 'variants' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.product.variants | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for v in p.product.variants -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'sku' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = v.sku | is_type: 'string' -%}\n{%- assign nullValue = v.sku | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"sku must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- assign phase = 'products' -%}\n{%- assign cursor = nil -%}\n{%- assign cursors = '' | split: '' -%}\n{%- assign handleId = nil -%}\n{%- assign variantId = nil -%}\n{%- assign handlePages = 0 -%}\n{%- assign skuPages = 0 -%}\n{%- assign complete = false -%}\n{%- assign hasState = p | has_key: 'state' -%}\n{%- if valid -%}\n{%- assign sourceSkus = p.product.variants | map: 'sku' -%}\n{%- if hasState -%}\n{%- if p.state != nil -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'state' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'phase' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.phase | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.phase != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"phase must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'productHandle' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.productHandle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.productHandle != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"productHandle must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'sourceSkus' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.sourceSkus | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'cursors' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.cursors | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'handlePages' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.handlePages | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'skuPages' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state.skuPages | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'cursor' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = p.state.cursor | is_type: 'string' -%}\n{%- assign nullValue = p.state.cursor | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"cursor must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'handleProductId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = p.state.handleProductId | is_type: 'string' -%}\n{%- assign nullValue = p.state.handleProductId | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"handleProductId must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.state | has_key: 'skuVariantId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = p.state.skuVariantId | is_type: 'string' -%}\n{%- assign nullValue = p.state.skuVariantId | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"skuVariantId must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign savedSkus = p.state.sourceSkus | json -%}\n{%- assign currentSkus = sourceSkus | json -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.productHandle == p.product.handle and savedSkus == currentSkus -%}\n{%- assign valid = false -%}\n{%- assign error = \"Duplicate continuation product mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.state.phase == 'products' or p.state.phase == 'variants' or p.state.phase == 'done' -%}\n{%- assign valid = false -%}\n{%- assign error = \"Duplicate continuation phase invalid\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign phase = p.state.phase -%}\n{%- assign cursor = p.state.cursor -%}\n{%- assign cursors = p.state.cursors -%}\n{%- assign handleId = p.state.handleProductId -%}\n{%- assign variantId = p.state.skuVariantId -%}\n{%- assign handlePages = p.state.handlePages -%}\n{%- assign skuPages = p.state.skuPages -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if phase == 'products' -%}\n{%- call {\"requestId\":\"read-product-page\",\"bodyEmbedded\":{\"variables\":{\"after\":{{ cursor | json }}}}} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products | has_key: 'nodes' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products.nodes | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products | has_key: 'pageInfo' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products.pageInfo | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products.pageInfo | has_key: 'hasNextPage' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products.pageInfo.hasNextPage | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign hasMore = r.data.data.products.pageInfo.hasNextPage -%}\n{%- if hasMore -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products.pageInfo | has_key: 'endCursor' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.products.pageInfo.endCursor | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.products.pageInfo.endCursor != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"endCursor must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.products.pageInfo.endCursor != cursor -%}\n{%- assign valid = false -%}\n{%- assign error = \"Pagination cursor did not advance\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign lastNode = r.data.data.products.nodes | last -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = lastNode | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = lastNode.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless lastNode.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign pageId = lastNode.id | split: '/' | last -%}\n{%- if cursors contains pageId -%}\n{%- assign valid = false -%}\n{%- assign error = 'Repeated pagination page.' -%}\n{%- endif -%}\n{%- assign singlePageId = pageId | split: ',' -%}\n{%- assign cursors = cursors | concat: singlePageId -%}\n{%- assign cursor = r.data.data.products.pageInfo.endCursor -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign handlePages = handlePages | plus: 1 -%}\n{%- call {\"requestId\":\"filter-products-exact-handle\",\"liquidParamsEmbedded\":{\"products\":{{ r.data.data.products.nodes | json }},\"expectedHandle\":{{ p.product.handle | json }}}} as matches -%}\n{%- if valid -%}\n{%- assign valid = matches | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless matches.status >= 200 and matches.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless matches.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data.products | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for m in matches.data.products -%}\n{%- if valid -%}\n{%- assign valid = m | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless m.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign handleId = m.id -%}\n{%- endif -%}\n{%- endfor -%}\n{%- unless hasMore -%}\n{%- assign phase = 'variants' -%}\n{%- assign cursor = nil -%}\n{%- assign cursors = '' | split: '' -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- elsif phase == 'variants' -%}\n{%- call {\"requestId\":\"product-import-catalog-sku-page\",\"bodyEmbedded\":{\"variables\":{\"after\":{{ cursor | json }}}}} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'productVariants' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants | has_key: 'nodes' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants.nodes | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants | has_key: 'pageInfo' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants.pageInfo | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants.pageInfo | has_key: 'hasNextPage' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants.pageInfo.hasNextPage | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign hasMore = r.data.data.productVariants.pageInfo.hasNextPage -%}\n{%- if hasMore -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants.pageInfo | has_key: 'endCursor' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.productVariants.pageInfo.endCursor | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.productVariants.pageInfo.endCursor != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"endCursor must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.productVariants.pageInfo.endCursor != cursor -%}\n{%- assign valid = false -%}\n{%- assign error = \"Pagination cursor did not advance\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign lastNode = r.data.data.productVariants.nodes | last -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = lastNode | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = lastNode.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless lastNode.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign pageId = lastNode.id | split: '/' | last -%}\n{%- if cursors contains pageId -%}\n{%- assign valid = false -%}\n{%- assign error = 'Repeated pagination page.' -%}\n{%- endif -%}\n{%- assign singlePageId = pageId | split: ',' -%}\n{%- assign cursors = cursors | concat: singlePageId -%}\n{%- assign cursor = r.data.data.productVariants.pageInfo.endCursor -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign skuPages = skuPages | plus: 1 -%}\n{%- for candidate in r.data.data.productVariants.nodes -%}\n{%- if valid -%}\n{%- assign valid = candidate | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = candidate.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless candidate.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = candidate | has_key: 'sku' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = candidate.sku | is_type: 'string' -%}\n{%- assign nullValue = candidate.sku | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"sku must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- for v in p.product.variants -%}\n{%- if v.sku != '' and v.sku != nil -%}\n{%- if valid -%}\n{%- assign candidates = r.data.data.productVariants.nodes | where: 'sku', v.sku -%}\n{%- assign candidateCount = candidates | size -%}\n{%- if candidateCount > 0 -%}\n{%- call {\"requestId\":\"filter-variants-exact-sku\",\"liquidParamsEmbedded\":{\"variants\":{{ candidates | json }},\"expectedSku\":{{ v.sku | json }}}} as matches -%}\n{%- if valid -%}\n{%- assign valid = matches | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless matches.status >= 200 and matches.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data | has_key: 'success' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data.success | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless matches.data.success == true -%}\n{%- assign valid = false -%}\n{%- assign error = \"Required saved helper failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data | has_key: 'variants' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = matches.data.variants | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for m in matches.data.variants -%}\n{%- if valid -%}\n{%- assign valid = m | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless m.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign variantId = m.id -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endfor -%}\n{%- unless hasMore -%}\n{%- assign phase = 'done' -%}\n{%- assign cursor = nil -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if phase == 'done' -%}\n{%- assign complete = true -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"complete\":{{ complete | json }},\"handleProductId\":{{ handleId | json }},\"skuVariantId\":{{ variantId | json }},\"pages\":{\"products\":{{ handlePages | json }},\"variants\":{{ skuPages | json }}},\"state\":{%- if complete -%}\nnull{%- else -%}\n{\"phase\":{{ phase | json }},\"productHandle\":{{ p.product.handle | json }},\"sourceSkus\":{{ sourceSkus | json }},\"cursor\":{{ cursor | json }},\"cursors\":{{ cursors | json }},\"handleProductId\":{{ handleId | json }},\"skuVariantId\":{{ variantId | json }},\"handlePages\":{{ handlePages | json }},\"skuPages\":{{ skuPages | json }}}{%- endif -%}\n,\"error\":null}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "product import duplicates",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-catalog-sku-page.json

TITLE
product import catalog sku page (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads one bounded catalog SKU page for duplicate continuations. Uses 20 variants per page so large existing catalogs do not require oversized runtime state. Fixture variant/image readers retain their two-item pages.",
  "formatVersion": 1,
  "handle": "product-import-catalog-sku-page",
  "method": "POST",
  "name": "product import catalog sku page",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ImportCatalogSkus($after: String) { productVariants(first: 20, after: $after, sortKey: ID) { nodes { id sku } pageInfo { hasNextPage endCursor } } }\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-create.json

TITLE
product import create (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Creation leaf used only after complete duplicate and prerequisite checks. Caller omits all source IDs, includes run ownership tags, and retains every returned ID even on incomplete outcomes.",
  "formatVersion": 1,
  "handle": "product-import-create",
  "method": "POST",
  "name": "product import create",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"mutation ImportCreate($input: ProductSetInput!) { productSet(input: $input, synchronous: true) { product { id handle tags } userErrors { field message code } } }\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-ownership.json

TITLE
product import ownership (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads one recorded product and its exact ownership tags; preserves null for already absent products.",
  "formatVersion": 1,
  "handle": "product-import-ownership",
  "method": "POST",
  "name": "product import ownership",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ImportOwnership($productId: ID!) { shop { id myshopifyDomain } product(id: $productId) { id handle tags } }\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-owned-page.json

TITLE
product import owned page (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads a small page of run-tag candidates. Callers must verify each returned exact tag and exhaust pagination.",
  "formatVersion": 1,
  "handle": "product-import-owned-page",
  "method": "POST",
  "name": "product import owned page",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ImportOwnedPage($query: String!, $after: String) { products(first: 2, after: $after, query: $query, sortKey: ID) { nodes { id title handle tags descriptionHtml options { name values } } pageInfo { hasNextPage endCursor } } }\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-complete-product.json

TITLE
product import complete product (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Assembles complete detail, variant and image data through the existing saved readers. Every connection must terminate with a valid nonrepeating cursor sequence. Errors never return partial products as complete.",
  "formatVersion": 1,
  "handle": "product-import-complete-product",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'productId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.productId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.productId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"productId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- assign variants = '' | split: '' -%}\n{%- assign images = '' | split: '' -%}\n{%- assign variantPages = 0 -%}\n{%- assign imagePages = 0 -%}\n{%- if valid -%}\n{%- call {\"requestId\":\"read-product-detail-page\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ p.productId | json }}}}} as detail -%}\n{%- if valid -%}\n{%- assign valid = detail | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless detail.status >= 200 and detail.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = detail.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless detail.data.data.product.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product | has_key: 'title' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product.title | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless detail.data.data.product.title != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"title must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product | has_key: 'handle' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product.handle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless detail.data.data.product.handle != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"handle must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product | has_key: 'descriptionHtml' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product.descriptionHtml | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product | has_key: 'options' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = detail.data.data.product.options | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless detail.data.data.product.id == p.productId -%}\n{%- assign valid = false -%}\n{%- assign error = \"Product detail identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- assign hasMore = true -%}\n{%- assign cursor = nil -%}\n{%- assign cursors = '' | split: '' -%}\n{%- while hasMore and valid -%}\n{%- call {\"requestId\":\"read-product-variant-page\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ p.productId | json }},\"after\":{{ cursor | json }}}}} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.product.id == p.productId -%}\n{%- assign valid = false -%}\n{%- assign error = \"Page product identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product | has_key: 'variants' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants | has_key: 'nodes' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants.nodes | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants | has_key: 'pageInfo' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants.pageInfo | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants.pageInfo | has_key: 'hasNextPage' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants.pageInfo.hasNextPage | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign hasMore = r.data.data.product.variants.pageInfo.hasNextPage -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if hasMore -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants.pageInfo | has_key: 'endCursor' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.variants.pageInfo.endCursor | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.product.variants.pageInfo.endCursor != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"endCursor must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign cursor = r.data.data.product.variants.pageInfo.endCursor -%}\n{%- if cursors contains cursor -%}\n{%- assign valid = false -%}\n{%- assign error = 'Repeated pagination cursor.' -%}\n{%- endif -%}\n{%- assign cursorSingle = r.data.data.product.variants.pageInfo | map: 'endCursor' -%}\n{%- assign cursors = cursors | concat: cursorSingle -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign variants = variants | concat: r.data.data.product.variants.nodes -%}\n{%- assign variantPages = variantPages | plus: 1 -%}\n{%- endif -%}\n{%- endwhile -%}\n{%- assign hasMore = true -%}\n{%- assign cursor = nil -%}\n{%- assign cursors = '' | split: '' -%}\n{%- while hasMore and valid -%}\n{%- call {\"requestId\":\"read-product-image-page\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ p.productId | json }},\"after\":{{ cursor | json }}}}} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.product.id == p.productId -%}\n{%- assign valid = false -%}\n{%- assign error = \"Page product identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product | has_key: 'images' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images | has_key: 'nodes' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images.nodes | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images | has_key: 'pageInfo' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images.pageInfo | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images.pageInfo | has_key: 'hasNextPage' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images.pageInfo.hasNextPage | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign hasMore = r.data.data.product.images.pageInfo.hasNextPage -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if hasMore -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images.pageInfo | has_key: 'endCursor' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.images.pageInfo.endCursor | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.product.images.pageInfo.endCursor != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"endCursor must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign cursor = r.data.data.product.images.pageInfo.endCursor -%}\n{%- if cursors contains cursor -%}\n{%- assign valid = false -%}\n{%- assign error = 'Repeated pagination cursor.' -%}\n{%- endif -%}\n{%- assign cursorSingle = r.data.data.product.images.pageInfo | map: 'endCursor' -%}\n{%- assign cursors = cursors | concat: cursorSingle -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign images = images | concat: r.data.data.product.images.nodes -%}\n{%- assign imagePages = imagePages | plus: 1 -%}\n{%- endif -%}\n{%- endwhile -%}\n{%- if valid -%}\n{%- for option in detail.data.data.product.options -%}\n{%- if valid -%}\n{%- assign valid = option | has_key: 'name' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = option.name | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless option.name != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"name must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = option | has_key: 'values' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = option.values | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for value in option.values -%}\n{%- assign valueValid = value | is_type: 'string' -%}\n{%- if valid -%}\n{%- unless valueValid -%}\n{%- assign valid = false -%}\n{%- assign error = \"Malformed option value\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- endfor -%}\n{%- for v in variants -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless v.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'sku' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = v.sku | is_type: 'string' -%}\n{%- assign nullValue = v.sku | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"sku must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'price' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.price | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless v.price != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"price must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'inventoryQuantity' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.inventoryQuantity | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v | has_key: 'selectedOptions' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = v.selectedOptions | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- for selected in v.selectedOptions -%}\n{%- if valid -%}\n{%- assign valid = selected | has_key: 'name' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = selected.name | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless selected.name != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"name must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = selected | has_key: 'value' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = selected.value | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless selected.value != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"value must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- endfor -%}\n{%- for im in images -%}\n{%- if valid -%}\n{%- assign valid = im | has_key: 'id' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = im.id | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless im.id != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"id must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = im | has_key: 'url' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = im.url | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless im.url != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"url must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = im | has_key: 'altText' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign stringValue = im.altText | is_type: 'string' -%}\n{%- assign nullValue = im.altText | is_type: 'null' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless stringValue or nullValue -%}\n{%- assign valid = false -%}\n{%- assign error = \"altText must be string or null\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"product\":{\"id\":{{ p.productId | json }},\"title\":{{ detail.data.data.product.title | json }},\"handle\":{{ detail.data.data.product.handle | json }},\"descriptionHtml\":{{ detail.data.data.product.descriptionHtml | json }},\"options\":{{ detail.data.data.product.options | json }},\"variants\":{{ variants | json }},\"images\":{{ images | json }}},\"pages\":{\"variants\":{{ variantPages | json }},\"images\":{{ imagePages | json }}},\"error\":null}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "product import complete product",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-media-observation.json

TITLE
product import media observation (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Observes all media pages once, distinguishing pending, ready and failed images. The workflow returns a three-second continuation delay and a maximum of 20 observations; no busy polling or hidden timers.",
  "formatVersion": 1,
  "handle": "product-import-media-observation",
  "liquid": "{%- assign runId = '' -%}\n{%- assign count = 0 -%}\n{%- assign observedReady = false -%}\n{%- assign valid = true -%}\n{%- assign error = 'Invalid input or required response shape.' -%}\n{%- assign p = nil -%}\n{%- assign hasInput = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInput -%}\n{%- assign p = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'productId' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.productId | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless p.productId != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"productId must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p | has_key: 'expectedImages' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = p.expectedImages | is_type: 'integer' -%}\n{%- endif -%}\n{%- assign mediaCount = 0 -%}\n{%- assign ready = true -%}\n{%- assign pages = 0 -%}\n{%- assign hasMore = true -%}\n{%- assign cursor = nil -%}\n{%- assign cursors = '' | split: '' -%}\n{%- while hasMore and valid -%}\n{%- call {\"requestId\":\"read-product-media-page\",\"bodyEmbedded\":{\"variables\":{\"productId\":{{ p.productId | json }},\"after\":{{ cursor | json }}}}} as r -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.status | is_type: 'integer' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.status >= 200 and r.status < 300 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Saved request execution failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign graphErrors = r.data | map: 'errors' | first | default: '' -%}\n{%- assign errorCount = graphErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless errorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Shopify GraphQL errors\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data | has_key: 'data' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data | has_key: 'product' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.product.id == p.productId -%}\n{%- assign valid = false -%}\n{%- assign error = \"Media product identity mismatch\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product | has_key: 'media' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media | has_key: 'nodes' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media.nodes | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media | has_key: 'pageInfo' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media.pageInfo | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media.pageInfo | has_key: 'hasNextPage' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media.pageInfo.hasNextPage | is_type: 'boolean' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign hasMore = r.data.data.product.media.pageInfo.hasNextPage -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if hasMore -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media.pageInfo | has_key: 'endCursor' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = r.data.data.product.media.pageInfo.endCursor | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless r.data.data.product.media.pageInfo.endCursor != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"endCursor must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign cursor = r.data.data.product.media.pageInfo.endCursor -%}\n{%- if cursors contains cursor -%}\n{%- assign valid = false -%}\n{%- assign error = 'Repeated pagination cursor.' -%}\n{%- endif -%}\n{%- assign cursorSingle = r.data.data.product.media.pageInfo | map: 'endCursor' -%}\n{%- assign cursors = cursors | concat: cursorSingle -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign pages = pages | plus: 1 -%}\n{%- for m in r.data.data.product.media.nodes -%}\n{%- if valid -%}\n{%- assign valid = m | has_key: 'status' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.status | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless m.status != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"status must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m | has_key: 'mediaErrors' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.mediaErrors | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign mediaErrorCount = m.mediaErrors | size -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless m.status != 'FAILED' and mediaErrorCount == 0 -%}\n{%- assign valid = false -%}\n{%- assign error = \"Image processing failed\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- if valid -%}\n{%- if m.mediaContentType == 'IMAGE' -%}\n{%- assign mediaCount = mediaCount | plus: 1 -%}\n{%- if m.status != 'READY' -%}\n{%- assign ready = false -%}\n{%- else -%}\n{%- if valid -%}\n{%- assign valid = m | has_key: 'image' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.image | is_type: 'object' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.image | has_key: 'url' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- assign valid = m.image.url | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n{%- unless m.image.url != '' -%}\n{%- assign valid = false -%}\n{%- assign error = \"url must not be empty\" -%}\n{%- endunless -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endif -%}\n{%- endfor -%}\n{%- endif -%}\n{%- endwhile -%}\n{%- if valid -%}\n{%- if mediaCount != p.expectedImages -%}\n{%- assign ready = false -%}\n{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"ready\":{{ ready | json }},\"imageCount\":{{ mediaCount | json }},\"pages\":{{ pages | json }},\"error\":null}{%- else -%}\n{ \"success\":false,\"error\":{{ error | json }} }{%- endif -%}\n",
  "name": "product import media observation",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-inventory-page.json

TITLE
product import inventory page (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Independent paginated readback of available inventory at the destination default location.",
  "formatVersion": 1,
  "handle": "product-import-inventory-page",
  "method": "POST",
  "name": "product import inventory page",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ImportInventory($productId: ID!, $locationId: ID!, $after: String) { product(id: $productId) { id variants(first: 2, after: $after) { nodes { id sku inventoryQuantity inventoryItem { id tracked inventoryLevel(locationId: $locationId) { quantities(names: [\\\"available\\\"]) { name quantity } } } } pageInfo { hasNextPage endCursor } } } }\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/product-import-delete.json

TITLE
product import delete (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Deletes one explicit product ID after the cleanup coordinator checks shop identity and exact run ownership.",
  "formatVersion": 1,
  "handle": "product-import-delete",
  "method": "POST",
  "name": "product import delete",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"mutation ImportDelete($productId: ID!) { productDelete(input: {id: $productId}) { deletedProductId userErrors { field message } } }\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-product-page.json

TITLE
Read one page of products (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads exactly one Shopify product page with a fixed page size of 2 and returns the native HTTP/GraphQL response, including errors. Optionally supply bodyEmbedded.variables.after with the previous endCursor unchanged; omitted or null reads the first page. Uses APIEase server-side Shopify authentication. No triggers or dependencies.",
  "formatVersion": 1,
  "handle": "read-product-page",
  "method": "POST",
  "name": "Read one page of products",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ReadProductPage($after: String) {\\n  products(first: 2, after: $after) {\\n    nodes {\\n      id\\n      title\\n      handle\\n    }\\n    pageInfo {\\n      hasNextPage\\n      endCursor\\n    }\\n  }\\n}\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-product-detail-page.json

TITLE
Read one product detail page by ID (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads one Shopify product by the required bodyEmbedded.variables.productId with a fixed GraphQL query and returns the native HTTP/GraphQL response unchanged, including null products and errors. Selects id, title, handle, descriptionHtml, and option names and values in their returned order. Uses APIEase server-side Shopify authentication. Each invocation makes one Shopify request with no triggers, chaining, or dependencies.",
  "formatVersion": 1,
  "handle": "read-product-detail-page",
  "method": "POST",
  "name": "Read one product detail page by ID",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ReadProductDetailPage($productId: ID!) {\\n  product(id: $productId) {\\n    id\\n    title\\n    handle\\n    descriptionHtml\\n    options {\\n      name\\n      values\\n    }\\n  }\\n}\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-product-variant-page.json

TITLE
Read one page of a product’s variants (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads exactly one page of variants belonging to the required bodyEmbedded.variables.productId, with optional after cursor and fixed page size 2. Returns parent and variant IDs, nullable SKU, decimal price, selected options, inventory quantity and inventory item tracking without conversion. Uses APIEase server-side Shopify authentication and returns the native HTTP/GraphQL response unchanged. Each invocation makes one Shopify request with no triggers, chaining or dependencies.",
  "formatVersion": 1,
  "handle": "read-product-variant-page",
  "method": "POST",
  "name": "Read one page of a product’s variants",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ReadProductVariantPage($productId: ID!, $after: String) {\\n  product(id: $productId) {\\n    id\\n    variants(first: 2, after: $after) {\\n      nodes {\\n        id\\n        sku\\n        price\\n        selectedOptions { name value }\\n        inventoryQuantity\\n        inventoryItem { id tracked }\\n      }\\n      pageInfo { hasNextPage endCursor }\\n    }\\n  }\\n}\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-product-image-page.json

TITLE
Read one page of a product’s images (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads exactly one image connection page for the required bodyEmbedded.variables.productId, with optional after cursor and fixed page size 2. Returns the parent ID and ordered image IDs, URLs and nullable alt text through the supported 2026-10 images projection. Preserves empty collections, null products and errors. Uses APIEase server-side Shopify authentication and returns the native HTTP/GraphQL response unchanged. Each invocation makes one Shopify request with no triggers, chaining or dependencies.",
  "formatVersion": 1,
  "handle": "read-product-image-page",
  "method": "POST",
  "name": "Read one page of a product’s images",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ReadProductImagePage($productId: ID!, $after: String) {\\n  product(id: $productId) {\\n    id\\n    images(first: 2, after: $after) {\\n      nodes { id url altText }\\n      pageInfo { hasNextPage endCursor }\\n    }\\n  }\\n}\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-product-media-page.json

TITLE
Read one page of product media status (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads exactly one media connection page for the required bodyEmbedded.variables.productId, with optional after cursor and fixed page size 2. Returns parent and media IDs, content type, processing status, media error codes and messages, and image URL and nullable alt text for MediaImage. Preserves all returned types and statuses without filtering, polling or deciding readiness. Uses APIEase server-side Shopify authentication and returns the native HTTP/GraphQL response unchanged. Each invocation makes one Shopify request with no triggers, chaining or dependencies.",
  "formatVersion": 1,
  "handle": "read-product-media-page",
  "method": "POST",
  "name": "Read one page of product media status",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ReadProductMediaPage($productId: ID!, $after: String) {\\n  product(id: $productId) {\\n    id\\n    media(first: 2, after: $after) {\\n      nodes {\\n        id\\n        mediaContentType\\n        status\\n        mediaErrors { code message }\\n        ... on MediaImage { image { url altText } }\\n      }\\n      pageInfo { hasNextPage endCursor }\\n    }\\n  }\\n}\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-default-location.json

TITLE
Read the default destination location (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads the authenticated shop’s primary location ID using the Shopify location query without an ID argument. Takes no runtime inputs and preserves a null location or errors. Uses APIEase server-side Shopify authentication and returns the native HTTP/GraphQL response unchanged. Each invocation makes one Shopify request with no product or variant reads, triggers, chaining or dependencies.",
  "formatVersion": 1,
  "handle": "read-default-location",
  "method": "POST",
  "name": "Read the default destination location",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ReadDefaultLocation {\\n  location { id }\\n}\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/match-title-prefix.json

TITLE
Match a title against a literal prefix (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "title must be a string and prefix must be a nonempty string; both fields are required. Compares literal values case-sensitively without normalization. Reads liquidParamsEmbedded and returns success, matches, and error. No saved defaults, triggers, dependencies, or Shopify calls.",
  "formatVersion": 1,
  "handle": "match-title-prefix",
  "liquid": "{%- assign valid = true -%}\n{%- assign matches = false -%}\n{%- assign inputs = nil -%}\n{%- assign hasInputs = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInputs -%}\n  {%- assign inputs = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'title' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.title | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'prefix' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.prefix | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.prefix == '' -%}{%- assign valid = false -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign prefixLength = inputs.prefix | size -%}\n  {%- assign titlePrefix = inputs.title | slice: 0, prefixLength -%}\n  {%- if titlePrefix == inputs.prefix -%}{%- assign matches = true -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"matches\":{{ matches | json }},\"error\":null}\n{%- else -%}\n{\"success\":false,\"matches\":false,\"error\":\"title must be a string and prefix must be a nonempty string; both fields are required.\"}\n{%- endif -%}\n",
  "name": "Match a title against a literal prefix",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/filter-products-exact-handle.json

TITLE
Filter supplied products by exact handle (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Filters caller-supplied products by invoking only match-exact-handle for each handle, using liquidParamsEmbedded. Requires an array of objects and a nonempty expectedHandle string, including for empty arrays. Preserves complete matching objects, order, and repeats. Malformed input or an unusable matcher execution/result fails the whole filter with an empty list. No saved defaults, triggers, or Shopify calls.",
  "formatVersion": 1,
  "handle": "filter-products-exact-handle",
  "liquid": "{%- assign valid = true -%}\n{%- assign inputs = nil -%}\n{%- assign selected = '' | split: '' -%}\n{%- assign hasInputs = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInputs -%}\n  {%- assign inputs = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.products | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'expectedHandle' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.expectedHandle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.expectedHandle == '' -%}{%- assign valid = false -%}{%- endif -%}\n{%- endif -%}\n{%- assign error = 'products must be an array and expectedHandle must be a nonempty string; both fields are required.' -%}\n{%- if valid -%}\n  {%- for item in inputs.products -%}\n    {%- assign valid = item | has_key: 'handle' -%}\n    {%- assign error = 'Each products item must be an object with a valid handle field.' -%}\n    {%- if valid -%}\n      {%- call {\"requestId\":\"match-exact-handle\",\"liquidParamsEmbedded\":{\"candidateHandle\":{{ item.handle | json }},\"expectedHandle\":{{ inputs.expectedHandle | json }}}} as matcherResult -%}\n      {%- assign error = 'The match-exact-handle call failed or returned an unusable result.' -%}\n      {%- assign valid = matcherResult | has_key: 'status' -%}\n      {%- if valid -%}\n        {%- assign valid = matcherResult.status | is_type: 'integer' -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- if matcherResult.status < 200 or matcherResult.status >= 300 -%}{%- assign valid = false -%}{%- endif -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign valid = matcherResult | has_key: 'data' -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign hasSuccess = matcherResult.data | has_key: 'success' -%}\n        {%- assign hasMatches = matcherResult.data | has_key: 'matches' -%}\n        {%- assign hasError = matcherResult.data | has_key: 'error' -%}\n        {%- unless hasSuccess and hasMatches and hasError -%}{%- assign valid = false -%}{%- endunless -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign successIsBoolean = matcherResult.data.success | is_type: 'boolean' -%}\n        {%- assign matchesIsBoolean = matcherResult.data.matches | is_type: 'boolean' -%}\n        {%- assign errorIsNull = matcherResult.data.error | is_type: 'null' -%}\n        {%- unless successIsBoolean and matchesIsBoolean and errorIsNull and matcherResult.data.success == true -%}{%- assign valid = false -%}{%- endunless -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- if matcherResult.data.matches -%}\n          {%- assign singleton = inputs.products | slice: forloop.index0, 1 -%}\n          {%- assign selected = selected | concat: singleton -%}\n        {%- endif -%}\n      {%- endif -%}\n    {%- endif -%}\n    {%- unless valid -%}{%- break -%}{%- endunless -%}\n  {%- endfor -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"products\":{{ selected | json }},\"error\":null}\n{%- else -%}\n{\"success\":false,\"products\":[],\"error\":{{ error | json }}}\n{%- endif -%}\n",
  "name": "Filter supplied products by exact handle",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/match-exact-handle.json

TITLE
Match two handles exactly (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "candidateHandle and expectedHandle must both be present nonempty strings. Compares literal values case-sensitively without normalization. Reads liquidParamsEmbedded and returns success, matches, and error. No saved defaults, triggers, dependencies, or Shopify calls.",
  "formatVersion": 1,
  "handle": "match-exact-handle",
  "liquid": "{%- assign valid = true -%}\n{%- assign matches = false -%}\n{%- assign inputs = nil -%}\n{%- assign hasInputs = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInputs -%}\n  {%- assign inputs = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'candidateHandle' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.candidateHandle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.candidateHandle == '' -%}{%- assign valid = false -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'expectedHandle' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.expectedHandle | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.expectedHandle == '' -%}{%- assign valid = false -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.candidateHandle == inputs.expectedHandle -%}{%- assign matches = true -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"matches\":{{ matches | json }},\"error\":null}\n{%- else -%}\n{\"success\":false,\"matches\":false,\"error\":\"candidateHandle and expectedHandle must both be present nonempty strings.\"}\n{%- endif -%}\n",
  "name": "Match two handles exactly",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/filter-variants-exact-sku.json

TITLE
Filter supplied variants by exact SKU (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Filters caller-supplied variants by invoking only match-exact-sku for each sku, using liquidParamsEmbedded. Requires an array of objects and a nonempty expectedSku string, including for empty arrays. Preserves complete matching objects, order, and repeats. Malformed input or an unusable matcher execution/result fails the whole filter with an empty list. No saved defaults, triggers, or Shopify calls.",
  "formatVersion": 1,
  "handle": "filter-variants-exact-sku",
  "liquid": "{%- assign valid = true -%}\n{%- assign inputs = nil -%}\n{%- assign selected = '' | split: '' -%}\n{%- assign hasInputs = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInputs -%}\n  {%- assign inputs = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'variants' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.variants | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'expectedSku' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.expectedSku | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.expectedSku == '' -%}{%- assign valid = false -%}{%- endif -%}\n{%- endif -%}\n{%- assign error = 'variants must be an array and expectedSku must be a nonempty string; both fields are required.' -%}\n{%- if valid -%}\n  {%- for item in inputs.variants -%}\n    {%- assign valid = item | has_key: 'sku' -%}\n    {%- assign error = 'Each variants item must be an object with a valid sku field.' -%}\n    {%- if valid -%}\n      {%- call {\"requestId\":\"match-exact-sku\",\"liquidParamsEmbedded\":{\"candidateSku\":{{ item.sku | json }},\"expectedSku\":{{ inputs.expectedSku | json }}}} as matcherResult -%}\n      {%- assign error = 'The match-exact-sku call failed or returned an unusable result.' -%}\n      {%- assign valid = matcherResult | has_key: 'status' -%}\n      {%- if valid -%}\n        {%- assign valid = matcherResult.status | is_type: 'integer' -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- if matcherResult.status < 200 or matcherResult.status >= 300 -%}{%- assign valid = false -%}{%- endif -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign valid = matcherResult | has_key: 'data' -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign hasSuccess = matcherResult.data | has_key: 'success' -%}\n        {%- assign hasMatches = matcherResult.data | has_key: 'matches' -%}\n        {%- assign hasError = matcherResult.data | has_key: 'error' -%}\n        {%- unless hasSuccess and hasMatches and hasError -%}{%- assign valid = false -%}{%- endunless -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign successIsBoolean = matcherResult.data.success | is_type: 'boolean' -%}\n        {%- assign matchesIsBoolean = matcherResult.data.matches | is_type: 'boolean' -%}\n        {%- assign errorIsNull = matcherResult.data.error | is_type: 'null' -%}\n        {%- unless successIsBoolean and matchesIsBoolean and errorIsNull and matcherResult.data.success == true -%}{%- assign valid = false -%}{%- endunless -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- if matcherResult.data.matches -%}\n          {%- assign singleton = inputs.variants | slice: forloop.index0, 1 -%}\n          {%- assign selected = selected | concat: singleton -%}\n        {%- endif -%}\n      {%- endif -%}\n    {%- endif -%}\n    {%- unless valid -%}{%- break -%}{%- endunless -%}\n  {%- endfor -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"variants\":{{ selected | json }},\"error\":null}\n{%- else -%}\n{\"success\":false,\"variants\":[],\"error\":{{ error | json }}}\n{%- endif -%}\n",
  "name": "Filter supplied variants by exact SKU",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/match-exact-sku.json

TITLE
Match a nonempty SKU exactly (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "candidateSku must be present as a string or null; expectedSku must be a present nonempty string. Compares literal values case-sensitively without normalization. Reads liquidParamsEmbedded and returns success, matches, and error. No saved defaults, triggers, dependencies, or Shopify calls.",
  "formatVersion": 1,
  "handle": "match-exact-sku",
  "liquid": "{%- assign valid = true -%}\n{%- assign matches = false -%}\n{%- assign inputs = nil -%}\n{%- assign hasInputs = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInputs -%}\n  {%- assign inputs = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'candidateSku' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.candidateSku | is_type: 'string' -%}\n  {%- assign isNull = inputs.candidateSku | is_type: 'null' -%}\n  {%- if isNull -%}{%- assign valid = true -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'expectedSku' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.expectedSku | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.expectedSku == '' -%}{%- assign valid = false -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.candidateSku == inputs.expectedSku -%}{%- assign matches = true -%}{%- endif -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"matches\":{{ matches | json }},\"error\":null}\n{%- else -%}\n{\"success\":false,\"matches\":false,\"error\":\"candidateSku must be present as a string or null; expectedSku must be a present nonempty string.\"}\n{%- endif -%}\n",
  "name": "Match a nonempty SKU exactly",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/read-catalog-variant-page.json

TITLE
Read one page of catalog variant SKUs (request)

CONTENT
```json
{
  "address": "https://yourstore.myshopify.com/admin/api/2026-10/graphql.json",
  "contractVersion": 1,
  "description": "Reads exactly one shop-wide productVariants page with fixed page size 2 and optional bodyEmbedded.variables.after cursor. Returns variant IDs, nullable SKUs and page information unchanged without matching, filtering or assuming SKU uniqueness. Accepts no productId. Uses APIEase server-side Shopify authentication and returns the native HTTP/GraphQL response unchanged. Each invocation makes one Shopify request with no triggers, chaining or dependencies.",
  "formatVersion": 1,
  "handle": "read-catalog-variant-page",
  "method": "POST",
  "name": "Read one page of catalog variant SKUs",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{\"query\":\"query ReadCatalogVariantPage($after: String) {\\n  productVariants(first: 2, after: $after) {\\n    nodes { id sku }\\n    pageInfo { hasNextPage endCursor }\\n  }\\n}\"}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/filter-product-list.json

TITLE
Filter supplied products by title prefix (request)

CONTENT
```json
{
  "contractVersion": 1,
  "description": "Filters caller-supplied products by invoking only match-title-prefix for each title, using liquidParamsEmbedded. Requires an array of objects and a nonempty prefix string, including for empty arrays. Preserves complete matching objects, order, and repeats. Malformed input or an unusable matcher execution/result fails the whole filter with an empty list. No saved defaults, triggers, or Shopify calls.",
  "formatVersion": 1,
  "handle": "filter-product-list",
  "liquid": "{%- assign valid = true -%}\n{%- assign inputs = nil -%}\n{%- assign selected = '' | split: '' -%}\n{%- assign hasInputs = apiEaseParameters | has_key: 'liquidParams' -%}\n{%- if hasInputs -%}\n  {%- assign inputs = apiEaseParameters.liquidParams -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'products' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.products | is_type: 'array' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs | has_key: 'prefix' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- assign valid = inputs.prefix | is_type: 'string' -%}\n{%- endif -%}\n{%- if valid -%}\n  {%- if inputs.prefix == '' -%}{%- assign valid = false -%}{%- endif -%}\n{%- endif -%}\n{%- assign error = 'products must be an array and prefix must be a nonempty string; both fields are required.' -%}\n{%- if valid -%}\n  {%- for item in inputs.products -%}\n    {%- assign valid = item | has_key: 'title' -%}\n    {%- assign error = 'Each products item must be an object with a valid title field.' -%}\n    {%- if valid -%}\n      {%- call {\"requestId\":\"match-title-prefix\",\"liquidParamsEmbedded\":{\"title\":{{ item.title | json }},\"prefix\":{{ inputs.prefix | json }}}} as matcherResult -%}\n      {%- assign error = 'The match-title-prefix call failed or returned an unusable result.' -%}\n      {%- assign valid = matcherResult | has_key: 'status' -%}\n      {%- if valid -%}\n        {%- assign valid = matcherResult.status | is_type: 'integer' -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- if matcherResult.status < 200 or matcherResult.status >= 300 -%}{%- assign valid = false -%}{%- endif -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign valid = matcherResult | has_key: 'data' -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign hasSuccess = matcherResult.data | has_key: 'success' -%}\n        {%- assign hasMatches = matcherResult.data | has_key: 'matches' -%}\n        {%- assign hasError = matcherResult.data | has_key: 'error' -%}\n        {%- unless hasSuccess and hasMatches and hasError -%}{%- assign valid = false -%}{%- endunless -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- assign successIsBoolean = matcherResult.data.success | is_type: 'boolean' -%}\n        {%- assign matchesIsBoolean = matcherResult.data.matches | is_type: 'boolean' -%}\n        {%- assign errorIsNull = matcherResult.data.error | is_type: 'null' -%}\n        {%- unless successIsBoolean and matchesIsBoolean and errorIsNull and matcherResult.data.success == true -%}{%- assign valid = false -%}{%- endunless -%}\n      {%- endif -%}\n      {%- if valid -%}\n        {%- if matcherResult.data.matches -%}\n          {%- assign singleton = inputs.products | slice: forloop.index0, 1 -%}\n          {%- assign selected = selected | concat: singleton -%}\n        {%- endif -%}\n      {%- endif -%}\n    {%- endif -%}\n    {%- unless valid -%}{%- break -%}{%- endunless -%}\n  {%- endfor -%}\n{%- endif -%}\n{%- if valid -%}\n{\"success\":true,\"products\":{{ selected | json }},\"error\":null}\n{%- else -%}\n{\"success\":false,\"products\":[],\"error\":{{ error | json }}}\n{%- endif -%}\n",
  "name": "Filter supplied products by title prefix",
  "parameters": [],
  "resourceType": "request",
  "triggers": [],
  "type": "liquid"
}
```

SOURCE
https://github.com/APIEase/apiease-examples/blob/main/examples/shopify/products/import-between-stores/destination/resources/requests/staging-product-import-connection.json

TITLE
Staging product import connection (request)

CONTENT
```json
{
  "address": "https://app-admin-staging.apiease.com/api/remote/caller/call",
  "contractVersion": 1,
  "description": "Calls the staging APIEase authenticated remote caller by default. The deployment runner also uses stageApiPath for the supported Project API bootstrap, validation, plan and apply endpoints, keeping staging bindings separate. Requires manual entry of the staging APIEase API key into the Sensitive x-apiease-api-key header; this is not a Shopify token. Defaults to read-product-import-test. Runtime query parameters supply requestId and serialized liquidParamsEmbedded. No local Shopify credential is forwarded.",
  "formatVersion": 1,
  "handle": "staging-product-import-connection",
  "method": "POST",
  "name": "Staging product import connection",
  "parameters": [
    {
      "name": "Content-Type",
      "sensitive": false,
      "type": "header",
      "value": "application/json"
    },
    {
      "name": "requestId",
      "sensitive": false,
      "type": "query",
      "value": "read-product-import-test"
    },
    {
      "name": "x-apiease-api-key",
      "sensitive": true,
      "type": "header",
      "value": {
        "mode": "preserve"
      }
    },
    {
      "name": "x-shop-myshopify-domain",
      "sensitive": false,
      "type": "header",
      "value": "store-apiease-admin-staging.myshopify.com"
    },
    {
      "sensitive": false,
      "type": "body",
      "value": "{}"
    }
  ],
  "resourceType": "request",
  "triggers": [],
  "type": "http"
}
```
