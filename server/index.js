import "./env.js";
import app from "./app.js";

// CHANGE THIS: Always check process.env.PORT first for production
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ADD '0.0.0.0': This ensures the server accepts external connections
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔══════════════════════════════════════╗
║   Employee Portal Server             ║
║   Environment: ${NODE_ENV.padEnd(20)} ║
║   Port: ${String(PORT).padEnd(30)} ║
╚══════════════════════════════════════╝
  `);
});
// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export default server;
