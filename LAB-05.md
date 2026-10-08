# Lab-05 — Shopping Cart

## Run

Start MongoDB and configure `.env` as described in LAB-03.md. Run `npm run build:all`, then `npm start`. For development, run the backend and `npm run dev:client`. Restart a running Node process after backend changes so new routes are loaded. Port 5000 can conflict with macOS services; set PORT to an available port, and update Vite’s proxy if using a different backend port.

## Data model and API

The existing Customer model is the lab’s User model. `cart` defaults to `[]`; each row stores only a Product ObjectId reference and a positive whole-number quantity. Rows have no extra subdocument ID. Existing documents without a cart still work.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| POST | `/cart/:productId` | Adds quantity 1 or increments an existing row; returns updated populated cart with 200. |
| GET | `/cart` | Loads current customer’s cart and populates current product data. |
| PATCH | `/cart/:productId` | Sets a positive safe integer quantity within current stock. |
| DELETE | `/cart/:productId` | Removes the reference and returns updated populated cart. |

All routes use JWT authentication (HttpOnly cookie or Bearer header) and derive ownership from `req.user`. Invalid IDs/quantities/stock return 400; missing products or cart rows return 404; unauthenticated requests return 401. React uses the same endpoints at `/api/cart` to distinguish JSON requests from browser `/cart` navigation.

Adds use one conditional atomic MongoDB aggregation pipeline to map/increment a row or append a new row, preventing duplicate rows and lost increments under concurrent requests. The condition rejects an increment at stock. PATCH uses a positional update, DELETE uses `$pull`. GET and mutation responses populate current product name, price, image, category and stock. Deleted products are omitted from the response, while their references can still be explicitly removed.

Product stock is read before the customer update, so a simultaneous product stock change is not covered by a cross-collection transaction. Cart quantities do not reserve stock. Final stock verification belongs to Lab-06 checkout.

## Shared frontend state

`CartProvider` owns cart items, loading/error state and mutations. Product cards, Navbar, Cart and Order Summary use the same Context. The provider refreshes on login and cart navigation, clears state on logout/customer changes, and ignores stale responses. Mutations replace the shared state with the server response. Requests are serialized to prevent whole-cart responses arriving out of order; only the active item shows progress. Failed writes leave prior confirmed data intact and offer a refresh, since a lost network response can follow a successful server write.

Navbar count is total units, not distinct products. Subtotal is derived from current prices and quantities, calculated in paise before formatting in rupees. No totals or copied product data are stored in MongoDB. Cards support Add to Cart/Add Another and out-of-stock/stock-limit states. Cart provides accessible +/- controls, explicit removal, per-item totals, loading/empty/error/retry states, and responsive order summary. Stock reductions are shown as errors and block checkout until resolved. Checkout navigates to an explicit Lab-06 placeholder; orders are not created in this lab.

## Validation

`npm test` runs real HTTP/MongoDB integration tests, including five concurrent attempts against stock 3 (three successes, two rejections, one row with quantity 3), invalid quantities, user isolation, legacy users, stock/price changes, login persistence and deleted-product handling. `npm run build:all` checks backend TypeScript, strict client types and production assets.

Import `postman/ShopKart-Cart.postman_collection.json` through Postman Import, then run all requests in order. It creates a fresh test customer and a product with stock 3, logs in, tests add/increment/get/update/stock validation/remove, then logs out and checks 401. Set `baseUrl` to your server (default http://localhost:5001). The cookie jar must remain enabled. Each run creates fresh test data.

Chrome verification covered initial add, repeat add into one row, count/subtotal synchronization, increment/decrement, refresh persistence, removal/empty state, and the checkout placeholder. No automated frontend suite was added.

The imported Postman collection completed with all 19 assertions passing across 15 requests. Backend regression coverage completed with 12 passing integration tests.
