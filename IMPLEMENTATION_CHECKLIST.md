# Implementation Checklist

## Phase 1: Backend Setup ✅ (Completed)

- [x] Created `server/app.js` - Express application setup
- [x] Implemented `server/middleware/auth.middleware.js` - JWT validation & role enforcement
- [x] Created `server/index.js` - Server entry point
- [x] Created `server/package.json` - Dependencies for backend
- [x] Created `server/.env.example` - Environment variable template
- [x] Created `server/routes/profiles.routes.js` - Example protected route
- [x] Created `server/routes/tasks.routes.js` - Example protected route with detailed patterns
- [x] Created `BACKEND_ARCHITECTURE.md` - Comprehensive guide
- [x] Created `supabase/rls-setup.sql` - Database security policies

## Phase 2: Supabase Configuration (Next Steps)

### Step 1: Set Up Environment Variables

**In `server/.env`** (copy from `server/.env.example`):

```bash
# Get these values from Supabase Dashboard
# Settings > API > Project URL and Keys
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  # Service Role Key
SUPABASE_JWT_SECRET=your-jwt-secret  # JWT Secret

# Server config
PORT=3000
NODE_ENV=development

# CORS - allow your frontend
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Step 2: Install Server Dependencies

```bash
cd server
npm install
# OR if you prefer pnpm:
pnpm install
```

### Step 3: Enable Row-Level Security (RLS)

1. Go to Supabase Dashboard → SQL Editor
2. Copy all SQL from `supabase/rls-setup.sql`
3. Run the SQL queries
4. This creates RLS policies on your tables

**Verify RLS is enabled:**

```sql
-- Run in SQL Editor to check
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All tables should show `rowsecurity = true`.

## Phase 3: Database Schema Verification

Ensure your database tables have:

### `profiles` table

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'employee', -- 'admin', 'manager', 'employee', 'hr', etc.
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);
```

### `tasks` table (if needed)

```sql
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  priority text DEFAULT 'medium', -- 'low', 'medium', 'high'
  assigned_to uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);
```

## Phase 4: Test Backend Locally

### Start the backend server

```bash
cd server
npm run dev
```

You should see:

```
╔══════════════════════════════════════╗
║   Employee Portal Server             ║
║   Environment: development           ║
║   Port: 3000                         ║
╚══════════════════════════════════════╝
```

### Test endpoints with Postman or cURL

**1. Health Check (public, no auth)**

```bash
curl http://localhost:3000/health
```

**2. Get Current User (requires auth)**

First, get a token:

```bash
# Login via your client or Supabase dashboard
TOKEN="your-jwt-token-here"
```

Then test the endpoint:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/protected/profiles/me
```

**3. Get All Profiles (admin only)**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/protected/profiles
```

## Phase 5: Update Client Code

### Update client API calls to use backend instead of direct Supabase

**Before (direct Supabase):**

```javascript
// client/src/api/auth.api.js
const { data } = await supabase.auth.signInWithPassword({ email, password });
const { data } = await supabase.from("profiles").select("*").eq("id", userId);
```

**After (via backend):**

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

export const createTask = async (token, taskData) => {
  const response = await fetch("http://localhost:3000/api/protected/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(taskData),
  });
  if (!response.ok) throw new Error("Failed to create task");
  return response.json();
};
```

### Update React hooks to fetch from backend

```javascript
// client/src/hooks/useTasks.js
import { useState, useEffect } from "react";
import { fetchTasks, createTask } from "../api/tasks.api.js";
import { useAuth } from "./auth.hooks.js";

export const useTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get JWT token from Supabase
  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  useEffect(() => {
    if (!user) return;

    const loadTasks = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const data = await fetchTasks(token);
        setTasks(data);
      } catch (error) {
        console.error("Failed to load tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [user]);

  return { tasks, loading };
};
```

## Phase 6: Add More Routes

For each new feature:

1. **Create route file**

   ```bash
   touch server/routes/[feature].routes.js
   ```

2. **Implement endpoints** (follow pattern in `tasks.routes.js`)

3. **Mount in `server/app.js`**

   ```javascript
   import featureRoutes from "./routes/feature.routes.js";
   app.use("/api/protected/feature", featureRoutes);
   ```

4. **Add RLS policies** to `supabase/rls-setup.sql`

5. **Test with Postman/cURL** before client integration

## Phase 7: Deployment Preparation

- [ ] Add `server/.env` to `.gitignore` (never commit secrets)
- [ ] Update production Supabase credentials in CI/CD
- [ ] Set `NODE_ENV=production` on server
- [ ] Configure `ALLOWED_ORIGINS` for production domain
- [ ] Test all endpoints on staging environment
- [ ] Set up error logging/monitoring
- [ ] Enable HTTPS/SSL certificates

## Troubleshooting

### Issue: "Invalid token"

**Cause**: JWT secret mismatch or token expired  
**Fix**: Verify `SUPABASE_JWT_SECRET` in `.env` matches Supabase dashboard

### Issue: "Forbidden" on admin-only routes

**Cause**: User role not fetched correctly from database  
**Fix**: Check `profiles` table has correct role, check RLS policies

### Issue: CORS errors in browser

**Cause**: Frontend origin not in `ALLOWED_ORIGINS`  
**Fix**: Add `http://localhost:5173` to `ALLOWED_ORIGINS` in `.env`

### Issue: Routes return 404

**Cause**: Routes not mounted in `app.js`  
**Fix**: Check `app.use()` imports and mount statements

## Quick Reference: Common Routes Pattern

```javascript
// Protected routes need 3 things:

// 1. Import middleware
import {
  requireRole,
  requireOwnerOrAdmin,
} from "../middleware/auth.middleware.js";

// 2. Apply verifyToken at parent route
app.use("/api/protected", verifyToken);

// 3. Use additional middleware for specific routes
router.get("/:id", requireOwnerOrAdmin(), handler);
router.post("/", requireRole("admin"), handler);
```

## File Structure Summary

```
server/
├── index.js                       # Start here
├── app.js                         # All routes and middleware setup
├── package.json                   # Dependencies
├── .env                           # Secrets (CREATE THIS FILE)
├── .env.example                   # Template
├── middleware/
│   └── auth.middleware.js         # JWT + Role validation
├── routes/
│   ├── profiles.routes.js         # User profiles
│   └── tasks.routes.js            # Tasks (example)
└── utils/                         # Utility functions (if needed)

client/
├── src/
│   ├── api/
│   │   ├── auth.api.js            # Login/signup
│   │   └── tasks.api.js           # Task API calls
│   ├── hooks/
│   │   ├── auth.hooks.js          # Auth state
│   │   └── useTasks.js            # Task state
│   └── ...
```

## Next: What To Build

- [ ] Requests/approvals workflow
- [ ] Shift management
- [ ] Event management
- [ ] Feedback system
- [ ] Dashboard with analytics
- [ ] Notification system

Each feature follows the same pattern:

1. Create `routes/[feature].routes.js`
2. Add RLS policies in `supabase/rls-setup.sql`
3. Create `api/[feature].api.js` on client
4. Create `hooks/use[Feature].js` for state management
