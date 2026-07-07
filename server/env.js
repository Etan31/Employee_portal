import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });

// Fail fast at startup if any required secret is missing, rather than surfacing
// opaque errors on the first request that touches Supabase.
const REQUIRED = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "SUPABASE_JWT_SECRET"];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  logger.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}
