import mongoose from "mongoose";
import ProjectModel from "../models/Project.model.js";

// ── Create project — creator becomes the first admin ───────────────────────
export const createProject = async ({ name, userId }) => {
  if (!name)   throw new Error("name is required");
  if (!userId) throw new Error("userId is required");
  try {
    return await ProjectModel.create({
      name,
      users:  [userId],
      admins: [userId],  // creator is always the first admin
    });
  } catch (err) {
    if (err.code === 11000) throw new Error("Project name already exists!");
    throw err;
  }
};

// ── Get all projects for a user ────────────────────────────────────────────
export const getAllProjectByUserId = async ({ userId }) => {
  if (!userId) throw new Error("UserId is required");
  return ProjectModel.find({ users: userId }).populate("users", "_id email username");
};

// ── Add users to a project ─────────────────────────────────────────────────
export const addUserToProject = async ({ projectId, users, userId }) => {
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId))
    throw new Error("Invalid projectId");
  if (!Array.isArray(users) || users.some((u) => !mongoose.Types.ObjectId.isValid(u)))
    throw new Error("Invalid user IDs");
  if (!userId || !mongoose.Types.ObjectId.isValid(userId))
    throw new Error("Invalid userId");

  const project = await ProjectModel.findOne({ _id: projectId, users: userId });
  if (!project) throw new Error("User does not belong to this project");

  return ProjectModel.findOneAndUpdate(
    { _id: projectId },
    { $addToSet: { users: { $each: users } } },
    { new: true }
  );
};

// ── Join via invite code ────────────────────────────────────────────────────
export const joinProjectByInviteCode = async ({ inviteCode, userId }) => {
  if (!inviteCode) throw new Error("inviteCode is required");
  if (!userId)     throw new Error("userId is required");

  const project = await ProjectModel.findOne({ inviteCode: inviteCode.trim() });
  if (!project) throw new Error("Invalid invite code — project not found");

  if (project.users.map((u) => u.toString()).includes(userId.toString())) {
    return ProjectModel.findById(project._id).populate("users", "_id email username");
  }

  return ProjectModel.findByIdAndUpdate(
    project._id,
    { $addToSet: { users: userId } },
    { new: true }
  ).populate("users", "_id email username");
};

// ── Delete project — admin only ────────────────────────────────────────────
export const deleteProject = async ({ projectId, userId }) => {
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId))
    throw new Error("Invalid projectId");

  const project = await ProjectModel.findById(projectId);
  if (!project) throw new Error("Project not found");

  const isAdmin = project.admins.some((a) => a.toString() === userId.toString());
  if (!isAdmin) throw new Error("Only project admins can delete this project");

  await ProjectModel.findByIdAndDelete(projectId);
};

// ── Remove a member — admin only ───────────────────────────────────────────
export const removeMember = async ({ projectId, targetUserId, requesterId }) => {
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId))
    throw new Error("Invalid projectId");
  if (!mongoose.Types.ObjectId.isValid(targetUserId))
    throw new Error("Invalid targetUserId");

  const project = await ProjectModel.findById(projectId);
  if (!project) throw new Error("Project not found");

  const isAdmin = project.admins.some((a) => a.toString() === requesterId.toString());
  if (!isAdmin) throw new Error("Only admins can remove members");

  // Cannot remove another admin
  const targetIsAdmin = project.admins.some((a) => a.toString() === targetUserId.toString());
  if (targetIsAdmin) throw new Error("Cannot remove another admin");

  return ProjectModel.findByIdAndUpdate(
    projectId,
    { $pull: { users: targetUserId } },
    { new: true }
  ).populate("users", "_id email username");
};

// ── Exit project — any member ──────────────────────────────────────────────
export const exitProject = async ({ projectId, userId }) => {
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId))
    throw new Error("Invalid projectId");

  const project = await ProjectModel.findById(projectId);
  if (!project) throw new Error("Project not found");

  const isMember = project.users.some((u) => u.toString() === userId.toString());
  if (!isMember) throw new Error("You are not a member of this project");

  const isAdmin    = project.admins.some((a) => a.toString() === userId.toString());
  const otherAdmins = project.admins.filter((a) => a.toString() !== userId.toString());

  // If the only admin tries to leave, block unless there are no other members
  // Otherwise ownership would be lost — they must promote someone first
  const otherMembers = project.users.filter((u) => u.toString() !== userId.toString());
  if (isAdmin && otherAdmins.length === 0 && otherMembers.length > 0) {
    throw new Error(
      "You are the only admin. Please make another member an admin before leaving."
    );
  }

  // Remove from users and admins
  await ProjectModel.findByIdAndUpdate(projectId, {
    $pull: { users: userId, admins: userId },
  });
};

// ── Promote member to admin — admin only ───────────────────────────────────
export const promoteToAdmin = async ({ projectId, targetUserId, requesterId }) => {
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId))
    throw new Error("Invalid projectId");

  const project = await ProjectModel.findById(projectId);
  if (!project) throw new Error("Project not found");

  const isAdmin = project.admins.some((a) => a.toString() === requesterId.toString());
  if (!isAdmin) throw new Error("Only admins can promote other members");

  const isMember = project.users.some((u) => u.toString() === targetUserId.toString());
  if (!isMember) throw new Error("Target user is not a member of this project");

  return ProjectModel.findByIdAndUpdate(
    projectId,
    { $addToSet: { admins: targetUserId } },
    { new: true }
  ).populate("users", "_id email username");
};

// ── Regenerate invite code ──────────────────────────────────────────────────
export const regenerateInviteCode = async ({ projectId, userId }) => {
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId))
    throw new Error("Invalid projectId");

  const project = await ProjectModel.findOne({ _id: projectId, users: userId });
  if (!project) throw new Error("User does not belong to this project");

  const { randomBytes } = await import("crypto");
  return ProjectModel.findByIdAndUpdate(
    projectId,
    { inviteCode: randomBytes(10).toString("hex") },
    { new: true }
  );
};

// ── Get project by ID ──────────────────────────────────────────────────────
export const getProjectByIdIn = async ({ projectId }) => {
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId))
    throw new Error("Invalid project ID");
  return ProjectModel.findById(projectId).populate("users", "_id email username");
};

// ── Persist collaborative code ─────────────────────────────────────────────
export const updateSharedCode = async ({ projectId, userId, code, language }) => {
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId))
    throw new Error("Invalid projectId");
  const project = await ProjectModel.findOne({ _id: projectId, users: userId });
  if (!project) throw new Error("Access denied: not a member");
  const update = { sharedCode: code };
  if (language) update.language = language;
  return ProjectModel.findByIdAndUpdate(projectId, update, { new: true });
};

// ── Save run output ────────────────────────────────────────────────────────
export const saveRunOutput = async ({ projectId, output }) => {
  return ProjectModel.findByIdAndUpdate(
    projectId,
    { lastRunOutput: output, lastRunAt: new Date() },
    { new: true }
  );
};