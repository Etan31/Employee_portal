import "./env.js";
import app from "./app.js";
import { logger } from "./utils/logger.js";

// PORT is provided by the host in production; fall back to SERVER_PORT then 3000 locally.
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Bind 0.0.0.0 so the server accepts external connections on hosted environments.
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Employee Portal server listening on port ${PORT} (${NODE_ENV})`);
});

// Graceful shutdown on termination signals.
const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default server;
