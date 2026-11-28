-- 010_attendance_leave.sql
-- First vertical slice from docs/attendance-leave-slice-contract.md.
-- Apply AFTER 006, 007, 008 and 009.
--
-- Principles:
--   * Browser writes go through SECURITY DEFINER RPCs, never direct table writes.
--   * Reads use RLS and company/team/self scope helpers.
--   * Leave is counted in hours; paid leave is balance-limited, unpaid leave is not.
--   * Approved leave blocks clock-in for the covered time.
--   * Every mutation writes staff_audit and, where useful, a notification.

BEGIN;

-- ---------------------------------------------------------------------------
-- Extra capability for the configured fallback approver. This is deliberately
-- narrower than leave.approve: it only works on requests routed to that person.
-- ---------------------------------------------------------------------------
INSERT INTO public.permissions(code) VALUES ('leave.approve_fallback')
ON CONFLICT(code) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rbac_private.migration_state WHERE step = '010_fallback_approver_grant') THEN
    INSERT INTO public.role_permissions(role_id, permission_code)
    SELECT r.id, 'leave.approve_fallback'
    FROM public.roles r
    WHERE r.code = 'admin'
    ON CONFLICT(role_id, permission_code) DO NOTHING;
    INSERT INTO rbac_private.migration_state(step) VALUES ('010_fallback_approver_grant');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Company setting for the fallback approver (default: first active admin).
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS fallback_leave_approver_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies,
  code text NOT NULL CHECK (length(trim(code)) BETWEEN 1 AND 40),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_minutes integer NOT NULL DEFAULT 60 CHECK (break_minutes BETWEEN 0 AND 240),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code),
  UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS public.employee_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies,
  employee_id uuid NOT NULL,
  shift_id uuid NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
  FOREIGN KEY (shift_id, company_id) REFERENCES public.shifts(id, company_id),
  UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS public.attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies,
  employee_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('clock_in', 'clock_out')),
  occurred_at timestamptz NOT NULL,
  local_date date NOT NULL,
  timezone text NOT NULL,
  source text NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'mobile', 'correction', 'import')),
  correction_request_id uuid,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
  UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS public.attendance_correction_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies,
  employee_id uuid NOT NULL,
  target_date date NOT NULL,
  requested_event_type text NOT NULL CHECK (requested_event_type IN ('clock_in', 'clock_out')),
  requested_time timestamptz NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 3 AND 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
  UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies,
  code text NOT NULL CHECK (length(trim(code)) BETWEEN 1 AND 40),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  unit text NOT NULL DEFAULT 'hours' CHECK (unit IN ('hours', 'days')),
  requires_attachment boolean NOT NULL DEFAULT false,
  attachment_after_hours numeric,
  is_paid boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code),
  UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS public.leave_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies,
  leave_type_id uuid NOT NULL,
  accrual_method text NOT NULL DEFAULT 'manual' CHECK (accrual_method IN ('manual', 'annual', 'monthly')),
  accrual_rate numeric NOT NULL DEFAULT 0 CHECK (accrual_rate >= 0),
  max_balance numeric CHECK (max_balance IS NULL OR max_balance >= 0),
  carryover_max numeric CHECK (carryover_max IS NULL OR carryover_max >= 0),
  allow_negative boolean NOT NULL DEFAULT false,
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  FOREIGN KEY (leave_type_id, company_id) REFERENCES public.leave_types(id, company_id),
  UNIQUE(company_id, leave_type_id, effective_from),
  UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS public.leave_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies,
  employee_id uuid NOT NULL,
  leave_type_id uuid NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('accrual', 'usage', 'adjustment', 'carryover', 'expiry')),
  amount numeric NOT NULL CHECK (amount <> 0),
  effective_date date NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 3 AND 500),
  reference_type text,
  reference_id uuid,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
  FOREIGN KEY (leave_type_id, company_id) REFERENCES public.leave_types(id, company_id),
  UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies,
  employee_id uuid NOT NULL,
  leave_type_id uuid NOT NULL,
  approver_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  total_hours numeric NOT NULL CHECK (total_hours > 0),
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES public.profiles(id),
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK ((start_time IS NULL AND end_time IS NULL) OR (start_time IS NOT NULL AND end_time IS NOT NULL)),
  CHECK (start_time IS NULL OR start_date = end_date),
  CHECK (reason IS NULL OR length(reason) <= 1000),
  CHECK (decision_reason IS NULL OR length(trim(decision_reason)) BETWEEN 3 AND 500),
  FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id),
  FOREIGN KEY (leave_type_id, company_id) REFERENCES public.leave_types(id, company_id),
  FOREIGN KEY (approver_id, company_id) REFERENCES public.employees(id, company_id),
  UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS public.leave_request_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies,
  leave_request_id uuid NOT NULL,
  work_date date NOT NULL,
  hours numeric NOT NULL CHECK (hours > 0),
  day_portion text CHECK (day_portion IS NULL OR day_portion IN ('full', 'am', 'pm')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (leave_request_id, company_id) REFERENCES public.leave_requests(id, company_id) ON DELETE CASCADE,
  UNIQUE(leave_request_id, work_date),
  UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS public.leave_request_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies,
  leave_request_id uuid NOT NULL,
  storage_path text NOT NULL CHECK (length(trim(storage_path)) BETWEEN 1 AND 500),
  file_name text NOT NULL CHECK (length(trim(file_name)) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (length(trim(mime_type)) BETWEEN 1 AND 120),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (leave_request_id, company_id) REFERENCES public.leave_requests(id, company_id) ON DELETE CASCADE,
  UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS public.leave_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies,
  leave_request_id uuid NOT NULL,
  actor_id uuid REFERENCES public.profiles(id),
  action text NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'cancelled', 'reassigned', 'attachment_added')),
  from_status text,
  to_status text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (leave_request_id, company_id) REFERENCES public.leave_requests(id, company_id) ON DELETE CASCADE,
  UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies,
  holiday_date date NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, holiday_date),
  UNIQUE(id, company_id)
);

