# ShopKart project conventions

- Use TypeScript for all application code from Lab-03 onward. React components use `.tsx`; services, utilities, models, controllers and routes use `.ts`. Do not add new `.jsx` application files.
- Keep the frontend strict type check in `npm run build:client`.
- Keep backend MVC separation and shared API logic in `client/src/services/api.ts`.
- Explain non-obvious choices with short comments and document each lab in its walkthrough.
- Verify backend changes with `npm test` and frontend flows in the requested browser. Do not add Playwright unless the user asks for it.
