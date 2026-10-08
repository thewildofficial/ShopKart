import type { RequestHandler, Request, Response } from "express";
import mongoose from "mongoose";
import Customer from "../models/customer.model";
import Product, { type Product as ProductData } from "../models/product.model";

type PopulatedItem = { product: mongoose.HydratedDocument<ProductData> | null; quantity: number };
async function respond(req: Request, res: Response, message?: string) {
  const customer = await Customer.findById(req.user!._id).populate<{ cart: PopulatedItem[] }>({ path: "cart.product", select: "name price image category stock" });
  if (!customer) return res.status(401).json({ success: false, message: "Unauthorized" });
  const cart = (customer.cart || []).filter((item) => item.product !== null);
  return res.json({ success: true, ...(message && { message }), cart });
}
export const getCart: RequestHandler = async (req, res) => respond(req, res);
export const validateCartId: RequestHandler = (req, res, next) => {
  if (typeof req.params.productId !== "string" || !mongoose.isObjectIdOrHexString(req.params.productId)) return res.status(400).json({ success: false, message: "Invalid product ID" });
  next();
};
export const addToCart: RequestHandler = async (req, res) => {
  const id = new mongoose.Types.ObjectId(req.params.productId as string);
  const product = await Product.findById(id);
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  if (product.stock < 1) return res.status(400).json({ success: false, message: "Product is out of stock" });
  // A single atomic pipeline increments an existing row or appends one. The
  // filter rejects increments at stock even when multiple requests race.
  const result = await Customer.updateOne({ _id: req.user!._id, cart: { $not: { $elemMatch: { product: id, quantity: { $gte: product.stock } } } } }, [{ $set: { cart: { $let: {
    vars: { items: { $ifNull: ["$cart", []] } }, in: { $cond: [
      { $in: [id, "$$items.product"] },
      { $map: { input: "$$items", as: "item", in: { $cond: [{ $eq: ["$$item.product", id] }, { product: id, quantity: { $add: ["$$item.quantity", 1] } }, "$$item"] } } },
      { $concatArrays: ["$$items", [{ product: id, quantity: 1 }]] },
    ] },
  } } } }]);
  if (!result.matchedCount) return res.status(400).json({ success: false, message: "Quantity cannot exceed available stock" });
  return respond(req, res, "Cart updated");
};
export const updateQuantity: RequestHandler = async (req, res) => {
  const quantity: unknown = req.body?.quantity;
  if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 1) return res.status(400).json({ success: false, message: "Quantity must be a whole number of at least 1" });
  const product = await Product.findById(req.params.productId);
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  if (quantity > product.stock) return res.status(400).json({ success: false, message: "Quantity cannot exceed available stock" });
  const result = await Customer.updateOne({ _id: req.user!._id, "cart.product": product._id }, { $set: { "cart.$.quantity": quantity } }, { runValidators: true });
  if (!result.matchedCount) return res.status(404).json({ success: false, message: "Product not in cart" });
  return respond(req, res, "Cart updated");
};
export const removeFromCart: RequestHandler = async (req, res) => {
  const result = await Customer.updateOne({ _id: req.user!._id, "cart.product": req.params.productId }, { $pull: { cart: { product: req.params.productId } } });
  if (!result.matchedCount) return res.status(404).json({ success: false, message: "Product not in cart" });
  return respond(req, res, "Product removed from cart");
};
