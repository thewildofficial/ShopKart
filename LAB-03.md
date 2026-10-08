# Lab-03 — Product Catalog & Discovery

The app now supports the complete login → home → products → search/filter → details journey. All React components are TSX, services and utilities are TypeScript, and the client is checked in strict mode before every production build.

## Run

```sh
npm install
cp .env.example .env
# Set JWT_SECRET, and start MongoDB.
npm run dev
```

In another terminal:

```sh
npm run seed
npm run dev:client
```

Open http://localhost:5173. Register or login, then choose **Browse products** on Home or **Products** in the navbar. Seeding is optional and inserts eight demo products into MongoDB; running it again preserves existing product data. Cards always come from API responses. Demo images are local SVGs, so there is no image download dependency.

To serve the built frontend and API together: `npm run build:all`, then `npm start`, and open http://localhost:5000.

## Implemented backend

| Endpoint | Behavior |
| --- | --- |
| `POST /products` | Creates a MongoDB product and returns `{ success, product }` with 201. The API is public, as the lab allows. |
| `GET /products` | Returns `{ success, count, products }`; summaries include ID, name, price, category, image and stock. |
| `GET /products/:id` | Returns `{ success, product }` with complete description and creation date. Invalid ID → 400; missing product → 404. |
| `GET /products?search=keyboard` | Case-insensitive, literal substring search on the name. |
| `GET /products?category=Electronics` | Exact category matching. |
| `GET /products?search=keyboard&category=Electronics` | Both conditions are applied to the same MongoDB query. |
| `GET /products?sort=price_asc` or `price_desc` | Bonus: sort by price, with an ID tie-breaker for stable ordering. |

The Mongoose model requires all six product fields, positive finite price, whole-number stock of at least zero, and an automatic `createdAt`. Controllers reject missing fields, blank text, wrong numeric types, invalid prices and stocks with 400. Only known product fields are copied into MongoDB. Search metacharacters are escaped so a search for `.*` means those literal characters. Malformed or unsupported query parameters return 400.

The same API is also mounted at `/api/products`. The frontend uses this unambiguous JSON URL because `/products` is also a React page. On the built Express server, normal browser navigation requests HTML and receives the React page; API requests receive JSON. Vite proxies `/api` and `/customers` during development.

## Implemented frontend

- `/products`: dynamic image/name/rupee price/category/stock cards with **View Details** links.
- Search input, category dropdown and optional price sorting fetch filtered results from the backend. A 250 ms debounce reduces requests. AbortController cancels old requests so outdated results cannot replace a newer search.
- Search, category and sort live in query parameters and survive refresh. Categories include the lab examples plus any extra categories found in MongoDB.
- `/products/:id`: React Router URL parameter selects the product fetched from the backend. The page shows a larger image, name, description, price, category and stock.
- **Add to Cart** is a preview UI only. Clicking it explicitly explains that no cart changed. Out-of-stock products disable the button.
- Loading, retryable error and empty-result states are implemented on the listing; details handle loading and invalid/missing products. Broken images get an accessible fallback.
- Product pages require a valid customer session in the client, and the existing registration, login, account and logout flow remains available. Product API access itself remains public per the assignment.
- Responsive cards and detail layouts adapt to mobile screens.

## TypeScript migration

Every previous `.jsx` component is now `.tsx`. API and validation helpers are `.ts`; Vite config is `.mts`. Shared types describe customers, form data, products, filters and loading states. Component props and events are typed, and caught errors are handled safely as unknown values. `client/tsconfig.json` enables strict mode, unused-code checks and noEmit. The backend was already TypeScript and remains so.

`AGENTS.md` records the TypeScript preference for future work in this repository.

## Organization

| File | Responsibility |
| --- | --- |
| `backend/models/product.model.ts` | Mongoose product data and schema validation. |
| `backend/controllers/product.controller.ts` | Create, list, search, filter, sort and get one product. |
| `backend/routes/product.routes.ts` | The three product REST routes. |
| `backend/scripts/seed-products.ts` | Optional sample data, preserving existing records. |
| `client/src/pages/Products.tsx` | Listing, query state, requests and result states. |
| `client/src/pages/ProductDetails.tsx` | URL ID, full product details and cart preview. |
| `client/src/components/ProductCard.tsx` | One reusable card rendered with `.map()`. |
| `client/src/components/SearchBar.tsx` | Controlled search, category and sorting controls. |
| `client/src/components/ProductImage.tsx` | Images and broken-image fallback. |
| `client/src/services/api.ts` | Typed Fetch calls and shared request errors. |
| `client/src/types.ts` | Shared domain, form and loading-state types. |
| `test/customer-auth.test.ts` | Real HTTP/MongoDB auth and product integration tests. |

## Verify

```sh
npm test
npm run build:all
```

Tests start an isolated temporary MongoDB, never use your development database, and clean up afterward. Product cases cover schema validation, API creation/persistence, missing/invalid data, field whitelisting, summaries/details, literal case-insensitive search, category, combined filters, sorting, empty results and invalid/missing IDs. Existing authentication tests also run.

Import `postman/ShopKart-Product-Catalog.postman_collection.json` into Postman and run in order to demonstrate the product APIs. It contains response checks and captures the created product ID for the details request. Its creation request adds a demo product to whichever database your running API uses.

Browser verification uses the in-app browser directly, without adding Playwright to the project. See the completed verification notes below for observed results.

## Viva notes

- MongoDB is the source of truth; hardcoded cards would not reflect created products or inventory.
- A URL parameter identifies one resource (`/products/:id`); query parameters customize a list (`?category=Books`).
- `.map()` renders one ProductCard for each API product, using the MongoDB ID as its stable React key.
- Loading/error/empty states explain whether data is pending, failed or legitimately absent.
- Backend filtering applies to stored data and avoids downloading everything just to discard it in the browser.
- Shared API logic keeps networking, credentials and errors out of individual UI components.
