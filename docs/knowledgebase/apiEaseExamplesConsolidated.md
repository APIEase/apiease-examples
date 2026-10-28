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
