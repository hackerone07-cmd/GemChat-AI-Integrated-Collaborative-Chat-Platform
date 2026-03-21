import { Router } from "express";
import { body, param } from "express-validator";
import * as projectController from "../controllers/Project.controller.js";
import * as authMiddleware from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

const router = Router();

// Create
router.post(
  "/create",
  authMiddleware.authUser,
  body("name").isString().notEmpty().withMessage("Name is required"),
  validate,
  projectController.createProject
);

// Get all for user
router.get("/all", authMiddleware.authUser, projectController.getAllProject);

// Get single
router.get(
  "/get-project/:projectId",
  authMiddleware.authUser,
  param("projectId").isMongoId().withMessage("Invalid projectId"),
  validate,
  projectController.getProjectById
);

// Delete project (admin only)
router.delete(
  "/:projectId",
  authMiddleware.authUser,
  param("projectId").isMongoId().withMessage("Invalid projectId"),
  validate,
  projectController.deleteProject
);

// Add users
router.put(
  "/add-user",
  authMiddleware.authUser,
  body("projectId").isString().notEmpty().withMessage("projectId is required"),
  body("users")
    .isArray({ min: 1 }).withMessage("users must be a non-empty array")
    .custom((users) => users.every((u) => typeof u === "string"))
    .withMessage("Each user must be a string ID"),
  validate,
  projectController.addUserProject
);

// Remove member (admin only)
router.delete(
  "/:projectId/members/:targetUserId",
  authMiddleware.authUser,
  param("projectId").isMongoId().withMessage("Invalid projectId"),
  param("targetUserId").isMongoId().withMessage("Invalid targetUserId"),
  validate,
  projectController.removeMember
);

// Exit project (any member)
router.post(
  "/:projectId/exit",
  authMiddleware.authUser,
  param("projectId").isMongoId().withMessage("Invalid projectId"),
  validate,
  projectController.exitProject
);

// Promote to admin (admin only)
router.put(
  "/:projectId/promote/:targetUserId",
  authMiddleware.authUser,
  param("projectId").isMongoId().withMessage("Invalid projectId"),
  param("targetUserId").isMongoId().withMessage("Invalid targetUserId"),
  validate,
  projectController.promoteToAdmin
);

// Join via invite code
router.post(
  "/join",
  authMiddleware.authUser,
  body("inviteCode").isString().notEmpty().withMessage("inviteCode is required"),
  validate,
  projectController.joinProjectByCode
);

// Regenerate invite code
router.post(
  "/regenerate-invite/:projectId",
  authMiddleware.authUser,
  param("projectId").isMongoId().withMessage("Invalid projectId"),
  validate,
  projectController.regenerateInviteCode
);

export default router;