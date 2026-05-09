# Backend Architecture Guide

## What Is Your Architecture Exactly?

Your project uses a **Frontend-Backend Separation** pattern (also called **API-Driven Architecture**), NOT classic MVC.

### Comparison

| Aspect                 | Classic MVC                          | Your Architecture                 |
| ---------------------- | ------------------------------------ | --------------------------------- |
| **View Rendering**     | Server renders HTML templates        | Client (React) renders components |
| **Response Format**    | HTML pages                           | JSON APIs                         |
| **Session Management** | Server-side sessions                 | JWT tokens (stateless)            |
| **Client Type**        | Browser (dumb)                       | SPA (smart, handles routing)      |
| **Use Case**           | Traditional web apps (Rails, Django) | Modern SPAs (React, Vue, Angular) |

### Your Stack Components

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  React + Vite (Views + UI Logic + Client Routing)       │
│  - Handles user interaction                             │
│  - Manages component state (React hooks)                │
│  - Client-side routing (React Router)                   │
│  - Sends HTTP requests to backend                       │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP Requests (JSON)
                 │ with JWT in Authorization header
                 ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend Layer                         │
│  Express.js (API Controllers + Business Logic)          │
│  - Routes (what endpoints exist)                        │
│  - Middleware (auth, validation, logging)               │
│  - Controllers (business logic)                         │
│  - Sends JSON responses                                 │
└────────────────┬────────────────────────────────────────┘
                 │ SQL Queries + RLS Enforcement
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  Supabase (PostgreSQL + Auth + RLS Policies)           │
│  - Stores data in tables                                │
│  - RLS = Row-Level Security (database-enforced access) │
│  - Prevents unauthorized data access at DB level        │
└─────────────────────────────────────────────────────────┘
```

## Security Model (Defense in Depth)

Your authentication flows through **3 layers**:

### 1. **Client Login → Supabase**

```javascript
// client/src/api/auth.api.js
const { data } = await supabase.auth.signInWithPassword({ email, password });
// Returns: JWT token
```

### 2. **Client → Backend (JWT Validation)**

```javascript
// Every API request includes Authorization header
headers: {
  "Authorization": "Bearer eyJhbGc..." // JWT token
}

// Backend validates it (server/middleware/auth.middleware.js)
// - Verifies JWT signature (ensures token is authentic)
// - Extracts user ID and email
// - Fetches fresh profile data (ensures role is current)
// - Attaches req.user to request
```

### 3. **Backend → Database (RLS Policies)**

```sql
-- Supabase RLS Example
-- Users can only see their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Only admins can see all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## Middleware Structure

Middleware runs in order when a request hits a route:

```
Client Request
    ↓
CORS Middleware
    ↓
Body Parser Middleware
    ↓
verifyToken Middleware (if protected route)
    ├─ Extract JWT from Authorization header
    ├─ Verify JWT signature
    ├─ Fetch user profile from DB
    └─ Attach req.user
    ↓
requireRole Middleware (if role-protected route)
    ├─ Check if req.user.role matches allowed roles
    └─ Return 403 if not allowed
    ↓
Route Handler (your controller logic)
    ├─ req.user is now available
    ├─ Perform business logic
    └─ Send JSON response
    ↓
Error Handler
    └─ Catches any errors and sends error response
```

## Route Protection Examples

### Public Route (No Auth)

```javascript
app.get("/api/public/health", (req, res) => {
  res.json({ status: "ok" });
});
// Anyone can access
```

### Protected Route (Auth Required)

```javascript
app.get("/api/protected/profiles/me", verifyToken, (req, res) => {
  res.json(req.user);
});
// Only users with valid JWT can access
```

### Role-Protected Route (Auth + Admin Only)

```javascript
app.get(
  "/api/protected/profiles",
  verifyToken,
  requireRole("admin"),
  (req, res) => {
    // Fetch all profiles
  },
);
// Only authenticated admins can access
```

### Owner-Or-Admin Protected Route

```javascript
app.get(
  "/api/protected/profiles/:userId",
  verifyToken,
  requireOwnerOrAdmin(),
  (req, res) => {
    // User can view own profile, or admin can view anyone's
  },
);
```

## File Structure

```
server/
├── index.js                      # Server entry point (listen on PORT)
├── app.js                        # Express app setup
├── .env.example                  # Environment variables template
├── middleware/
│   └── auth.middleware.js        # JWT validation + role middleware
├── routes/
│   ├── profiles.routes.js        # Example: /api/protected/profiles
│   ├── tasks.routes.js           # Example: /api/protected/tasks
│   └── ...
├── modules/                      # TODO: Business logic (optional layer)
│   ├── profiles.module.js        # Reusable profile logic
│   └── ...
└── utils/                        # Utility functions
    ├── logger.js                 # Logging helper
    └── ...
```

## Environment Variables

Create `server/.env` (copy from `.env.example`):

```env
PORT=3000
NODE_ENV=development

# Get these from Supabase dashboard
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... # Service role key (from Settings > API)
SUPABASE_JWT_SECRET=your-secret  # From Settings > API > JWT Secret

# If using CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## How to Add New Routes

### Step 1: Create Route File

```javascript
// server/routes/tasks.routes.js
import express from "express";
import { requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", async (req, res) => {
  // req.user is available (comes from verifyToken)
  console.log("Fetching tasks for user:", req.user.id);
  res.json([]);
});

router.post("/", requireRole("manager"), async (req, res) => {
  // Only managers can create tasks
  res.json({ success: true });
});

export default router;
```

### Step 2: Mount Route in app.js

```javascript
// server/app.js
import taskRoutes from "./routes/tasks.routes.js";

app.use("/api/protected/tasks", taskRoutes);
```

### Step 3: All requests to `/api/protected/tasks` now:

- ✅ Require valid JWT (from `verifyToken` on `/api/protected`)
- ✅ Can use `requireRole()` for additional role checks
- ✅ Have access to `req.user`

## Client API Integration

Update your client to use the backend instead of direct Supabase calls:

```javascript
// client/src/api/tasks.api.js
export const fetchTasks = async (token) => {
  const response = await fetch("http://localhost:3000/api/protected/tasks", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) throw new Error("Failed to fetch tasks");
  return response.json();
};
```

## Database RLS Configuration

Every protected table should have RLS enabled:

```sql
-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow users to update own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

## Key Security Principles

1. **Never trust the client**: Always validate on the server
2. **Token in every request**: Client sends JWT in `Authorization` header
3. **Verify before trusting**: Backend verifies JWT signature
4. **Fresh data**: Fetch profile from DB (role can change)
5. **Least privilege**: Middleware checks role before allowing action
6. **Database defense**: RLS policies prevent direct table access
7. **No sensitive data in JWT**: JWT can be decoded; store sensitive info in DB

## Common Mistakes to Avoid

❌ **BAD**: Exposing API keys in client  
✅ **GOOD**: Keys only in server `.env`

❌ **BAD**: Trusting role from JWT without verifying  
✅ **GOOD**: Fetch fresh role from DB on each request

❌ **BAD**: Checking roles only on client (UI hiding)  
✅ **GOOD**: Always check roles on server (middleware)

❌ **BAD**: No RLS policies on database tables  
✅ **GOOD**: Enable RLS + write policies for each table

## Next Steps

1. **Install dependencies** in `server/` directory
2. **Create `.env` file** with Supabase credentials
3. **Add RLS policies** to Supabase tables
4. **Create more routes** (tasks, requests, etc.)
5. **Update client API** calls to use backend
6. **Test with Postman/Thunder Client** before client integration
