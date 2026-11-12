# How To Integrate A Third-Party API In Shopify

Source post: [How to integrate third party API in Shopify](https://stackoverflow.com/questions/54859491/how-to-integrate-third-party-api-in-shopify) (Stack Overflow).

This example shows the smallest APIEase setup you need to send new Shopify orders to a third-party API without building or hosting a custom backend.

## What this example does

- Listens for APIEase's `ORDERS_CREATE` webhook trigger, which maps to Shopify's `orders/create` topic.
- Sends the webhook payload to your third-party API with APIEase.
- Keeps the third-party API token on the server as a sensitive request header.

## Files

- `resources/requests/send-shopify-order-to-third-party.json`: the APIEase HTTP request resource.

That JSON request file defines:

- the third-party API endpoint
- the `POST` method
- the `ORDERS_CREATE` webhook trigger
- the sensitive `Authorization` header

## Beginner-friendly steps

1. Replace the example API URL in the request file with your real third-party order endpoint.
2. Replace the placeholder bearer token with the real token or credential format your third-party API expects.
3. Create the request in APIEase:

```bash
apiease create request --file examples/how-to-integrate-third-party-api-in-shopify/resources/requests/send-shopify-order-to-third-party.json
```

4. Confirm the webhook event is correct for your use case:
   `ORDERS_CREATE` sends the order as soon as Shopify creates it.
   If your third-party system should only receive paid orders, change the trigger to the APIEase constant for that Shopify event. APIEase uses uppercase webhook constants that mirror the Shopify topic name, so a topic such as `orders/paid` would follow the pattern `ORDERS_PAID`. Use the exact constant for the Shopify event you want.
5. Run a test order in Shopify and confirm the third-party API receives it.

## Why this is enough

For this use case you do not need to start by building a full custom Shopify app. The basic pattern is:

1. Shopify creates an order.
2. APIEase receives the webhook.
3. APIEase calls the third-party API from the server.

That covers the core integration path the question is asking about.

The request does not need a saved body parameter because APIEase automatically forwards the full Shopify webhook payload as the request body. For this basic example, that means you do not need to manually construct the order JSON before sending it to the third-party API.

## When to extend this example

Use a more advanced APIEase flow if your third-party API needs more than a single authenticated POST:

- Add more request headers if the API needs a custom auth scheme.
- Change the body if the API expects a different payload shape.
- Add a chained authentication request if you must fetch a temporary access token before sending the order.

## Important notes

- Do not put the third-party API secret in Shopify theme code or storefront JavaScript.
- Start with manual testing before relying on live orders.
- Match the body format to the exact contract from the third-party API documentation.

If this helped you, consider sharing it with others who run into the same problem.

## Official Links

- [Shopify App](https://apps.shopify.com/apiease-admin): Install APIEase in Shopify.
- [Website](https://www.apiease.com/): Product overview and platform information.
- [Documentation](https://docs.apiease.com/): Guides, concepts, and implementation reference.
- [CLI](https://github.com/kevinstl-org/apiease-cli): Command-line workflow for APIEase projects.
- [Template](https://github.com/kevinstl-org/apiease-template): Starter repository for APIEase project structure.
