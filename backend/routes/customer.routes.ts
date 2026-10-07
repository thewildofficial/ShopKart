import { Router } from "express";
import protect from "../middlewares/auth.middleware";
import {
  changePassword,
  getMyProfile,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
} from "../controllers/customer.controller";

const router = Router();

// Registration and login are public so customers can obtain authentication.
router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
// protect runs first: only authenticated requests reach these handlers with req.user set.
router.get("/me", protect, getMyProfile);
router.post("/logout", protect, logoutCustomer);
router.patch("/change-password", protect, changePassword);

export default router;
