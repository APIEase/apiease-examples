# Server-side JWT authentication

Source post: [Autenticate API call](https://community.shopify.com/t/autenticate-api-call/407663) (Shopify Community).

<!-- apiease-kb:start -->
Keep authentication and the protected API call on the server. The caller receives the data it needs without obtaining the service's JWT.

Three examples demonstrate this with the same DummyJSON demo accounts and product catalogue:

| Example | Approach |
| --- | --- |
| [Chained Requests](chained-requests/README.md) | One request signs in, then **Next Request** passes the returned token to the product request. |
| [Liquid Request](liquid-request/README.md) | Liquid calls the two helpers explicitly, stops on authentication failure, and renders selected fields or a fixed error message. |
| [Liquid Request with JWT caching](liquid-cached-request/README.md) | Liquid reuses a persisted token until it approaches expiry and permits one renewal and retry when the product API rejects the token. |

The examples have been deployed and tested through APIEase's authenticated remote caller. Their READMEs cover setup, invocation, returned data, and the supported execution scope. A verified public storefront integration is not included yet.
<!-- apiease-kb:end -->

[answer.md](answer.md) is the community response draft. This package is not yet enrolled in the curated examples knowledge base.
