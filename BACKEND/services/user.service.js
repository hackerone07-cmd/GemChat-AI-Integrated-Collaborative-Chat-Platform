import User from "../models/user.model.js";

// ── Create user (register) ─────────────────────────────────────────────────
export const createUser = async ({ email, password, username }) => {
  if (!email || !password)    throw new Error("Email and password are required");
  if (!username?.trim())      throw new Error("Username is required");

  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 2)  throw new Error("Username must be at least 2 characters");
  if (trimmedUsername.length > 30) throw new Error("Username must be at most 30 characters");

  const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/;
  if (!passwordRegex.test(password)) {
    throw new Error(
      "Password must be at least 8 characters and include a number and a special character"
    );
  }

  const user = await User.create({ email, password, username: trimmedUsername });
  return user;
};

// ── Get all users except the requester ────────────────────────────────────
export const getAllUsers = async ({ userId }) => {
  return User.find({ _id: { $ne: userId } }).select("_id email username");
};

// ── Update profile (username and/or password) ─────────────────────────────
export const updateProfile = async ({ userId, username, currentPassword, newPassword }) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw new Error("User not found");

  if (username !== undefined) {
    const trimmed = username.trim();
    if (trimmed.length < 2)  throw new Error("Username must be at least 2 characters");
    if (trimmed.length > 30) throw new Error("Username must be at most 30 characters");
    user.username = trimmed;
  }

  if (newPassword) {
    if (!currentPassword) throw new Error("Current password is required to set a new one");
    const valid = await user.isValidPassword(currentPassword);
    if (!valid) throw new Error("Current password is incorrect");

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new Error(
        "New password must be at least 8 characters and include a number and a special character"
      );
    }
    user.password = newPassword;
  }

  await user.save();
  return user;
};