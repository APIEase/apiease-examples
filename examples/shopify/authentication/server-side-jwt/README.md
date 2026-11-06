# Server-side JWT authentication

<!-- apiease-kb:start -->
Keep authentication and the protected API call on the server. The caller receives the data it needs without obtaining the service's JWT.

The [Chained Requests example](chained-requests/README.md) demonstrates this with DummyJSON: one saved request signs in, then a second uses the returned token to retrieve product summaries. The chain has been deployed and tested through APIEase's authenticated remote caller. Its README covers setup, invocation, and the returned data. A verified storefront integration is not included yet.

The Liquid orchestration and persisted-token caching alternatives described in the community answer are not implemented here yet.
<!-- apiease-kb:end -->

[answer.md](answer.md) is the community response draft. This package is not yet enrolled in the curated examples knowledge base.
