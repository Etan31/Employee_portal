# API Endpoints Reference

All protected endpoints require `Authorization: Bearer <JWT_TOKEN>` header.

---

## Health Check (Public)

### GET /health

No authentication required.

**Request:**

```bash
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-05-08T10:30:45.123Z"
}
```

---

## Profiles Endpoints

Base: `/api/protected/profiles`

All require: `Authorization: Bearer <token>`

### GET /api/protected/profiles/me

Get current user's profile.

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/protected/profiles/me
```

**Response:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "role": "manager"
  },
  "profile": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "role": "manager",
    "created_at": "2026-05-08T10:00:00Z",
    "updated_at": "2026-05-08T10:00:00Z"
  }
}
```

---

### GET /api/protected/profiles/:userId

Get specific user's profile (owner only or admin).

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/protected/profiles/550e8400-e29b-41d4-a716-446655440000
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "role": "manager",
  "role_name": null,
  "created_at": "2026-05-08T10:00:00Z",
  "updated_at": "2026-05-08T10:00:00Z"
}
```

**Errors:**

- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Not owner and not admin
- `404 Not Found` - User not found

---

### PUT /api/protected/profiles/:userId

Update user profile (owner only or admin).

**Request:**

```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Updated"}' \
  http://localhost:3000/api/protected/profiles/550e8400-e29b-41d4-a716-446655440000
```

**Request Body:**

```json
{
  "name": "John Updated",
  "department": "Engineering"
}
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "role": "manager",
  "name": "John Updated",
  "department": "Engineering",
  "updated_at": "2026-05-08T10:30:45Z"
}
```

**Special Notes:**

- Users cannot change their own role
- Only admins can change user roles
- Partial updates allowed (send only fields to update)

**Errors:**

- `400 Bad Request` - Invalid data
- `403 Forbidden` - Trying to change role (not admin), or not owner
- `404 Not Found` - User not found

---

### GET /api/protected/profiles

List all user profiles (admin only).

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/protected/profiles
```

**Response:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "role": "manager",
    "role_name": null,
    "created_at": "2026-05-08T10:00:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "jane@example.com",
    "role": "employee",
    "role_name": null,
    "created_at": "2026-05-08T10:05:00Z"
  }
]
```

**Errors:**

- `403 Forbidden` - User is not admin

---

## Tasks Endpoints

Base: `/api/protected/tasks`

All require: `Authorization: Bearer <token>`

### GET /api/protected/tasks

Get tasks (employees see own, managers/admins see all).

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/protected/tasks
```

**Response (Employee):**

```json
[
  {
    "id": "uuid",
    "title": "Fix bug in login",
    "status": "in_progress",
    "priority": "high",
    "assigned_to": "current-user-id",
    "created_at": "2026-05-08T10:00:00Z",
    "updated_at": "2026-05-08T10:30:00Z"
  }
]
```

**Response (Manager/Admin):**

```json
[
  {
    "id": "uuid1",
    "title": "Fix bug in login",
    "status": "in_progress",
    "priority": "high",
    "assigned_to": "user-id-1",
    "created_at": "2026-05-08T10:00:00Z"
  },
  {
    "id": "uuid2",
    "title": "Design dashboard",
    "status": "pending",
    "priority": "medium",
    "assigned_to": "user-id-2",
    "created_at": "2026-05-08T10:05:00Z"
  }
]
```

---

### POST /api/protected/tasks

Create a new task (manager/admin only).

**Request:**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New task",
    "description": "Fix the dashboard",
    "assigned_to": "user-id",
    "priority": "high"
  }' \
  http://localhost:3000/api/protected/tasks
```

**Request Body:**

```json
{
  "title": "Fix dashboard",
  "description": "Dashboard loading is slow",
  "assigned_to": "550e8400-e29b-41d4-a716-446655440000",
  "priority": "high"
}
```

**Response:**

```json
{
  "id": "uuid-of-new-task",
  "title": "Fix dashboard",
  "description": "Dashboard loading is slow",
  "status": "pending",
  "priority": "high",
  "assigned_to": "550e8400-e29b-41d4-a716-446655440000",
  "created_by": "current-user-id",
  "created_at": "2026-05-08T10:35:00Z",
  "updated_at": "2026-05-08T10:35:00Z"
}
```

**Errors:**

- `400 Bad Request` - Missing title or invalid data
- `403 Forbidden` - Not a manager/admin

---

### GET /api/protected/tasks/:taskId

Get task details.

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/protected/tasks/uuid-of-task
```

