import mongoose from "mongoose";
const itemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true }, price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1, validate: Number.isSafeInteger }, image: String,
}, { _id: false });
const addressSchema = new mongoose.Schema(Object.fromEntries(
  ["fullName", "phone", "addressLine1", "city", "state", "pincode"].map(key => [key, { type: String, required: true, trim: true }])
), { _id: false });
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  items: { type: [itemSchema], required: true }, shippingAddress: { type: addressSchema, required: true },
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED"], default: "PENDING" },
  status: { type: String, enum: ["PENDING_PAYMENT", "PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"], default: "PENDING_PAYMENT" },
  cartCleared: { type: Boolean, default: false },
  razorpayOrderId: String, razorpayPaymentId: String,
}, { timestamps: true });
export default mongoose.model("Order", orderSchema);
