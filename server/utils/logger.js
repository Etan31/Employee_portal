// Minimal level-aware server logger. Single seam so Pino/Winston can replace it later
// without touching call sites. Reads LOG_LEVEL (default: info; debug in development).
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const configuredLevel =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "development" ? "debug" : "info");

const threshold = LEVELS[configuredLevel] ?? LEVELS.info;

// Emit only when the message level is at or below the configured threshold.
const emit = (level, sink, args) => {
  if (LEVELS[level] <= threshold) sink(`[${level.toUpperCase()}]`, ...args);
};

export const logger = {
  error: (...args) => emit("error", console.error, args),
  warn: (...args) => emit("warn", console.warn, args),
  info: (...args) => emit("info", console.log, args),
  debug: (...args) => emit("debug", console.log, args),
};
