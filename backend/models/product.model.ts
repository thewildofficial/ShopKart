import mongoose from "mongoose";

export interface Product {
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  createdAt: Date;
}

const productSchema = new mongoose.Schema<Product>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: {
      type: Number, required: true,
      validate: { validator: (value: number) => Number.isFinite(value) && value > 0, message: "Price must be greater than 0" },
    },
    category: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    stock: {
      type: Number, required: true, min: 0,
      validate: { validator: Number.isInteger, message: "Stock must be a whole number" },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export default mongoose.model<Product>("Product", productSchema);
