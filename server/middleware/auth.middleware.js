import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

/**
 * Initialize Supabase client for JWT verification
 * Uses the Supabase API key as the JWT secret
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY, // Service role key for backend
);

/**
 * Extract JWT token from Authorization header
 * Expected format: "Bearer <token>"
 */
function extractToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7); // Remove "Bearer " prefix
}

/**
 * Verify Supabase JWT token
 * Validates signature using Supabase's JWT secret
 */
async function verifySupabaseToken(token) {
  try {
    // Decode the token using Supabase's public key
    // For production, implement proper JWT verification using RS256
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
}

/**
 * Fetch user profile with role information from database
 * This ensures roles are current and not just from the token
 */
async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      role_id,
      roles!inner(name)
    `,
    )
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return {
    ...data,
    role: data.roles?.name || "employee", // Map role name from joined table
  };
}

/**
 * Middleware: Verify JWT token and attach user to request
 * Usage: app.use(verifyToken) or app.get('/protected', verifyToken, handler)
 *
 * Attaches to req.user:
 * - id: user ID from token
 * - email: user email from token
 * - role: normalized role (admin, manager, employee, etc.)
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid Authorization header",
      });
    }

    // Verify JWT signature
    const decoded = await verifySupabaseToken(token);

    // Extract user ID from token
    const userId = decoded.sub; // Supabase uses 'sub' for user ID

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token payload",
      });
    }

    // Fetch fresh profile data (ensures role is current)
    const profile = await fetchUserProfile(userId);

    // Attach user info to request
    req.user = {
      id: userId,
      email: decoded.email || profile.email,
      role: normalizeRole(profile.role || profile.role_id || profile.role_name),
      profile, // Full profile data available if needed
    };

    next();
  } catch (error) {
    console.error("[AUTH ERROR]", error.message);
    res.status(401).json({
      error: "Unauthorized",
      message: error.message,
    });
  }
};

/**
 * Middleware: Require specific role(s)
 * Usage: app.get('/admin', requireRole('admin'), handler)
 *        app.get('/staff', requireRole(['admin', 'manager']), handler)
 */
export const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "No user context",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `This resource requires one of: ${roles.join(", ")}. You are: ${req.user.role}`,
      });
    }

    next();
  };
};

/**
 * Normalize role from various database formats
 * Maps numeric IDs and string names to standardized role names
 */
function normalizeRole(role) {
  if (!role) return "employee";

  const ROLE_MAP = {
    1: "admin",
    2: "manager",
    3: "employee",
    admin: "admin",
    manager: "manager",
    employee: "employee",
    hr: "hr",
    finance: "finance",
  };

  const key = typeof role === "string" ? role.toLowerCase() : role;
  return ROLE_MAP[key] || "employee";
}

/**
 * Middleware: Require user to own the resource (or be admin)
 * Usage: app.get('/users/:userId', verifyToken, requireOwnerOrAdmin(), handler)
 */
export const requireOwnerOrAdmin = () => {
  return (req, res, next) => {
    const { userId } = req.params;

    if (req.user.role === "admin") {
      return next();
    }

    if (req.user.id === userId) {
      return next();
    }

    return res.status(403).json({
      error: "Forbidden",
      message: "You can only access your own data",
    });
  };
};

/**
 * Optional: Custom error class for auth errors
 */
export class AuthError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AuthError";
  }
}
