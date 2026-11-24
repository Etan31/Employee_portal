BEGIN;

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Manila', active boolean NOT NULL DEFAULT true
);
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100), UNIQUE(company_id, name), UNIQUE(id, company_id)
);
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies,
  auth_user_id uuid UNIQUE REFERENCES public.profiles(id), employee_no text NOT NULL,
  first_name text NOT NULL, last_name text NOT NULL, work_email text NOT NULL,
  department_id uuid, manager_id uuid, job_title text, hire_date date,
  employment_status text NOT NULL DEFAULT 'pending_onboarding' CHECK (employment_status IN ('pending_onboarding','active','suspended','terminated')),
  account_status text NOT NULL DEFAULT 'invited' CHECK (account_status IN ('invited','active','suspended','deactivated')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_no), UNIQUE(id, company_id), CHECK(manager_id IS DISTINCT FROM id),
  FOREIGN KEY(department_id, company_id) REFERENCES public.departments(id, company_id),
  FOREIGN KEY(manager_id, company_id) REFERENCES public.employees(id, company_id)
);
CREATE UNIQUE INDEX employees_email_unique ON public.employees(lower(work_email));
CREATE INDEX employees_company_idx ON public.employees(company_id);
CREATE INDEX employees_manager_idx ON public.employees(manager_id);
CREATE INDEX employees_department_idx ON public.employees(department_id);
CREATE TABLE public.employee_private (
  employee_id uuid PRIMARY KEY REFERENCES public.employees(id), personal_email text,
  personal_phone text, emergency_contact text
);
CREATE TABLE public.staff_invitations (
  employee_id uuid PRIMARY KEY REFERENCES public.employees(id),
  state text NOT NULL DEFAULT 'requested' CHECK(state IN ('requested','sending','sent','accepted','cancelled')),
  requested_by uuid NOT NULL REFERENCES public.profiles(id), requested_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid REFERENCES public.profiles(id), sent_at timestamptz, accepted_at timestamptz,
  attempt_id uuid, lease_until timestamptz, expires_at timestamptz
);
CREATE TABLE public.staff_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid,
  employee_id uuid REFERENCES public.employees(id), action text NOT NULL, reason text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_audit_employee_idx ON public.staff_audit(employee_id, occurred_at DESC);
CREATE TABLE public.identity_sync_jobs (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id), revision uuid NOT NULL DEFAULT gen_random_uuid(),
  requested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_roles ADD COLUMN starts_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.user_roles ADD COLUMN ends_at timestamptz;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_effective_dates CHECK(ends_at IS NULL OR ends_at > starts_at);

-- Preserve known identities without inventing reporting, department or employment dates.
INSERT INTO public.companies(id,name) VALUES ('10000000-0000-0000-0000-000000000001','Nexus');
INSERT INTO public.employees(company_id,auth_user_id,employee_no,first_name,last_name,work_email,employment_status,account_status)
SELECT '10000000-0000-0000-0000-000000000001', id, id::text, COALESCE(first_name,''), COALESCE(last_name,''), email,
  CASE WHEN is_active THEN 'active' ELSE 'suspended' END, CASE WHEN is_active THEN 'active' ELSE 'suspended' END
FROM public.profiles;

