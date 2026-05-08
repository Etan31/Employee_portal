-- ============================================
-- Supabase RLS (Row-Level Security) Setup
-- Run these in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PROFILES TABLE - RLS Configuration
-- ============================================

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "profiles_user_select_own"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "profiles_admin_select_all"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Policy: Users can update their own profile (except role_id)
CREATE POLICY "profiles_user_update_own"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role_id = (SELECT role_id FROM profiles WHERE id = auth.uid())
  );

-- Policy: Admins can update any profile
CREATE POLICY "profiles_admin_update_all"
  ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Policy: Only service role can insert (during registration)
CREATE POLICY "profiles_service_insert"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Policy: Only service role can insert (during registration)
CREATE POLICY "profiles_service_insert"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- 2. TASKS TABLE - RLS Configuration (Example)
-- ============================================

-- Assuming you have a tasks table with structure:
-- id (uuid), user_id (uuid), title (text), status (text), created_at (timestamp)
-- assigned_to (uuid) REFERENCES profiles(id)

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own tasks
CREATE POLICY "tasks_user_select_own"
  ON tasks
  FOR SELECT
  USING (auth.uid() = assigned_to);

-- Policy: Managers can see all tasks
CREATE POLICY "tasks_manager_select_all"
  ON tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager')
    )
  );

-- Policy: Users can create tasks for themselves
CREATE POLICY "tasks_user_insert_own"
  ON tasks
  FOR INSERT
  WITH CHECK (auth.uid() = assigned_to);

-- Policy: Users can update their own tasks (if status is not 'completed')
CREATE POLICY "tasks_user_update_own"
  ON tasks
  FOR UPDATE
  USING (auth.uid() = assigned_to AND status != 'completed')
  WITH CHECK (auth.uid() = assigned_to);

-- Policy: Managers can update any task
CREATE POLICY "tasks_manager_update_all"
  ON tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager')
    )
  );

-- ============================================
-- 3. REQUESTS TABLE - RLS Configuration (Example)
-- ============================================

-- Assuming you have a requests table with structure:
-- id (uuid), requester_id (uuid), reviewer_id (uuid), status (text), created_at (timestamp)

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see requests they created
CREATE POLICY "requests_requester_select"
  ON requests
  FOR SELECT
  USING (auth.uid() = requester_id);

-- Policy: Reviewers can see requests assigned to them
CREATE POLICY "requests_reviewer_select"
  ON requests
  FOR SELECT
  USING (auth.uid() = reviewer_id);

-- Policy: Admins can see all requests
CREATE POLICY "requests_admin_select"
  ON requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Policy: Users can create requests for themselves
CREATE POLICY "requests_user_insert"
  ON requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Policy: Reviewers can update requests assigned to them
CREATE POLICY "requests_reviewer_update"
  ON requests
  FOR UPDATE
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- ============================================
-- 4. HELPER: View Current RLS Policies
-- ============================================

-- Run this to see all RLS policies on a table:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- ============================================
-- 5. NOTES
-- ============================================

/*
WHEN TO USE RLS:

✅ USE RLS for:
- User-specific data (profiles, personal settings)
- Team/department-restricted data
- Sensitive financial or HR information
- Multi-tenant scenarios

❌ SKIP RLS for:
- Public data (blog posts, public events)
- Data fully controlled by backend logic
- Highly complex authorization rules (implement in backend instead)

TESTING RLS:

1. As authenticated user: Can only see/modify own data
2. As admin: Can see/modify all data
3. As unauthenticated: Cannot see anything

Best practice: Implement authorization in BOTH places:
- RLS in database (prevents direct queries)
- Backend middleware (validates for API requests)

*/
