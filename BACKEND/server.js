import "dotenv/config";
import http from "http";
import app from "./app.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import ProjectModel from "./models/Project.model.js";
import UserModel from "./models/user.model.js";
import { generateResult } from "./services/ai.service.js";
import * as projectService from "./services/Project.service.js";

const port   = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "*", methods: ["GET","POST"], credentials: true },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
const buildMembersList = (users) =>
  users.map(u => ({
    _id: u._id.toString(), email: u.email,
    username: u.username || u.email.split("@")[0],
  }));

// ── Auth middleware ───────────────────────────────────────────────────────────
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers["authorization"]?.split(" ")[1];
    const projectId = socket.handshake.query?.projectId;

    if (!token)     return next(new Error("No token"));
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId))
      return next(new Error("Invalid project ID"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const dbUser  = await UserModel.findById(decoded._id).select("_id email username");
    if (!dbUser) return next(new Error("User not found"));

    const project = await ProjectModel.findById(projectId).populate("users","_id email username");
    if (!project)  return next(new Error("Project not found"));

    const isMember = project.users.some(u => u._id.toString() === dbUser._id.toString());
    if (!isMember) return next(new Error("Access denied"));

    socket.user       = { _id: dbUser._id.toString(), email: dbUser.email, username: dbUser.username || dbUser.email.split("@")[0] };
    socket.projectId  = projectId;
    socket.projectDoc = project;
    next();
  } catch (err) {
    next(new Error("Auth failed: " + err.message));
  }
});

// ── Connection handler ────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  socket.join(socket.projectId);
  console.log(`✅ ${socket.user.username} → project ${socket.projectId}`);

  // 1. Sync state to the new user
  socket.emit("code-sync", {
    code:          socket.projectDoc.sharedCode,
    language:      socket.projectDoc.language,
    lastRunOutput: socket.projectDoc.lastRunOutput,
  });
  socket.emit("message-history", socket.projectDoc.messages || []);
  socket.emit("members-list",    buildMembersList(socket.projectDoc.users));

  // 2. Notify others this user came online
  socket.broadcast.to(socket.projectId).emit("user-connected", { user: socket.user });

  // ── Chat ──────────────────────────────────────────────────────────────────
  socket.on("project-message", async (data) => {
    const { message, projectId = socket.projectId } = data;
    if (!message?.trim()) return;

    const senderName   = socket.user.username;
    const isAiRequest  = message.toLowerCase().includes("@ai");

    // Persist user message
    await ProjectModel.findByIdAndUpdate(projectId, {
      $push: { messages: { $each: [{
        sender: socket.user.email, senderUsername: senderName,
        message: message.trim(), isAI: false, timestamp: new Date(),
      }], $slice: -500 } },
    }).catch(() => {});

    if (isAiRequest) {
      try {
        const aiResponse = await generateResult(message.replace(/@ai/gi, "").trim());
        let parsed;
        try   { parsed = JSON.parse(aiResponse); }
        catch { parsed = { text: aiResponse }; }

        // Persist AI message
        await ProjectModel.findByIdAndUpdate(projectId, {
          $push: { messages: { $each: [{
            sender: "AI Assistant", senderUsername: "AI Assistant",
            message: aiResponse, isAI: true, timestamp: new Date(),
          }], $slice: -500 } },
        }).catch(() => {});

        io.to(projectId).emit("project-message", {
          message: aiResponse, sender: "AI Assistant",
          senderUsername: "AI Assistant", isAI: true, parsed,
          timestamp: new Date().toISOString(),
        });

        if (parsed?.fileTree) {
          const snippet = Object.entries(parsed.fileTree)
            .map(([fn, d]) => `// ── ${fn} ──\n${d.file?.contents || ""}`)
            .join("\n\n");
          await ProjectModel.findByIdAndUpdate(projectId, { sharedCode: snippet }).catch(() => {});
          io.to(projectId).emit("code-update", { code: snippet, updatedBy: "AI Assistant", timestamp: new Date().toISOString() });

          // Emit individual file-created events so all clients add them to their file trees
          Object.entries(parsed.fileTree).forEach(([filename, node]) => {
            const content = node?.file?.contents ?? "";
            io.to(projectId).emit("file-created", {
              path: filename, content, lang: filename.split(".").pop() || "plaintext",
            });
          });
        }
      } catch (err) {
        socket.emit("project-message", {
          message: "⚠️ AI error: " + err.message,
          sender: "System", senderUsername: "System",
          isSystem: true, timestamp: new Date().toISOString(),
        });
      }
    } else {
      socket.broadcast.to(socket.projectId).emit("project-message", {
        ...data, sender: socket.user.email, senderUsername: senderName,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ── Real-time cursor position broadcast ───────────────────────────────────
  socket.on("cursor-move", ({ email, username, filename, line, col }) => {
    socket.broadcast.to(socket.projectId).emit("cursor-move", {
      email: email || socket.user.email,
      username: username || socket.user.username,
      filename, line, col,
    });
  });

  // ── Code change ───────────────────────────────────────────────────────────
  socket.on("code-change", async ({ filename, code, language }) => {
    try {
      if (filename) {
        // Broadcast to everyone else in the room
        socket.broadcast.to(socket.projectId).emit("code-update", {
          filename, code, language,
          updatedBy: socket.user.username,
          timestamp: new Date().toISOString(),
        });
        // Persist sharedCode for the "main" file
        await projectService.updateSharedCode({
          projectId: socket.projectId, userId: socket.user._id, code, language,
        }).catch(() => {});
      }
    } catch (err) {
      console.error("code-change:", err.message);
    }
  });

  // ── File management — broadcast to all other room members ─────────────────
  socket.on("file-created", (data) => {
    socket.broadcast.to(socket.projectId).emit("file-created", data);
  });
  socket.on("file-deleted", (data) => {
    socket.broadcast.to(socket.projectId).emit("file-deleted", data);
  });
  socket.on("file-renamed", (data) => {
    socket.broadcast.to(socket.projectId).emit("file-renamed", data);
  });

  // ── Language change ───────────────────────────────────────────────────────
  socket.on("language-change", async ({ language }) => {
    const allowed = ["javascript","typescript","python","java","cpp","c","go","rust","php","ruby","swift","kotlin","bash","html","css","json","sql","plaintext"];
    if (!allowed.includes(language)) return;
    await ProjectModel.findByIdAndUpdate(socket.projectId, { language }).catch(() => {});
    io.to(socket.projectId).emit("language-change", { language, changedBy: socket.user.username });
  });

  // ── Code run result ───────────────────────────────────────────────────────
  socket.on("code-run-result", async ({ output, language, code }) => {
    try {
      await projectService.saveRunOutput({ projectId: socket.projectId, output });
      io.to(socket.projectId).emit("code-run-result", {
        output, language, code, ranBy: socket.user.username,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("code-run-result:", err.message);
    }
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`❌ ${socket.user.username} left ${socket.projectId}`);
    socket.leave(socket.projectId);
    socket.broadcast.to(socket.projectId).emit("user-disconnected", { user: socket.user });
    // Clear cursor for this user
    socket.broadcast.to(socket.projectId).emit("cursor-move", {
      email: socket.user.email, username: socket.user.username,
      filename: null, line: null, col: null,
    });
  });
});

export { io };
server.listen(port, () => console.log(`🚀 Server on port ${port}`));