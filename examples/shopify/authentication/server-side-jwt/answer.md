Have your storefront request the data it needs. Your Remix backend can obtain the JWT, use it to call the protected API, and return only the intended display data.

Your concern about a publicly obtainable token is valid. I'm assuming here that the JWT is a private service credential used to call a protected API; your question doesn't specify its issuer or permissions. When a JWT acts as a bearer credential, anyone holding it can exercise the access it grants. Returning it to the frontend can therefore expose more authority than the limited data response your storefront needs. [RFC 6750 explains bearer-token usage](https://www.rfc-editor.org/rfc/rfc6750.html).

## Keep the complete operation in your Remix backend

The request and response flow would be:

```text
Storefront
    -> Shopify App Proxy
    -> Remix backend: request the data

Remix backend
    -> Authentication endpoint: authenticate using server-held credentials

Authentication endpoint
    -> Remix backend: return JWT

Remix backend
    -> Protected API endpoint: request data using JWT

Protected API endpoint
    -> Remix backend: return data

Remix backend
    -> Shopify App Proxy
    -> Storefront: return only the intended display data
```

In practice, your backend would:

1. Validate the App Proxy request and allow only the input needed for this predefined operation.
2. Obtain the JWT using credentials stored on the server.
3. Use that JWT to make the protected API request.
4. Select the fields intended for the storefront and return them, keeping the token and authentication response out of both successful responses and errors.

Any credentials needed to obtain the JWT must also stay on the server, outside storefront JavaScript, browser-delivered markup, and frontend configuration. Both the authentication credentials and JWT stay server-side throughout this workflow. Your backend can also reuse an unexpired token while it remains usable instead of authenticating on every request.

**Also change the existing token endpoint.** Stopping the frontend from calling `GET /apps/PROXY_URL/api/get-token` does not close the exposure if that route still returns a JWT publicly. Remove it from public use, or change it to perform the complete data operation and return only the intended data.

## What App Proxy verifies

Using Shopify App Proxy is appropriate. Shopify adds `logged_in_customer_id`, `path_prefix`, `shop`, `signature`, and `timestamp` to the forwarded query, plus the `X-Forwarded-Host` and `X-Forwarded-For` headers. For an anonymous visitor, the customer ID is empty.

Your backend must verify the signature. It authenticates the signed query parameters; it does not cover an arbitrary request body or every header. The forwarded headers alone are not authentication. See [Shopify's App Proxy authentication documentation](https://shopify.dev/docs/apps/build/online-store/app-proxies/authenticate-app-proxies).

In an application using a compatible version of Shopify's Remix library, its configured `authenticate` object provides the documented helper:

```javascript
await authenticate.public.appProxy(request);
```

Shopify documents this as the [App Proxy request validation helper](https://shopify.dev/docs/api/shopify-app-remix/latest/authenticate/public/app-proxy). It is separate from authenticating to your upstream service:

- **App Proxy verification:** Remix verifies the Shopify-forwarded request.
- **Upstream authentication:** Remix obtains and uses the protected service's JWT.

The storefront does not need that service JWT to ask your backend to perform this predefined operation.

Someone can still reproduce a public App Proxy request in Postman and receive the data it intentionally exposes; that does not expose the JWT. An authenticated upstream API can supply information you deliberately display publicly. For customer-specific or confidential results, add caller authorization and resource-ownership checks. A verified `logged_in_customer_id` supplies customer context, but you must still check access to the requested resource. [Shopify documents that customer context here](https://shopify.dev/docs/apps/build/online-store/app-proxies/authenticate-app-proxies).

## The same workflow with APIEase

I'm the developer of APIEase. It provides server-side execution for this integration, so the authentication and protected API calls can run without building and hosting that integration backend yourself. Your existing Remix backend can already solve this; APIEase is another way to run this particular integration while keeping the rest of your application.

This extends the pattern in [my earlier reply about theme extensions and the Shopify API](https://community.shopify.com/t/using-shopify-api-from-theme-extention/332413): the storefront supplies limited input, and the backend performs the privileged call. Here, the backend first obtains the credential needed for that call.

### Option 1: Chained Requests

For a straightforward linear workflow, chain an authentication request to a protected-data request. The second request uses the token from the first response, with the actual token field and authorization format determined by your provider. APIEase documents this in [Chained Requests](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) and its [authentication walkthrough](https://docs.apiease.com/docs/general/apiease-details/authentication-example).

```text
Storefront -> Shopify App Proxy -> APIEase

Authentication Request
    -> Obtain JWT
    -> Pass JWT server-side to the next request

Protected API Request
    -> Use JWT
    -> Return the intended data through App Proxy to the storefront
```

Configure the public operation to return only the final display data, keeping the intermediate authentication response internal. The public entry point must run the complete operation without exposing a token-only shortcut. Chaining passes values between requests; it does not automatically remove tokens or private fields from returned data, as the [authentication documentation explains](https://docs.apiease.com/docs/general/apiease-details/authentication-example).

### Option 2: Liquid Request

An [APIEase Liquid Request](https://docs.apiease.com/docs/requests/request-types/liquid-requests) can call saved requests, inspect their responses, and shape the output. It can obtain the JWT, check whether authentication succeeded, use the token in the protected API call, and render only the desired result.

This gives you more control over input validation, conditional logic, error handling, and which fields reach the storefront than a simple linear chain. Keep token-producing helper requests internal and return sanitized errors if either call fails.

This Liquid executes on APIEase's server. It is separate from Shopify theme Liquid: the authentication code and credentials belong in the APIEase request, while the theme receives only its deliberately rendered result.

### Option 3: Liquid Request with persisted JWT caching and expiry handling

Build on Option 2 by saving the JWT and its expiry in a persisted APIEase shop variable, then checking that state on later executions:

```text
Storefront -> Shopify App Proxy -> APIEase Liquid Request

Read cached JWT and expiry
    |
    +-- Token remains usable:
    |       Call protected API with cached JWT
    |
    +-- Token missing or approaching expiry:
            Authenticate
            Save replacement JWT and expiry
            Call protected API with replacement JWT

Return only the intended data through App Proxy to the storefront
```

Use the provider's documented expiry information and allow a small margin before expiry. The benefit is fewer authentication calls while the JWT stays server-side.

An [APIEase shop variable](https://docs.apiease.com/docs/variables/variables-overview) persists across executions, unlike a temporary Liquid variable within one execution. System Requests let the workflow read and update that stored state. Mark the token variable **Sensitive**, which masks its value in the admin UI. The value remains available to authorized runtime workflows, so that setting does not prevent a public request from exposing it if you render or return it. Keep cache access internal and return only the intended display data.
