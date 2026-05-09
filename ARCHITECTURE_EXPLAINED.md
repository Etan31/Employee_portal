# Architecture Clarification: What Your Project Actually Is

## TL;DR

Your project is **API-Driven Frontend-Backend Separation**, NOT classic server-side MVC.

```
Frontend (React SPA) ←→ Backend (REST API) ←→ Database (Supabase)
```

---

## Side-by-Side Comparison

### Classic MVC (Rails, Django, Laravel)

```
Browser Request
    ↓
Server Routes
    ↓
Controller (business logic)
    ↓
Model (database)
    ↓
View (render HTML template)
    ↓
Send HTML to browser
    ↓
Browser renders HTML
```

**Result**: Server sends complete HTML pages. Browser is passive (mostly).

---

### Your Architecture (API-Driven)

```
Browser (React)          ← → Backend (Express)      ← → Database (Supabase)
┌─────────────────┐           ┌──────────────────┐        ┌────────────┐
│ - Renders UI    │           │ - Validates JWT  │        │ - Stores   │
│ - Manages state │ JSON API  │ - Enforces roles │ SQL    │   data     │
│ - Client routing│ requests  │ - Business logic │ queries│ - RLS      │
│ - Calls backend │ ←───────→ │ - DB queries     │ ←────→ │   enforces │
└─────────────────┘ (JSON)    └──────────────────┘        │   security │
                                                          └────────────┘
```

**Result**: Server sends JSON data. Browser renders with received data.

---

## Why This Matters for Security

### Classic MVC

- Session stored on server (secure by default)
- HTML never leaves server (no exposure to client manipulation)
- All logic runs server-side

### Your Architecture

- **No session stored on server** (stateless)
- JWT token is shared with client (can be decoded by anyone)
- Frontend is untrusted (can be modified by users)

**This is why you need:**

1. **Backend validation** - Never trust client data
2. **RLS policies** - Database enforces security
3. **Role checks on server** - Client role is cosmetic only

---

## Security Flow in Your App

### Step 1: User Logs In (Client-Side)

```javascript
// client/src/api/auth.api.js
const { data } = await supabase.auth.signInWithPassword({ email, password });
// Supabase returns JWT token + user data
```

✅ **Good**: Supabase handles password validation  
⚠️ **Note**: Client receives token, but token alone is NOT trusted

---

### Step 2: Client Stores Token

```javascript
// client/src/hooks/auth.hooks.js
const [user, setUser] = useState(null); // From Supabase session
```

⚠️ **Token is in browser memory**

- Client can't be trusted with authorization decisions
- Any JavaScript can read this token
- User could modify role data in browser dev tools

---

### Step 3: Client Sends Every Request with Token

```javascript
// client/src/api/tasks.api.js
fetch("http://localhost:3000/api/protected/tasks", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

✅ **Good**: Client sends token  
⚠️ **Token can be forged or modified by user**

---

### Step 4: Server Validates (THE CRITICAL PART)

```javascript
// server/middleware/auth.middleware.js
const decoded = await verifySupabaseToken(token);
// ✅ Verify signature (token wasn't forged)
// ✅ Fetch fresh profile from DB (role is current)
// ✅ Attach req.user to request
```

✅ **Good**: Server doesn't trust the token alone  
✅ **Good**: Server fetches fresh data from DB

---

### Step 5: Server Checks Role Before Allowing Action

```javascript
// server/routes/tasks.routes.js
router.post("/", requireRole(["admin", "manager"]), async (req, res) => {
  // Only runs if req.user.role === "admin" OR "manager"
});
```

✅ **Good**: Server enforces role  
⚠️ **Useless to check role on client only**

---

### Step 6: Database Enforces Final Layer (RLS)

```sql
-- supabase/rls-setup.sql
CREATE POLICY "Only admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

✅ **Good**: Even if backend logic is buggy, database says "no"  
✅ **Good**: Defense in depth

---

## Architecture Diagram

```
USER ACTION: Click "Delete User"
    ↓
┌──────────────────────────────────────┐
│ CLIENT LAYER (React)                 │
│ ✅ Send DELETE /api/protected/users/123
│ ✅ Include JWT token                 │
│ ⚠️ CAN be bypassed by devtools       │
└──────────────────────────────────────┘
    ↓ HTTP Request
┌──────────────────────────────────────┐
│ SERVER MIDDLEWARE (auth.middleware.js)│
│ ✅ Verify JWT signature              │
│ ✅ Extract user from token           │
│ ✅ Fetch role from database          │
│ ✅ Attach req.user to request        │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ ROUTE HANDLER (requireRole middleware)│
│ ✅ Check if user.role === 'admin'    │
│ ❌ Reject if not admin               │
│ ✅ Continue if admin                 │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ BUSINESS LOGIC (Route controller)    │
│ ✅ Execute DELETE query              │
└──────────────────────────────────────┘
    ↓ SQL Query
┌──────────────────────────────────────┐
│ DATABASE (RLS POLICY)                │
│ ✅ Check: Is user an admin?          │
│ ❌ Reject if not (RLS policy)        │
│ ✅ Allow DELETE if admin             │
└──────────────────────────────────────┘
    ↓
USER sees "User deleted"
```

