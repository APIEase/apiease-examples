# Lookup Shopify Discount Code Details From A Theme Extension

<!-- apiease-kb:start -->
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

- [Admin GraphQL request](resources/requests/lookup-shopify-discount-code-admin-graphql.json), handle `lookup-shopify-discount-code-admin-graphql`: the internal HTTP request containing the fixed GraphQL query.
- [Discount details request](resources/requests/lookup-shopify-discount-code-details.json), handle `lookup-shopify-discount-code-details`: the storefront-facing Liquid request that validates the input and shapes the response.
- [Discount details widget](resources/widgets/lookup-shopify-discount-code-details.json), handle `lookup-shopify-discount-code-details`: the reusable storefront UI.

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
<!-- apiease-kb:end -->

The companion `answer.md` contains short community-answer copy that links to this example.

## Beginner-friendly steps

1. Choose the shop domain where APIEase is installed. The setup script below injects that shop domain into a temporary copy of `lookup-shopify-discount-code-admin-graphql.json`; if you use the manual commands, replace `your-store.myshopify.com` in that file before creating the Admin GraphQL request.
2. Confirm the shop permissions and request configuration described in [Requirements and limitations](#requirements-and-limitations).
3. Create the internal Admin GraphQL request:

```bash
apiease create request --file examples/shopify/discount-codes/details/resources/requests/lookup-shopify-discount-code-admin-graphql.json
```

4. Create the storefront-facing Liquid request:

```bash
apiease create request --file examples/shopify/discount-codes/details/resources/requests/lookup-shopify-discount-code-details.json
```

5. Create the widget:

```bash
apiease create widget --file examples/shopify/discount-codes/details/resources/widgets/lookup-shopify-discount-code-details.json
```

For a working install, prefer the script below. It passes `--auto-update-source-identifier` so `apiease-cli` can migrate source identifiers in the resource files it creates from.

```bash
APIEASE_SHOP_DOMAIN=your-store.myshopify.com examples/shopify/discount-codes/details/create-resources.sh
```

6. Add the Storefront App Proxy trigger to the Liquid request in the APIEase admin. The Liquid request handle is `lookup-shopify-discount-code-details`.
7. Add the APIEase app block to the desired theme template or page and set the widget handle to `lookup-shopify-discount-code-details`.
8. Test with an existing discount code.

Before using the script or manual commands, check the source files against [Requirements and limitations](#requirements-and-limitations): use your installed shop domain and omit any exported App Proxy trigger from the create payload, then configure that trigger in APIEase admin.

<!-- apiease-kb:start -->
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
<!-- apiease-kb:end -->

## When to extend this example

Use this as the root pattern for related discount-code examples:

- Show eligible products for a discount code.
- Show eligible collections for a discount code.
- Validate whether a discount applies to the current product.
- Validate whether a discount applies to the current cart.
- Show active discount codes.
- Show discounts available to a logged-in customer.
- Show automatic discounts.
- Build promotion finder widgets.

## Official links

- [Shopify codeDiscountNodeByCode](https://shopify.dev/docs/api/admin-graphql/latest/queries/codeDiscountNodeByCode)
- [Shopify DiscountCodeNode](https://shopify.dev/docs/api/admin-graphql/latest/objects/DiscountCodeNode)
- [Shopify DiscountCodeBasic](https://shopify.dev/docs/api/admin-graphql/latest/objects/DiscountCodeBasic)
- [APIEase documentation](https://docs.apiease.com/)
