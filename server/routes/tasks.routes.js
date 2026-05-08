import express from "express";
import { requireRole } from "../middleware/auth.middleware.js";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

/**
 * GET /api/protected/tasks
 * Get user's tasks (or all tasks if admin/manager)
 * Auth: Required
 */
router.get("/", async (req, res, next) => {
  try {
    let query = supabase
      .from("tasks")
      .select(
        "id, title, status, priority, assigned_to, created_at, updated_at",
      );

    // Regular employees only see their own tasks
    if (req.user.role === "employee") {
      query = query.eq("assigned_to", req.user.id);
    }
    // Managers and admins see all tasks (optionally filter by department)
    // You could add: .eq("department", req.user.profile.department)

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      return res.status(400).json({
        error: "Bad Request",
        message: error.message,
      });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/protected/tasks
 * Create a new task (manager/admin only)
 * Auth: Required + Manager/Admin role
 */
router.post("/", requireRole(["admin", "manager"]), async (req, res, next) => {
  try {
    const { title, description, assigned_to, priority = "medium" } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Task title is required",
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title,
        description,
        assigned_to,
        priority,
        status: "pending",
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: "Bad Request",
        message: error.message,
      });
    }

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/protected/tasks/:taskId
 * Get task details (owner, assigned manager, or admin only)
 * Auth: Required
 */
router.get("/:taskId", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", req.params.taskId)
      .single();

    if (error) {
      return res.status(404).json({
        error: "Not Found",
        message: "Task not found",
      });
    }

    // Check authorization
    if (
      req.user.role !== "admin" &&
      req.user.role !== "manager" &&
      data.assigned_to !== req.user.id &&
      data.created_by !== req.user.id
    ) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to view this task",
      });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/protected/tasks/:taskId
 * Update task (creator, assigned manager, or admin only)
 * Auth: Required
 */
router.put("/:taskId", async (req, res, next) => {
  try {
    const { title, description, status, priority } = req.body;

    // First, get the task to check authorization
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", req.params.taskId)
      .single();

    if (fetchError) {
      return res.status(404).json({
        error: "Not Found",
        message: "Task not found",
      });
    }

    // Check authorization
    if (req.user.role !== "admin" && task.created_by !== req.user.id) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only the task creator or admin can update this task",
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({
        ...(title && { title }),
        ...(description && { description }),
        ...(status && { status }),
        ...(priority && { priority }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.params.taskId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: "Bad Request",
        message: error.message,
      });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/protected/tasks/:taskId
 * Delete task (creator or admin only)
 * Auth: Required
 */
router.delete("/:taskId", async (req, res, next) => {
  try {
    // First, get the task to check authorization
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", req.params.taskId)
      .single();

    if (fetchError) {
      return res.status(404).json({
        error: "Not Found",
        message: "Task not found",
      });
    }

    // Check authorization
    if (req.user.role !== "admin" && task.created_by !== req.user.id) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only the task creator or admin can delete this task",
      });
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", req.params.taskId);

    if (error) {
      return res.status(400).json({
        error: "Bad Request",
        message: error.message,
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