CREATE INDEX IF NOT EXISTS employee_shifts_employee_idx ON public.employee_shifts(employee_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS attendance_events_employee_idx ON public.attendance_events(employee_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS attendance_events_company_date_idx ON public.attendance_events(company_id, local_date);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_correction_pending_idx
  ON public.attendance_correction_requests(employee_id, target_date, requested_event_type)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS attendance_correction_employee_idx ON public.attendance_correction_requests(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS leave_requests_employee_idx ON public.leave_requests(employee_id, status, start_date DESC);
CREATE INDEX IF NOT EXISTS leave_requests_approver_idx ON public.leave_requests(approver_id, status, submitted_at);
CREATE INDEX IF NOT EXISTS leave_requests_company_idx ON public.leave_requests(company_id, start_date);
CREATE INDEX IF NOT EXISTS leave_request_days_date_idx ON public.leave_request_days(work_date);
CREATE INDEX IF NOT EXISTS leave_ledger_employee_idx ON public.leave_ledger_entries(employee_id, leave_type_id, effective_date);
CREATE INDEX IF NOT EXISTS leave_attachments_request_idx ON public.leave_request_attachments(leave_request_id);
CREATE INDEX IF NOT EXISTS leave_events_request_idx ON public.leave_request_events(leave_request_id, created_at);
CREATE INDEX IF NOT EXISTS holidays_company_date_idx ON public.holidays(company_id, holiday_date);

-- ---------------------------------------------------------------------------
-- Scope helpers. Only the public.* helpers are callable by authenticated users;
-- they are SECURITY DEFINER so RLS policies do not need access to base tables.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_employee_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM public.employees WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_company_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT company_id FROM public.employees WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_my_direct_report(staff_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.employees
    WHERE id = staff_id
      AND manager_id = public.current_employee_id()
      AND company_id = public.my_company_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_hr_employee(staff_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_permission('employee.read_private')
    AND EXISTS(
      SELECT 1 FROM public.employees
      WHERE id = staff_id AND company_id = public.my_company_id()
    );
$$;

CREATE OR REPLACE FUNCTION public.can_review_attendance(staff_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (public.has_permission('attendance.review') AND public.is_my_direct_report(staff_id))
    OR (public.has_permission('attendance.read_hr')
        AND EXISTS(SELECT 1 FROM public.employees WHERE id = staff_id AND company_id = public.my_company_id()));
$$;

CREATE OR REPLACE FUNCTION public.can_read_leave_request(request_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.leave_requests r
    WHERE r.id = request_id
      AND (
        r.employee_id = public.current_employee_id()
        OR r.approver_id = public.current_employee_id()
        OR (public.has_permission('employee.read_private') AND r.company_id = public.my_company_id())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_leave_ledger(staff_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT staff_id = public.current_employee_id()
    OR public.can_read_hr_employee(staff_id);
$$;

CREATE OR REPLACE FUNCTION public.can_read_employee_shift(staff_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT staff_id = public.current_employee_id()
    OR public.is_my_direct_report(staff_id)
    OR public.can_read_hr_employee(staff_id);
$$;

-- Resolve the business date for a punch, including a night shift that crosses
-- midnight. Falls back to the local calendar date when no shift is assigned.
CREATE OR REPLACE FUNCTION public.attendance_business_date(staff_id uuid, at_time timestamptz) RETURNS date
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  company uuid;
  tz text;
  local_ts timestamp;
  local_date date;
  local_time time;
  shift_row public.shifts;
BEGIN
  SELECT e.company_id, c.timezone INTO company, tz
  FROM public.employees e JOIN public.companies c ON c.id = e.company_id
  WHERE e.id = staff_id;

  IF company IS NULL THEN
    RETURN NULL;
  END IF;

  local_ts := at_time AT TIME ZONE tz;
  local_date := local_ts::date;
  local_time := local_ts::time;

  SELECT s.* INTO shift_row
  FROM public.employee_shifts es
  JOIN public.shifts s ON s.id = es.shift_id
  WHERE es.employee_id = staff_id
    AND es.company_id = company
    AND es.effective_from <= local_date
    AND (es.effective_to IS NULL OR es.effective_to >= local_date)
  ORDER BY es.effective_from DESC
  LIMIT 1;

  IF shift_row.id IS NOT NULL AND shift_row.end_time <= shift_row.start_time AND local_time < shift_row.end_time THEN
    RETURN local_date - 1;
  END IF;

  RETURN local_date;
END;
$$;

-- ---------------------------------------------------------------------------
-- Read RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_attendance(p_from date, p_to date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me uuid := public.current_employee_id();
  company uuid := public.my_company_id();
BEGIN
  IF me IS NULL OR NOT public.has_permission('time.self') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 366 THEN
    RAISE EXCEPTION 'Choose a valid date range' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object(
    'employee_id', me,
    'from', p_from,
    'to', p_to,
    'events', COALESCE((
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.occurred_at, a.id)
      FROM public.attendance_events a
      WHERE a.employee_id = me AND a.local_date BETWEEN p_from AND p_to
    ), '[]'::jsonb),
    'leave', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'leave_type_id', r.leave_type_id,
        'leave_type', lt.name,
        'start_date', r.start_date,
        'end_date', r.end_date,
        'start_time', r.start_time,
        'end_time', r.end_time,
        'total_hours', r.total_hours,
        'status', r.status,
        'days', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('work_date', d.work_date, 'hours', d.hours, 'day_portion', d.day_portion) ORDER BY d.work_date)
          FROM public.leave_request_days d WHERE d.leave_request_id = r.id
        ), '[]'::jsonb)
      ) ORDER BY r.start_date)
      FROM public.leave_requests r
      JOIN public.leave_types lt ON lt.id = r.leave_type_id
      WHERE r.employee_id = me
        AND r.status IN ('pending', 'approved')
        AND r.start_date <= p_to AND r.end_date >= p_from
    ), '[]'::jsonb),
    'holidays', COALESCE((
      SELECT jsonb_agg(to_jsonb(h) ORDER BY h.holiday_date)
      FROM public.holidays h
      WHERE h.company_id = company AND h.holiday_date BETWEEN p_from AND p_to
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.team_attendance(p_from date, p_to date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me uuid := public.current_employee_id();
  company uuid := public.my_company_id();
  can_hr boolean := public.has_permission('attendance.read_hr');
BEGIN
  IF me IS NULL OR p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 62 THEN
    RAISE EXCEPTION 'Choose a valid date range' USING ERRCODE = '22023';
  END IF;
  IF NOT can_hr AND NOT public.has_permission('attendance.review') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'employee_id', e.id,
      'first_name', e.first_name,
      'last_name', e.last_name,
      'department_id', e.department_id,
      'events', COALESCE((
        SELECT jsonb_agg(to_jsonb(a) ORDER BY a.occurred_at, a.id)
        FROM public.attendance_events a
        WHERE a.employee_id = e.id AND a.local_date BETWEEN p_from AND p_to
      ), '[]'::jsonb)
    ) ORDER BY e.last_name, e.first_name)
    FROM public.employees e
    WHERE e.company_id = company
      AND e.employment_status = 'active'
      AND (can_hr OR e.manager_id = me)
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_catalog() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  company uuid := public.my_company_id();
BEGIN
  IF company IS NULL THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'types', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', lt.id, 'code', lt.code, 'name', lt.name, 'unit', lt.unit,
        'requires_attachment', lt.requires_attachment,
        'attachment_after_hours', lt.attachment_after_hours,
        'is_paid', lt.is_paid,
        'policy', (
          SELECT to_jsonb(p) FROM public.leave_policies p
          WHERE p.leave_type_id = lt.id AND p.company_id = company
            AND p.effective_from <= current_date
            AND (p.effective_to IS NULL OR p.effective_to >= current_date)
          ORDER BY p.effective_from DESC LIMIT 1
        )
      ) ORDER BY lt.name)
      FROM public.leave_types lt
      WHERE lt.company_id = company AND lt.is_active
    ), '[]'::jsonb),
    'holidays', COALESCE((
      SELECT jsonb_agg(to_jsonb(h) ORDER BY h.holiday_date)
      FROM public.holidays h WHERE h.company_id = company
    ), '[]'::jsonb),
    'shifts', COALESCE((
      SELECT jsonb_agg(to_jsonb(s) ORDER BY s.name)
      FROM public.shifts s WHERE s.company_id = company AND s.is_active
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.my_leave_balances() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me uuid := public.current_employee_id();
  company uuid := public.my_company_id();
BEGIN
  IF me IS NULL OR NOT public.has_permission('time.self') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'leave_type_id', lt.id,
      'code', lt.code,
      'name', lt.name,
      'is_paid', lt.is_paid,
      'unit', lt.unit,
      'balance_hours', COALESCE((
        SELECT sum(l.amount) FROM public.leave_ledger_entries l
        WHERE l.employee_id = me AND l.leave_type_id = lt.id
      ), 0),
      'used_hours', COALESCE((
        SELECT sum(r.total_hours) FROM public.leave_requests r
        WHERE r.employee_id = me AND r.leave_type_id = lt.id AND r.status = 'approved'
      ), 0),
      'pending_hours', COALESCE((
        SELECT sum(r.total_hours) FROM public.leave_requests r
        WHERE r.employee_id = me AND r.leave_type_id = lt.id AND r.status = 'pending'
      ), 0)
    ) ORDER BY lt.name)
    FROM public.leave_types lt
    WHERE lt.company_id = company AND lt.is_active
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.employee_leave_balances(p_employee_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  company uuid := public.my_company_id();
BEGIN
  IF NOT public.can_read_leave_ledger(p_employee_id) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'leave_type_id', lt.id,
      'code', lt.code,
      'name', lt.name,
      'is_paid', lt.is_paid,
      'unit', lt.unit,
      'balance_hours', COALESCE((
        SELECT sum(l.amount) FROM public.leave_ledger_entries l
        WHERE l.employee_id = p_employee_id AND l.leave_type_id = lt.id
      ), 0),
      'used_hours', COALESCE((
        SELECT sum(r.total_hours) FROM public.leave_requests r
        WHERE r.employee_id = p_employee_id AND r.leave_type_id = lt.id AND r.status = 'approved'
      ), 0)
    ) ORDER BY lt.name)
    FROM public.leave_types lt
    WHERE lt.company_id = company AND lt.is_active
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.my_leave_requests() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me uuid := public.current_employee_id();
BEGIN
  IF me IS NULL OR NOT public.has_permission('time.self') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', r.id, 'employee_id', r.employee_id, 'leave_type_id', r.leave_type_id,
      'leave_type', lt.name, 'approver_id', r.approver_id,
      'approver_name', concat_ws(' ', a.first_name, a.last_name),
      'start_date', r.start_date, 'end_date', r.end_date,
      'start_time', r.start_time, 'end_time', r.end_time,
      'total_hours', r.total_hours, 'reason', r.reason, 'status', r.status,
      'submitted_at', r.submitted_at, 'decided_at', r.decided_at,
      'decision_reason', r.decision_reason,
      'days', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('work_date', d.work_date, 'hours', d.hours, 'day_portion', d.day_portion) ORDER BY d.work_date)
        FROM public.leave_request_days d WHERE d.leave_request_id = r.id
      ), '[]'::jsonb),
      'attachments', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', x.id, 'file_name', x.file_name, 'mime_type', x.mime_type, 'size_bytes', x.size_bytes))
        FROM public.leave_request_attachments x WHERE x.leave_request_id = r.id
      ), '[]'::jsonb)
    ) ORDER BY r.submitted_at DESC)
    FROM public.leave_requests r
    JOIN public.leave_types lt ON lt.id = r.leave_type_id
    LEFT JOIN public.employees a ON a.id = r.approver_id
    WHERE r.employee_id = me
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.pending_leave_approvals() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me uuid := public.current_employee_id();
BEGIN
  IF me IS NULL OR NOT (public.has_permission('leave.approve') OR public.has_permission('leave.approve_fallback')) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', r.id, 'employee_id', r.employee_id,
      'employee_name', concat_ws(' ', e.first_name, e.last_name),
      'leave_type_id', r.leave_type_id, 'leave_type', lt.name,
      'start_date', r.start_date, 'end_date', r.end_date,
      'start_time', r.start_time, 'end_time', r.end_time,
      'total_hours', r.total_hours, 'reason', r.reason,
      'submitted_at', r.submitted_at,
      'days', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('work_date', d.work_date, 'hours', d.hours, 'day_portion', d.day_portion) ORDER BY d.work_date)
        FROM public.leave_request_days d WHERE d.leave_request_id = r.id
      ), '[]'::jsonb),
      'attachments', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', x.id, 'file_name', x.file_name, 'mime_type', x.mime_type, 'size_bytes', x.size_bytes))
        FROM public.leave_request_attachments x WHERE x.leave_request_id = r.id
      ), '[]'::jsonb)
    ) ORDER BY r.submitted_at)
    FROM public.leave_requests r
    JOIN public.employees e ON e.id = r.employee_id
    JOIN public.leave_types lt ON lt.id = r.leave_type_id
    WHERE r.approver_id = me AND r.status = 'pending'
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_leave_requests(p_employee_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT (p_employee_id = public.current_employee_id() OR public.can_read_hr_employee(p_employee_id)) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', r.id, 'leave_type_id', r.leave_type_id, 'leave_type', lt.name,
      'start_date', r.start_date, 'end_date', r.end_date,
      'start_time', r.start_time, 'end_time', r.end_time,
      'total_hours', r.total_hours, 'status', r.status, 'reason', r.reason,
      'submitted_at', r.submitted_at, 'decided_at', r.decided_at,
      'decision_reason', r.decision_reason,
      'days', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('work_date', d.work_date, 'hours', d.hours, 'day_portion', d.day_portion) ORDER BY d.work_date)
        FROM public.leave_request_days d WHERE d.leave_request_id = r.id
      ), '[]'::jsonb),
      'attachments', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', x.id, 'file_name', x.file_name, 'mime_type', x.mime_type, 'size_bytes', x.size_bytes))
        FROM public.leave_request_attachments x WHERE x.leave_request_id = r.id
      ), '[]'::jsonb)
    ) ORDER BY r.start_date DESC)
    FROM public.leave_requests r
    JOIN public.leave_types lt ON lt.id = r.leave_type_id
    WHERE r.employee_id = p_employee_id
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.team_leave_calendar(p_from date, p_to date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me uuid := public.current_employee_id();
  company uuid := public.my_company_id();
  can_hr boolean := public.has_permission('attendance.read_hr') OR public.has_permission('employee.read_private');
BEGIN
  IF me IS NULL OR p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 62 THEN
    RAISE EXCEPTION 'Choose a valid date range' USING ERRCODE = '22023';
  END IF;
  IF NOT can_hr AND NOT (public.has_permission('team.read') OR public.has_permission('leave.approve') OR public.has_permission('leave.approve_fallback')) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', r.id, 'employee_id', r.employee_id,
      'employee_name', concat_ws(' ', e.first_name, e.last_name),
      'leave_type', lt.name, 'start_date', r.start_date, 'end_date', r.end_date,
      'start_time', r.start_time, 'end_time', r.end_time, 'total_hours', r.total_hours,
      'days', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('work_date', d.work_date, 'hours', d.hours, 'day_portion', d.day_portion) ORDER BY d.work_date)
        FROM public.leave_request_days d WHERE d.leave_request_id = r.id
      ), '[]'::jsonb)
    ) ORDER BY r.start_date, e.last_name)
    FROM public.leave_requests r
    JOIN public.employees e ON e.id = r.employee_id
    JOIN public.leave_types lt ON lt.id = r.leave_type_id
    WHERE r.company_id = company AND r.status = 'approved'
      AND r.start_date <= p_to AND r.end_date >= p_from
      AND (can_hr OR e.manager_id = me)
  ), '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- Attendance write RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clock_attendance(p_event_type text, p_occurred_at timestamptz DEFAULT now()) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me uuid := public.current_employee_id();
  company uuid;
  tz text;
  business_date date;
  last_event text;
  event_row public.attendance_events;
