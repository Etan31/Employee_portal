-- Apply AFTER bootstrap.sql or the existing v2 schema. Compatible existing RBAC objects are preserved on retry.
-- Transactional cutover: user_roles becomes authoritative; profiles.role_id is retained only for history.
BEGIN;

CREATE SCHEMA IF NOT EXISTS rbac_private;
REVOKE ALL ON SCHEMA rbac_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS rbac_private.migration_state (
  step text PRIMARY KEY,
  completed_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE rbac_private.migration_state FROM PUBLIC, anon, authenticated;

-- Convert the existing UUID-based RBAC tables without discarding assignments.
DO $$
DECLARE
  has_permission_id boolean;
  has_permission_code boolean;
  has_assigned_by boolean;
  has_granted_by boolean;
  has_assigned_at boolean;
  has_granted_at boolean;
  permission_type text;
  permission_attnum smallint;
  code_attnum smallint;
  user_attnum smallint;
  role_attnum smallint;
  granted_by_attnum smallint;
  primary_definition text;
  duplicate_count bigint;
  expected_foreign_key boolean;
  constraint_row record;
BEGIN
  IF to_regclass('public.permissions') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'permissions' AND column_name = 'code'
        AND data_type IN ('text', 'character varying')
    ) THEN
      RAISE EXCEPTION 'Cannot convert RBAC schema: public.permissions.code must be text.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.permissions WHERE code IS NULL) THEN
      RAISE EXCEPTION 'Cannot convert RBAC schema: public.permissions.code contains NULL values.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.permissions GROUP BY code HAVING count(*) > 1) THEN
      RAISE EXCEPTION 'Cannot convert RBAC schema: public.permissions.code contains duplicates.';
    END IF;
    ALTER TABLE public.permissions ALTER COLUMN code SET NOT NULL;

    SELECT a.attnum INTO code_attnum
    FROM pg_attribute a
    WHERE a.attrelid = 'public.permissions'::regclass AND a.attname = 'code' AND NOT a.attisdropped;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conrelid = 'public.permissions'::regclass AND c.contype IN ('p', 'u')
        AND c.conkey = ARRAY[code_attnum]::smallint[]
    ) THEN
      ALTER TABLE public.permissions ADD CONSTRAINT permissions_code_unique UNIQUE (code);
    END IF;
  END IF;

  IF to_regclass('public.role_permissions') IS NOT NULL THEN
    IF to_regclass('public.permissions') IS NULL THEN
      RAISE EXCEPTION 'Cannot convert public.role_permissions: public.permissions is missing.';
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'role_permissions' AND column_name = 'permission_id'
    ) INTO has_permission_id;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'role_permissions' AND column_name = 'permission_code'
    ) INTO has_permission_code;

    IF NOT has_permission_id AND NOT has_permission_code THEN
      RAISE EXCEPTION 'Cannot convert public.role_permissions: expected permission_id or permission_code.';
    END IF;
    IF has_permission_id THEN
      SELECT data_type INTO permission_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'role_permissions' AND column_name = 'permission_id';
      IF permission_type IS DISTINCT FROM 'uuid' THEN
        RAISE EXCEPTION 'Cannot convert public.role_permissions.permission_id: expected uuid, found %.', permission_type;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'permissions' AND column_name = 'id'
          AND data_type = 'uuid'
      ) THEN
        RAISE EXCEPTION 'Cannot convert public.role_permissions.permission_id: public.permissions.id must be uuid.';
      END IF;

      IF NOT has_permission_code THEN
        ALTER TABLE public.role_permissions ADD COLUMN permission_code text;
      END IF;
      IF EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        LEFT JOIN public.permissions p ON p.id = rp.permission_id
        WHERE p.id IS NULL OR (rp.permission_code IS NOT NULL AND rp.permission_code IS DISTINCT FROM p.code)
      ) THEN
        RAISE EXCEPTION 'Cannot convert public.role_permissions: permission IDs are orphaned or conflict with permission_code.';
      END IF;
      UPDATE public.role_permissions rp
      SET permission_code = p.code
      FROM public.permissions p
      WHERE p.id = rp.permission_id AND rp.permission_code IS NULL;
      IF EXISTS (
        SELECT 1 FROM public.role_permissions WHERE permission_code IS NULL
      ) THEN
        RAISE EXCEPTION 'Cannot convert public.role_permissions: permission_code could not be populated for every row.';
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.role_permissions GROUP BY role_id, permission_code HAVING count(*) > 1
      ) THEN
        RAISE EXCEPTION 'Cannot convert public.role_permissions: multiple permission IDs map to the same role and code.';
      END IF;

      SELECT a.attnum INTO permission_attnum
      FROM pg_attribute a
      WHERE a.attrelid = 'public.role_permissions'::regclass AND a.attname = 'permission_id' AND NOT a.attisdropped;
      SELECT c.conname INTO primary_definition
      FROM pg_constraint c
      WHERE c.conrelid = 'public.role_permissions'::regclass AND c.contype = 'p'
        AND c.conkey @> ARRAY[permission_attnum]::smallint[];
      IF primary_definition IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.role_permissions DROP CONSTRAINT %I', primary_definition);
      END IF;
      FOR constraint_row IN
        SELECT c.conname FROM pg_constraint c
        WHERE c.conrelid = 'public.role_permissions'::regclass AND c.contype <> 'p'
          AND c.conkey @> ARRAY[permission_attnum]::smallint[]
      LOOP
        EXECUTE format('ALTER TABLE public.role_permissions DROP CONSTRAINT %I', constraint_row.conname);
      END LOOP;
      ALTER TABLE public.role_permissions DROP COLUMN permission_id;
    END IF;

    SELECT a.attnum INTO code_attnum
    FROM pg_attribute a
    WHERE a.attrelid = 'public.permissions'::regclass AND a.attname = 'code' AND NOT a.attisdropped;
    SELECT a.attnum INTO permission_attnum
    FROM pg_attribute a
    WHERE a.attrelid = 'public.role_permissions'::regclass AND a.attname = 'permission_code' AND NOT a.attisdropped;
    ALTER TABLE public.role_permissions ALTER COLUMN permission_code SET NOT NULL;

    SELECT pg_get_constraintdef(c.oid) INTO primary_definition
    FROM pg_constraint c
    WHERE c.conrelid = 'public.role_permissions'::regclass AND c.contype = 'p';
    IF primary_definition IS NULL THEN
      ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_code);
    ELSIF primary_definition <> 'PRIMARY KEY (role_id, permission_code)' THEN
      RAISE EXCEPTION 'Cannot convert public.role_permissions: unexpected primary key definition (%).', primary_definition;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conrelid = 'public.role_permissions'::regclass AND c.contype = 'f'
        AND c.conkey = ARRAY[permission_attnum]::smallint[]
        AND c.confrelid = 'public.permissions'::regclass
        AND c.confkey = ARRAY[code_attnum]::smallint[]
    ) THEN
      ALTER TABLE public.role_permissions
        ADD CONSTRAINT role_permissions_permission_code_fkey
        FOREIGN KEY (permission_code) REFERENCES public.permissions(code) ON DELETE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.user_roles') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'assigned_by'
    ) INTO has_assigned_by;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'granted_by'
    ) INTO has_granted_by;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'assigned_at'
    ) INTO has_assigned_at;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'granted_at'
    ) INTO has_granted_at;

    IF has_assigned_by AND has_granted_by THEN
      RAISE EXCEPTION 'Cannot convert public.user_roles: both assigned_by and granted_by exist; reconcile them before migrating.';
    ELSIF has_assigned_by THEN
      ALTER TABLE public.user_roles RENAME COLUMN assigned_by TO granted_by;
    END IF;
    IF has_assigned_at AND has_granted_at THEN
      RAISE EXCEPTION 'Cannot convert public.user_roles: both assigned_at and granted_at exist; reconcile them before migrating.';
    ELSIF has_assigned_at THEN
      ALTER TABLE public.user_roles RENAME COLUMN assigned_at TO granted_at;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'granted_by'
        AND data_type IS DISTINCT FROM 'uuid'
    ) THEN
      RAISE EXCEPTION 'Cannot convert public.user_roles.granted_by: expected uuid.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'granted_at'
        AND data_type IS DISTINCT FROM 'timestamp with time zone'
    ) THEN
      RAISE EXCEPTION 'Cannot convert public.user_roles.granted_at: expected timestamp with time zone.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'granted_by'
    ) THEN
      IF to_regclass('auth.users') IS NULL OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'id'
          AND data_type = 'uuid'
      ) THEN
        RAISE EXCEPTION 'Cannot validate public.user_roles.granted_by: auth.users(id uuid) is missing.';
      END IF;
      SELECT a.attnum INTO granted_by_attnum
      FROM pg_attribute a
      WHERE a.attrelid = 'public.user_roles'::regclass AND a.attname = 'granted_by' AND NOT a.attisdropped;
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint c
        WHERE c.conrelid = 'public.user_roles'::regclass AND c.contype = 'f'
          AND c.conkey = ARRAY[granted_by_attnum]::smallint[]
          AND c.confrelid = 'auth.users'::regclass
          AND c.confkey = ARRAY[(SELECT a.attnum FROM pg_attribute a
            WHERE a.attrelid = 'auth.users'::regclass AND a.attname = 'id' AND NOT a.attisdropped)]::smallint[]
      ) INTO expected_foreign_key;
      IF NOT expected_foreign_key THEN
        IF EXISTS (
          SELECT 1 FROM public.user_roles ur
          LEFT JOIN auth.users u ON u.id = ur.granted_by
          WHERE ur.granted_by IS NOT NULL AND u.id IS NULL
        ) THEN
          RAISE EXCEPTION 'Cannot convert public.user_roles.granted_by: values are missing from auth.users.';
        END IF;
        FOR constraint_row IN
          SELECT c.conname FROM pg_constraint c
          WHERE c.conrelid = 'public.user_roles'::regclass AND c.contype = 'f'
            AND granted_by_attnum = ANY(c.conkey)
        LOOP
          EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT %I', constraint_row.conname);
        END LOOP;
        ALTER TABLE public.user_roles
          ADD FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
      END IF;
    END IF;

    SELECT a.attnum INTO user_attnum
    FROM pg_attribute a
    WHERE a.attrelid = 'public.user_roles'::regclass AND a.attname = 'user_id' AND NOT a.attisdropped;
    SELECT a.attnum INTO role_attnum
    FROM pg_attribute a
    WHERE a.attrelid = 'public.user_roles'::regclass AND a.attname = 'role_id' AND NOT a.attisdropped;
    IF NOT EXISTS (
      SELECT 1 FROM pg_index i
      WHERE i.indrelid = 'public.user_roles'::regclass AND i.indisunique
        AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts = 2
        AND i.indkey[0] = user_attnum AND i.indkey[1] = role_attnum
    ) THEN
      SELECT count(*) INTO duplicate_count
      FROM (
        SELECT 1 FROM public.user_roles GROUP BY user_id, role_id HAVING count(*) > 1
      ) duplicates;
      IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Cannot convert public.user_roles: duplicate user_id/role_id assignments exist.';
      END IF;
      CREATE UNIQUE INDEX user_roles_user_role_unique ON public.user_roles(user_id, role_id);
    END IF;
  END IF;
