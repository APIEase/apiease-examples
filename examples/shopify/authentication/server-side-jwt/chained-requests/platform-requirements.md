# Platform changes needed for a pure public JWT chain

The example deliberately remains a two-request HTTP chain. A Liquid gateway was considered and excluded. These are required runtime capabilities and acceptance conditions, **not configuration fields that APIEase currently supports**. No APIEase platform source was changed for this example.

## 1. Enforce a saved public input policy through the entire chain

Controlled tests reproduce caller-supplied `bodyEmbedded` replacing the saved login password, `headersEmbedded` replacing the protected request's Authorization header, and `queryParamsEmbedded` replacing the product selection and limit. `systemParamsEmbedded` can set `VERIFY_SSL_CERT` to `false` and override a failed result's status to 202. Sensitive saved parameters do not prevent these overrides.

Relevant runtime code: `backend/integration/parameterResolver.js`, particularly `resolveAllEmbeddedParametersByName`; `backend/service/caller/nextRequestService.js`, which copies the original caller input into the continuation; and `backend/service/caller/responseOverrides.js`.

Required behavior: a saved policy for this public operation must reject unapproved caller input before authentication. This example accepts no business input. Caller input must not modify credentials, privileged headers, destinations, response modes, TLS verification, result statuses, chain continuation, or runtime-history settings. Apply the policy to query and body inputs and carry the trusted execution context through every continuation. Keep fixed destinations fixed; no destination-redirection exploit was reproduced for these literal URLs.

Acceptance: submit overrides through GET queries and POST bodies. The public request must reject them without making an upstream call, or ignore them while preserving the exact configured operation. No override may change what leaves the server or what returns publicly. Verify supported execution shortcuts against the deployed route as well. In the current source test, an extra query parameter named `nextRequest` does not bypass the saved chain; no token-only bypass was demonstrated.

## 2. Allow a public chain entry to call internal saved dependencies

Publishing only the authentication entry in the controlled runtime causes login to run, followed by a 403 when the product request lacks its own Storefront App Proxy trigger. Publishing both requests makes the normal chain work, but exposes the helper directly as well.

Relevant runtime code: `backend/service/caller/nextApiEaseCallParameterService.js` preserves the App Proxy route; `backend/service/caller/apiEaseCallValidator.js` and `backend/service/trigger/storefront/storefrontAppProxyExecutionPolicyService.js` apply the public-trigger gate again at the next step.

Required behavior: verify the public entry once, then authorize only its saved same-shop dependency chain through trusted internal execution context. Do not grant this context from a caller parameter. Keep direct public invocation of both internal-only resources and arbitrary request handles forbidden. An alternative platform design could enforce equivalent restrictions on every published step, but merely adding a second public trigger is insufficient for the stated internal-helper boundary.

Acceptance: the entry completes with only its own public trigger, while direct calls to the protected-data helper are rejected before execution. Signature and originating-shop verification still apply at the public entry.

## 3. Define failure handling and the public response independently of upstream bodies

The successful source-runtime and live-provider checks return only product data. However, controlled tests also show that:

- A failed authentication request still runs the product request with an unresolved token placeholder; internal parameter warnings reach the caller.
- A token deliberately included in a simulated protected-API error is returned unchanged in the final browser-visible response body.
- HTTP failures can be wrapped in HTTP 200 even though the body's status indicates failure.

Relevant runtime code: `backend/integration/caller.js` (`apiEaseCall` and `handleNextRequest`), `backend/service/http/httpCallService.js` (`buildConciseResponse`), and `app/service/requests/requestExecutionHttpResponse.js`.

Required behavior: support an enforceable chain failure policy and an explicit public output contract. Stop this chain on failed authentication or a missing/invalid token field. Return fixed sanitized errors, suppress private intermediate payloads and internal diagnostics, and allow only the intended final product fields and pagination metadata. An empty, failed, missing, or malformed continuation must never fall back to exposing the authentication response. This requirement includes both access and refresh tokens, response headers, and cookies. Do not rely on field-name detection alone to sanitize arbitrary error text.

Acceptance: verify successful data, failed login, missing token, protected-API errors, timeouts, missing dependencies, malformed responses, and errors containing credential/token canaries. Inspect the complete external response, not just the widget display. Define HTTP and body-status behavior consistently for the public contract.

## Additional server-log observation

`backend/service/http/httpCallController.js` serializes and truncates HTTP responses for server logs. That can include an authentication response. Disabling runtime history is not log redaction. Before production service credentials are used with this pattern, redact token-bearing authentication responses at every execution/logging boundary, including standalone executors. This was a source inspection finding; no deployment log audit was performed. The verification harness suppresses runtime logs only in its own process.

## CLI installation compatibility

Local deployment exposed a separate tooling gap: both `apiease create request` and `apiease update request` reject `nextRequest` with `INVALID_REQUEST_CREATE_CONTRACT` and `UNSUPPORTED_FIELD`. Both commands use `src/client/ApiEaseCreateRequestContractValidator.js` in `apiease-cli`, whose top-level field allowlist omits `nextRequest`. The deployed public update API accepted the same complete authentication definition, and the saved chain executed successfully.

Required change: align the CLI request validator with the public API's supported chain field and add create/update coverage for handle-based continuation. A string `nextRequest` must reach the API without being stripped or rejected; invalid values must still fail validation. The checked-in setup script requires this CLI fix. The local deployment used the versioned public CRUD API, with resource-version checks, to apply the definitions without changing runtime behavior or introducing an orchestration gateway. The [local-store report](../../../../../test/evidence/jwt-chain-local-store.json) identifies the tested CLI revision and validator hash.

## What has and has not been established

The [runtime audit](../../../../../scripts/verification/verifyJwtChain.mjs) exits 2 and reports `storefrontReady: false` for the current implementation. The [characterization tests](../../../../../test/server-side-jwt-chained.test.js) exercise actual APIEase modules with in-memory persistence and controlled upstream responses. The live-provider source check exercises the same chain with DummyJSON.

The separate [local-store verification](../../../../../test/evidence/jwt-chain-local-store.json) confirms saved-resource readback and deployed APIEase execution against DummyJSON: successful product data, missing-token and invalid-token rejection, failed-login warnings, and successful execution after the failure tests. No token or credential data was detected in those responses. Storefront probes redirected to Shopify's password page, so live App Proxy trigger rejection and signature handling remain unverified. No theme block was installed or rendered. This deployment test does not resolve the public input and output requirements above.

After the platform capabilities exist, update these resource definitions using the actual supported schema, add the intended public trigger and storefront widget, and run the browser-visible success, failure, override, and direct-helper checks on a development shop. Keep the example out of the curated knowledge base and avoid calling it a working public-storefront solution until those checks pass.
