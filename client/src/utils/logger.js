// Minimal client logger: no-ops in production so debug/PII never reaches the browser console.
const isDev = import.meta.env.DEV;

// Verbose developer traces; stripped entirely in production builds.
export const logDebug = (...args) => {
  if (isDev) console.debug(...args);
};

// Error diagnostics; surfaced only in development to avoid leaking details to users.
export const logError = (...args) => {
  if (isDev) console.error(...args);
};
