import express from "express";
import {
  requireRole,
  requireOwnerOrAdmin,
} from "../middleware/auth.middleware.js";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

/**
 * GET /api/protected/profiles/me
 * Get current user's profile
 * Auth: Required (verifyToken already applied by parent route)
 */
router.get("/me", async (req, res, next) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
      profile: req.user.profile,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/protected/profiles/:userId
 * Get user profile (admin only or self)
 * Auth: Required + requireOwnerOrAdmin
 */
router.get("/:userId", requireOwnerOrAdmin(), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        role_id,
        roles!inner(name),
        created_at,
        updated_at
      `,
      )
      .eq("id", req.params.userId)
      .single();

    if (error) {
      return res.status(404).json({
        error: "Not Found",
        message: "User profile not found",
      });
    }

    // Return data with role name mapped
    res.json({
      ...data,
      role: data.roles?.name || "employee",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/protected/profiles/:userId
 * Update user profile (admin only or self)
 * Auth: Required + requireOwnerOrAdmin
 */
router.put("/:userId", requireOwnerOrAdmin(), async (req, res, next) => {
  try {
    const { id, role_id, ...updateData } = req.body;

    // Prevent users from changing their own role (only admins can do this)
    if (role_id !== undefined && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only admins can update user roles",
      });
    }

    // If role_id is provided, include it in update
    const finalUpdateData =
      role_id !== undefined ? { ...updateData, role_id } : updateData;

    const { data, error } = await supabase
      .from("profiles")
      .update(finalUpdateData)
      .eq("id", req.params.userId)
      .select(
        `
        id,
        email,
        role_id,
        roles!inner(name),
        created_at,
        updated_at
      `,
      )
      .single();

    if (error) {
      return res.status(400).json({
        error: "Bad Request",
        message: error.message,
      });
    }

    res.json({
      ...data,
      role: data.roles?.name || "employee",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/protected/profiles
 * List all profiles (admin only)
 * Auth: Required + requireRole('admin')
 */
router.get("/", requireRole("admin"), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        role_id,
        roles!inner(name),
        created_at
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({
        error: "Bad Request",
        message: error.message,
      });
    }

    // Map role names for response
    const profilesWithRoles = data.map((profile) => ({
      ...profile,
      role: profile.roles?.name || "employee",
    }));

    res.json(profilesWithRoles);
  } catch (error) {
    next(error);
  }
});

export default router;
