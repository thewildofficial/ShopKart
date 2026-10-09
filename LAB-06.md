# Lab 06 — Checkout and Orders

Checkout now collects and validates shipping details, reviews the global cart, creates a pending MongoDB order and opens Razorpay Test Checkout. Successful checkout details go to the backend for HMAC-SHA256 verification before the order becomes PAID / PLACED. The frontend refreshes CartContext and opens `/order-success/:id`. `/orders` and `/orders/:id` provide persistent, owner-only history and snapshot details with loading, empty, error and retry states.

## Run

1. Copy `.env.example` to `.env` and configure MongoDB and JWT as in previous labs.
2. Add your **Test Mode** `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. The backend rejects non-test keys. Never commit `.env`.
3. Run `npm run build:all` and `npm start`, or run the backend and `npm run dev:client` in separate terminals.
4. Login, add products, open Cart → Proceed to Checkout, enter the address and pay through Razorpay's test window.
5. Try success, failure and dismissal. Only a verified success clears the cart. Retry verification after a network error without paying again.

## API

Authenticated endpoints are available at both `/orders` and `/api/orders`:

- `POST /create-payment-order`: `{ shippingAddress: { fullName, phone, addressLine1, city, state, pincode } }`. Returns `shopKartOrderId`, `razorpayOrderId`, `amount` (paise), `currency`, public `keyId`.
- `POST /verify-payment`: `{ shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
- `GET /`: current customer's orders, newest first.
- `GET /:id`: owned order or 404.

Prices are calculated in integer paise from fresh product data. Orders retain product name, price, quantity and image snapshots. The HMAC uses the database's Razorpay order ID and a constant-time comparison. Provider errors retain the cart and mark the pending order FAILED. Verification retries preserve newly changed carts using an original-cart comparison; completed retries do not clear a later cart.

## Verification

`npm test` runs the existing regression suite and Lab 06 API integration coverage against an isolated real MongoDB process. Razorpay is stubbed only at the provider boundary; checkout validation, persistence, authentication, signature verification and cart changes use the real API/database. `npm run build:all` verifies strict TypeScript and the production client build.

Razorpay API keys are needed for a manual hosted Test Checkout run. Automated tests make no paid or external payment calls.

## Lab scope

Stock is checked immediately before pending order creation. This lab does not reserve or decrement inventory and does not implement production payment webhooks. Order and customer updates are separate writes for compatibility with the project's standalone MongoDB setup; signature verification can be retried if cart reconciliation fails.

Reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