END $$;

-- Fail with a useful diagnostic rather than silently adopting a different RBAC schema.
DO $$ DECLARE expected record; actual_type text; BEGIN
  IF to_regclass('public.roles') IS NULL OR to_regclass('public.profiles') IS NULL
    OR to_regclass('public.notifications') IS NULL THEN
    RAISE EXCEPTION 'RBAC migration requires public.roles, public.profiles and public.notifications. Apply the base schema first.';
  END IF;
  FOR expected IN SELECT * FROM (VALUES
    ('roles', 'id', 'bigint'), ('roles', 'name', 'text'),
    ('profiles', 'id', 'uuid'), ('profiles', 'email', 'text'),
    ('profiles', 'first_name', 'text'), ('profiles', 'last_name', 'text'),
    ('profiles', 'avatar_url', 'text'), ('profiles', 'role_id', 'bigint'),
    ('profiles', 'is_active', 'boolean'),
    ('notifications', 'user_id', 'uuid'), ('notifications', 'is_read', 'boolean'),
    ('permissions', 'code', 'text'),
    ('role_permissions', 'role_id', 'bigint'), ('role_permissions', 'permission_code', 'text'),
    ('user_roles', 'user_id', 'uuid'), ('user_roles', 'role_id', 'bigint'),
    ('user_roles', 'granted_by', 'uuid'), ('user_roles', 'granted_at', 'timestamp with time zone'),
    ('access_audit', 'id', 'bigint'), ('access_audit', 'actor_id', 'uuid'), ('access_audit', 'target_user_id', 'uuid'),
    ('access_audit', 'action', 'text'), ('access_audit', 'old_roles', 'ARRAY'), ('access_audit', 'new_roles', 'ARRAY'),
    ('access_audit', 'reason', 'text'), ('access_audit', 'occurred_at', 'timestamp with time zone')
  ) AS required(table_name, column_name, data_type) LOOP
    IF to_regclass('public.' || expected.table_name) IS NOT NULL THEN
      SELECT data_type INTO actual_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = expected.table_name AND column_name = expected.column_name;
      IF actual_type IS NULL OR (actual_type IS DISTINCT FROM expected.data_type AND NOT (expected.data_type = 'text' AND actual_type IN ('character varying', 'character'))) THEN
        RAISE EXCEPTION 'Existing RBAC schema differs: public.%.% must be %. Inspect its definition before migrating; no data was changed.', expected.table_name, expected.column_name, expected.data_type;
      END IF;
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS code text;
UPDATE public.roles SET code = CASE lower(regexp_replace(trim(name), '[ _-]+', '_', 'g'))
  WHEN 'system_administrator' THEN 'admin' WHEN 'administrator' THEN 'admin'
  WHEN 'hr' THEN 'hr_administrator' WHEN 'hr_admin' THEN 'hr_administrator'
  WHEN 'human_resources' THEN 'hr_administrator'
  ELSE lower(regexp_replace(trim(name), '[ _-]+', '_', 'g')) END
