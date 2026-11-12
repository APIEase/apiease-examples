# Obtain a JWT and retrieve product data with a Liquid Request

Source post: [Autenticate API call](https://community.shopify.com/t/autenticate-api-call/407663) (Shopify Community).

<!-- apiease-kb:start -->
This example uses a server-side Liquid Request to sign in to DummyJSON, use the returned JWT to retrieve three product summaries, and return only the fields needed for display. The caller does not obtain or supply the JWT.

Compared with the [Chained Requests example](../chained-requests/README.md), Liquid gives this workflow explicit decisions: stop when authentication fails, check the product response, and return a fixed error message when the operation cannot complete.

**Supported usage:** run this version from APIEase admin or the authenticated remote caller. Leave the Storefront App Proxy triggers disabled. Public storefront invocation is not supported by this verified setup.

## How it works

```text
Call jwt-liquid-product-summaries
    -> Call jwt-liquid-authenticate
       POST https://dummyjson.com/auth/login
    <- Receive accessToken in server-side Liquid
    -> Check that authentication succeeded and a token was returned
    -> Call jwt-liquid-products with Authorization: Bearer <token>
       GET https://dummyjson.com/auth/products?limit=3&select=title,price
    <- Check the response and select the product fields
Return product summaries, or a fixed error message
```

This is **APIEase server-side Liquid**, not authentication code placed in Shopify theme Liquid. The two HTTP requests are helpers. They have no public triggers and no **Next Request** setting; the Liquid request calls them explicitly.

| Resource | Purpose |
| --- | --- |
| [jwt-liquid-product-summaries](resources/requests/jwt-liquid-product-summaries.json) | Liquid entry point. Calls the helpers, checks their results, and renders the public product fields. |
| [jwt-liquid-authenticate](resources/requests/jwt-liquid-authenticate.json) | Signs in with a saved sensitive JSON body containing a DummyJSON demo account. |
| [jwt-liquid-products](resources/requests/jwt-liquid-products.json) | Retrieves three products. Liquid supplies its sensitive Authorization header for that execution. |
| [Product widget](resources/widgets/jwt-liquid-product-summaries.json) | Displays product titles and prices. Included as a display example; storefront access and theme placement remain disabled. |

The handles are separate from the chained example, so both examples can be installed in the same shop.

## Input and output

Call `jwt-liquid-product-summaries` with **no runtime parameters**. The helper handles, endpoints, saved credentials, and product selection are configured on the server. The Liquid template passes only the bearer header it builds from the authentication response to the product helper. It does not forward caller input to either helper.

Each execution signs in again and requests a five-minute token. There is no token cache, refresh flow, or saved token variable in this version.

APIEase wraps the rendered JSON in `data`. A successful response looks like:

```json
{
  "status": 200,
  "data": {
    "ok": true,
    "products": [
      {"id": 1, "title": "Essence Mascara Lash Princess", "price": 9.99},
      {"id": 2, "title": "Eyeshadow Palette with Mirror", "price": 19.99},
      {"id": 3, "title": "Powder Canister", "price": 14.99}
    ]
  }
}
```

The Liquid template checks the product fields and uses `| json` when rendering their values. It returns at most three products with only `id`, `title`, and `price`. Extra upstream fields, pagination metadata, login responses, and tokens are omitted. An empty product list is a successful result with `products: []`.

When authentication fails or its token is missing, Liquid skips the product request and returns:

```json
{
  "status": 200,
  "data": {
    "ok": false,
    "code": "AUTHENTICATION_FAILED",
    "message": "Unable to authenticate with the product service."
  }
}
```

A failed or malformed product response returns `PRODUCTS_UNAVAILABLE` with the message `Unable to load products. Please try again.` Raw upstream errors are not included. Check both the APIEase execution status and `data.ok`: a completed Liquid request can return `ok: false` while the APIEase status remains 200.

DummyJSON provides public demo accounts and synthetic products. Its authenticated product route requires a token, while the same sample catalogue is also available publicly. Use only documented DummyJSON demo credentials here; use no production credentials or customer data.
<!-- apiease-kb:end -->

## Install

You need Node.js 18 or later and the `apiease` CLI configured for your development shop and environment.

1. Choose a demo account from [DummyJSON's authentication guide](https://dummyjson.com/docs/auth).
2. Set `JWT_DEMO_USERNAME` and `JWT_DEMO_PASSWORD` in your shell to that account's values. Keep them out of source files.
3. From the repository root, run:

   ```bash
   bash examples/shopify/authentication/server-side-jwt/liquid-request/create-resources.sh your-store.myshopify.com
   ```

The script creates the two helpers, the Liquid request, and the display widget. It replaces existing resources with these same handles. It renders credentials into a permission-restricted temporary file and removes that file on exit. The checked-in authentication body keeps empty credentials.

All requests are saved without storefront triggers. The script does not add a theme block. Keep this setup restricted to APIEase admin and trusted remote callers.

To configure the resources manually, use the fields in the linked JSON definitions. Set the helper body to your demo credentials, preserve the sensitive flags, and copy the entry request's `liquid` value into its Liquid editor. No **Next Request** settings are needed.

## Run

In APIEase admin, run **JWT Liquid Product Summaries** (`jwt-liquid-product-summaries`). The result should match the success shape above. The authentication helper is not the entry point: running it directly from a trusted admin returns the provider's authentication response.

For a trusted server or development tool, use the [authenticated remote caller](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely) with `requestId=jwt-liquid-product-summaries`. Keep the APIEase API key on that trusted caller. No username, password, or bearer token belongs in browser code.

The widget's **Load products** button calls only the Liquid entry and displays the returned titles and prices. Its prices use USD for this demo. It is included for previewing the display behavior, not as an enabled storefront installation.

## Verified behavior

The [local-store report](../../../../../test/evidence/jwt-liquid-local-store.json) records execution of the deployed resources against live DummyJSON: three product summaries, unchanged results when ordinary caller overrides were supplied, fixed authentication and product errors, and successful execution after restoring the test settings. No token or credential data was detected in those responses.

Controlled tests also cover a missing token, malformed product data, JSON escaping, extra upstream fields, an upstream error containing a token, and rejection of direct storefront access to the supplied resources. The widget's success and error displays were checked in a local browser preview using captured public product data. This was not a Shopify theme or App Proxy test.
