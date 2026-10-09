import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { createHmac, timingSafeEqual } from "node:crypto";
import Customer from "../models/customer.model";
import Product from "../models/product.model";
import Order from "../models/order.model";
import { paymentKeys, razorpay } from "../config/razorpay";

export function validateAddress(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const address: Record<string, string> = {};
  for (const key of ["fullName", "phone", "addressLine1", "city", "state", "pincode"]) {
    if (typeof input[key] !== "string" || !input[key].trim() || input[key].length > 250) return null;
    address[key] = input[key].trim();
  }
  return /^[6-9]\d{9}$/.test(address.phone) && /^\d{6}$/.test(address.pincode) ? address : null;
}
export const createPaymentOrder: RequestHandler = async (req, res) => {
  const shippingAddress = validateAddress(req.body?.shippingAddress);
  if (!shippingAddress) return res.status(400).json({ success: false, message: "All shipping fields are required; use a valid 10-digit Indian mobile number and 6-digit pincode" });
  const customer = await Customer.findById(req.user!._id);
  if (!customer) return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!customer.cart.length) return res.status(400).json({ success: false, message: "Your cart is empty" });
  const items = [];
  let amount = 0;
  for (const item of customer.cart) {
    const product = await Product.findById(item.product);
    if (!product) return res.status(400).json({ success: false, message: "A product in your cart is no longer available" });
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > product.stock) return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
    amount += Math.round(product.price * 100) * item.quantity;
    items.push({ product: product._id, name: product.name, price: Math.round(product.price * 100) / 100, quantity: item.quantity, image: product.image });
  }
  if (!Number.isSafeInteger(amount) || amount < 1) return res.status(400).json({ success: false, message: "Invalid order amount" });
  let order;
  try {
    const { keyId } = paymentKeys();
    order = await Order.create({ user: customer._id, items, shippingAddress, totalAmount: amount / 100 });
    const paymentOrder = await razorpay.createOrder(amount, String(order._id));
    order.razorpayOrderId = paymentOrder.id;
    await order.save();
    return res.status(201).json({ success: true, shopKartOrderId: order._id, razorpayOrderId: paymentOrder.id, amount, currency: "INR", keyId });
  } catch {
    if (order) await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: "FAILED" } });
    return res.status(503).json({ success: false, message: "Unable to create payment order. Check Test Mode configuration or try again. Your cart is saved." });
  }
};
export const verifyPayment: RequestHandler = async (req, res) => {
  const { shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!mongoose.isObjectIdOrHexString(shopKartOrderId) || typeof razorpay_order_id !== "string" || typeof razorpay_payment_id !== "string" || !/^pay_[a-zA-Z0-9]+$/.test(razorpay_payment_id) || typeof razorpay_signature !== "string" || !/^[a-f0-9]{64}$/.test(razorpay_signature)) return res.status(400).json({ success: false, message: "Invalid payment details" });
  const order = await Order.findOne({ _id: shopKartOrderId, user: req.user!._id });
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  if (!order.razorpayOrderId || razorpay_order_id !== order.razorpayOrderId) return res.status(400).json({ success: false, message: "Payment order does not match" });
  const expected = createHmac("sha256", paymentKeys().secret).update(`${order.razorpayOrderId}|${razorpay_payment_id}`).digest();
  if (!timingSafeEqual(expected, Buffer.from(razorpay_signature, "hex"))) return res.status(400).json({ success: false, message: "Invalid payment signature" });
  if (order.paymentStatus === "PAID" && order.razorpayPaymentId !== razorpay_payment_id) return res.status(409).json({ success: false, message: "Order already paid with another payment" });
  const paid = await Order.findOneAndUpdate({ _id: order._id, paymentStatus: { $ne: "PAID" } }, { $set: { paymentStatus: "PAID", status: "PLACED", razorpayPaymentId: razorpay_payment_id } }, { new: true });
  // Compare the original cart so retries cannot erase items added after checkout.
  // If clearing fails after persisting payment, retrying verification repairs it.
  if (!order.cartCleared) {
    await Customer.updateOne({ _id: req.user!._id, cart: order.items.map(item => ({ product: item.product, quantity: item.quantity })) }, { $set: { cart: [] } });
    await Order.updateOne({ _id: order._id }, { $set: { cartCleared: true } });
  }
  return res.json({ success: true, order: paid || await Order.findById(order._id) });
};
export const getOrders: RequestHandler = async (req, res) => res.json({ success: true, orders: await Order.find({ user: req.user!._id }).sort({ createdAt: -1, _id: -1 }) });
export const getOrder: RequestHandler = async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ success: false, message: "Invalid order ID" });
  const order = await Order.findOne({ _id: req.params.id, user: req.user!._id });
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  return res.json({ success: true, order });
};
