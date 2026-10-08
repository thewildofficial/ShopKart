import { Router } from "express";
import { createProduct, getProduct, getProducts } from "../controllers/product.controller";

const router = Router();
// Product APIs stay public for Lab-03. Admin permissions come in a later lab.
router.post("/", createProduct);
router.get("/", getProducts);
router.get("/:id", getProduct);
export default router;