CREATE FUNCTION rbac_private.company_of(subject uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT company_id FROM public.employees WHERE auth_user_id = subject;
$$;
CREATE FUNCTION rbac_private.eligible(subject uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.employees e JOIN public.companies c ON c.id=e.company_id
    JOIN public.profiles p ON p.id=e.auth_user_id WHERE p.id=subject AND p.is_active
    AND c.active AND e.employment_status='active' AND e.account_status='active');
$$;
CREATE OR REPLACE FUNCTION rbac_private.has_permission(subject uuid, capability text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT rbac_private.eligible(subject) AND EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.role_permissions rp ON rp.role_id=ur.role_id
    WHERE ur.user_id=subject AND rp.permission_code=capability AND ur.starts_at <= now() AND (ur.ends_at IS NULL OR ur.ends_at > now())
  );
$$;
CREATE OR REPLACE FUNCTION public.get_access_context(subject uuid DEFAULT auth.uid()) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF subject IS NULL OR (subject IS DISTINCT FROM auth.uid() AND auth.role() IS DISTINCT FROM 'service_role') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE='42501';
  END IF;
  IF NOT rbac_private.eligible(subject) THEN
    RETURN jsonb_build_object('active',false,'roles','[]'::jsonb,'permissions','[]'::jsonb,
      'onboarding',EXISTS(SELECT 1 FROM public.employees e JOIN public.staff_invitations i ON i.employee_id=e.id
        WHERE e.auth_user_id=subject AND e.employment_status='pending_onboarding' AND e.account_status='invited' AND i.state='sent'));
  END IF;
  RETURN (SELECT jsonb_build_object('active',true,'profile',jsonb_build_object('id',p.id,'email',p.email,
    'first_name',p.first_name,'last_name',p.last_name,'avatar_url',p.avatar_url),
    'roles',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'code',r.code,'name',r.name))
      FROM public.user_roles ur JOIN public.roles r ON r.id=ur.role_id WHERE ur.user_id=subject
      AND ur.starts_at<=now() AND (ur.ends_at IS NULL OR ur.ends_at>now())),'[]'::jsonb),
    'permissions',COALESCE((SELECT jsonb_agg(code) FROM public.permissions WHERE rbac_private.has_permission(subject,code)),'[]'::jsonb))
    FROM public.profiles p WHERE p.id=subject);
END; $$;

INSERT INTO public.permissions(code) VALUES ('account.invite'),('account.deactivate');
INSERT INTO public.role_permissions SELECT id,p FROM public.roles CROSS JOIN unnest(ARRAY['account.invite','account.deactivate']) p WHERE code='admin';

CREATE FUNCTION public.staff_directory(team_only boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_permission('directory.read') OR (team_only AND NOT public.has_permission('team.read')) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE='42501';
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'first_name',e.first_name,'last_name',e.last_name,
    'work_email',e.work_email,'job_title',e.job_title,'department',d.name,'manager_id',e.manager_id,
    'manager_name',concat_ws(' ',m.first_name,m.last_name)) ORDER BY e.last_name,e.first_name)
    FROM public.employees e LEFT JOIN public.departments d ON d.id=e.department_id LEFT JOIN public.employees m ON m.id=e.manager_id
    WHERE e.company_id=rbac_private.company_of(auth.uid()) AND e.employment_status='active'
    AND (NOT team_only OR m.auth_user_id=auth.uid())),'[]'::jsonb);
END; $$;
CREATE FUNCTION public.my_staff_record() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_permission('profile.self') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  RETURN (SELECT to_jsonb(e) || jsonb_build_object('department',d.name,'company',c.name,'timezone',c.timezone,
    'manager_name',concat_ws(' ',m.first_name,m.last_name)) FROM public.employees e
    JOIN public.companies c ON c.id=e.company_id LEFT JOIN public.departments d ON d.id=e.department_id
    LEFT JOIN public.employees m ON m.id=e.manager_id WHERE e.auth_user_id=auth.uid());
END; $$;

CREATE FUNCTION public.staff_administration() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE hr boolean := public.has_permission('employee.update_employment');
BEGIN
  IF NOT hr AND NOT public.has_permission('account.invite') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('employees',COALESCE((SELECT jsonb_agg(
    CASE WHEN hr THEN to_jsonb(e) ELSE jsonb_build_object('id',e.id,'work_email',e.work_email,'first_name',e.first_name,
      'last_name',e.last_name,'auth_user_id',e.auth_user_id,'account_status',e.account_status) END
    || jsonb_build_object('invitation_state',i.state) ORDER BY e.created_at DESC)
    FROM public.employees e LEFT JOIN public.staff_invitations i ON i.employee_id=e.id
    WHERE e.company_id=rbac_private.company_of(auth.uid())),'[]'::jsonb),
    'departments',COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY name) FROM public.departments d WHERE company_id=rbac_private.company_of(auth.uid())),'[]'::jsonb));
END; $$;

