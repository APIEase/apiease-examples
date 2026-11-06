Hopefully the following explanation to this older question will help others.

**A JWT is a sensitive credential that is used to authenticate with a protected API. It should never be exposed in your storefront, whether through JavaScript, an API response, or any other browser-accessible mechanism.**

Fortunately, the solution is pretty straightforward, and it can be implemented using a Remix backend and Shopify App Proxy.

### Keep authentication and API execution on the backend

Rather than having your storefront obtain the JWT and then use it to make the authenticated API call, have your Remix backend perform both operations.

The entire process looks like this:

1. **Storefront → Remix backend:** Your storefront makes a request through Shopify App Proxy for the data it needs, not for a JWT.
2. **Remix backend → Authentication API:** Your backend authenticates with the external service using securely stored credentials and receives the JWT.
3. **Remix backend → Protected API:** Your backend uses the JWT to make the authenticated API call and receives the requested data.
4. **Remix backend → Storefront:** Your backend returns the data to the storefront through Shopify App Proxy.

**The important distinction is that both the authentication request and the authenticated API call happen entirely on the backend. Neither the JWT nor the credentials used to obtain it are ever exposed to the storefront.**

You can also retain the JWT on your backend and reuse it until it expires, rather than authenticating with the external service for every storefront request.

### What about Shopify App Proxy?

The Shopify App Proxy is the proper entry point to a backend service for this type of storefront integration.

When Shopify forwards an App Proxy request to your backend, it includes parameters such as `shop`, `timestamp`, `logged_in_customer_id`, and `signature`.

Your backend should verify the Shopify-generated signature to confirm that the request was forwarded through Shopify and that the signed parameters haven't been modified.

If you're using Shopify's Remix authentication library, you can use:

```javascript
await authenticate.public.appProxy(request);
```

You can read more about this in [Shopify's App Proxy authentication documentation](https://shopify.dev/docs/apps/build/online-store/app-proxies/authenticate-app-proxies).

It's worth noting that **even after making these changes, someone can still reproduce a request to your public App Proxy endpoint using Postman and receive the resulting data. That's perfectly fine when you're in control of what data is returned and it's intended for public consumption.**

### You can also do this with APIEase

APIEase provides a managed backend for Shopify API integrations.

The architecture is essentially identical to the Remix solution above, except APIEase handles the server-side execution without requiring you to build and maintain your own integration backend.

There are three ways to accomplish this with APIEase, depending on how much control you need.

**1. Chained Requests — the simplest approach**

Create one request that authenticates with your external API and obtains the JWT. [Chain](https://docs.apiease.com/docs/requests/request-parameters/chained-requests) that request to a second request that uses the JWT to retrieve the data.

Both requests execute on the server, and the storefront receives only the intended result of the authenticated API call.

**2. Liquid Request — more control over the process**

An APIEase [Liquid Request](https://docs.apiease.com/docs/requests/request-types/liquid-requests) can execute the authentication request, capture the JWT, and then execute the authenticated API request.

The advantage is that you can introduce conditional logic, validate responses, handle errors, and control precisely what gets returned to the storefront.

This is Liquid executing on the APIEase server, not Liquid running in your Shopify theme.

**3. Liquid Request with JWT caching — avoid unnecessary authentication calls**

This takes the second approach a step further.

Instead of obtaining a new JWT for every storefront request, store it in a sensitive [APIEase variable](https://docs.apiease.com/docs/variables/variables-overview) along with its expiration information.

When a new request arrives, check whether the existing JWT is still valid. If it is, reuse it. If not, authenticate again, store the replacement, and continue with the API call.

This allows the JWT to be reused across storefront requests without exposing it to the browser.

You can find the three approaches demonstrated here:

[Server-side JWT authentication with Shopify App Proxy](https://github.com/APIEase/apiease-examples/tree/main/examples/shopify/authentication/server-side-jwt)

**Ultimately, whether you're using Remix or APIEase, the principle is the same: authenticate on the server, make the protected API call on the server, and return only the data your storefront needs.**