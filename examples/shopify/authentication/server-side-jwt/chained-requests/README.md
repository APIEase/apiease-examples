# Obtain a JWT and retrieve public product data with Chained Requests

<!-- apiease-kb:start -->
**Status: the internal chain works in controlled runtime tests and against the live demo provider. It is not ready for a public storefront.** Both checked-in requests have empty trigger lists. Do not add Storefront App Proxy triggers until the [platform requirements](platform-requirements.md) have been implemented and the public operation has passed verification.

## Scenario and architecture

This example uses [DummyJSON's documented login](https://dummyjson.com/docs/auth) and [authenticated resource routes](https://dummyjson.com/docs#resources-as-auth-user). A synthetic demo account obtains an `accessToken` JWT. The next request sends it as a bearer credential to `/auth/products` and requests three product summaries. The product data is deliberately public sample content; DummyJSON also makes it available without authentication at `/products`.

DummyJSON is a hosted test service, not a production identity provider. Its account credentials are public demo data. Use only its documented sample accounts here; do not send real customer, Shopify, or production credentials to it. No merchant-hosted mock backend is required.

Implemented internal flow:

```text
Trusted server or APIEase admin
    -> jwt-chain-authenticate: POST https://dummyjson.com/auth/login
    <- JWT in authentication response (server-side)
    -> Next Request: jwt-chain-products
       GET https://dummyjson.com/auth/products?limit=3&select=title,price
       Authorization: Bearer <JWT from previous response>
    <- Final product data returned to the initiating caller
```

The intended storefront entry is the complete operation starting at `jwt-chain-authenticate`. It remains disabled. There is no separate token-only request, Liquid gateway, widget, token cache, or replacement integration backend in this package.

## Resources and invocation contract

| Resource | Role |
| --- | --- |
| [jwt-chain-authenticate](resources/requests/jwt-chain-authenticate.json) | POST login using a sensitive saved JSON body. Its `nextRequest` field contains the handle `jwt-chain-products`. |
| [jwt-chain-products](resources/requests/jwt-chain-products.json) | GET the fixed product endpoint using `Bearer {accessToken}` from the previous response. Requests only `title` and `price`; the provider also returns each product's `id`. |

These are ordinary resource definitions for `apiease create request`. `nextRequest` is the public CRUD field; its value is a handle, not a server-owned ID. The chain uses [documented response substitution](https://docs.apiease.com/docs/requests/request-parameters/chained-requests). Neither source file contains credentials or server-owned IDs.

Invoke `jwt-chain-authenticate` without runtime input. Do not supply embedded body, header, path, query, or system overrides. The username, password, expiry setting, destination, headers, and product selection are saved server-side configuration. **This no-input contract is currently a caller responsibility; it is not enforced against public callers by these resources.**

The saved authentication body starts with empty username and password values and is unusable until configured. Setup supplies a DummyJSON demo account and requests a five-minute token using the provider's documented `expiresInMins` field. Every execution authenticates again. The returned refresh token is unused.

## Observable results and limitations

The successful APIEase result contains the final request's `status` and `data`. `data.products` contains up to three objects with `id`, `title`, and `price`; `data` also includes the provider's `total`, `skip`, and `limit`. Authentication responses and their cookies are absent from the tested successful result.

The current runtime continues to the next request even after a failed login. Without an access token, the protected endpoint rejects the request; an unresolved-variable warning can accompany that final result. A protected-API failure returns that endpoint's status and response body. These are observations, not a sanitized public error contract. If an upstream error body contains a token, the chain currently passes it through.

APIEase's legacy HTTP response wrapper can use HTTP 200 while the JSON body's `status` is 401, 403, or 502. Check the body's status when using the trusted remote caller. A successful HTTP transport alone does not establish a successful chain.

Sensitive saved parameters and `RECORD_RUNTIME_HISTORY=false` do not filter upstream response bodies or lock caller overrides. The [platform requirements](platform-requirements.md) explain the missing enforcement. Customer login is not needed for this public sample product scenario.
<!-- apiease-kb:end -->

## Install for trusted internal testing

Use Node.js 18 or later and the `apiease` CLI configured for your intended development shop and environment. The setup script creates or updates only the two handles above, with empty trigger lists; an existing definition with either handle will be replaced.

1. Set `JWT_DEMO_USERNAME` and `JWT_DEMO_PASSWORD` in your shell to a demo account from the [provider's authentication documentation](https://dummyjson.com/docs/auth). Keep these settings out of tracked files.
2. Run from the repository root:

   ```bash
   bash examples/shopify/authentication/server-side-jwt/chained-requests/create-resources.sh your-store.myshopify.com
   ```

3. Invoke `jwt-chain-authenticate` through APIEase's authenticated admin or [trusted remote caller](https://docs.apiease.com/docs/requests/triggers/calling-requests-remotely). Keep the APIEase API key on the trusted server. No runtime parameters are required.

The script creates the product dependency first, then renders the authentication body into a permission-restricted temporary file. It removes that file on exit and leaves the checked-in resource unchanged. Do not run setup with shell tracing enabled. There is deliberately no step to publish an App Proxy trigger or add a theme block.

## Verification

The runtime tests require an APIEase source checkout with its dependencies installed. Set `APIEASE_RUNTIME_PATH` to that checkout. This is a maintainer test dependency, not a backend merchants need to deploy.

```bash
APIEASE_RUNTIME_PATH=/absolute/path/to/apiease node --test test/server-side-jwt-chained.test.js
APIEASE_RUNTIME_PATH=/absolute/path/to/apiease node scripts/verification/verifyJwtChain.mjs
```

The second command exits **2** while public-storefront requirements fail. Passing characterization tests confirm the reported limitations; they do not mean the public operation is safe. Without `APIEASE_RUNTIME_PATH`, the regular tests cover source and setup only and explicitly skip the runtime group.

With the documented demo credentials in the environment, run the chain against the live provider:

```bash
APIEASE_RUNTIME_PATH=/absolute/path/to/apiease node scripts/verification/verifyJwtChain.mjs --live-provider
```

This runs actual APIEase execution modules against DummyJSON, with injected in-memory resource storage, shop context, and usage accounting. It verifies the final data and token absence without printing tokens. It is not a deployed APIEase or Shopify App Proxy test. The controlled tests inject upstream responses, including a deliberately token-containing error; that error is not a claim about DummyJSON's observed behavior.

Evidence: [controlled runtime checks](../../../../../test/evidence/jwt-chain-runtime.json) and [live provider checks](../../../../../test/evidence/jwt-chain-provider.json). Reports record resource hashes, relevant runtime source hashes, and the source checkout revision. No deployed resource creation, theme rendering, or Shopify signature verification has been verified. The configured development APIEase endpoint could not be reached during this task.
