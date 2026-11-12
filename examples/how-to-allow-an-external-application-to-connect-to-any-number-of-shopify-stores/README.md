# How To Allow An External Application To Connect To Any Number Of Shopify Stores

Source post: [How to allow an external application to connect to any number of Shopify stores](https://community.shopify.com/t/how-to-allow-an-external-application-to-connect-to-any-number-of-shopify-stores/361444) (Shopify Community).

This example answers the Shopify Community question by showing a small APIEase setup for a multi-store external application.

The key point is that there is not a generic Shopify URL that lets an arbitrary external app send a merchant to Shopify, have them pick any store, and return permanent credentials to that external app.

The supported pattern is still store-by-store app authorization. With APIEase, each merchant installs and authorizes APIEase for their own shop, APIEase stores that shop's OAuth token, your external app can remotely execute the same saved request against whichever shop domain has already authorized the app, and APIEase can also forward Shopify webhook events to your external system with a shared secret header for verification.

## What this example does

- Creates one saved HTTP request per shop that calls the Shopify Admin GraphQL API.
- Uses APIEase automatic shop access token injection, so the request does not need an explicit `X-Shopify-Access-Token` header.
- Lets your external application call the same request ID remotely for different shops by changing the `x-shop-myshopify-domain` header.
- Creates a webhook-triggered HTTP request that forwards Shopify orders to your external application.
- Includes a sensitive shared secret header so your external application can verify that forwarded calls came from APIEase.

## Files

- `resources/requests/read-shopify-order-transactions.json`: a minimal HTTP request that reads orders and their transactions from the current shop.
- `resources/requests/forward-shopify-orders-to-external-application.json`: a webhook-triggered HTTP request that forwards new Shopify orders to your external application with a shared secret header.

## Beginner-friendly steps

1. Replace `your-client-store.myshopify.com` in `read-shopify-order-transactions.json` with the actual client shop domain.
2. Create the Admin API request in APIEase for that specific shop:

```bash
apiease create request \
  --shop-domain your-client-store.myshopify.com \
  --file examples/how-to-allow-an-external-application-to-connect-to-any-number-of-shopify-stores/resources/requests/read-shopify-order-transactions.json
```

3. Confirm the stored shop token has the Shopify Admin API scopes you need.
   For order reads, that usually means `read_orders`.
   Shopify also limits order access to the last 60 days by default unless the app is approved for broader order access.
4. Replace the example address in `forward-shopify-orders-to-external-application.json` with your real external webhook endpoint.
5. Replace `replace-with-shared-secret` with a secret your external application will verify on incoming requests.
6. Create the webhook forwarding request in APIEase:

```bash
apiease create request \
  --file examples/how-to-allow-an-external-application-to-connect-to-any-number-of-shopify-stores/resources/requests/forward-shopify-orders-to-external-application.json
```

7. Generate an APIEase API key from the APIEase settings page if you do not already have one.
8. From your external application, call the saved Admin API request remotely:

```bash
curl -X POST 'https://app-admin.apiease.com/api/remote/caller/call?requestId=read-shopify-order-transactions' \
  -H 'x-apiease-api-key: replace-with-your-apiease-api-key' \
  -H 'x-shop-myshopify-domain: your-client-store.myshopify.com'
```

9. To call the same request for another client store, authorize APIEase in that store, save the same request there, and change only the `x-shop-myshopify-domain` header in the remote call.
10. To receive pushed order events, make sure your external application accepts the forwarded webhook request and verifies the `X-APIEASE-Shared-Secret` header before processing the payload.

## Why this is enough

This solves the main problem behind the question in two ways:

1. A merchant authorizes the app for one Shopify store.
2. APIEase stores that shop's OAuth token for that shop.
3. Your external application identifies the target shop with `x-shop-myshopify-domain`.
4. APIEase executes the saved request against that shop's Admin API using the stored token.
5. APIEase can also receive Shopify webhook events for that shop and forward them to your external application.
6. Your external application verifies the shared secret header before trusting the forwarded event.

That gives you one repeatable integration pattern across many Shopify stores without making your external application handle Shopify Admin API tokens directly for each request, and without requiring your external application to receive Shopify webhooks directly.

## Important notes

- The request address must match the client shop domain for automatic Shopify token injection to apply.
- Do not put Shopify Admin API credentials in browser code, theme code, or widgets.
- Choose a shared secret value that your external application can verify before accepting forwarded order events.
- This example uses `ORDERS_CREATE` as the webhook event. Change it if your synchronization flow should run on a different Shopify order event.

## Official Links

- [Shopify App](https://apps.shopify.com/apiease-admin): Install APIEase in Shopify.
- [Website](https://www.apiease.com/): Product overview and platform information.
- [Documentation](https://docs.apiease.com/): Guides, concepts, and implementation reference.
- [CLI](https://github.com/kevinstl-org/apiease-cli): Command-line workflow for APIEase projects.
- [Template](https://github.com/kevinstl-org/apiease-template): Starter repository for APIEase project structure.
