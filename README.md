# ShopKart — Labs 01, 02 and 03

An MVC Express/Mongoose TypeScript backend and a responsive TypeScript React authentication and product catalog frontend.

**Lab-02 walkthrough:** see [LAB-02.md](LAB-02.md) for setup, every implemented feature, the folder structure, cookie flow, viva answers and browser verification.

Run `npm run dev` for the API and `npm run dev:client` in another terminal for the React app at http://localhost:5173. To serve the built app and API together, run `npm run build:all` then `npm start`.

**Lab-03 walkthrough:** see [LAB-03.md](LAB-03.md) for product APIs, search, category filtering, sorting, details, TypeScript migration and validation.

Optional sample products: run `npm run seed` after starting MongoDB. Visit `/products` after logging in. Products are stored in MongoDB and fetched through the API.

## Requirements

- Node.js 20.19+ or 22.12+
- MongoDB running locally

## Run locally

1. Install the dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `JWT_SECRET` to a long random value.
3. Start MongoDB.
4. Start the API with `npm start`.

The TypeScript source is compiled into `dist/` automatically. The API listens on `http://localhost:5000` by default.

## Endpoints

- `POST /customers/register`
- `POST /customers/login`
- `GET /customers/me` (authentication cookie required)
- `POST /customers/logout` (authentication cookie required)
- `PATCH /customers/change-password` (authentication cookie required)

The JWT is stored in the `shopkart_auth` HttpOnly cookie. Passwords are hashed by the Mongoose model before they are persisted, and password fields are excluded from every customer response.

## Postman demonstration

Import `postman/ShopKart-Customer-Auth.postman_collection.json` into Postman. Make sure the API and MongoDB are running, keep Postman's cookie jar enabled, and run the requests in order. The collection creates a fresh email automatically and checks the expected status code and response for each request.

The demo visibly proves:

- A profile request without login is rejected with `401`.
- Registration succeeds with `201` and does not return a password.
- Duplicate email, missing fields, and short passwords are rejected with `409` or `400`.
- Wrong login credentials return a generic `401` error.
- Correct login returns `200` and an `HttpOnly` `shopkart_auth` cookie.
- The profile works after login and fails again after logout.
- Password change works, and the new password can be used to log in.

## Tests

`npm test` compiles the TypeScript source, starts a temporary MongoDB instance, runs the HTTP flow end to end, and removes the temporary test database afterward. Set `MONGOD_BIN` if `mongod` is not on your PATH.

## Lab-04: Wishlist

See [LAB-04.md](LAB-04.md) for protected wishlist APIs, persistent Product references, frontend behavior and the Postman collection.

## Lab-05: Shopping Cart

See [LAB-05.md](LAB-05.md) for cart APIs, shared React Context state, stock validation, quantity controls, totals and a runnable Postman collection.

## Lab 06: Checkout and Orders

See [LAB-06.md](LAB-06.md) for Razorpay Test Mode configuration, payment verification, order history and test coverage.