CREATE FUNCTION public.save_staff_record(record_id uuid, fields jsonb, change_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE company uuid := rbac_private.company_of(auth.uid()); result uuid; manager uuid; department uuid; previous_org jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(761042);
  IF NOT public.has_permission('employee.update_employment') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  IF change_reason IS NULL OR length(trim(change_reason)) NOT BETWEEN 3 AND 500 OR jsonb_typeof(fields) IS DISTINCT FROM 'object'
    OR EXISTS(SELECT 1 FROM jsonb_object_keys(fields) k WHERE k NOT IN ('employee_no','first_name','last_name','work_email','department_id','manager_id','job_title','hire_date'))
    OR EXISTS(SELECT 1 FROM unnest(ARRAY['employee_no','first_name','last_name','work_email','job_title','hire_date']) k
      WHERE length(trim(COALESCE(fields->>k,''))) NOT BETWEEN 1 AND 150)
    OR fields->>'work_email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Provide valid staff fields and a reason' USING ERRCODE='22023';
  END IF;
  manager := nullif(fields->>'manager_id','')::uuid; department := nullif(fields->>'department_id','')::uuid;
  IF department IS NULL OR NOT EXISTS(SELECT 1 FROM public.departments WHERE id=department AND company_id=company) THEN
    RAISE EXCEPTION 'Choose a company department' USING ERRCODE='22023'; END IF;
  IF manager IS NOT NULL AND (manager=record_id OR NOT EXISTS(SELECT 1 FROM public.employees WHERE id=manager AND company_id=company AND employment_status='active')) THEN
    RAISE EXCEPTION 'Choose an active manager in this company' USING ERRCODE='22023'; END IF;
  IF EXISTS(WITH RECURSIVE chain AS (SELECT id,manager_id FROM public.employees WHERE id=manager
    UNION SELECT e.id,e.manager_id FROM public.employees e JOIN chain c ON e.id=c.manager_id) SELECT 1 FROM chain WHERE id=record_id) THEN
    RAISE EXCEPTION 'Reporting relationships cannot form a cycle' USING ERRCODE='22023'; END IF;
  IF record_id IS NULL THEN
    INSERT INTO public.employees(company_id,employee_no,first_name,last_name,work_email,department_id,manager_id,job_title,hire_date)
    VALUES(company,trim(fields->>'employee_no'),trim(fields->>'first_name'),trim(fields->>'last_name'),lower(trim(fields->>'work_email')),
      department,manager,trim(fields->>'job_title'),(fields->>'hire_date')::date) RETURNING id INTO result;
  ELSE
    IF NOT EXISTS(SELECT 1 FROM public.employees WHERE id=record_id AND company_id=company AND lower(work_email)=lower(trim(fields->>'work_email'))) THEN
      RAISE EXCEPTION 'Record unavailable or work email changed; email changes require identity reconciliation' USING ERRCODE='22023'; END IF;
    SELECT jsonb_build_object('department_id',department_id,'manager_id',manager_id) INTO previous_org
      FROM public.employees WHERE id=record_id AND company_id=company;
    UPDATE public.employees SET employee_no=trim(fields->>'employee_no'),first_name=trim(fields->>'first_name'),last_name=trim(fields->>'last_name'),
      department_id=department,manager_id=manager,job_title=trim(fields->>'job_title'),hire_date=(fields->>'hire_date')::date,updated_at=now()
      WHERE id=record_id AND company_id=company RETURNING id INTO result;
  END IF;
  INSERT INTO public.staff_audit(actor_id,employee_id,action,reason,details) VALUES(auth.uid(),result,'staff.saved',trim(change_reason),
    jsonb_build_object('before',previous_org,'after',jsonb_build_object('department_id',department,'manager_id',manager)));
  RETURN result;
END; $$;
CREATE FUNCTION public.create_department(department_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result uuid;
BEGIN
  IF NOT public.has_permission('employee.update_employment') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  INSERT INTO public.departments(company_id,name) VALUES(rbac_private.company_of(auth.uid()),trim(department_name)) RETURNING id INTO result;
  INSERT INTO public.staff_audit(actor_id,action,reason,details) VALUES(auth.uid(),'department.created','HR created department',jsonb_build_object('id',result));
  RETURN result;
END; $$;

CREATE FUNCTION public.request_staff_invitation(staff_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_permission('employee.update_employment') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.employees WHERE id=staff_id AND company_id=rbac_private.company_of(auth.uid())
    AND employment_status='pending_onboarding' AND auth_user_id IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff is not awaiting provisioning' USING ERRCODE='22023'; END IF;
  INSERT INTO public.staff_invitations(employee_id,requested_by) VALUES(staff_id,auth.uid()) ON CONFLICT DO NOTHING;
  INSERT INTO public.staff_audit(actor_id,employee_id,action,reason) VALUES(auth.uid(),staff_id,'invitation.requested','HR requested account provisioning');
END; $$;

-- The attempt UUID is a server lease identifier, not an invitation credential.
CREATE FUNCTION public.claim_staff_invitation(actor uuid, staff_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE invitation public.staff_invitations; staff public.employees; recovery_user uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR NOT rbac_private.has_permission(actor,'account.invite') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO staff FROM public.employees WHERE id=staff_id AND company_id=rbac_private.company_of(actor)
    AND employment_status='pending_onboarding' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff is not awaiting provisioning' USING ERRCODE='22023'; END IF;
  SELECT u.id INTO recovery_user FROM auth.users u JOIN public.staff_invitations i ON i.employee_id=staff_id
    WHERE lower(u.email)=lower(staff.work_email) AND u.invited_at>=i.requested_at AND i.state IN ('requested','sending')
      AND NOT EXISTS(SELECT 1 FROM public.employees e WHERE e.auth_user_id=u.id AND e.id<>staff_id);
  UPDATE public.staff_invitations SET state='sending',attempt_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',sent_by=actor
    WHERE employee_id=staff_id AND (state IN ('requested','sent') OR (state='sending' AND lease_until<now()))
      AND (sent_at IS NULL OR sent_at<now()-interval '1 minute') RETURNING * INTO invitation;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable or delivery already in progress' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('email',staff.work_email,'attempt_id',invitation.attempt_id,'recovery_user_id',recovery_user);
END; $$;
CREATE FUNCTION public.finish_staff_invitation(actor uuid, staff_id uuid, attempt uuid, invited_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE staff public.employees;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR NOT rbac_private.has_permission(actor,'account.invite') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO staff FROM public.employees WHERE id=staff_id AND company_id=rbac_private.company_of(actor)
    AND employment_status='pending_onboarding' FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.staff_invitations WHERE employee_id=staff_id AND state='sending' AND attempt_id=attempt AND sent_by=actor) THEN
    RAISE EXCEPTION 'Provisioning attempt no longer valid' USING ERRCODE='22023'; END IF;
  IF invited_user IS NULL THEN
    UPDATE public.staff_invitations SET state='requested',lease_until=NULL WHERE employee_id=staff_id;
    INSERT INTO public.staff_audit(actor_id,employee_id,action,reason) VALUES(actor,staff_id,'invitation.failed','Delivery failed; retry required');
    RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=invited_user AND lower(email)=lower(staff.work_email))
    OR (staff.auth_user_id IS NOT NULL AND staff.auth_user_id<>invited_user) THEN
    RAISE EXCEPTION 'Invitation identity mismatch' USING ERRCODE='22023'; END IF;
  UPDATE public.employees SET auth_user_id=invited_user,updated_at=now() WHERE id=staff_id;
  UPDATE public.profiles SET is_active=false,first_name=staff.first_name,last_name=staff.last_name WHERE id=invited_user;
  INSERT INTO public.user_roles(user_id,role_id,granted_by) SELECT invited_user,id,actor FROM public.roles WHERE code='employee' ON CONFLICT DO NOTHING;
  UPDATE public.staff_invitations SET state='sent',sent_at=now(),expires_at=now()+interval '7 days',lease_until=NULL WHERE employee_id=staff_id;
  INSERT INTO public.staff_audit(actor_id,employee_id,action,reason) VALUES(actor,staff_id,'invitation.sent','Identity linked; awaiting verified onboarding');
END; $$;
CREATE FUNCTION public.accept_staff_invitation() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE staff public.employees;
BEGIN
  SELECT * INTO staff FROM public.employees WHERE auth_user_id=auth.uid() FOR UPDATE;
  IF staff.id IS NULL OR staff.employment_status<>'pending_onboarding' OR staff.account_status<>'invited'
    OR NOT EXISTS(SELECT 1 FROM public.companies WHERE id=staff.company_id AND active)
    OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL AND lower(email)=lower(staff.work_email))
    OR NOT EXISTS(SELECT 1 FROM public.staff_invitations WHERE employee_id=staff.id AND state='sent' AND expires_at>now()) THEN
    RAISE EXCEPTION 'A verified, current staff invitation is required' USING ERRCODE='42501'; END IF;
  UPDATE public.employees SET employment_status='active',account_status='active',updated_at=now() WHERE id=staff.id;
  UPDATE public.profiles SET is_active=true WHERE id=auth.uid();
  UPDATE public.staff_invitations SET state='accepted',accepted_at=now() WHERE employee_id=staff.id;
  INSERT INTO public.staff_audit(actor_id,employee_id,action,reason) VALUES(auth.uid(),staff.id,'invitation.accepted','Verified staff completed account onboarding');
END; $$;

CREATE FUNCTION public.set_staff_access(staff_id uuid, new_status text, change_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE staff public.employees;
BEGIN
  PERFORM pg_advisory_xact_lock(761042);
  IF NOT public.has_permission('account.deactivate') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  IF new_status NOT IN ('suspended','active','deactivated') OR new_status IS NULL OR change_reason IS NULL OR length(trim(change_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Valid status and reason required' USING ERRCODE='22023'; END IF;
  SELECT * INTO staff FROM public.employees WHERE id=staff_id AND company_id=rbac_private.company_of(auth.uid()) FOR UPDATE;
  IF NOT FOUND OR staff.auth_user_id=auth.uid() OR staff.account_status='deactivated'
    OR (staff.account_status='invited' AND new_status<>'deactivated')
    OR (new_status='active' AND staff.account_status<>'suspended') THEN
    RAISE EXCEPTION 'Invalid account transition; self suspension and terminated reactivation are forbidden' USING ERRCODE='22023'; END IF;
  IF staff.auth_user_id IS NOT NULL THEN
    IF new_status<>'active' AND rbac_private.has_permission(staff.auth_user_id,'role.assign') AND NOT EXISTS(
      SELECT 1 FROM public.employees e WHERE e.company_id=staff.company_id AND e.id<>staff.id
        AND rbac_private.has_permission(e.auth_user_id,'role.assign')) THEN
      RAISE EXCEPTION 'Keep at least one active role administrator in this company' USING ERRCODE='22023'; END IF;
    UPDATE public.profiles SET is_active=(new_status='active') WHERE id=staff.auth_user_id;
    INSERT INTO public.identity_sync_jobs(user_id) VALUES(staff.auth_user_id)
      ON CONFLICT(user_id) DO UPDATE SET revision=gen_random_uuid(),requested_at=now();
  END IF;
  UPDATE public.employees SET account_status=new_status,employment_status=CASE new_status WHEN 'deactivated' THEN 'terminated' ELSE new_status END,updated_at=now() WHERE id=staff_id;
  IF new_status='deactivated' THEN
    DELETE FROM public.user_roles WHERE user_id=staff.auth_user_id;
    UPDATE public.staff_invitations SET state='cancelled' WHERE employee_id=staff_id AND state<>'accepted';
  END IF;
  INSERT INTO public.staff_audit(actor_id,employee_id,action,reason,details) VALUES(auth.uid(),staff_id,'account.'||new_status,trim(change_reason),jsonb_build_object('previous_status',staff.account_status));
END; $$;

-- Exposed tables have no browser writes; transactions above own every sensitive mutation.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['companies','departments','employees','employee_private','staff_invitations','staff_audit','identity_sync_jobs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
END $$;
GRANT SELECT ON public.employee_private TO authenticated;
CREATE POLICY private_hr_only ON public.employee_private FOR SELECT TO authenticated USING (
  public.has_permission('employee.read_private') AND EXISTS(SELECT 1 FROM public.employees e
    WHERE e.id=employee_id AND e.company_id=rbac_private.company_of(auth.uid()))
);
-- Private table policy calls a definer predicate to avoid granting the underlying staff table.
CREATE FUNCTION public.can_read_private_staff(staff_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_permission('employee.read_private') AND EXISTS(SELECT 1 FROM public.employees
    WHERE id=staff_id AND company_id=rbac_private.company_of(auth.uid()));
$$;
DROP POLICY private_hr_only ON public.employee_private;
CREATE POLICY private_hr_only ON public.employee_private FOR SELECT TO authenticated USING(public.can_read_private_staff(employee_id));

DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('staff_directory','my_staff_record','staff_administration','save_staff_record',
      'create_department','request_staff_invitation','accept_staff_invitation','set_staff_access','can_read_private_staff') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.claim_staff_invitation(uuid,uuid),public.finish_staff_invitation(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_staff_invitation(uuid,uuid),public.finish_staff_invitation(uuid,uuid,uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION rbac_private.company_of(uuid),rbac_private.eligible(uuid) FROM PUBLIC,anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.staff_audit_id_seq TO service_role;

-- Reuse the existing serialized/audited grant writer behind a company boundary.
ALTER FUNCTION public.set_user_roles(uuid,bigint[],text) RENAME TO set_user_roles_unscoped;
REVOKE ALL ON FUNCTION public.set_user_roles_unscoped(uuid,bigint[],text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.set_user_roles(target_user uuid, assigned_roles bigint[], grant_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_permission('role.assign') OR rbac_private.company_of(target_user) IS DISTINCT FROM rbac_private.company_of(auth.uid())
    OR NOT EXISTS(SELECT 1 FROM public.employees WHERE auth_user_id=target_user AND account_status<>'deactivated') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  PERFORM public.set_user_roles_unscoped(target_user,assigned_roles,grant_reason);
  IF NOT EXISTS(SELECT 1 FROM public.employees e WHERE e.company_id=rbac_private.company_of(auth.uid())
    AND rbac_private.has_permission(e.auth_user_id,'role.assign')) THEN
    RAISE EXCEPTION 'Keep at least one active role administrator in this company' USING ERRCODE='22023'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.set_user_roles(uuid,bigint[],text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_user_roles(uuid,bigint[],text) TO authenticated;
ALTER FUNCTION public.get_role_administration() RENAME TO get_role_administration_unscoped;
REVOKE ALL ON FUNCTION public.get_role_administration_unscoped() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.get_role_administration() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  result := public.get_role_administration_unscoped();
  RETURN jsonb_set(result,'{accounts}',COALESCE((SELECT jsonb_agg(a) FROM jsonb_array_elements(result->'accounts') a
    WHERE rbac_private.company_of((a->>'id')::uuid)=rbac_private.company_of(auth.uid())),'[]'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.get_role_administration() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_role_administration() TO authenticated;
CREATE FUNCTION public.get_staff_audit() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_permission('audit.read_security') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM (SELECT s.* FROM public.staff_audit s
    LEFT JOIN public.employees e ON e.id=s.employee_id WHERE COALESCE(e.company_id,rbac_private.company_of(s.actor_id))=rbac_private.company_of(auth.uid())
    ORDER BY s.occurred_at DESC,s.id DESC LIMIT 100) a),'[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.get_staff_audit() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_audit() TO authenticated;
CREATE OR REPLACE FUNCTION public.get_access_audit() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_permission('audit.read_security') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM (SELECT s.* FROM public.access_audit s
    WHERE rbac_private.company_of(s.target_user_id)=rbac_private.company_of(auth.uid())
    ORDER BY s.occurred_at DESC,s.id DESC LIMIT 100) a),'[]'::jsonb);
END; $$;
REVOKE UPDATE,DELETE,TRUNCATE ON public.staff_audit,public.access_audit FROM service_role;
COMMIT;
