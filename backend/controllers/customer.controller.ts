import bcrypt from "bcrypt";
import type { NextFunction, Request, Response } from "express";
import Customer from "../models/customer.model";
import {
  COOKIE_NAME,
  generateToken,
  getClearCookieOptions,
  getCookieOptions,
} from "../utils/generateToken";

const DUMMY_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.4N4a1iR6W9a8f8gQq4w4qB7yRk5s6e";

function isMissing(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function registerCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  try {
    const { fullName, email, password, phone } = req.body || {};

    if ([fullName, email, password, phone].some(isMissing)) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters",
      });
    }

    // Use the same email format for registration and login; leave passwords unchanged.
    const normalizedEmail = email.trim().toLowerCase();
    const existingCustomer = await Customer.exists({ email: normalizedEmail });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const customer = await Customer.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
      phone: phone.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      customer: customer.toSafeJSON(),
    });
  } catch (error) {
    // Two registrations can pass the earlier check; the unique index catches that race.
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    return next(error);
  }
}

export async function loginCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const passwordValue = typeof password === "string" ? password : "";
    // Passwords are hidden by default; opt in here to verify the login.
    const customer = await Customer.findOne({ email: normalizedEmail }).select("+password");
    // Still run bcrypt for unknown emails to avoid noticeably quicker failures.
    const passwordHash = customer?.password || DUMMY_PASSWORD_HASH;
    const passwordMatches = await bcrypt.compare(passwordValue, passwordHash);

    if (!customer || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(customer._id.toString());
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Login successful",
      customer: customer.toSafeJSON(),
    });
  } catch (error) {
    return next(error);
  }
}

export function getMyProfile(req: Request, res: Response): Response {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  return res.status(200).json(req.user.toSafeJSON());
}

export function logoutCustomer(req: Request, res: Response): Response {
  res.clearCookie(COOKIE_NAME, getClearCookieOptions());

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> {
  try {
    const { oldPassword, newPassword } = req.body || {};

    if (isMissing(oldPassword) || isMissing(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 6 characters",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const customer = await Customer.findById(req.user._id).select("+password");

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const passwordMatches = await bcrypt.compare(oldPassword, customer.password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // The model's save hook hashes the new password before storing it.
    customer.password = newPassword;
    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return next(error);
  }
}
