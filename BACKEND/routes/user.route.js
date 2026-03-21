import { Router } from "express";
import { body } from "express-validator";
import * as userController from "../controllers/user.controller.js";
import * as authMiddleware from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

const router = Router();

// ── Register ───────────────────────────────────────────────────────────────
router.post(
  "/register",
  [
    body("username")
      .notEmpty().withMessage("Username is required")
      .isLength({ min: 2, max: 30 }).withMessage("Username must be 2–30 characters")
      .trim(),
    body("email").isEmail().withMessage("Email must be valid"),
    body("password")
      .isLength({ min: 3 }).withMessage("Password too short"),
  ],
  validate,
  userController.createUserController
);

// ── Login ──────────────────────────────────────────────────────────────────
router.post(
  "/login",
  [
    body("identifier")
      .notEmpty().withMessage("Username or email is required")
      .isLength({ min: 2, max: 100 }).withMessage("Must be 2–100 characters")
      .trim(),
    body("password")
      .notEmpty().withMessage("Password is required")
      .isLength({ min: 3 }).withMessage("Password too short"),
  ],
  validate,
  userController.loginUserController
);

// ── Profile ────────────────────────────────────────────────────────────────
router.get("/profile", authMiddleware.authUser, userController.getProfileController);

router.put(
  "/profile",
  authMiddleware.authUser,
  [
    body("username")
      .optional()
      .isLength({ min: 2, max: 30 }).withMessage("Username must be 2–30 characters")
      .trim(),
    body("newPassword")
      .optional()
      .isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  validate,
  userController.updateProfileController
);

// ── Logout ─────────────────────────────────────────────────────────────────
router.get("/logout", authMiddleware.authUser, userController.logoutController);

// ── Get all other users ────────────────────────────────────────────────────
router.get("/all", authMiddleware.authUser, userController.getAllUsersController);

export default router;