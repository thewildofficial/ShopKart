# Lab-02: client/server authentication, explained

This lab adds a React frontend to the existing Lab-01 Express/MongoDB backend. All four tasks are implemented, including the protected home page that the assignment allows postponing.

## Run it

Use Node.js 22.12+ (or 20.19+) and MongoDB. From this repository:

```sh
npm install
cp .env.example .env
# Set JWT_SECRET in .env to a long random secret.
# Start your local MongoDB service before starting the API.
npm run dev
```

In a second terminal:

```sh
npm run dev:client
```

Open http://localhost:5173/register. The API runs on port 5000. Vite forwards `/customers` requests to the API, so the browser sees one origin and accepts the cookie without extra CORS configuration. Use the same browser hostname throughout the flow.

For a built app, run `npm run build:all` followed by `npm start`, then open http://localhost:5000. Express serves the React pages and API together. Production needs HTTPS because production authentication cookies use `Secure`.

## What each file does

| File | Responsibility |
| --- | --- |
| `client/src/main.jsx` | Starts React and wraps the app in BrowserRouter. |
| `client/src/App.jsx` | Checks the session, controls protected routes, handles logout and retry. |
| `client/src/pages/Register.jsx` | Controlled name/email/password/phone inputs; validation; registration request. |
| `client/src/pages/Login.jsx` | Controlled email/password inputs; login request; navigation. |
| `client/src/pages/Home.jsx` | Displays the authenticated customer's name, email and phone. |
| `client/src/components/Navbar.jsx` | Navigation and logout button. |
| `client/src/components/FormField.jsx` | Shared labeled input with accessible field errors. |
| `client/src/components/AuthLayout.jsx` | Shared responsive layout for login and registration. |
| `client/src/services/api.js` | All four API calls, cookie credentials and friendly request errors. |
| `client/src/utils/validation.js` | Required fields, email format, minimum password length and phone format. |
| `client/src/styles.css` | Responsive desktop/mobile styling and visible keyboard focus. |
| `client/vite.config.mjs` | React build and development API proxy. |

## Follow one customer through the app

1. **Register:** `/register` stores each input in React state. Changing an input updates its state, making it a controlled component. Submitting runs validation first. A valid form sends `POST /customers/register` with `{ fullName, email, password, phone }`. The existing backend hashes the password and saves the customer. Success redirects to `/login` with a confirmation and the email prefilled. Duplicate-email errors appear in the form.
2. **Login:** `/login` sends `POST /customers/login` with `{ email, password }`. Wrong credentials show **Invalid Credentials**. Successful login causes the server to set `shopkart_auth`, an HttpOnly cookie, and the browser automatically stores it. React then navigates to `/home`.
3. **Verify:** On every route change or refresh, `App.jsx` requests `GET /customers/me`. While it waits, the app shows a loading state. A successful response is the customer displayed on Home. A `401` means the customer is anonymous, and `/home` redirects to `/login`. A server/network failure shows a retry button rather than silently treating the customer as logged out.
4. **Logout:** The navbar sends `POST /customers/logout`. The server clears the cookie, React clears the displayed customer, and the app redirects to `/login`. Revisiting Home requires authentication again. If logout fails because of a network issue, an error appears and the customer can retry. A `401` during logout means the session has already expired, so the app redirects to login.

The browser's cookie is the session credential. The React customer object is only temporary display state. Neither JWT nor customer data is saved in localStorage. An AbortController cancels outdated session requests during navigation. Submit buttons are disabled while their request is pending to prevent accidental double submissions.

## Lab viva answers

- **Why `credentials: 'include'`?** It tells Fetch to include browser cookies and accept credential cookies. This is Fetch's equivalent of Axios `withCredentials: true`.
- **Why can't JavaScript read an HttpOnly cookie?** The browser restricts it to HTTP requests; `document.cookie` cannot reveal it.
- **Why is Home protected?** React redirects anonymous users, and the backend authentication middleware independently rejects unauthenticated profile requests. The server check is the actual security boundary.
- **Why `/customers/me`?** It asks the server whether the current cookie is valid and fetches the actual customer, so refreshing the page works without trusting manually stored user details.
- **Authentication vs authorization?** Authentication establishes who you are. Authorization decides what that identity may access.

## Verification

```sh
npm test
npm run build:all
```

`npm test` runs the existing backend HTTP tests against a temporary MongoDB: registration, password hashing, duplicate/missing/short-password failures, login, cookie flags, profile protection, password change and logout. Set `MONGOD_BIN` if `mongod` is not on PATH.

Browser verification is performed directly in the browser, without Playwright. Reproduce the complete flow by opening `/home` while logged out, registering a customer, trying an incorrect password, logging in correctly, confirming the name/email/phone, refreshing, logging out and revisiting `/home`. Also submit an empty registration form and an already registered email to check errors.

## Reference documentation

- [Vite development proxy](https://vite.dev/config/server-options#server-proxy)
- [React Router BrowserRouter](https://reactrouter.com/api/declarative-routers/BrowserRouter)
