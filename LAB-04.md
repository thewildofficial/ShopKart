# Lab-04 — Wishlist System

ShopKart customers can save products from the catalog, open `/wishlist`, view product details and remove saved items without refreshing the page. Wishlist data persists in MongoDB across refreshes and logins. Feature state uses local React hooks, without Context or Redux.

## Run

Use the setup in LAB-03.md: start MongoDB, configure `.env`, run `npm run build:all` and `npm start`. Open http://localhost:5000. For Vite development, use `npm run dev:client`; API calls use the existing `/api` proxy.

## Database and authentication

The existing Customer model is the lab’s User model. Its `wishlist` defaults to an empty array of `Schema.Types.ObjectId` references with `ref: "Product"`. Product objects are never copied into customer records. GET uses `populate()` to return current name, price, category, image and stock. Deleted products are omitted from the response and count; their references can still be removed.

Authentication uses the existing HttpOnly JWT cookie. Bearer JWTs are also supported for the lab’s Postman requests. Controllers take ownership only from `req.user`; request bodies and query parameters cannot select another customer.

## API

| Method | Endpoint | Result |
| --- | --- | --- |
| POST | `/wishlist/:productId` | 201 saved; 400 invalid ID; 404 missing product; 409 already saved |
| GET | `/wishlist` | 200 `{ success, count, wishlist }` with populated products |
| DELETE | `/wishlist/:productId` | 200 removed; 400 invalid ID; 404 not saved |

All routes require authentication (401 otherwise). The same routes are available under `/api/wishlist` for React. On the production server, browser HTML navigation to `/wishlist` serves React; API clients receive JSON.

The add operation uses a conditional atomic `$addToSet`, so concurrent requests produce one success and subsequent conflicts. Removal uses conditional `$pull`. These updates do not run the password save hook because no password is changed.

## UI

Product cards show Add to Wishlist, Saving and Added states. Buttons prevent repeated requests and display API errors. A duplicate response reconciles the card to Added. Wishlist cards show every required product field, View Details and Remove actions. Removal updates the list and count after server confirmation. If another tab already removed an item, the list reconciles with that 404 response.

The wishlist page has loading, empty and error states, Browse Products navigation and a retry request. Fetches are aborted on unmount to avoid stale results. Navbar and protected React routes include Wishlist.

## Verification

`npm run build:all` checks backend TypeScript, strict frontend types and the production build. `npm test` runs real HTTP requests against isolated MongoDB and covers authentication, malformed IDs, missing products, absent removals, concurrent duplicates, reference storage, current populated prices, persistence across sessions, user isolation and deleted products, alongside Labs 02–03 regression checks.

Import `postman/ShopKart-Wishlist.postman_collection.json`. Set `baseUrl` and a real `productId` from GET `/products`. Login with the existing auth collection first so Postman retains the cookie. Run add, duplicate, get, remove and missing-removal requests. The collection includes status assertions. Browser verification was attempted, but the available in-app browser blocked localhost with `ERR_BLOCKED_BY_CLIENT`; the interactive UI remains unverified in this environment.
