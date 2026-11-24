# Identity foundation — migration 008

## Status and scope

The application implementation covers the identity slice for all five personas. It is
not a claim that the whole blueprint, or production deployment, is complete. Existing
attendance, leave, task, helpdesk, policy and dashboard widgets still include sample data.
Do not use those modules as operational records yet. Mood collection was removed per ADR-008.

Phase 1 previously lacked actual staff/company records, a directory backed by protected
data, reporting scopes, provisioning/acceptance and lifecycle enforcement. Migration 008
and the corresponding screens implement those foundations. Roles and permission grants
from 006/007 are preserved. System administrators never receive private HR access implicitly.

## Deploy in order

1. Back up the database and test against staging. Apply **006**, **007**, then
   `supabase/migrations/008_identity_foundation.sql` once. On an empty project first use
   `supabase/bootstrap.sql`; do not also apply historical v1/v2 schemas.
   Migration 008 is atomic, intentionally rejects conflicting existing tables, and is not
   a repeatable seed script. Record it in your migration runner before deploying the app.
2. Review the migrated company membership. Existing profiles become staff in Nexus with
   their original active/inactive state. Unknown departments, job titles, manager and
   hire dates are not fabricated. HR must complete those records. Review inactive legacy
   identities before granting restored access. The initial timezone is **Asia/Manila**;
   confirm it before attendance calculations. Configure additional companies through a
   reviewed migration; company switching is not a public operation.
3. In Supabase Auth, disable **Allow new users to sign up**, enable email confirmation,
   configure production SMTP and allowlist the exact portal redirect URL. Set
   `INVITATION_REDIRECT_URL` on the Express/Vercel server (HTTPS in production).
   The URL should be the portal root. Supabase consumes its Auth callback before the
   access resolver sends the invited user to `#/accept-invitation`.
4. Deploy API and frontend together after the migration. Development Vite proxies `/api`
   to port 3000. Production `/api/protected/invitations/:staffId/send` must reach Express.
5. Run `pnpm sync:identity` from a **single scheduled worker**, at least once per minute.
   It needs the server environment. Jobs are created transactionally for suspension,
   restoration and deactivation; failed Auth operations remain queued. Monitor nonzero
   exits and old jobs. Do not run overlapping workers. This script is supplied but no
   hosting schedule is created by this change.
6. Exercise real email acceptance in staging, all five roles, an unrelated manager,
   an inactive account, and a multi-role account. No real users/emails are created by
   the automated tests. Verify Auth callback handling and SMTP before inviting staff.

Supabase owns invitation credentials and email verification. Application tables store no
invitation token. See [Auth invitations](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail),
[Auth configuration](https://supabase.com/docs/guides/auth/general-configuration) and
[redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Operating flow

- HR: open Employee Lifecycle; create a department if needed; add staff number, legal/work
  name, work email, job title, start date and reporting manager; save with a reason.
  A top-level staff member may have no manager. Request the account from the staff row.
- Administrator: open Accounts and send the requested invitation. Default Employee is
  assigned during validated linking. Any additional approved roles are assigned in
  Roles & Permissions and audited separately. Queue membership is a Phase 4 workflow;
  a Support Agent role alone must never authorize all future tickets.
- Invitee: open the email, set credentials and confirm account ownership. Acceptance
  requires a matching verified Auth email, a linked pending employee, an active company
  and an unexpired sent invitation. The app invitation expires after seven days; Supabase
  email-link expiry is separately configured. Password policy is also enforced by Auth.
- Transfers: HR edits reporting/department with a reason. Team reads resolve the current
  manager each time. Self-reporting and reporting cycles are rejected.
- Suspension: administrators provide a reason. Database/API/RLS access stops immediately,
  including old JWTs. The queued worker bans new Auth login; restoration queues unbanning.
  Existing JWTs are not assumed revoked by an Auth ban.
- Deactivation: ends employment eligibility, removes roles and cancels outstanding
  invitations. Audit records remain. Rehire is deliberately not a one-click reactivation;
  it needs a reviewed lifecycle workflow. Task/ticket reassignment will be added when
  those business records exist in Phases 3–4.

Delivery uses a two-minute database lease and a one-minute resend interval. Provider
failure resets the request for retry. If delivery succeeds but linking fails, access stays
blocked. Retry after the lease expires reconciles a matching Auth identity only if it was
invited after the HR request and is not linked to another staff record. The UI distinguishes
reconciliation from a newly sent email. Existing unrelated Auth users are not silently adopted.

## Data and API ownership

`companies`, `departments`, `employees`, `employee_private`, `staff_invitations`,
`staff_audit` and `identity_sync_jobs` have RLS enabled. Browser writes to these tables are
revoked. HR-only private reads check current company membership through a definer predicate.
The directory returns only work fields; start date, staff number and status are self/HR fields.
Administrative listings expose identity metadata without private HR contents.

Transactional authenticated RPCs (errors 42501 forbidden; 22023 invalid workflow/input):

| RPC | Arguments | Authorization / result |
|---|---|---|
| `staff_directory` | `team_only=false` | directory.read; team.read additionally for current direct reports; safe array |
| `my_staff_record` | none | profile.self; own employment record |
| `staff_administration` | none | HR employment capability or account.invite; scoped records and departments |
| `create_department` | `department_name` | HR employment capability; department UUID |
| `save_staff_record` | `record_id` nullable, `fields`, `change_reason` | HR; staff UUID; rejects extra keys |
| `request_staff_invitation` | `staff_id` | HR; pending/unlinked staff only |
| `accept_staff_invitation` | none | verified current invited identity; activates atomically |
| `set_staff_access` | `staff_id`, `new_status`, `change_reason` | account.deactivate; guards transitions/self/last admin |
| `get_staff_audit` | none | audit.read_security; latest 100 company events |

The staff form's fields are `employee_no`, `first_name`, `last_name`, `work_email`,
`department_id`, `manager_id`, `job_title`, `hire_date`. Email is immutable after creation;
changing it requires coordinated identity verification, not a profile patch.

`POST /api/protected/invitations/:staffId/send`: Bearer JWT, empty body. Requires current
account.invite; returns `{sent:true,reconciled:false}` or `{sent:false,reconciled:true}`.
400 invalid ID/body; 401 invalid session; 403 unauthorized; 409 lease/state/linking conflict;
502 mail provider failure; 503 configuration/access unavailable. Only service_role may
execute the claim/finish RPCs, which also recheck the administrator's current permission.

`user_roles.starts_at/ends_at` are enforced by both access resolution and RLS permission
checks. The existing role screen makes immediate grants; scheduled grant editing is not
exposed yet. Assigning roles anew replaces their previous windows. Business-specific scope
tables and approval workflows belong to their later slices; a role flag is not row access.

## Verification and next gate

Run `pnpm test:rbac`, `pnpm test:rbac:browser`, `pnpm test:identity:browser`, targeted
lint and `pnpm build`. Database tests use actual PostgreSQL execution in PGlite; browser
tests use mocked network responses and do not prove production Auth email delivery.

Before calling Phase 1 deployed: verify migration on the actual schema, company assignments,
SMTP and redirect settings, invite-only Auth, the identity worker, real invitation acceptance
and suspension with an existing session. Then begin Phase 2 attendance events, duplicate
clock-in prevention and timezone boundaries. Leave, queues, HR private editing, policies and
leasing remain subsequent milestones, not completed features of this slice.
