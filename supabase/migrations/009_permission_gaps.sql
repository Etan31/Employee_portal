-- 009_permission_gaps.sql
-- Adds explicit capabilities for features that previously reused broader grants.
-- Apply after 006, 007 and 008. Idempotent: permission codes are always ensured;
-- role grants are applied once and are not restored after a later revocation.

BEGIN;

INSERT INTO public.permissions(code) VALUES
  ('notification.read'),
  ('knowledge.read'),
  ('feature_flag.manage'),
  ('attendance.read_hr')
ON CONFLICT(code) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM rbac_private.migration_state WHERE step = '009_permission_gaps'
  ) THEN
    -- Notifications are personal: every role may read its own notifications.
    INSERT INTO public.role_permissions(role_id, permission_code)
    SELECT r.id, p.code
    FROM public.roles r
    CROSS JOIN public.permissions p
    WHERE p.code = 'notification.read'
    ON CONFLICT(role_id, permission_code) DO NOTHING;

    -- Published knowledge is readable by all staff; editing still requires knowledge.manage.
    INSERT INTO public.role_permissions(role_id, permission_code)
    SELECT r.id, p.code
    FROM public.roles r
    CROSS JOIN public.permissions p
    WHERE r.code IN ('employee', 'manager', 'hr_administrator', 'support_agent', 'admin')
      AND p.code = 'knowledge.read'
    ON CONFLICT(role_id, permission_code) DO NOTHING;

    -- Preserve read access for custom support roles that already edit knowledge.
    INSERT INTO public.role_permissions(role_id, permission_code)
    SELECT DISTINCT rp.role_id, 'knowledge.read'
    FROM public.role_permissions rp
    WHERE rp.permission_code = 'knowledge.manage'
    ON CONFLICT(role_id, permission_code) DO NOTHING;

    -- Preserve existing feature-flag access: any role that could configure the system
    -- receives the explicit feature-flag capability instead of losing it on the cutover.
    INSERT INTO public.role_permissions(role_id, permission_code)
    SELECT DISTINCT rp.role_id, 'feature_flag.manage'
    FROM public.role_permissions rp
    WHERE rp.permission_code = 'system.configure'
    ON CONFLICT(role_id, permission_code) DO NOTHING;

    -- HR attendance reads are explicit; managers keep attendance.review for team scope.
    INSERT INTO public.role_permissions(role_id, permission_code)
    SELECT r.id, p.code
    FROM public.roles r
    CROSS JOIN public.permissions p
    WHERE r.code = 'hr_administrator'
      AND p.code = 'attendance.read_hr'
    ON CONFLICT(role_id, permission_code) DO NOTHING;

    INSERT INTO rbac_private.migration_state(step) VALUES ('009_permission_gaps');
  END IF;
END $$;

COMMIT;
