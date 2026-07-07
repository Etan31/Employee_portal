import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { verifyToken } from "./middleware/auth.middleware.js";
import { supabaseAdmin } from "./utils/supabaseAdmin.js";
import profileRoutes from "./routes/profiles.routes.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const corsOptions = {
  origin: (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(","),
  credentials: true,
};

// Baseline security headers (no external dependency). Applied to every response.
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  // Allow the SPA to reach Supabase (REST + realtime websocket) and inline styles from PrimeReact.
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    ].join("; "),
  );
  next();
});

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/**
 * 1. API ROUTES (Must be FIRST)
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * Deep health check that also touches the database, so a single ping keeps
 * both this backend and the Supabase project alive. Uses a HEAD count query
 * (no rows transferred) to stay lightweight.
 */
app.get("/health/db", async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) throw error;

    res.json({
      status: "ok",
      db: "reachable",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      db: "unreachable",
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Protected Routes
app.use("/api/protected", verifyToken);
app.use("/api/protected/profiles", profileRoutes);

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
app.use((err, req, res, _next) => {
  logger.error(err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;