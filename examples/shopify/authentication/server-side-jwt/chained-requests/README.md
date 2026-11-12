# Obtain a JWT and retrieve product data with Chained Requests

Source post: [Autenticate API call](https://community.shopify.com/t/autenticate-api-call/407663) (Shopify Community).

<!-- apiease-kb:start -->
This example shows how to authenticate with an external API, use the returned JWT in a second request, and return product data to the caller. APIEase performs both requests on the server. The caller does not need to obtain or send the JWT.

The two saved requests have been deployed and tested against DummyJSON through APIEase's authenticated remote caller. This package currently provides the request chain; a storefront widget and verified storefront setup are not included.

## How it works

```text
Call jwt-chain-authenticate
    -> APIEase signs in to DummyJSON using saved demo credentials
    <- DummyJSON returns an accessToken
    -> APIEase runs jwt-chain-products using that token
    <- The caller receives product data
```

[DummyJSON](https://dummyjson.com/docs/auth) provides public demo accounts and sample products. Its authenticated `/auth/products` route requires a bearer token, even though the product data is also publicly available at `/products`. This makes it a useful demonstration without using real customer data or production credentials.

| Request | What it does |
| --- | --- |
| [jwt-chain-authenticate](resources/requests/jwt-chain-authenticate.json) | Signs in at `https://dummyjson.com/auth/login`. Its **Next Request** is `jwt-chain-products`. |
| [jwt-chain-products](resources/requests/jwt-chain-products.json) | Calls `https://dummyjson.com/auth/products` with `Authorization: Bearer {accessToken}` and requests three product summaries. |

`{accessToken}` refers to the previous request's response. APIEase substitutes it on the server when running the second request. This is the standard [Chained Requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) handoff.

Leave **Sensitive** off for this Authorization header: its saved value is the visible template `Bearer {accessToken}`, and the token is supplied only at runtime. Marking the template sensitive would encrypt and mask the placeholder without protecting an additional saved credential. Keep the authentication body sensitive because it stores the username and password.

Call `jwt-chain-authenticate` without runtime parameters. The credentials, endpoints, headers, and product selection are saved in APIEase. Each execution obtains a new token; this example does not cache tokens or use the returned refresh token. The login requests a five-minute token.

## Result

The successful response contains the product request's `status` and `data`. Each product has an `id`, `title`, and `price`; pagination values are also returned. The intermediate login response is not included.

```json
{
  "status": 200,
  "data": {
    "products": [
      {"id": 1, "title": "Essence Mascara Lash Princess", "price": 9.99},
      {"id": 2, "title": "Eyeshadow Palette with Mirror", "price": 19.99},
      {"id": 3, "title": "Powder Canister", "price": 14.99}
    ],
    "total": 194,
    "skip": 0,
    "limit": 3
  }
}
```

This is the response observed during verification; DummyJSON's sample catalogue can change. Check the JSON body's `status` before using `data`: the tested remote caller returned HTTP 200 even when the body reported a 401 authentication error. A failed login can also produce an unresolved-variable warning because the second request has no token to use.

## Storefront access

A **Storefront App Proxy** trigger allows a request to be called through Shopify's app proxy. It controls storefront access; it does not move execution into the browser or require the browser to receive the JWT.

APIEase's [storefront documentation](https://docs.apiease.com/docs/requests/triggers/storefont-calls) describes adding this trigger to the request the storefront calls directly, while leaving requests called only by that request without a public trigger. In this example, the storefront entry would be `jwt-chain-authenticate`, which runs the complete chain.

The supplied resources have no storefront triggers. The verified setup below uses APIEase admin or its authenticated remote caller. Storefront execution of this example still needs verification; do not treat the remote-call results as a completed storefront integration.
<!-- apiease-kb:end -->

## Set up in APIEase

Create the product request first so it is available when selecting the next request for authentication.

1. Create an **HTTP** request with handle `jwt-chain-products`:
   - Method: `GET`
   - Address: `https://dummyjson.com/auth/products`
   - Header `Accept`: `application/json`
   - Header `Authorization`: `Bearer {accessToken}`; leave **Sensitive** off.
   - Query parameter `limit`: `3`
   - Query parameter `select`: `title,price`
2. Create an **HTTP** request with handle `jwt-chain-authenticate`:
   - Method: `POST`
   - Address: `https://dummyjson.com/auth/login`
   - Headers `Accept` and `Content-Type`: `application/json`
   - A sensitive JSON body containing the demo account's username and password, as shown below.
   - **Next Request**: `jwt-chain-products`
3. On both requests, set the system parameters `REQUEST_TIMEOUT_SECONDS` to `15` and `RECORD_RUNTIME_HISTORY` to `false`, matching the resource files. Save both requests without storefront triggers.

Use a documented account from [DummyJSON's authentication guide](https://dummyjson.com/docs/auth) to replace the placeholders:

```json
{
  "username": "DEMO_USERNAME",
  "password": "DEMO_PASSWORD",
  "expiresInMins": 5
}
```

Keep these values in the saved sensitive body. Do not put them in theme code. The checked-in authentication definition has empty credentials so users can configure their own demo account. Use only DummyJSON demo credentials for this example.

### CLI setup

[create-resources.sh](create-resources.sh) supplies the demo credentials from `JWT_DEMO_USERNAME` and `JWT_DEMO_PASSWORD` and creates or updates the two request handles. It requires a CLI version that accepts `nextRequest`. The tested CLI version, 0.2.7, rejects this field in both create and update commands; use the admin setup above with that version.

With a compatible CLI configured for your development shop, set the two environment variables and run:

```bash
bash examples/shopify/authentication/server-side-jwt/chained-requests/create-resources.sh your-store.myshopify.com
```

The script replaces existing definitions with these handles. It keeps credentials in a permission-restricted temporary file, removes that file on exit, and leaves the source files unchanged.

## Run the example

Run `jwt-chain-authenticate` in APIEase admin, or invoke that handle through the [authenticated remote caller](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely). No runtime input is needed. For remote calls, keep the APIEase API key in your trusted server or development environment.

You should receive the product result shown above. Running `jwt-chain-products` alone has no previous authentication response, so the token is missing and DummyJSON rejects the call.

## Verified behavior

The [local-store verification report](../../../../../test/evidence/jwt-chain-local-store.json) records successful execution with three product summaries, rejection of missing or invalid tokens and invalid login credentials, and successful execution again after those failure tests. No token or credential data was detected in the inspected response bodies, headers, or cookies.

The live tests used APIEase's authenticated remote caller. Storefront attempts reached Shopify's password page, so Shopify App Proxy execution and theme rendering were not verified. These results apply to the demonstrated DummyJSON responses; they are not a guarantee about the responses of other APIs.
