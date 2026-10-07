import jwt, { type SignOptions } from "jsonwebtoken";

export const COOKIE_NAME = "shopkart_auth";

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"];
const JWT_SECRET = process.env.JWT_SECRET || "shopkart-development-secret-change-me";

export function generateToken(customerId: string): string {
  return jwt.sign({ userId: customerId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): jwt.JwtPayload | string {
  return jwt.verify(token, JWT_SECRET);
}

export function getCookieOptions(): {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function getClearCookieOptions(): {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
} {
  const { httpOnly, sameSite, secure, path } = getCookieOptions();
  return { httpOnly, sameSite, secure, path };
}
