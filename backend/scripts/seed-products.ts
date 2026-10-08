import mongoose from "mongoose";
import Product from "../models/product.model";

if (typeof process.loadEnvFile === "function") {
  try { process.loadEnvFile(); }
  catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
  }
}

// This is optional demo data stored in MongoDB, never a hardcoded API response.
const products = [
  { name: "Studio Headphones", description: "Comfortable wireless over-ear headphones with noise isolation, clear sound and a rechargeable battery. A daily companion for music and focused work.", price: 4999, category: "Electronics", image: "/images/headphones.svg", stock: 25 },
  { name: "Mechanical Keyboard", description: "A compact mechanical keyboard with tactile switches and a comfortable layout. Built for studying, coding and everyday typing.", price: 2999, category: "Electronics", image: "/images/keyboard.svg", stock: 10 },
  { name: "Everyday Cotton Tee", description: "A soft cotton T-shirt with a relaxed fit. An easy wardrobe staple for your everyday plans.", price: 699, category: "Fashion", image: "/images/shirt.svg", stock: 18 },
  { name: "Canvas Carry Tote", description: "A reusable canvas tote with sturdy handles and plenty of space for books and daily essentials.", price: 449, category: "Fashion", image: "/images/tote.svg", stock: 0 },
  { name: "The Creative Notebook", description: "A cloth-bound dotted notebook for sketches, ideas and class notes. Includes 160 pages and a handy ribbon marker.", price: 349, category: "Books", image: "/images/book.svg", stock: 32 },
  { name: "JavaScript Handbook", description: "A beginner-friendly guide to JavaScript fundamentals, with practical examples covering functions, objects and asynchronous programming.", price: 899, category: "Books", image: "/images/book.svg", stock: 12 },
  { name: "Ceramic Morning Mug", description: "A glazed ceramic mug with a comfortable handle. Just the right companion for tea, coffee and a quiet morning.", price: 599, category: "Home", image: "/images/mug.svg", stock: 14 },
  { name: "Reading Desk Lamp", description: "An adjustable desk lamp with a warm light for your reading corner or study desk. A simple way to brighten your space.", price: 1299, category: "Home", image: "/images/lamp.svg", stock: 8 },
];

async function seed(): Promise<void> {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/shopkart");
    let inserted = 0;
    for (const product of products) {
      // Running seed again adds only missing names; it never resets existing stock.
      const result = await Product.updateOne({ name: product.name }, { $setOnInsert: product }, { upsert: true, runValidators: true });
      inserted += result.upsertedCount;
    }
    console.log(`Added ${inserted} demo products. Existing products were preserved.`);
  } finally { await mongoose.disconnect(); }
}
void seed().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
