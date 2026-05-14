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
/**
 * Middleware Setup
 * Order matters: CORS → body parsers → auth → routes → error handling
 */
const corsOptions = {
  origin: (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(","),
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, "../client/dist")));

// 2. Handle any requests that don't match your API routes by sending index.html
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

/**
 * Health Check Route (no auth required)
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * Public Routes (no authentication required)
 */
// TODO: Add public routes here (e.g., /api/public/...)

/**
 * Protected Routes (authentication required)
 * All routes below require valid JWT token
 */
app.use("/api/protected", verifyToken);

/**
 * Mount protected route modules
 */
app.use("/api/protected/profiles", profileRoutes);
app.use("/api/protected/tasks", taskRoutes);
// TODO: Add more routes as needed
// import requestRoutes from './routes/requests.routes.js';
// app.use("/api/protected/requests", requestRoutes);

/**
 * 404 Handler
 */

/**
 * Global Error Handler
 * Keep this at the very bottom
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