WHERE code IS NULL OR btrim(code) = '';
-- Duplicate aliases fail here rather than silently merge existing role assignments.
ALTER TABLE public.roles ALTER COLUMN code SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.roles'::regclass AND conname = 'roles_code_unique') THEN
    ALTER TABLE public.roles ADD CONSTRAINT roles_code_unique UNIQUE(code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.roles'::regclass AND conname = 'roles_code_format') THEN
    ALTER TABLE public.roles ADD CONSTRAINT roles_code_format CHECK (code ~ '^[a-z][a-z0-9_]*$');
  END IF;
END $$;
INSERT INTO public.roles(name, code) VALUES
  ('employee', 'employee'), ('manager', 'manager'), ('HR Administrator', 'hr_administrator'),
  ('Support Agent', 'support_agent'), ('admin', 'admin') ON CONFLICT(code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.permissions (code text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id bigint REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_code text REFERENCES public.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_code)
);
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id bigint REFERENCES public.roles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, role_id)
);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS role_permissions_permission_idx ON public.role_permissions(permission_code);
CREATE TABLE IF NOT EXISTS public.access_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid,
  target_user_id uuid,
  action text NOT NULL,
  old_roles bigint[] NOT NULL,
  new_roles bigint[] NOT NULL,
  reason text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS access_audit_time_idx ON public.access_audit(occurred_at DESC);

