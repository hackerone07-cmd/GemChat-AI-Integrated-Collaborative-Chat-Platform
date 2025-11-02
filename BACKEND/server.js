import "dotenv/config.js";    
import http from "http";
import app from "./app.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import ProjectModel from "./models/Project.model.js";
import { generateResult } from "./services/ai.service.js";
import { measureMemory } from "vm";
import { sensitiveHeaders } from "http2";
const port = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server,{
    cors:{
        origin:"*"
    }
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers["authorization"]?.split(" ")[1];
  const projectId = socket.handshake.query?.projectId;

  if (!token) return next(new Error("Authentication error"));
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId))
    return next(new Error("Invalid project ID"));

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  socket.user = decoded;
  socket.projectId = projectId; // ✅ only the ID string
  next();
});

io.on("connection", (socket) => {
  socket.join(socket.projectId);
  console.log(`✅ User joined project room: ${socket.projectId}`);

  socket.on("project-message", async (data) => {
    const { message, projectId = socket.projectId } = data;
    if (!projectId) return;

    const ai = message.toLowerCase().includes("@ai");

    if (ai) {
      const aiResponse = await generateResult(message.replace("@ai", "").trim());
      io.to(projectId).emit("project-message", {
        message: aiResponse,
        sender: "AI Assistant",
        timestamp: new Date().toISOString(),
      });
    } else {
      // Broadcast to everyone except sender, in this project only
      socket.broadcast.to(socket.projectId).emit("project-message", {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User left project room: ${socket.projectId}`);
    socket.leave(socket.projectId);
  });
});


export { io };


server.listen(3000,(req,res)=>{
    console.log(`server running on port ${port}`);    
})