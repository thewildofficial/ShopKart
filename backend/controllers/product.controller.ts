import mongoose, { type FilterQuery } from "mongoose";
import type { NextFunction, Request, Response } from "express";
import ProductModel, { type Product } from "../models/product.model";

// Search means literal text, so characters like '(' or '.*' must not act as regex.
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    const { name, description, price, category, image, stock } = req.body || {};
    if ([name, description, category, image].some((value) => typeof value !== "string" || !value.trim())) {
      return res.status(400).json({ success: false, message: "Name, description, category and image are required" });
    }
    // Check raw JSON types before Mongoose can coerce strings into numbers.
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ success: false, message: "Price must be a number greater than 0" });
    }
    if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ success: false, message: "Stock must be a whole number of at least 0" });
    }
    // Copy only known fields; callers cannot provide _id or overwrite createdAt.
    const product = await ProductModel.create({ name, description, price, category, image, stock });
    return res.status(201).json({ success: true, product });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
}

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    if (Object.keys(req.query).some((key) => !["search", "category", "sort"].includes(key))) {
      return res.status(400).json({ success: false, message: "Unsupported product query parameter" });
    }
    const { search, category, sort } = req.query;
    if ([search, category, sort].some((value) => value !== undefined && typeof value !== "string")) {
      return res.status(400).json({ success: false, message: "Search, category and sort must be single text values" });
    }
    if (sort && sort !== "price_asc" && sort !== "price_desc") {
      return res.status(400).json({ success: false, message: "Sort must be price_asc or price_desc" });
    }
    const query: FilterQuery<Product> = {};
    if (typeof search === "string" && search.trim()) query.name = { $regex: escapeRegex(search.trim()), $options: "i" };
    if (typeof category === "string" && category.trim()) query.category = category.trim();

    // Both filters apply to one MongoDB query, and _id makes sorting deterministic.
    const order: Record<string, 1 | -1> = sort === "price_asc" ? { price: 1, _id: 1 }
      : sort === "price_desc" ? { price: -1, _id: 1 } : { createdAt: -1, _id: 1 };
    const products = await ProductModel.find(query)
      .select("name price category image stock")
      .sort(order).lean();
    return res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    const id = req.params.id;
    if (typeof id !== "string" || !mongoose.isObjectIdOrHexString(id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }
    const product = await ProductModel.findById(id).lean();
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    return res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
}