INSERT INTO public.permissions(code) VALUES
  ('account.read'),
  ('admin.workspace'),
  ('attendance.review'),
  ('audit.read_security'),
  ('calendar.read'),
  ('dashboard.read'),
  ('directory.read'),
  ('employee.read_private'),
  ('employee.update_employment'),
  ('holiday.manage'),
  ('hr.report.read'),
  ('hr.request.read'),
  ('hr.workspace'),
  ('integration.manage'),
  ('knowledge.manage'),
  ('leave.adjust'),
  ('leave.approve'),
  ('leave.policy.manage'),
  ('manager.workspace'),
  ('org.configure'),
  ('org.read'),
  ('policy.publish'),
  ('policy.read'),
  ('preferences.self'),
  ('profile.self'),
  ('queue.report.read'),
  ('role.assign'),
  ('support.workspace'),
  ('system.configure'),
  ('system.health'),
  ('task.assign_team'),
  ('task.self'),
  ('team.read'),
  ('team.report.read'),
  ('ticket.assigned'),
  ('ticket.escalate'),
  ('ticket.self'),
  ('ticket.triage'),
  ('time.self') ON CONFLICT(code) DO NOTHING;
DO $$
DECLARE should_seed boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rbac_private.migration_state WHERE step = '006_default_role_permissions') THEN
    SELECT NOT EXISTS (SELECT 1 FROM public.role_permissions) INTO should_seed;
    IF should_seed THEN
      INSERT INTO public.role_permissions(role_id, permission_code)
      SELECT r.id, p.code FROM public.roles r CROSS JOIN public.permissions p
      WHERE r.code = 'employee' AND p.code IN ('dashboard.read', 'task.self', 'profile.self', 'time.self', 'directory.read', 'calendar.read', 'policy.read', 'ticket.self', 'org.read', 'preferences.self')
      ON CONFLICT(role_id, permission_code) DO NOTHING;
      INSERT INTO public.role_permissions(role_id, permission_code)
      SELECT r.id, p.code FROM public.roles r CROSS JOIN public.permissions p
      WHERE r.code = 'admin' AND p.code IN ('dashboard.read', 'task.self', 'profile.self', 'time.self', 'directory.read', 'calendar.read', 'policy.read', 'ticket.self', 'org.read', 'preferences.self', 'admin.workspace', 'account.read', 'role.assign', 'org.configure', 'system.configure', 'integration.manage', 'audit.read_security', 'system.health')
      ON CONFLICT(role_id, permission_code) DO NOTHING;
      INSERT INTO public.role_permissions(role_id, permission_code)
      SELECT r.id, p.code FROM public.roles r CROSS JOIN public.permissions p
      WHERE r.code = 'hr_administrator' AND p.code IN ('dashboard.read', 'task.self', 'profile.self', 'time.self', 'directory.read', 'calendar.read', 'policy.read', 'ticket.self', 'org.read', 'preferences.self', 'hr.workspace', 'employee.read_private', 'employee.update_employment', 'leave.policy.manage', 'leave.adjust', 'holiday.manage', 'policy.publish', 'hr.request.read', 'hr.report.read')
      ON CONFLICT(role_id, permission_code) DO NOTHING;
      INSERT INTO public.role_permissions(role_id, permission_code)
      SELECT r.id, p.code FROM public.roles r CROSS JOIN public.permissions p
      WHERE r.code = 'manager' AND p.code IN ('dashboard.read', 'task.self', 'profile.self', 'time.self', 'directory.read', 'calendar.read', 'policy.read', 'ticket.self', 'org.read', 'preferences.self', 'manager.workspace', 'team.read', 'leave.approve', 'attendance.review', 'task.assign_team', 'team.report.read')
      ON CONFLICT(role_id, permission_code) DO NOTHING;
      INSERT INTO public.role_permissions(role_id, permission_code)
      SELECT r.id, p.code FROM public.roles r CROSS JOIN public.permissions p
      WHERE r.code = 'support_agent' AND p.code IN ('dashboard.read', 'task.self', 'profile.self', 'time.self', 'directory.read', 'calendar.read', 'policy.read', 'ticket.self', 'org.read', 'preferences.self', 'support.workspace', 'ticket.triage', 'ticket.assigned', 'ticket.escalate', 'knowledge.manage', 'queue.report.read')
      ON CONFLICT(role_id, permission_code) DO NOTHING;
    END IF;
    INSERT INTO rbac_private.migration_state(step) VALUES ('006_default_role_permissions');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rbac_private.migration_state WHERE step = '006_profile_role_backfill') THEN
    INSERT INTO public.user_roles(user_id, role_id)
    SELECT p.id, p.role_id
    FROM public.profiles p
    WHERE p.role_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p.id AND ur.role_id = p.role_id
      )
    ON CONFLICT(user_id, role_id) DO NOTHING;
    INSERT INTO rbac_private.migration_state(step) VALUES ('006_profile_role_backfill');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    JOIN public.permissions p ON p.code = rp.permission_code
    WHERE p.code = 'role.assign'
  ) THEN
    RAISE EXCEPTION 'No role has role.assign. Add an explicit administrator grant before applying the RBAC policy cutover.';
  END IF;