---

## What Happens if Someone Tries to Cheat

### Scenario 1: User opens DevTools and changes role

```javascript
// In browser console:
localStorage.setItem("user_role", "admin");
```

**Your backend response**:

```
❌ "Forbidden: You are not an admin"
```

✅ **You're safe** because backend fetched fresh role from DB

---

### Scenario 2: User tries to forge a JWT token

```javascript
// User creates fake token with role='admin'
fetch("http://localhost:3000/api/protected/tasks", {
  headers: { Authorization: `Bearer eyJhbGc...` },
});
```

**Your backend response**:

```
❌ "Invalid token: Signature verification failed"
```

✅ **You're safe** because server verifies signature

---

### Scenario 3: User calls API directly (bypasses UI)

```bash
curl -X DELETE http://localhost:3000/api/protected/users/123 \
  -H "Authorization: Bearer [valid-token]"
```

**Backend checks**:

1. ✅ Is token valid? YES
2. ✅ Is user authenticated? YES
3. ❌ Is user an admin? NO → Return 403 Forbidden

✅ **You're safe** because backend validates role

---

## Common Mistakes to Avoid

### ❌ MISTAKE #1: Trusting Client Role

```javascript
// BAD - Client role can be changed by user
if (user.role === "admin") {
  showDeleteButton();
}
```

**Should be**: Delete button shown but API rejects if not really admin

---

### ❌ MISTAKE #2: Not Fetching Fresh Profile

```javascript
// BAD - Using role from JWT token
export const verifyToken = (token) => {
  const decoded = jwt.verify(token, secret);
  req.user = decoded; // Role might be stale!
};
```

**Should be**: Fetch profile from DB to get current role

```javascript
// GOOD
const profile = await supabase
  .from("profiles")
  .select("role")
  .eq("id", userId)
  .single();
req.user.role = profile.role; // Fresh data
```

---

### ❌ MISTAKE #3: Exposing API Keys in Client

```javascript
// BAD - Supabase anon key visible in browser
const supabase = createClient(URL, ANON_KEY);
```

**Should be**:

- Keep anon key for auth only (login/signup)
- Use backend for data queries
- Backend uses service key (secret, not exposed)

---

### ❌ MISTAKE #4: No RLS Policies

```sql
-- BAD - No RLS, anyone can query anything
SELECT * FROM profiles; -- Returns all users
```

**Should be**:

```sql
-- GOOD - RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);
```

---

## File Structure Explained

```
server/
├── index.js                      # Starts server on port 3000
├── app.js                        # Express config + routes
├── middleware/
│   └── auth.middleware.js        # 🔒 JWT validation + role check
└── routes/
    ├── profiles.routes.js        # GET /me, /users/:id, etc.
    └── tasks.routes.js           # GET /tasks, POST /tasks, etc.

client/
├── src/
│   ├── api/
│   │   ├── auth.api.js           # Login (direct to Supabase)
│   │   └── tasks.api.js          # Fetch tasks (via backend)
│   ├── hooks/
│   │   ├── auth.hooks.js         # useAuth() - manages login state
│   │   └── useTasks.js           # useTasks() - manages task state
│   └── pages/
│       └── Dashboard/             # UI components
```

**Key Insight**:

- Auth (login) still goes directly to Supabase ✅
- Data fetching goes through backend ✅
- Backend validates everything ✅

---

## Why This Architecture?

| Concern                | Classic MVC                    | Your Architecture                          |
| ---------------------- | ------------------------------ | ------------------------------------------ |
| **Scalability**        | Server renders HTML (heavy)    | Server only provides data (light)          |
| **API Reuse**          | Hard - tied to one frontend    | Easy - mobile app can use same API         |
| **User Experience**    | Full page reloads              | Smooth SPA (no full reloads)               |
| **Real-time Updates**  | Polling/long-polling           | WebSockets (future)                        |
| **Security**           | Simpler (server-side sessions) | Requires more attention (JWT + validation) |
| **Offline Capability** | Not possible                   | Possible (client-side caching)             |

**Your choice is correct for modern web apps** ✅

---

## Summary

| Layer        | Responsibility               | Security Check         |
| ------------ | ---------------------------- | ---------------------- |
| **Client**   | Get user input, render UI    | ⚠️ Can be bypassed     |
| **Backend**  | Validate, authorize, execute | ✅ **Trust this**      |
| **Database** | Store data, enforce RLS      | ✅ **Final safeguard** |

**Remember**:

- Client = Untrusted (always validate on server)
- Backend = Gatekeeper (always check permissions)
- Database = Fort Knox (RLS policies are last resort)

This is **defense in depth** — multiple layers ensure security.
