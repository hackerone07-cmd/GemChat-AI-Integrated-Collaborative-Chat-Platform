import User from "../models/user.model.js";
import * as userService from "../services/user.service.js";
import redisClient from "../services/redis.service.js";

// ── Register ───────────────────────────────────────────────────────────────
export const createUserController = async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const user  = await userService.createUser({ email, password, username });
    const token = user.generateJWT();
    delete user._doc.password;
    res.status(201).json({ user, token });
  } catch (error) {
    console.error("Register error:", error);
    if (error.code === 11000 && error.keyPattern?.email)
      return res.status(400).json({ error: "Email already exists" });
    res.status(400).json({ error: error.message });
  }
};

// ── Login ──────────────────────────────────────────────────────────────────
export const loginUserController = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(401).json({ error: "No account found with this email" });

    const isMatch = await user.isValidPassword(password);
    if (!isMatch)
      return res.status(401).json({ error: "Incorrect password" });

    const token = user.generateJWT();
    delete user._doc.password;
    res.status(200).json({ user, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── Get profile (fresh from DB, not just JWT payload) ──────────────────────
export const getProfileController = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ user });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── Update profile (username / password) ──────────────────────────────────
export const updateProfileController = async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    const user = await userService.updateProfile({
      userId:          req.user._id,
      username,
      currentPassword,
      newPassword,
    });

    // Issue a fresh JWT so the new username is immediately reflected
    const token = user.generateJWT();
    delete user._doc.password;

    res.status(200).json({ user, token });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(400).json({ error: error.message });
  }
};

// ── Logout (blacklist token in Redis) ─────────────────────────────────────
export const logoutController = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      req.cookies?.token ||
      (authHeader?.toLowerCase().startsWith("bearer ")
        ? authHeader.split(" ")[1]
        : null);

    if (!token) return res.status(400).json({ error: "No token provided" });

    await redisClient.set(token, "logout", "EX", 60 * 60 * 24);
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── Get all other users ────────────────────────────────────────────────────
export const getAllUsersController = async (req, res) => {
  try {
    const loggedInUser = await User.findById(req.user._id);
    if (!loggedInUser) return res.status(404).json({ error: "User not found" });
    const users = await userService.getAllUsers({ userId: loggedInUser._id });
    res.status(200).json({ users });
  } catch (error) {
    console.error("getAllUsers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};