# Reuse a server-side JWT with a Liquid Request

<!-- apiease-kb:start -->
This example adds a persisted JWT cache to the [Liquid Request example](../liquid-request/README.md). It retrieves the same three DummyJSON product summaries, but signs in only when the cached token is missing, unusable, or rejected by the provider.

**Supported usage:** run this version from APIEase admin or the authenticated remote caller. Leave all Storefront App Proxy triggers disabled. Public storefront invocation is not supported by this verified setup.

## Resources and execution

| Resource | Purpose |
| --- | --- |
| [jwt-cache-product-summaries](resources/requests/jwt-cache-product-summaries.json) | Liquid entry point. Checks the cache, obtains a token when needed, calls the product helper, and renders selected fields. |
| [jwt-cache-authenticate](resources/requests/jwt-cache-authenticate.json) | Signs in to DummyJSON using a sensitive saved body and requests a five-minute access token. |
| [jwt-cache-products](resources/requests/jwt-cache-products.json) | GETs `/auth/products?limit=3&select=title,price` with the bearer header supplied by Liquid. |
| [jwt-cache-read](resources/requests/jwt-cache-read.json) | System request using `getVariables` to read this shop's cache. |
| [jwt-cache-write](resources/requests/jwt-cache-write.json) | System request using `setVariables` to replace the sensitive cache record. Called without parameters, it clears the cache. |
| [jwt-cache-dummyjson](resources/variables/jwt-cache-dummyjson.json) | Sensitive shop Variable containing the token, timestamps, and authorization context. Initially empty. |

```text
Call jwt-cache-product-summaries (no runtime parameters)
    -> Read this shop's cache
    -> Reuse a usable token, or sign in and save a replacement
    -> GET the protected products
       On 401: clear the cache, sign in again, retry the GET once
    -> Validate and select id, title, price
Return product summaries, or a fixed error
```

The HTTP and System requests are internal helpers with no public triggers or **Next Request** settings. All orchestration runs in APIEase server-side Liquid. The handles are distinct from examples 1 and 2, so they can coexist in the same shop.

## Cache and expiry

The Variable persists across executions. Its value is one object with `accessToken`, `issuedAt`, `expiresAt`, and `context`; `issuedAt` and `expiresAt` are Unix timestamps in seconds. Keeping them in one record avoids separate token and expiry writes.

[DummyJSON documents `expiresInMins`](https://dummyjson.com/docs/auth). The authentication helper requests five minutes, and Liquid calculates a conservative expiry as the time **before** the login call plus 300 seconds. This includes login latency in the token's usable lifetime. The example does not decode the JWT or use the returned refresh token; renewal means signing in again with the saved credentials.

The template's `safety_margin_seconds` is 30. A cached token is reused only when its expiry is more than that many seconds away. Missing fields, wrong types, a blank token, a future issue time, an inconsistent lifetime, a different context, or an expired token cause fresh authentication. A failed cache read or write returns a fixed `CACHE_UNAVAILABLE` error.

Adjust the safety margin at the start of the saved Liquid template, keeping it positive and below the token lifetime. If changing the lifetime, update both the login body's `expiresInMins` and the template's `token_lifetime_seconds`, then clear the cache. For another provider, use that provider's documented expiry contract.

Only a product response with status 401 triggers renewal. The operation is a read-only GET and permits one retry. A second 401 clears the replacement and ends with an error. Statuses such as 403, 404, 429, and 500 do not trigger another login. Failed authentication stops the operation without caching the failed response.

## Account isolation and simultaneous calls

APIEase Variables belong to a shop. This cache is dedicated to one configured DummyJSON demo account and the fixed product operation; its context is `dummyjson-demo-products-v1`. Treat that account as the shared service identity for this synthetic catalogue, never as the visiting customer's identity.

Clear the cache whenever changing credentials, account, provider, audience, or permissions. The installation script resets it before replacing the requests. If adapting this example for multiple authorization contexts within a shop, give each context separate cache and request handles, its own credentials, and a distinct `cache_context`. Do not share an individual customer's token across storefront visitors.

There is no refresh lock. Simultaneous cache misses can both sign in and write complete records; the last write becomes the saved cache, while each execution uses its own returned token. A concurrent rejection can also clear a newer cached value, causing an extra login. This pattern requires a provider that permits overlapping tokens. Live verification confirmed that an earlier DummyJSON token still works after another login. Providers that invalidate the previous token on renewal need coordinated renewal before using this pattern.

## Input and output

Run `jwt-cache-product-summaries` with no runtime parameters. Credentials, endpoints, cache selection, and product selection are saved on the server. The template constructs each helper call explicitly.

The final response matches example 2:

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

Only `id`, `title`, and `price` are returned, with JSON escaping and a maximum of three products. Empty product lists are allowed. Authentication responses, cache records, and raw upstream errors are never rendered by the template. **Sensitive** masks the saved Variable in admin; authorized server workflows can still read its value. Do not expose the authentication or cache helpers publicly.

Failures have `data.ok: false`, a `code`, and a fixed `message`:

| Code | Message |
| --- | --- |
| `AUTHENTICATION_FAILED` | Unable to authenticate with the product service. |
| `PRODUCTS_UNAVAILABLE` | Unable to load products. Please try again. |
| `CACHE_UNAVAILABLE` | Unable to prepare authentication. Please try again. |

Check both the APIEase execution status and `data.ok`; a completed Liquid request can return an application error while its execution status remains 200. No cache diagnostics are added to the display response.
<!-- apiease-kb:end -->

## Install and run

Use Node.js 18 or later and an `apiease` CLI configured for your development shop. Set `JWT_DEMO_USERNAME` and `JWT_DEMO_PASSWORD` to an account from [DummyJSON's authentication guide](https://dummyjson.com/docs/auth), then run from the repository root:

```bash
bash examples/shopify/authentication/server-side-jwt/liquid-cached-request/create-resources.sh your-store.myshopify.com
```

The script installs five requests and one sensitive Variable. It replaces existing resources with those handles and resets the cache. Credentials are written only to a permission-restricted temporary file, which is removed on exit. Use documented DummyJSON demo credentials, not production credentials or customer data.

In APIEase admin, run **JWT Cached Product Summaries** (`jwt-cache-product-summaries`) twice. The first call signs in and saves the cache; the second uses the cached token. The product output is the same. For server-side automation, use the [authenticated remote caller](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely) with this handle and keep the APIEase API key on the trusted caller.

To clear the cache, run **JWT Cache Write** (`jwt-cache-write`) from APIEase admin with no runtime parameters. It returns only a write acknowledgement. The next product request signs in again. Running the authentication or cache-read helper directly returns private authentication data to that trusted caller; use the product entry for the normal operation.

## Verification

Controlled tests exercise cache misses and reuse across executions, the expiry boundary, malformed records, authorization-context mismatch, shop isolation, bounded 401 retries, other failures, simultaneous misses, selected output fields, and rejection of direct storefront access.

The [local-store report](../../../../../test/evidence/jwt-cache-local-store.json) records live cache creation, reuse while login was temporarily disabled, expiry and safety-margin renewal, recovery from an invalid token, malformed-cache replacement, and fixed failure responses. Three simultaneous calls succeeded, and an earlier token remained usable after another login. Temporary credential and endpoint changes were restored. No token or credential data was detected in the final product responses.

Expiry tests set stored timestamps to expired or near-expiry values; they do not wait five minutes for a token to expire naturally. Shopify theme rendering and public App Proxy invocation are outside the verified setup.
