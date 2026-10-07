import type { CustomerDocument } from "../models/customer.model";

// Extend Express's Request type so TypeScript recognizes the customer added by protect.
declare global {
  namespace Express {
    interface Request {
      // Optional because public routes and requests before authentication have no user.
      user?: CustomerDocument;
    }
  }
}

export {};
