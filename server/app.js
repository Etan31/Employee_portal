import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { verifyToken } from "./middleware/auth.middleware.js";
import profileRoutes from "./routes/profiles.routes.js";
import taskRoutes from "./routes/tasks.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const corsOptions = {
  origin: (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(","),
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * 1. API ROUTES (Must be FIRST)
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Protected Routes
app.use("/api/protected", verifyToken);
app.use("/api/protected/profiles", profileRoutes);
app.use("/api/protected/tasks", taskRoutes);

/**
 * 2. STATIC FILES (Must be AFTER API routes)
 * Skipped on Vercel — Vercel serves client/dist as static assets natively.
 */
if (!process.env.VERCEL) {
  const distPath = path.join(__dirname, "../client/dist");
  app.use(express.static(distPath));

  /**
   * 3. THE CATCH-ALL (Must be LAST)
   * This handles React routing for any non-API URL
   */
  app.get("/(.*)", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

/**
 * 4. Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;