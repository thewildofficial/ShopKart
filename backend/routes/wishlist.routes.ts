import { Router } from "express";
import protect from "../middlewares/auth.middleware";
import { addToWishlist, getWishlist, removeFromWishlist } from "../controllers/wishlist.controller";

const router = Router();
router.use(protect);
router.get("/", getWishlist);
router.post("/:productId", addToWishlist);
router.delete("/:productId", removeFromWishlist);
export default router;
