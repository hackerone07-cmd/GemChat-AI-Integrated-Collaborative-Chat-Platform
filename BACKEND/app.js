import express from "express";
import morgan from "morgan";
import connect from "./db/db.js";
import userRouter from "./routes/user.route.js";
import projectRoutes from "./routes/Project.route.js";
import airoute from "./routes/ai.route.js";
import cookieParser from "cookie-parser";
import cors from "cors";

connect();

const app = express();

// ── CORS — tighten in production via CLIENT_URL env var ──
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Routes ──
app.use("/users", userRouter);
app.use("/projects", projectRoutes);
app.use("/ai", airoute);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "GemChat API running 🚀" });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

export default app;