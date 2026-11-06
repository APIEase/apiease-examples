# Server-side JWT authentication with Shopify App Proxy

<!-- apiease-kb:start -->
Keep the authentication request and the protected API call on the server. The storefront should receive only the data deliberately intended for visitors.

The first implementation is the [Chained Requests example](chained-requests/README.md). Its internal authentication-to-products flow has been exercised using APIEase runtime source and DummyJSON. **Public storefront activation is blocked by the current runtime's parameter and response handling.** The package has no public triggers. See the [platform requirements and reproduced behavior](chained-requests/platform-requirements.md).

The Liquid orchestration and persisted-token caching alternatives described in the community answer are not implemented here yet.
<!-- apiease-kb:end -->

[answer.md](answer.md) is the community response draft. The implementation status above is authoritative for the files currently available. This package is not yet enrolled in the curated examples knowledge base.