END $$;
ALTER TABLE public.profiles ALTER COLUMN role_id DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN role_id DROP NOT NULL;

REVOKE ALL ON SCHEMA rbac_private FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION rbac_private.has_permission(subject uuid, capability text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    WHERE p.id = subject AND p.is_active IS TRUE AND rp.permission_code = capability
  );
$$;
REVOKE ALL ON FUNCTION rbac_private.has_permission(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_access_context(subject uuid DEFAULT auth.uid()) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF subject IS NULL OR (subject IS DISTINCT FROM auth.uid() AND auth.role() IS DISTINCT FROM 'service_role') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'active', p.is_active IS TRUE,
    'profile', CASE WHEN p.is_active IS TRUE THEN jsonb_build_object(
      'id', p.id, 'email', p.email, 'first_name', p.first_name, 'last_name', p.last_name, 'avatar_url', p.avatar_url
    ) ELSE NULL END,
    'roles', CASE WHEN p.is_active IS TRUE THEN COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'code', r.code, 'name', r.name) ORDER BY r.code)
      FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE ur.user_id = p.id), '[]'::jsonb) ELSE '[]'::jsonb END,
    'permissions', CASE WHEN p.is_active IS TRUE THEN COALESCE((SELECT jsonb_agg(capability ORDER BY capability) FROM (
      SELECT DISTINCT rp.permission_code AS capability FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id WHERE ur.user_id = p.id
    ) grants), '[]'::jsonb) ELSE '[]'::jsonb END
  ) INTO result FROM public.profiles p WHERE p.id = subject;
  RETURN COALESCE(result, jsonb_build_object('active', false, 'roles', '[]'::jsonb, 'permissions', '[]'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.get_access_context(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_access_context(uuid) TO authenticated, service_role;

-- Keep legacy policy checks working without restoring admin access to private records.
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT rbac_private.has_permission(auth.uid(), 'role.assign');
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_permission(capability text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT rbac_private.has_permission(auth.uid(), capability);
$$;
REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Remove old permissive/recursive policies on these identity tables only.
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('profiles', 'roles') LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;
REVOKE ALL ON public.roles, public.profiles, public.permissions, public.role_permissions,
  public.user_roles, public.access_audit FROM PUBLIC, anon, authenticated;
-- Remove any legacy column-level privileges as well as table-level privileges.
DO $$ DECLARE col record; BEGIN
  FOR col IN SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('profiles', 'notifications', 'roles', 'permissions', 'role_permissions', 'user_roles', 'access_audit') LOOP
    EXECUTE format('REVOKE UPDATE (%I), INSERT (%I), REFERENCES (%I), SELECT (%I) ON public.%I FROM PUBLIC, anon, authenticated', col.column_name, col.column_name, col.column_name, col.column_name, col.table_name);
  END LOOP;
END $$;
GRANT SELECT (id, email, first_name, last_name, avatar_url) ON public.profiles TO authenticated;
GRANT UPDATE(first_name, last_name, avatar_url) ON public.profiles TO authenticated;
CREATE POLICY profiles_read_self ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) AND (SELECT public.has_permission('profile.self')));
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) AND (SELECT public.has_permission('profile.self')))
  WITH CHECK (id = (SELECT auth.uid()) AND is_active IS TRUE);
