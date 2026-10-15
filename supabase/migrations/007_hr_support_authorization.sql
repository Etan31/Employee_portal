-- Apply after the implemented 006_rbac.sql.
-- The exported database has HR/Support role assignments but no grants for those roles.
-- Add their explicit defaults once; retries must not restore later revocations.
BEGIN;

DO $$
DECLARE target_role text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rbac_private.migration_state WHERE step = '007_hr_support_authorization') THEN
    FOREACH target_role IN ARRAY ARRAY['hr_administrator', 'support_agent'] LOOP
      IF NOT EXISTS (SELECT 1 FROM public.roles WHERE code = target_role) THEN
        RAISE EXCEPTION 'Required role % is missing. Apply 006_rbac.sql first.', target_role;
      END IF;
    END LOOP;

    INSERT INTO public.permissions(code) VALUES
      ('dashboard.read'), ('task.self'), ('profile.self'), ('time.self'), ('directory.read'),
      ('calendar.read'), ('policy.read'), ('ticket.self'), ('org.read'), ('preferences.self'),
      ('hr.workspace'), ('employee.read_private'), ('employee.update_employment'),
      ('leave.policy.manage'), ('leave.adjust'), ('holiday.manage'), ('policy.publish'),
      ('hr.request.read'), ('hr.report.read'), ('support.workspace'), ('ticket.triage'),
      ('ticket.assigned'), ('ticket.escalate'), ('knowledge.manage'), ('queue.report.read')
    ON CONFLICT(code) DO NOTHING;

    INSERT INTO public.role_permissions(role_id, permission_code)
    SELECT r.id, p.code FROM public.roles r CROSS JOIN public.permissions p
    WHERE r.code IN ('hr_administrator', 'support_agent') AND (
      p.code IN ('dashboard.read', 'task.self', 'profile.self', 'time.self', 'directory.read',
        'calendar.read', 'policy.read', 'ticket.self', 'org.read', 'preferences.self')
      OR (r.code = 'hr_administrator' AND p.code IN ('hr.workspace', 'employee.read_private',
        'employee.update_employment', 'leave.policy.manage', 'leave.adjust', 'holiday.manage',
        'policy.publish', 'hr.request.read', 'hr.report.read'))
      OR (r.code = 'support_agent' AND p.code IN ('support.workspace', 'ticket.triage',
        'ticket.assigned', 'ticket.escalate', 'knowledge.manage', 'queue.report.read'))
    )
    ON CONFLICT(role_id, permission_code) DO NOTHING;

    INSERT INTO rbac_private.migration_state(step) VALUES ('007_hr_support_authorization');
  END IF;
END $$;

COMMIT;
