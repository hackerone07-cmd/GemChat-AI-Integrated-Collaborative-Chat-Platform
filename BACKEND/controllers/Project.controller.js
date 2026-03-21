import * as projectService from "../services/Project.service.js";
import userModel from "../models/user.model.js";
import { io } from "../server.js";

// helper — resolve logged-in user from JWT
const getMe = async (req) => {
  const user = await userModel.findById(req.user._id);
  if (!user) throw new Error("User not found");
  return user;
};

// ── POST /projects/create ──────────────────────────────────────────────────
export const createProject = async (req, res) => {
  try {
    const me = await getMe(req);
    const project = await projectService.createProject({
      name:   req.body.name,
      userId: me._id,
    });
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// ── GET /projects/all ──────────────────────────────────────────────────────
export const getAllProject = async (req, res) => {
  try {
    const me       = await getMe(req);
    const projects = await projectService.getAllProjectByUserId({ userId: me._id });
    res.status(200).json({ projects });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// ── DELETE /projects/:projectId — admin only ───────────────────────────────
export const deleteProject = async (req, res) => {
  try {
    const me = await getMe(req);
    await projectService.deleteProject({
      projectId: req.params.projectId,
      userId:    me._id,
    });
    // Notify all room members that the project is gone
    io.to(req.params.projectId).emit("project-deleted", {
      projectId: req.params.projectId,
    });
    res.status(200).json({ message: "Project deleted" });
  } catch (err) {
    console.error(err);
    res.status(err.message.includes("admin") ? 403 : 400).json({ error: err.message });
  }
};

// ── PUT /projects/add-user ─────────────────────────────────────────────────
export const addUserProject = async (req, res) => {
  try {
    const { projectId, users } = req.body;
    const me = await getMe(req);
    const project = await projectService.addUserToProject({
      projectId, users, userId: me._id,
    });
    users.forEach((userId) => {
      for (const [socketId, socket] of io.of("/").sockets) {
        if (socket.user?._id === userId) socket.join(projectId);
      }
    });
    io.to(projectId).emit("user-joined", { projectId, users });
    res.status(200).json({ project });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// ── DELETE /projects/:projectId/members/:targetUserId — admin only ─────────
export const removeMember = async (req, res) => {
  try {
    const me = await getMe(req);
    const project = await projectService.removeMember({
      projectId:    req.params.projectId,
      targetUserId: req.params.targetUserId,
      requesterId:  me._id,
    });
    // Kick the target user's socket out of the room
    for (const [, socket] of io.of("/").sockets) {
      if (socket.user?._id === req.params.targetUserId) {
        socket.leave(req.params.projectId);
        socket.emit("kicked", { projectId: req.params.projectId });
      }
    }
    io.to(req.params.projectId).emit("member-removed", {
      userId:    req.params.targetUserId,
      projectId: req.params.projectId,
    });
    res.status(200).json({ project });
  } catch (err) {
    console.error(err);
    res.status(err.message.includes("admin") ? 403 : 400).json({ error: err.message });
  }
};

// ── POST /projects/:projectId/exit — any member ────────────────────────────
export const exitProject = async (req, res) => {
  try {
    const me = await getMe(req);
    await projectService.exitProject({
      projectId: req.params.projectId,
      userId:    me._id,
    });
    io.to(req.params.projectId).emit("member-removed", {
      userId:    me._id.toString(),
      projectId: req.params.projectId,
    });
    res.status(200).json({ message: "You have left the project" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// ── PUT /projects/:projectId/promote/:targetUserId — admin only ────────────
export const promoteToAdmin = async (req, res) => {
  try {
    const me = await getMe(req);
    const project = await projectService.promoteToAdmin({
      projectId:    req.params.projectId,
      targetUserId: req.params.targetUserId,
      requesterId:  me._id,
    });
    io.to(req.params.projectId).emit("member-promoted", {
      userId:    req.params.targetUserId,
      projectId: req.params.projectId,
    });
    res.status(200).json({ project });
  } catch (err) {
    console.error(err);
    res.status(err.message.includes("admin") ? 403 : 400).json({ error: err.message });
  }
};

// ── POST /projects/join ────────────────────────────────────────────────────
export const joinProjectByCode = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: "inviteCode is required" });
    const me      = await getMe(req);
    const project = await projectService.joinProjectByInviteCode({
      inviteCode,
      userId: me._id,
    });
    io.to(project._id.toString()).emit("user-joined", {
      projectId: project._id,
      user: { _id: me._id, email: me.email, username: me.username },
    });
    res.status(200).json({ project });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// ── POST /projects/regenerate-invite/:projectId ────────────────────────────
export const regenerateInviteCode = async (req, res) => {
  try {
    const me      = await getMe(req);
    const project = await projectService.regenerateInviteCode({
      projectId: req.params.projectId,
      userId:    me._id,
    });
    io.to(req.params.projectId).emit("invite-regenerated", {
      projectId: req.params.projectId,
      newCode:   project.inviteCode,
    });
    res.status(200).json({ inviteCode: project.inviteCode });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// ── GET /projects/get-project/:projectId ──────────────────────────────────
export const getProjectById = async (req, res) => {
  try {
    const me      = await getMe(req);
    const project = await projectService.getProjectByIdIn({
      projectId: req.params.projectId,
    });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const isMember = project.users.some(
      (u) => u._id.toString() === me._id.toString()
    );
    if (!isMember) return res.status(403).json({ error: "Access denied" });

    res.status(200).json({ project });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};