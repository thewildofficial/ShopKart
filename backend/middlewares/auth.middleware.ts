import type { RequestHandler } from "express";
import Customer from "../models/customer.model";
import { COOKIE_NAME, verifyToken } from "../utils/generateToken";

function unauthorized(res: Parameters<RequestHandler>[1]) {
  return res.status(401).json({
    success: false,
    message: "Unauthorized",
  });
}

const protect: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return unauthorized(res);
  }

  try {
    const decoded = verifyToken(token);

    if (typeof decoded === "string" || typeof decoded.userId !== "string") {
      return unauthorized(res);
    }

    // A valid token must still belong to an existing customer; the hash stays excluded.
    const customer = await Customer.findById(decoded.userId);

    if (!customer) {
      return unauthorized(res);
    }

    // Pass the authenticated customer to the next handler instead of trusting request input.
    req.user = customer;
    return next();
  } catch {
    return unauthorized(res);
  }
};

export default protect;