**Response:**

```json
{
  "id": "uuid-of-task",
  "title": "Fix dashboard",
  "description": "Dashboard loading is slow",
  "status": "in_progress",
  "priority": "high",
  "assigned_to": "user-id",
  "created_by": "manager-id",
  "created_at": "2026-05-08T10:35:00Z",
  "updated_at": "2026-05-08T10:40:00Z"
}
```

**Who can see:**

- Task creator
- Assigned user
- Managers/Admins

**Errors:**

- `403 Forbidden` - Not authorized to view this task
- `404 Not Found` - Task not found

---

### PUT /api/protected/tasks/:taskId

Update task (creator or admin only).

**Request:**

```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "priority": "medium"
  }' \
  http://localhost:3000/api/protected/tasks/uuid-of-task
```

**Request Body:**

```json
{
  "title": "Fix dashboard [URGENT]",
  "status": "in_progress",
  "priority": "medium"
}
```

**Response:**

```json
{
  "id": "uuid-of-task",
  "title": "Fix dashboard [URGENT]",
  "status": "in_progress",
  "priority": "medium",
  "assigned_to": "user-id",
  "created_by": "manager-id",
  "created_at": "2026-05-08T10:35:00Z",
  "updated_at": "2026-05-08T10:45:00Z"
}
```

**Errors:**

- `403 Forbidden` - Only creator or admin can update
- `404 Not Found` - Task not found

---

### DELETE /api/protected/tasks/:taskId

Delete task (creator or admin only).

**Request:**

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/protected/tasks/uuid-of-task
```

**Response:**

- `204 No Content` (success, no response body)

**Errors:**

- `403 Forbidden` - Only creator or admin can delete
- `404 Not Found` - Task not found

---

## Error Responses

### 401 Unauthorized

Missing, invalid, or expired JWT token.

```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid Authorization header"
}
```

### 403 Forbidden

Authenticated but lacks permission for this action.

```json
{
  "error": "Forbidden",
  "message": "This resource requires one of: admin, manager. You are: employee"
}
```

### 404 Not Found

Resource doesn't exist.

```json
{
  "error": "Not Found",
  "message": "Task not found"
}
```

### 400 Bad Request

Invalid request data.

```json
{
  "error": "Bad Request",
  "message": "Task title is required"
}
```

### 500 Internal Server Error

Unexpected server error.

```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong"
}
```

---

## Status Codes Quick Reference

| Code | Meaning                         |
| ---- | ------------------------------- |
| 200  | ✅ Success (GET, PUT)           |
| 201  | ✅ Created (POST)               |
| 204  | ✅ No Content (DELETE)          |
| 400  | ❌ Bad Request (client error)   |
| 401  | ❌ Unauthorized (no/bad token)  |
| 403  | ❌ Forbidden (no permission)    |
| 404  | ❌ Not Found (resource missing) |
| 500  | ❌ Server Error                 |

---

## Testing with cURL Examples

### Login (get JWT token)

```bash
curl -X POST https://your-project.supabase.co/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "grant_type": "password"
  }'
```

Extract the `access_token` from response.

### Store token in variable

```bash
TOKEN="your-jwt-token-here"
```

### Test health endpoint

```bash
curl http://localhost:3000/health
```

### Get current user

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/protected/profiles/me
```

### Create a task

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task",
    "description": "This is a test",
    "priority": "low"
  }' \
  http://localhost:3000/api/protected/tasks
```

### Get all tasks

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/protected/tasks
```

---

## Client Code Examples

### Fetch profiles

```javascript
// client/src/api/profiles.api.js
export const getProfile = async (token) => {
  const res = await fetch("http://localhost:3000/api/protected/profiles/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
};
```

### Fetch tasks

```javascript
// client/src/api/tasks.api.js
export const getTasks = async (token) => {
  const res = await fetch("http://localhost:3000/api/protected/tasks", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
};

export const createTask = async (token, taskData) => {
  const res = await fetch("http://localhost:3000/api/protected/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(taskData),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
};
```

### Use in React

```javascript
// client/src/hooks/useTasks.js
import { useState, useEffect } from "react";
import { getTasks } from "../api/tasks.api.js";
import { useAuth } from "./auth.hooks.js";

export const useTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!user) return;

    const loadTasks = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const data = await getTasks(session.access_token);
        setTasks(data);
      } catch (err) {
        console.error(err);
      }
    };

    loadTasks();
  }, [user]);

  return tasks;
};
```