-- Notification access is also revoked immediately when the staff account loses access.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' LOOP
    EXECUTE format('DROP POLICY %I ON public.notifications', pol.policyname);
  END LOOP;
END $$;
REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE(is_read) ON public.notifications TO authenticated;
CREATE POLICY notifications_read_self ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND (SELECT public.has_permission('dashboard.read')));
CREATE POLICY notifications_update_self ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND (SELECT public.has_permission('dashboard.read')))
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.has_permission('dashboard.read')));
GRANT ALL ON public.permissions, public.role_permissions, public.user_roles, public.access_audit TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.access_audit_id_seq TO service_role;

-- Existing accounts retain assignments. New identities are inactive/unassigned until explicitly provisioned.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles(id, email, first_name, last_name, is_active, role_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name', false, NULL);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_role_administration() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT rbac_private.has_permission(auth.uid(), 'account.read') AND NOT rbac_private.has_permission(auth.uid(), 'role.assign') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'roles', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'code', r.code, 'name', r.name,
      'permissions', COALESCE((SELECT jsonb_agg(rp.permission_code ORDER BY rp.permission_code) FROM public.role_permissions rp WHERE rp.role_id = r.id), '[]'::jsonb)) ORDER BY r.name)
      FROM public.roles r), '[]'::jsonb),
    'accounts', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'email', p.email, 'is_active', p.is_active,
      'role_ids', COALESCE((SELECT jsonb_agg(ur.role_id ORDER BY ur.role_id) FROM public.user_roles ur WHERE ur.user_id = p.id), '[]'::jsonb)) ORDER BY p.email)
      FROM public.profiles p), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_role_administration() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_role_administration() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_user_roles(target_user uuid, assigned_roles bigint[], grant_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE old_ids bigint[]; new_ids bigint[];
BEGIN
  -- Serialize grant changes so two administrators cannot both remove the last administrator.
  PERFORM pg_advisory_xact_lock(761042);
  IF NOT rbac_private.has_permission(auth.uid(), 'role.assign') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF grant_reason IS NULL OR length(trim(grant_reason)) < 3 OR length(grant_reason) > 500 OR assigned_roles IS NULL THEN
    RAISE EXCEPTION 'A reason and role list are required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user) THEN
    RAISE EXCEPTION 'Account not found' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(assigned_roles) r WHERE r IS NULL OR NOT EXISTS (SELECT 1 FROM public.roles WHERE id = r)) THEN
    RAISE EXCEPTION 'Unknown role' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(array_agg(DISTINCT r ORDER BY r), '{}'::bigint[]) INTO new_ids FROM unnest(assigned_roles) r;
  SELECT COALESCE(array_agg(role_id ORDER BY role_id), '{}'::bigint[]) INTO old_ids FROM public.user_roles WHERE user_id = target_user;
  DELETE FROM public.user_roles WHERE user_id = target_user;
  INSERT INTO public.user_roles(user_id, role_id, granted_by) SELECT target_user, r, auth.uid() FROM unnest(new_ids) r;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE rbac_private.has_permission(p.id, 'role.assign')) THEN
    RAISE EXCEPTION 'Keep at least one active role administrator' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.access_audit(actor_id, target_user_id, action, old_roles, new_roles, reason)
    VALUES(auth.uid(), target_user, 'roles.changed', old_ids, new_ids, trim(grant_reason));
END;
$$;
REVOKE ALL ON FUNCTION public.set_user_roles(uuid, bigint[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_roles(uuid, bigint[], text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_access_audit() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT rbac_private.has_permission(auth.uid(), 'audit.read_security') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM (SELECT * FROM public.access_audit ORDER BY occurred_at DESC, id DESC LIMIT 100) a), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.get_access_audit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_access_audit() TO authenticated;

CREATE OR REPLACE FUNCTION rbac_private.protect_profile_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
    RAISE EXCEPTION 'Manage assignments through user_roles, not profiles.role_id' USING ERRCODE = '22023';
  END IF;
  IF OLD.is_active IS TRUE AND NEW.is_active IS NOT TRUE THEN
    PERFORM pg_advisory_xact_lock(761042);
    IF rbac_private.has_permission(OLD.id, 'role.assign') AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id <> OLD.id AND rbac_private.has_permission(p.id, 'role.assign')
    ) THEN RAISE EXCEPTION 'Keep at least one active role administrator' USING ERRCODE = '22023'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION rbac_private.protect_profile_access() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_profile_access ON public.profiles;
CREATE TRIGGER protect_profile_access BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION rbac_private.protect_profile_access();

COMMIT;
