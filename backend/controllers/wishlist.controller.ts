import type { RequestHandler } from "express";
import mongoose from "mongoose";
import Customer from "../models/customer.model";
import Product, { type Product as ProductData } from "../models/product.model";

export const getWishlist: RequestHandler = async (req, res) => {
  const customer = await Customer.findById(req.user!._id).populate<{ wishlist: mongoose.HydratedDocument<ProductData>[] }>({
    path: "wishlist", select: "name price category image stock",
  });
  if (!customer) return res.status(401).json({ success: false, message: "Unauthorized" });
  // Deleted products are omitted; remaining cards always show current product data.
  const wishlist = (customer.wishlist || []).filter(Boolean);
  return res.json({ success: true, count: wishlist.length, wishlist });
};

export const addToWishlist: RequestHandler = async (req, res) => {
  const productId = req.params.productId;
  if (typeof productId !== "string" || !mongoose.isObjectIdOrHexString(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }
  if (!await Product.exists({ _id: productId })) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  // The condition and update run atomically, so concurrent adds yield one success.
  const result = await Customer.updateOne({ _id: req.user!._id, wishlist: { $ne: productId } }, { $addToSet: { wishlist: productId } });
  if (!result.modifiedCount) return res.status(409).json({ success: false, message: "Product already in wishlist" });
  return res.status(201).json({ success: true, message: "Product added to wishlist" });
};

export const removeFromWishlist: RequestHandler = async (req, res) => {
  const productId = req.params.productId;
  if (typeof productId !== "string" || !mongoose.isObjectIdOrHexString(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }
  // Removal also works when the referenced product has since been deleted.
  const result = await Customer.updateOne({ _id: req.user!._id, wishlist: productId }, { $pull: { wishlist: productId } });
  if (!result.modifiedCount) return res.status(404).json({ success: false, message: "Product not in wishlist" });
  return res.json({ success: true, message: "Product removed from wishlist" });
};
