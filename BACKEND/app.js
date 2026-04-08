import express      from "express";
import morgan        from "morgan";
import cors          from "cors";
import cookieParser  from "cookie-parser";
import rateLimit     from "express-rate-limit";
import mongoose      from "mongoose";
import connect       from "./db/db.js";
import userRouter    from "./routes/user.route.js";
import projectRouter from "./routes/Project.route.js";
import aiRouter      from "./routes/ai.route.js";


connect();

const app = express();

// Trust the first proxy in production platforms like Render/Railway
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  credentials: true,
}));

// ── Body parsing — 10 MB limit to handle large file trees ────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ── Logging (skip in test) ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

// ── Global rate limit — 200 req / 15 min per IP ─────────────────────────────
app.use(rateLimit({
  windowMs:  15 * 60 * 1000,
  max:       200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many requests — please try again later" },
}));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/users",    userRouter);
app.use("/projects", projectRouter);
app.use("/ai",       aiRouter);

app.get("/", (_req, res) => res.json({ status: "ok", message: "GemChat API 🚀" }));
app.get("/health", (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? "ok" : "degraded",
    database: dbReady ? "connected" : "disconnected",
  });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