BEGIN
  IF me IS NULL OR NOT public.has_permission('time.self') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_event_type NOT IN ('clock_in', 'clock_out') THEN
    RAISE EXCEPTION 'Invalid attendance event' USING ERRCODE = '22023';
  END IF;
  IF p_occurred_at IS NULL THEN
    p_occurred_at := now();
  END IF;

  SELECT e.company_id, c.timezone INTO company, tz
  FROM public.employees e JOIN public.companies c ON c.id = e.company_id
  WHERE e.id = me;

  IF company IS NULL THEN
    RAISE EXCEPTION 'Employee record unavailable' USING ERRCODE = '42501';
  END IF;

  business_date := public.attendance_business_date(me, p_occurred_at);

  SELECT event_type INTO last_event
  FROM public.attendance_events
  WHERE employee_id = me
  ORDER BY occurred_at DESC, created_at DESC
  LIMIT 1;

  IF p_event_type = 'clock_in' AND last_event = 'clock_in' THEN
    RAISE EXCEPTION 'You are already clocked in' USING ERRCODE = '22023';
  END IF;
  IF p_event_type = 'clock_out' AND (last_event IS NULL OR last_event <> 'clock_in') THEN
    RAISE EXCEPTION 'No open shift to clock out from' USING ERRCODE = '22023';
  END IF;

  IF p_event_type = 'clock_in' AND EXISTS (
    SELECT 1
    FROM public.leave_requests r
    JOIN public.leave_request_days d ON d.leave_request_id = r.id
    WHERE r.employee_id = me
      AND r.status = 'approved'
      AND d.work_date = business_date
      AND (
        r.start_time IS NULL OR r.end_time IS NULL
        OR (p_occurred_at AT TIME ZONE tz)::time BETWEEN r.start_time AND r.end_time
      )
  ) THEN
    RAISE EXCEPTION 'Approved leave covers this time; clock-in is blocked' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.attendance_events(
    company_id, employee_id, event_type, occurred_at, local_date, timezone, source, created_by
  ) VALUES (
    company, me, p_event_type, p_occurred_at, business_date, tz, 'web', auth.uid()
  ) RETURNING * INTO event_row;

  INSERT INTO public.staff_audit(actor_id, employee_id, action, reason, details)
  VALUES (auth.uid(), me, 'attendance.' || p_event_type, 'Employee recorded attendance',
    jsonb_build_object('event_id', event_row.id, 'occurred_at', event_row.occurred_at, 'local_date', event_row.local_date));

  RETURN to_jsonb(event_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_attendance_correction(
  p_target_date date,
  p_event_type text,
  p_requested_time timestamptz,
  p_reason text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me uuid := public.current_employee_id();
  company uuid := public.my_company_id();
  result uuid;
BEGIN
  IF me IS NULL OR NOT public.has_permission('time.self') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_target_date IS NULL OR p_requested_time IS NULL
     OR p_event_type NOT IN ('clock_in', 'clock_out')
     OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Provide a valid correction request and reason' USING ERRCODE = '22023';
  END IF;
  IF p_target_date > current_date THEN
    RAISE EXCEPTION 'Future dates cannot be corrected' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.attendance_correction_requests
    WHERE employee_id = me AND target_date = p_target_date
      AND requested_event_type = p_event_type AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending correction already exists for that event' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.attendance_correction_requests(
    company_id, employee_id, target_date, requested_event_type, requested_time, reason
  ) VALUES (company, me, p_target_date, p_event_type, p_requested_time, trim(p_reason))
  RETURNING id INTO result;

  INSERT INTO public.staff_audit(actor_id, employee_id, action, reason, details)
  VALUES (auth.uid(), me, 'attendance.correction_requested', trim(p_reason),
    jsonb_build_object('request_id', result, 'target_date', p_target_date, 'event_type', p_event_type));

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_attendance_correction(
  p_request_id uuid,
  p_decision text,
  p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  req public.attendance_correction_requests;
  me uuid := public.current_employee_id();
  company uuid := public.my_company_id();
  tz text;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Choose approved or rejected' USING ERRCODE = '22023';
  END IF;
  IF p_decision = 'rejected' AND (p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 3 AND 500) THEN
    RAISE EXCEPTION 'A rejection reason is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO req FROM public.attendance_correction_requests
  WHERE id = p_request_id AND company_id = company
  FOR UPDATE;

  IF NOT FOUND OR NOT public.can_review_attendance(req.employee_id) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'This correction was already reviewed' USING ERRCODE = '22023';
  END IF;

  UPDATE public.attendance_correction_requests
  SET status = p_decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      decision_reason = nullif(trim(p_reason), ''),
      updated_at = now()
  WHERE id = req.id;

  IF p_decision = 'approved' THEN
    SELECT c.timezone INTO tz FROM public.companies c WHERE c.id = req.company_id;
    INSERT INTO public.attendance_events(
      company_id, employee_id, event_type, occurred_at, local_date, timezone, source, correction_request_id, created_by
    ) VALUES (
      req.company_id, req.employee_id, req.requested_event_type, req.requested_time,
      public.attendance_business_date(req.employee_id, req.requested_time), tz, 'correction', req.id, auth.uid()
    );
  END IF;

  INSERT INTO public.staff_audit(actor_id, employee_id, action, reason, details)
  VALUES (auth.uid(), req.employee_id, 'attendance.correction_' || p_decision,
    COALESCE(nullif(trim(p_reason), ''), 'Attendance correction reviewed'),
    jsonb_build_object('request_id', req.id, 'decision', p_decision));

  INSERT INTO public.notifications(user_id, type, title, message)
  SELECT e.auth_user_id, 'attendance', 'Attendance correction ' || p_decision,
    'Your attendance correction for ' || req.target_date || ' was ' || p_decision || '.'
  FROM public.employees e
  WHERE e.id = req.employee_id AND e.auth_user_id IS NOT NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- Leave write RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_leave_request(
  p_leave_type_id uuid,
  p_start_date date,
  p_end_date date,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL,
  p_reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me uuid := public.current_employee_id();
  staff public.employees;
  company uuid;
  lt public.leave_types;
  policy public.leave_policies;
  approver uuid;
  d date;
  day_hours numeric;
  total numeric := 0;
  shift_hours numeric;
  shift_row public.shifts;
  balance numeric;
  pending_hours numeric;
  request_id uuid;
  minutes numeric;
  is_partial boolean := (p_start_time IS NOT NULL OR p_end_time IS NOT NULL);
BEGIN
  IF me IS NULL OR NOT public.has_permission('time.self') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date OR p_end_date - p_start_date > 366 THEN
    RAISE EXCEPTION 'Choose a valid date range' USING ERRCODE = '22023';
  END IF;
  IF (p_start_time IS NULL) <> (p_end_time IS NULL) THEN
    RAISE EXCEPTION 'Provide both start and end times, or neither' USING ERRCODE = '22023';
  END IF;
  IF is_partial AND p_start_date <> p_end_date THEN
    RAISE EXCEPTION 'Partial-day leave must be requested one day at a time' USING ERRCODE = '22023';
  END IF;
  IF p_start_time IS NOT NULL AND p_start_time = p_end_time THEN
    RAISE EXCEPTION 'Partial-day start and end times must differ' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NOT NULL AND length(p_reason) > 1000 THEN
    RAISE EXCEPTION 'Reason is too long' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.employees WHERE id = me FOR UPDATE;
  SELECT * INTO staff FROM public.employees WHERE id = me;
  company := staff.company_id;

  SELECT * INTO lt FROM public.leave_types
  WHERE id = p_leave_type_id AND company_id = company AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave type unavailable' USING ERRCODE = '22023';
  END IF;

  -- Validate and total the working hours.
  d := p_start_date;
  WHILE d <= p_end_date LOOP
    IF extract(isodow FROM d) < 6
       AND NOT EXISTS (SELECT 1 FROM public.holidays h WHERE h.company_id = company AND h.holiday_date = d) THEN
      shift_row := NULL;
      SELECT s.* INTO shift_row
      FROM public.employee_shifts es
      JOIN public.shifts s ON s.id = es.shift_id
      WHERE es.employee_id = me AND es.company_id = company
        AND es.effective_from <= d AND (es.effective_to IS NULL OR es.effective_to >= d)
      ORDER BY es.effective_from DESC LIMIT 1;

      IF shift_row.id IS NULL THEN
        shift_hours := 8;
      ELSE
        shift_hours := (
          CASE WHEN shift_row.end_time > shift_row.start_time
            THEN extract(epoch FROM (shift_row.end_time - shift_row.start_time))
            ELSE extract(epoch FROM (shift_row.end_time + interval '24 hours' - shift_row.start_time))
          END / 3600.0
        ) - (shift_row.break_minutes / 60.0);
      END IF;

      IF is_partial THEN
        minutes := extract(epoch FROM (p_end_time - p_start_time)) / 60.0;
        IF minutes <= 0 THEN
          minutes := minutes + 1440;
        END IF;
        day_hours := minutes / 60.0;
      ELSE
        day_hours := shift_hours;
      END IF;

      IF day_hours > shift_hours THEN
        day_hours := shift_hours;
      END IF;

      IF day_hours <= 0 THEN
        RAISE EXCEPTION 'No working hours in the selected range' USING ERRCODE = '22023';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.leave_request_days rd
        JOIN public.leave_requests r ON r.id = rd.leave_request_id
        WHERE r.employee_id = me
          AND r.status IN ('pending', 'approved')
          AND rd.work_date = d
      ) THEN
        RAISE EXCEPTION 'Leave already exists for %', d USING ERRCODE = '22023';
      END IF;

      total := total + day_hours;
    END IF;
    d := d + 1;
  END LOOP;

  IF total <= 0 THEN
    RAISE EXCEPTION 'The selected range contains no working days' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO policy FROM public.leave_policies
  WHERE leave_type_id = lt.id AND company_id = company
    AND effective_from <= p_start_date
    AND (effective_to IS NULL OR effective_to >= p_start_date)
  ORDER BY effective_from DESC LIMIT 1;

  IF lt.is_paid THEN
    SELECT COALESCE(sum(amount), 0) INTO balance
    FROM public.leave_ledger_entries
    WHERE employee_id = me AND leave_type_id = lt.id;

    SELECT COALESCE(sum(total_hours), 0) INTO pending_hours
    FROM public.leave_requests
    WHERE employee_id = me AND leave_type_id = lt.id AND status = 'pending';

    IF balance - pending_hours < total AND (policy.id IS NULL OR NOT policy.allow_negative) THEN
      RAISE EXCEPTION 'Insufficient leave balance' USING ERRCODE = '22023';
    END IF;
  END IF;

  approver := staff.manager_id;
  IF approver IS NULL OR approver = me
     OR NOT EXISTS (
       SELECT 1 FROM public.employees
       WHERE id = approver AND company_id = company AND employment_status = 'active'
     ) THEN
    SELECT fallback_leave_approver_id INTO approver FROM public.companies WHERE id = company;
  END IF;
  IF approver IS NULL OR approver = me
     OR NOT EXISTS (SELECT 1 FROM public.employees WHERE id = approver AND company_id = company AND employment_status = 'active') THEN
    RAISE EXCEPTION 'No approver is configured for this request' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.leave_requests(
    company_id, employee_id, leave_type_id, approver_id,
    start_date, end_date, start_time, end_time, total_hours, reason
  ) VALUES (
    company, me, lt.id, approver,
    p_start_date, p_end_date, p_start_time, p_end_time, total, nullif(trim(p_reason), '')
  ) RETURNING id INTO request_id;

  d := p_start_date;
  WHILE d <= p_end_date LOOP
    IF extract(isodow FROM d) < 6
       AND NOT EXISTS (SELECT 1 FROM public.holidays h WHERE h.company_id = company AND h.holiday_date = d) THEN
      shift_row := NULL;
      SELECT s.* INTO shift_row
      FROM public.employee_shifts es
      JOIN public.shifts s ON s.id = es.shift_id
      WHERE es.employee_id = me AND es.company_id = company
        AND es.effective_from <= d AND (es.effective_to IS NULL OR es.effective_to >= d)
      ORDER BY es.effective_from DESC LIMIT 1;

      IF shift_row.id IS NULL THEN
        shift_hours := 8;
      ELSE
        shift_hours := (
          CASE WHEN shift_row.end_time > shift_row.start_time
            THEN extract(epoch FROM (shift_row.end_time - shift_row.start_time))
            ELSE extract(epoch FROM (shift_row.end_time + interval '24 hours' - shift_row.start_time))
          END / 3600.0
        ) - (shift_row.break_minutes / 60.0);
      END IF;

      IF is_partial THEN
        minutes := extract(epoch FROM (p_end_time - p_start_time)) / 60.0;
        IF minutes <= 0 THEN minutes := minutes + 1440; END IF;
        day_hours := minutes / 60.0;
      ELSE
        day_hours := shift_hours;
      END IF;

      IF day_hours > shift_hours THEN
        day_hours := shift_hours;
      END IF;

      INSERT INTO public.leave_request_days(company_id, leave_request_id, work_date, hours, day_portion)
      VALUES (
        company, request_id, d, day_hours,
        CASE
          WHEN day_hours >= shift_hours THEN 'full'
          WHEN p_end_time IS NOT NULL AND p_end_time <= time '12:00' THEN 'am'
          WHEN p_start_time IS NOT NULL AND p_start_time >= time '12:00' THEN 'pm'
          ELSE NULL
        END
      );
    END IF;
    d := d + 1;
  END LOOP;

  INSERT INTO public.leave_request_events(company_id, leave_request_id, actor_id, action, to_status, reason)
  VALUES (company, request_id, auth.uid(), 'submitted', 'pending', nullif(trim(p_reason), ''));

  INSERT INTO public.staff_audit(actor_id, employee_id, action, reason, details)
  VALUES (auth.uid(), me, 'leave.submitted', 'Employee submitted leave request',
    jsonb_build_object('request_id', request_id, 'leave_type_id', lt.id, 'total_hours', total,
      'start_date', p_start_date, 'end_date', p_end_date, 'approver_id', approver));

  INSERT INTO public.notifications(user_id, type, title, message)
  SELECT a.auth_user_id, 'leave', 'New leave request',
    concat_ws(' ', staff.first_name, staff.last_name) || ' requested ' || lt.name || '.'
  FROM public.employees a
  WHERE a.id = approver AND a.auth_user_id IS NOT NULL;

  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_leave_request(
  p_request_id uuid,
  p_decision text,
  p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  req public.leave_requests;
  lt public.leave_types;
  policy public.leave_policies;
  me uuid := public.current_employee_id();
  balance numeric;
BEGIN
  IF me IS NULL OR NOT (public.has_permission('leave.approve') OR public.has_permission('leave.approve_fallback')) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Choose approved or rejected' USING ERRCODE = '22023';
  END IF;
  IF p_decision = 'rejected' AND (p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 3 AND 500) THEN
    RAISE EXCEPTION 'A rejection reason is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO req FROM public.leave_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR req.approver_id <> me OR req.employee_id = me THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'This request was already decided' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO lt FROM public.leave_types WHERE id = req.leave_type_id;
  PERFORM 1 FROM public.employees WHERE id = req.employee_id FOR UPDATE;

  IF p_decision = 'approved' AND lt.requires_attachment
     AND (lt.attachment_after_hours IS NULL OR req.total_hours > lt.attachment_after_hours)
     AND NOT EXISTS (
       SELECT 1 FROM public.leave_request_attachments
       WHERE leave_request_id = req.id
     ) THEN
    RAISE EXCEPTION 'A supporting attachment is required before approval' USING ERRCODE = '22023';
  END IF;

  IF p_decision = 'approved' AND lt.is_paid THEN
    SELECT COALESCE(sum(amount), 0) INTO balance
    FROM public.leave_ledger_entries
    WHERE employee_id = req.employee_id AND leave_type_id = req.leave_type_id;

    SELECT * INTO policy FROM public.leave_policies
    WHERE leave_type_id = req.leave_type_id AND company_id = req.company_id
      AND effective_from <= req.start_date
      AND (effective_to IS NULL OR effective_to >= req.start_date)
    ORDER BY effective_from DESC LIMIT 1;

    IF balance < req.total_hours AND (policy.id IS NULL OR NOT policy.allow_negative) THEN
      RAISE EXCEPTION 'Insufficient leave balance' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.leave_ledger_entries(
      company_id, employee_id, leave_type_id, entry_type, amount, effective_date,
      reason, reference_type, reference_id, created_by
    ) VALUES (
      req.company_id, req.employee_id, req.leave_type_id, 'usage', -req.total_hours, req.start_date,
      'Leave approved', 'leave_request', req.id, auth.uid()
    );
  END IF;

  UPDATE public.leave_requests
  SET status = p_decision,
      decided_by = auth.uid(),
      decided_at = now(),
      decision_reason = nullif(trim(p_reason), ''),
      updated_at = now()
  WHERE id = req.id;

  INSERT INTO public.leave_request_events(company_id, leave_request_id, actor_id, action, from_status, to_status, reason)
  VALUES (req.company_id, req.id, auth.uid(), p_decision, 'pending', p_decision, nullif(trim(p_reason), ''));

  INSERT INTO public.staff_audit(actor_id, employee_id, action, reason, details)
  VALUES (auth.uid(), req.employee_id, 'leave.' || p_decision,
    COALESCE(nullif(trim(p_reason), ''), 'Leave request ' || p_decision),
    jsonb_build_object('request_id', req.id, 'decision', p_decision, 'total_hours', req.total_hours));

  INSERT INTO public.notifications(user_id, type, title, message)
  SELECT e.auth_user_id, 'leave', 'Leave request ' || p_decision,
    'Your ' || lt.name || ' request was ' || p_decision || '.'
  FROM public.employees e
  WHERE e.id = req.employee_id AND e.auth_user_id IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_leave_request(p_request_id uuid, p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  req public.leave_requests;
  me uuid := public.current_employee_id();
  lt public.leave_types;
  allowed boolean;
BEGIN
  IF me IS NULL OR NOT public.has_permission('time.self') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'A cancellation reason is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO req FROM public.leave_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR req.company_id <> public.my_company_id() THEN
    RAISE EXCEPTION 'Leave request unavailable' USING ERRCODE = '22023';
  END IF;

  allowed := (req.employee_id = me AND req.status = 'pending')
    OR (req.status = 'approved' AND (req.approver_id = me OR public.has_permission('employee.read_private')));
  IF NOT allowed THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF req.status IN ('rejected', 'cancelled') THEN
    RAISE EXCEPTION 'This request is already closed' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO lt FROM public.leave_types WHERE id = req.leave_type_id;

  IF req.status = 'approved' AND lt.is_paid THEN
    INSERT INTO public.leave_ledger_entries(
      company_id, employee_id, leave_type_id, entry_type, amount, effective_date,
      reason, reference_type, reference_id, created_by
    ) VALUES (
      req.company_id, req.employee_id, req.leave_type_id, 'adjustment', req.total_hours, req.start_date,
      left('Leave cancelled: ' || trim(p_reason), 500), 'leave_request', req.id, auth.uid()
    );
  END IF;

  UPDATE public.leave_requests
  SET status = 'cancelled',
      decision_reason = trim(p_reason),
      decided_by = CASE WHEN req.status = 'approved' THEN auth.uid() ELSE decided_by END,
      decided_at = CASE WHEN req.status = 'approved' THEN now() ELSE decided_at END,
      updated_at = now()
  WHERE id = req.id;

  INSERT INTO public.leave_request_events(company_id, leave_request_id, actor_id, action, from_status, to_status, reason)
  VALUES (req.company_id, req.id, auth.uid(), 'cancelled', req.status, 'cancelled', trim(p_reason));

  INSERT INTO public.staff_audit(actor_id, employee_id, action, reason, details)
  VALUES (auth.uid(), req.employee_id, 'leave.cancelled', trim(p_reason),
    jsonb_build_object('request_id', req.id, 'previous_status', req.status));

  INSERT INTO public.notifications(user_id, type, title, message)
  SELECT e.auth_user_id, 'leave', 'Leave request cancelled',
    'A leave request was cancelled: ' || trim(p_reason)
  FROM public.employees e
  WHERE e.id = req.approver_id AND e.auth_user_id IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_leave_balance(
  p_employee_id uuid,
  p_leave_type_id uuid,
  p_amount numeric,
  p_reason text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  company uuid := public.my_company_id();
  result uuid;
BEGIN
  IF NOT public.has_permission('leave.adjust') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount = 0 OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Provide a non-zero adjustment and reason' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_employee_id AND company_id = company) THEN
    RAISE EXCEPTION 'Employee unavailable' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.leave_types WHERE id = p_leave_type_id AND company_id = company) THEN
    RAISE EXCEPTION 'Leave type unavailable' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.employees WHERE id = p_employee_id FOR UPDATE;

  INSERT INTO public.leave_ledger_entries(
    company_id, employee_id, leave_type_id, entry_type, amount, effective_date,
    reason, reference_type, created_by
  ) VALUES (
    company, p_employee_id, p_leave_type_id, 'adjustment', p_amount, current_date,
    trim(p_reason), 'hr_adjustment', auth.uid()
  ) RETURNING id INTO result;

  INSERT INTO public.staff_audit(actor_id, employee_id, action, reason, details)
  VALUES (auth.uid(), p_employee_id, 'leave.balance_adjusted', trim(p_reason),
    jsonb_build_object('leave_type_id', p_leave_type_id, 'amount', p_amount, 'entry_id', result));

  INSERT INTO public.notifications(user_id, type, title, message)
  SELECT e.auth_user_id, 'leave', 'Leave balance updated',
    'HR updated your leave balance: ' || trim(p_reason) || '.'
  FROM public.employees e
  WHERE e.id = p_employee_id AND e.auth_user_id IS NOT NULL;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_leave_attachment(
  p_leave_request_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  req public.leave_requests;
  me uuid := public.current_employee_id();
  result uuid;
BEGIN
  IF me IS NULL OR NOT public.has_permission('time.self') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_storage_path IS NULL OR p_file_name IS NULL OR p_mime_type IS NULL OR p_size_bytes IS NULL OR p_size_bytes <= 0 THEN
    RAISE EXCEPTION 'Invalid attachment metadata' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO req FROM public.leave_requests WHERE id = p_leave_request_id FOR UPDATE;
  IF NOT FOUND OR req.employee_id <> me THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'Attachments can only be added to pending requests' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.leave_request_attachments(
    company_id, leave_request_id, storage_path, file_name, mime_type, size_bytes, uploaded_by
  ) VALUES (
    req.company_id, req.id, trim(p_storage_path), trim(p_file_name), trim(p_mime_type), p_size_bytes, auth.uid()
  ) RETURNING id INTO result;

  INSERT INTO public.leave_request_events(company_id, leave_request_id, actor_id, action, from_status, to_status, reason)
  VALUES (req.company_id, req.id, auth.uid(), 'attachment_added', req.status, req.status, trim(p_file_name));

  INSERT INTO public.staff_audit(actor_id, employee_id, action, reason, details)
  VALUES (auth.uid(), me, 'leave.attachment_added', 'Employee attached leave evidence',
    jsonb_build_object('request_id', req.id, 'attachment_id', result, 'file_name', trim(p_file_name)));

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- HR / admin configuration RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_leave_type(
  p_code text,
  p_name text,
  p_is_paid boolean DEFAULT true,
  p_requires_attachment boolean DEFAULT false,
  p_attachment_after_hours numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  company uuid := public.my_company_id();
  result uuid;
  normalized_code text := lower(trim(p_code));
BEGIN
  IF NOT public.has_permission('leave.policy.manage') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF normalized_code !~ '^[a-z0-9_]{1,40}$' OR p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 100
     OR (p_attachment_after_hours IS NOT NULL AND p_attachment_after_hours <= 0) THEN
    RAISE EXCEPTION 'Provide valid leave type fields' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.leave_types(
    company_id, code, name, unit, is_paid, requires_attachment, attachment_after_hours
  ) VALUES (
    company, normalized_code, trim(p_name), 'hours', COALESCE(p_is_paid, true),
    COALESCE(p_requires_attachment, false), p_attachment_after_hours
  )
  ON CONFLICT(company_id, code) DO UPDATE
  SET name = excluded.name,
      is_paid = excluded.is_paid,
      requires_attachment = excluded.requires_attachment,
      attachment_after_hours = excluded.attachment_after_hours,
      is_active = true,
      updated_at = now()
  RETURNING id INTO result;

  INSERT INTO public.staff_audit(actor_id, action, reason, details)
  VALUES (auth.uid(), 'leave_type.saved', 'HR saved leave type',
    jsonb_build_object('leave_type_id', result, 'code', normalized_code));

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_leave_policy(
  p_leave_type_id uuid,
  p_accrual_method text,
  p_accrual_rate numeric,
  p_max_balance numeric DEFAULT NULL,
  p_carryover_max numeric DEFAULT NULL,
  p_allow_negative boolean DEFAULT false,
  p_effective_from date DEFAULT current_date,
  p_effective_to date DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  company uuid := public.my_company_id();
  result uuid;
BEGIN
  IF NOT public.has_permission('leave.policy.manage') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_accrual_method NOT IN ('manual', 'annual', 'monthly')
     OR p_accrual_rate IS NULL OR p_accrual_rate < 0
     OR (p_max_balance IS NOT NULL AND p_max_balance < 0)
     OR (p_carryover_max IS NOT NULL AND p_carryover_max < 0)
     OR p_effective_from IS NULL
     OR (p_effective_to IS NOT NULL AND p_effective_to < p_effective_from) THEN
    RAISE EXCEPTION 'Provide valid policy fields' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.leave_types WHERE id = p_leave_type_id AND company_id = company) THEN
    RAISE EXCEPTION 'Leave type unavailable' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.leave_policies(
    company_id, leave_type_id, accrual_method, accrual_rate, max_balance,
    carryover_max, allow_negative, effective_from, effective_to
  ) VALUES (
    company, p_leave_type_id, p_accrual_method, p_accrual_rate, p_max_balance,
    p_carryover_max, COALESCE(p_allow_negative, false), p_effective_from, p_effective_to
  )
  ON CONFLICT(company_id, leave_type_id, effective_from) DO UPDATE
  SET accrual_method = excluded.accrual_method,
      accrual_rate = excluded.accrual_rate,
      max_balance = excluded.max_balance,
      carryover_max = excluded.carryover_max,
      allow_negative = excluded.allow_negative,
      effective_to = excluded.effective_to,
      updated_at = now()
  RETURNING id INTO result;

  INSERT INTO public.staff_audit(actor_id, action, reason, details)
  VALUES (auth.uid(), 'leave_policy.saved', 'HR saved leave policy',
    jsonb_build_object('leave_policy_id', result, 'leave_type_id', p_leave_type_id));

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_holiday(
  p_holiday_date date,
  p_name text,
  p_is_paid boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  company uuid := public.my_company_id();
  result uuid;
BEGIN
  IF NOT public.has_permission('holiday.manage') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_holiday_date IS NULL OR p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Provide valid holiday fields' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.holidays(company_id, holiday_date, name, is_paid)
  VALUES (company, p_holiday_date, trim(p_name), COALESCE(p_is_paid, false))
  ON CONFLICT(company_id, holiday_date) DO UPDATE
  SET name = excluded.name, is_paid = excluded.is_paid, updated_at = now()
  RETURNING id INTO result;

  INSERT INTO public.staff_audit(actor_id, action, reason, details)
  VALUES (auth.uid(), 'holiday.saved', 'HR saved holiday',
    jsonb_build_object('holiday_id', result, 'holiday_date', p_holiday_date));

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_shift(
  p_code text,
  p_name text,
  p_start_time time,
  p_end_time time,
  p_break_minutes integer DEFAULT 60
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  company uuid := public.my_company_id();
  result uuid;
  normalized_code text := lower(trim(p_code));
  duration_minutes integer;
BEGIN
  IF NOT public.has_permission('employee.update_employment') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF normalized_code !~ '^[a-z0-9_]{1,40}$' OR p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 100
     OR p_start_time IS NULL OR p_end_time IS NULL
     OR p_break_minutes IS NULL OR p_break_minutes NOT BETWEEN 0 AND 240 THEN
    RAISE EXCEPTION 'Provide valid shift fields' USING ERRCODE = '22023';
  END IF;

  duration_minutes := (
    CASE WHEN p_end_time > p_start_time
      THEN extract(epoch FROM (p_end_time - p_start_time))
      ELSE extract(epoch FROM (p_end_time + interval '24 hours' - p_start_time))
    END / 60.0
  )::integer;
  IF p_break_minutes >= duration_minutes THEN
    RAISE EXCEPTION 'Shift break must be shorter than the shift' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.shifts(company_id, code, name, start_time, end_time, break_minutes)
  VALUES (company, normalized_code, trim(p_name), p_start_time, p_end_time, p_break_minutes)
  ON CONFLICT(company_id, code) DO UPDATE
  SET name = excluded.name, start_time = excluded.start_time, end_time = excluded.end_time,
      break_minutes = excluded.break_minutes, is_active = true, updated_at = now()
  RETURNING id INTO result;

  INSERT INTO public.staff_audit(actor_id, action, reason, details)
  VALUES (auth.uid(), 'shift.saved', 'HR saved shift',
    jsonb_build_object('shift_id', result, 'code', normalized_code));

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_shift(
  p_employee_id uuid,
  p_shift_id uuid,
  p_effective_from date,
  p_effective_to date DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  company uuid := public.my_company_id();
  result uuid;
BEGIN
  IF NOT public.has_permission('employee.update_employment') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_effective_from IS NULL OR (p_effective_to IS NOT NULL AND p_effective_to < p_effective_from) THEN
    RAISE EXCEPTION 'Choose valid effective dates' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_employee_id AND company_id = company) THEN
    RAISE EXCEPTION 'Employee unavailable' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shifts WHERE id = p_shift_id AND company_id = company AND is_active) THEN
    RAISE EXCEPTION 'Shift unavailable' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.employees WHERE id = p_employee_id FOR UPDATE;
  IF EXISTS (
    SELECT 1 FROM public.employee_shifts
    WHERE employee_id = p_employee_id
      AND effective_from <= COALESCE(p_effective_to, '9999-12-31'::date)
      AND p_effective_from <= COALESCE(effective_to, '9999-12-31'::date)
  ) THEN
    RAISE EXCEPTION 'Shift assignments cannot overlap' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.employee_shifts(company_id, employee_id, shift_id, effective_from, effective_to)
  VALUES (company, p_employee_id, p_shift_id, p_effective_from, p_effective_to)
  RETURNING id INTO result;

  INSERT INTO public.staff_audit(actor_id, employee_id, action, reason, details)
  VALUES (auth.uid(), p_employee_id, 'shift.assigned', 'HR assigned shift',
    jsonb_build_object('assignment_id', result, 'shift_id', p_shift_id,
      'effective_from', p_effective_from, 'effective_to', p_effective_to));

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_fallback_leave_approver(p_employee_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  company uuid := public.my_company_id();
BEGIN
  IF NOT (public.has_permission('role.assign') OR public.has_permission('leave.policy.manage')) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_employee_id AND company_id = company AND employment_status = 'active') THEN
    RAISE EXCEPTION 'Choose an active employee in this company' USING ERRCODE = '22023';
  END IF;

  UPDATE public.companies SET fallback_leave_approver_id = p_employee_id WHERE id = company;
  INSERT INTO public.staff_audit(actor_id, employee_id, action, reason, details)
  VALUES (auth.uid(), p_employee_id, 'leave.fallback_approver_set', 'Admin configured fallback approver',
    jsonb_build_object('fallback_approver_id', p_employee_id));
END;
$$;

-- ---------------------------------------------------------------------------
-- Seed defaults: leave types, policies, a fallback approver and opening paid
-- balances. These are one-time seeds and remain editable by HR afterwards.
-- ---------------------------------------------------------------------------
INSERT INTO public.leave_types(company_id, code, name, unit, is_paid)
SELECT c.id, v.code, v.name, 'hours', v.is_paid
FROM public.companies c
CROSS JOIN (VALUES
  ('annual', 'Annual Leave', true),
  ('sick', 'Sick Leave', true),
  ('bereavement', 'Bereavement Leave', true),
  ('maternity', 'Maternity Leave', false),
  ('paternity', 'Paternity Leave', false),
  ('lwop', 'Leave without Pay', false)
) AS v(code, name, is_paid)
ON CONFLICT(company_id, code) DO NOTHING;

INSERT INTO public.leave_policies(
  company_id, leave_type_id, accrual_method, accrual_rate, max_balance,
  carryover_max, allow_negative, effective_from
)
SELECT c.id, lt.id, 'manual', 0,
  CASE lt.code WHEN 'annual' THEN 120 WHEN 'sick' THEN 80 WHEN 'bereavement' THEN 24 ELSE NULL END,
  CASE lt.code WHEN 'annual' THEN 40 ELSE 0 END,
  NOT lt.is_paid,
  date_trunc('year', current_date)::date
FROM public.companies c
JOIN public.leave_types lt ON lt.company_id = c.id
WHERE lt.code IN ('annual', 'sick', 'bereavement', 'maternity', 'paternity', 'lwop')
ON CONFLICT(company_id, leave_type_id, effective_from) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rbac_private.migration_state WHERE step = '010_fallback_approver_default') THEN
    UPDATE public.companies c
    SET fallback_leave_approver_id = (
      SELECT e.id
      FROM public.employees e
      JOIN public.user_roles ur ON ur.user_id = e.auth_user_id
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      WHERE e.company_id = c.id
        AND rp.permission_code = 'role.assign'
        AND e.employment_status = 'active'
      ORDER BY e.created_at, e.id
      LIMIT 1
    )
    WHERE c.fallback_leave_approver_id IS NULL;
    INSERT INTO rbac_private.migration_state(step) VALUES ('010_fallback_approver_default');
  END IF;
END $$;

DO $$
DECLARE
  c record;
  lt record;
  e record;
  opening numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rbac_private.migration_state WHERE step = '010_opening_leave_balances') THEN
    FOR c IN SELECT id FROM public.companies LOOP
      FOR lt IN SELECT id, code FROM public.leave_types
                WHERE company_id = c.id AND code IN ('annual', 'sick', 'bereavement') LOOP
        opening := CASE lt.code WHEN 'annual' THEN 120 WHEN 'sick' THEN 80 WHEN 'bereavement' THEN 24 END;
        FOR e IN SELECT id FROM public.employees
                 WHERE company_id = c.id AND employment_status = 'active'
                   AND NOT EXISTS (
                     SELECT 1 FROM public.leave_ledger_entries l
                     WHERE l.employee_id = employees.id AND l.leave_type_id = lt.id
                   ) LOOP
          INSERT INTO public.leave_ledger_entries(
            company_id, employee_id, leave_type_id, entry_type, amount, effective_date, reason
          ) VALUES (
            c.id, e.id, lt.id, 'accrual', opening, date_trunc('year', current_date)::date,
            'Opening balance seeded by migration 010'
          );
        END LOOP;
      END LOOP;
    END LOOP;
    INSERT INTO rbac_private.migration_state(step) VALUES ('010_opening_leave_balances');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- RLS. All browser writes are revoked; authenticated users get SELECT only.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'shifts', 'employee_shifts', 'attendance_events', 'attendance_correction_requests',
    'leave_types', 'leave_policies', 'leave_ledger_entries', 'leave_requests',
    'leave_request_days', 'leave_request_attachments', 'leave_request_events', 'holidays'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

GRANT SELECT ON public.shifts, public.employee_shifts, public.attendance_events,
  public.attendance_correction_requests, public.leave_types, public.leave_policies,
  public.leave_ledger_entries, public.leave_requests, public.leave_request_days,
  public.leave_request_attachments, public.leave_request_events, public.holidays
TO authenticated;

DROP POLICY IF EXISTS shifts_read ON public.shifts;
CREATE POLICY shifts_read ON public.shifts FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

DROP POLICY IF EXISTS employee_shifts_read ON public.employee_shifts;
CREATE POLICY employee_shifts_read ON public.employee_shifts FOR SELECT TO authenticated
  USING (public.can_read_employee_shift(employee_id));

DROP POLICY IF EXISTS attendance_events_read ON public.attendance_events;
CREATE POLICY attendance_events_read ON public.attendance_events FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_review_attendance(employee_id));

DROP POLICY IF EXISTS attendance_corrections_read ON public.attendance_correction_requests;
CREATE POLICY attendance_corrections_read ON public.attendance_correction_requests FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.can_review_attendance(employee_id));

DROP POLICY IF EXISTS leave_types_read ON public.leave_types;
CREATE POLICY leave_types_read ON public.leave_types FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

DROP POLICY IF EXISTS leave_policies_read ON public.leave_policies;
CREATE POLICY leave_policies_read ON public.leave_policies FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

DROP POLICY IF EXISTS leave_ledger_read ON public.leave_ledger_entries;
CREATE POLICY leave_ledger_read ON public.leave_ledger_entries FOR SELECT TO authenticated
  USING (public.can_read_leave_ledger(employee_id));

DROP POLICY IF EXISTS leave_requests_read ON public.leave_requests;
CREATE POLICY leave_requests_read ON public.leave_requests FOR SELECT TO authenticated
  USING (public.can_read_leave_request(id));

DROP POLICY IF EXISTS leave_request_days_read ON public.leave_request_days;
CREATE POLICY leave_request_days_read ON public.leave_request_days FOR SELECT TO authenticated
  USING (public.can_read_leave_request(leave_request_id));

DROP POLICY IF EXISTS leave_attachments_read ON public.leave_request_attachments;
CREATE POLICY leave_attachments_read ON public.leave_request_attachments FOR SELECT TO authenticated
  USING (public.can_read_leave_request(leave_request_id));

DROP POLICY IF EXISTS leave_events_read ON public.leave_request_events;
CREATE POLICY leave_events_read ON public.leave_request_events FOR SELECT TO authenticated
  USING (public.can_read_leave_request(leave_request_id));

DROP POLICY IF EXISTS holidays_read ON public.holidays;
CREATE POLICY holidays_read ON public.holidays FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

-- ---------------------------------------------------------------------------
-- Function grants
-- ---------------------------------------------------------------------------
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'current_employee_id', 'my_company_id', 'is_my_direct_report',
        'can_read_hr_employee', 'can_review_attendance', 'can_read_leave_request',
        'can_read_leave_ledger', 'can_read_employee_shift',
        'my_attendance', 'team_attendance', 'leave_catalog', 'my_leave_balances',
        'employee_leave_balances', 'my_leave_requests', 'pending_leave_approvals',
        'staff_leave_requests', 'team_leave_calendar', 'clock_attendance',
        'request_attendance_correction', 'review_attendance_correction',
        'create_leave_request', 'decide_leave_request', 'cancel_leave_request',
        'adjust_leave_balance', 'add_leave_attachment', 'save_leave_type',
        'save_leave_policy', 'save_holiday', 'save_shift', 'assign_shift',
        'set_fallback_leave_approver'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.signature);
  END LOOP;
END $$;

-- Internal helper: only used by SECURITY DEFINER functions above.
REVOKE ALL ON FUNCTION public.attendance_business_date(uuid, timestamptz) FROM PUBLIC, anon, authenticated;

COMMIT;
