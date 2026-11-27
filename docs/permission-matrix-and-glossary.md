# Permission Matrix and Domain Glossary

**Status:** Research artifact (Phase 0). Source of truth for capability codes is
`supabase/migrations/006_rbac.sql` + `007` + `008`. This document explains what each
code means, who gets it by default, what scope it carries, and how it maps to navigation.
It does not grant anything by itself; grants live in `role_permissions` / `user_roles`.

## 1. Domain glossary

Define these terms before writing any business code. Mixing them is the most common
source of vague requirements.

| Term | Definition | Not the same as |
|---|---|---|
| Staff / Employee record | A person's employment record (`employees`), separate from their Auth identity (`profiles.user_id -> auth.users.id`) | A user account or a profile |
| Profile | App identity fields (name, avatar, timezone, date format) owned by the staff member | Employment record |
| Role | A named bundle of capabilities (`roles.code`). Base roles: `employee`, `manager`, `hr_administrator`, `support_agent`, `admin` | A job title or department |
| Capability / Permission | A single action code (`permissions.code`) checked at API/RLS time | A UI menu item |
| Grant | A row linking a user to a role or capability, with optional effective window (`user_roles.starts_at/ends_at`) | A boolean flag on a profile |
| Scope | The set of rows a grant applies to (own, team, HR, queue, company, config) | The role itself |
| Organization scope | Company/department/manager graph used to decide team and HR visibility | A permission code |
| Attendance event | A single clock in/out punch (timestamp, timezone) | A daily summary |
| Daily attendance summary | Derived per-day state (present, absent, late, on leave) computed from events | A punch |
| Missed-punch correction | A request to fix a missing/incorrect punch, routed to the approver | A leave request |
| Leave request | A request for time off with type, dates, reason, attachments | An attendance event |
| Leave ledger / balance | Append-only record of accruals, usage, adjustments, corrections | A single balance number |
| Approval | A workflow decision (approve/reject/cancel) recorded with actor, reason, timestamp | A status field |
| Task | Work item with title, priority, assignee, reporter, due date, status, activity history | A support ticket |
| Support ticket / Incident | A service request with category, queue, SLA, priority, requester/agent threads | A task |
| Queue | A support work bucket with members, SLA policy and reporting | A department |
| Policy | A versioned document with audience, effective date, owner, acknowledgment tracking | A helpdesk article |
| Knowledge base article | Approved answer content linked to ticket categories | A policy |
| Chassis / asset (planned) | A uniquely serialized physical unit in the sales/leasing module | A generic inventory item |
| Audit entry | Immutable record of actor, action, entity, before/after, reason, request id, timestamp | A log line |

### Critical distinctions to lock now

1. **Task vs support ticket** - separate tables, separate lifecycles, separate priority vocabularies
   (`critical/high/medium/low` for tasks; `urgent/high/normal` for incidents). Never let a
   "Create Ticket" button create a task.
2. **Attendance event vs daily summary** - store raw punches; derive summaries. Corrections
   never mutate a punch silently; they create a correction request + audit entry.
3. **Leave balance vs ledger** - balance is a derived view over ledger entries; adjustments
   require rationale and audit.
4. **Role vs permission vs scope** - a role grants capabilities; capabilities are checked
   against scope at runtime. Hiding a menu item is UX, not enforcement.
5. **Profile vs employee record** - profile is self-editable identity; employee record is
   HR-owned employment data. Never expose `role_id`, `is_active`, or HR fields via profile
   endpoints.

## 2. Capability registry

Codes are the exact strings in `permissions.code`. Scope legend:
`O` own, `T` team/delegated, `H` authorized HR, `Q` assigned queue, `C` configuration,
`V` organization-safe public-work fields.

| Code | Meaning | Default scope |
|---|---|---|
| `dashboard.read` | Read the dashboard workspace | V |
| `profile.self` | Read/update own profile fields (name, avatar, prefs) | O |
| `preferences.self` | Manage own timezone, locale, notification channels | O |
| `notification.read` | Read and mark own notifications | O |
| `time.self` | Clock in/out and read own attendance/leave | O |
| `directory.read` | Read staff directory work fields | V |
| `calendar.read` | Read calendar events the user is allowed to see | O/T/V |
| `policy.read` | Read published policies and acknowledge | V |
| `ticket.self` | Create/read own helpdesk tickets | O |
| `org.read` | Read organization structure (authorized work fields only) | V |
| `task.self` | Create/read tasks in assigned scope | O |
| `manager.workspace` | Enter manager workspace | T |
| `team.read` | Read direct-report roster and work fields | T |
| `leave.approve` | Approve/reject leave for assigned scope | T |
| `attendance.review` | Review team attendance exceptions and corrections | T |
| `attendance.read_hr` | Read company attendance for authorized HR scope | H |
| `task.assign_team` | Assign tasks to team members | T |
| `team.report.read` | Read team reports | T |
| `hr.workspace` | Enter HR workspace | H |
| `employee.read_private` | Read private employment/HR fields | H |
| `employee.update_employment` | Create/update employment records, departments, managers | H |
| `leave.policy.manage` | Manage leave types, policies, accrual rules | H |
| `leave.adjust` | Adjust leave balances (with rationale + audit) | H |
| `holiday.manage` | Manage company holidays | H |
| `policy.publish` | Publish/version/archive policies and track acknowledgments | H |
| `hr.request.read` | Read HR service requests | H |
| `hr.report.read` | Read HR reports | H |
| `support.workspace` | Enter support workspace | Q |
| `ticket.triage` | Triage tickets in authorized queues | Q |
| `ticket.assigned` | Work assigned tickets (status, priority, notes) | Q |
| `ticket.escalate` | Escalate tickets | Q |
| `knowledge.read` | Read published knowledge base articles | V |
| `knowledge.manage` | Create/edit knowledge base (subject to approval) | Q |
| `queue.report.read` | Read queue analytics | Q |
| `admin.workspace` | Enter system administration workspace | C |
| `account.read` | List accounts (id, email, active status only) | C |
| `account.invite` | Invite/provision accounts | C |
| `account.deactivate` | Suspend/deactivate accounts (guarded) | C |
| `role.assign` | Assign/remove roles and capabilities (audited, last-admin guard) | C |
| `org.configure` | Configure departments/org structure | C |
| `feature_flag.manage` | Manage feature flags (explicit, audited) | C |
| `system.configure` | System configuration (non-flag) | C |
| `integration.manage` | Manage integrations | C |
| `audit.read_security` | Read security audit logs | C |
| `system.health` | Read environment health and incidents | C |

## 3. Default role grants

Mirrors `006`/`007`/`008`. Base `employee` capabilities are additive to every elevated role.

| Capability | Employee | Manager | HR Admin | Support Agent | System Admin |
|---|---|---|---|---|---|
| `dashboard.read` | x | x | x | x | x |
| `profile.self` | x | x | x | x | x |
| `preferences.self` | x | x | x | x | x |
| `notification.read` | x | x | x | x | x |
| `time.self` | x | x | x | x | x |
| `directory.read` | x | x | x | x | x |
| `calendar.read` | x | x | x | x | x |
| `policy.read` | x | x | x | x | x |
| `ticket.self` | x | x | x | x | x |
| `org.read` | x | x | x | x | x |
| `task.self` | x | x | x | x | x |
| `manager.workspace` | - | x | - | - | - |
| `team.read` | - | x | - | - | - |
| `leave.approve` | - | x | - | - | - |
| `attendance.review` | - | x | - | - | - |
| `attendance.read_hr` | - | - | x | - | - |
| `task.assign_team` | - | x | - | - | - |
| `team.report.read` | - | x | - | - | - |
| `hr.workspace` | - | - | x | - | - |
| `employee.read_private` | - | - | x | - | - |
| `employee.update_employment` | - | - | x | - | - |
| `leave.policy.manage` | - | - | x | - | - |
| `leave.adjust` | - | - | x | - | - |
| `holiday.manage` | - | - | x | - | - |
| `policy.publish` | - | - | x | - | - |
| `hr.request.read` | - | - | x | - | - |
| `hr.report.read` | - | - | x | - | - |
| `support.workspace` | - | - | - | x | - |
| `ticket.triage` | - | - | - | x | - |
| `ticket.assigned` | - | - | - | x | - |
| `ticket.escalate` | - | - | - | x | - |
| `knowledge.read` | x | x | x | x | x |
| `knowledge.manage` | - | - | - | x | - |
| `queue.report.read` | - | - | x | x | - |
| `admin.workspace` | - | - | - | - | x |
| `account.read` | - | - | - | - | x |
| `account.invite` | - | - | - | - | x |
| `account.deactivate` | - | - | - | - | x |
| `role.assign` | - | - | - | - | x |
| `org.configure` | - | - | - | - | x |
| `feature_flag.manage` | - | - | - | - | x |
| `system.configure` | - | - | - | - | x |
| `integration.manage` | - | - | - | - | x |
| `audit.read_security` | - | - | - | - | x |
| `system.health` | - | - | - | - | x |

Notes:
- `queue.report.read` is granted to both HR Admin and Support Agent per `007`. Decide whether
  HR keeps queue analytics or whether that was a migration convenience; document the decision.
- `knowledge.read` is granted to all five base roles and to any custom role that already held
  `knowledge.manage`, so the read/edit split does not remove existing access.
- `feature_flag.manage` is granted to any role that already held `system.configure`, preserving
  access on the cutover rather than hardcoding the admin role.
- Sales/leasing capabilities (`sales.*`, `leasing.*`) are **not** in this list yet. They
  must be added as new permission codes when Phase 6 requirements are confirmed, attached
  to users/groups rather than a new base role.
- Effective dates (`starts_at`/`ends_at`) are enforced by `get_access_context` and RLS.
  Scheduled grants exist in schema but no UI edits them yet.

## 4. Capability to navigation map

Drives the menu registry. A nav item renders only if the user has its capability.
Gaps marked `GAP` must be resolved before that nav item ships.

| Nav item (blueprint section 4) | Capability | Notes |
|---|---|---|
| Dashboard | `dashboard.read` | Content selected from permissions |
| My Tasks | `task.self` | |
| My Time | `time.self` | |
| Directory | `directory.read` | |
| Calendar | `calendar.read` | |
| Policies | `policy.read` | |
| Helpdesk | `ticket.self` | |
| Organization | `org.read` | |
| My Profile | `profile.self` | |
| Notifications | `notification.read` | Added in migration 009; the bell is the current entry point |
| Preferences | `preferences.self` | |
| Team Overview | `manager.workspace` + `team.read` | |
| Team Calendar | `manager.workspace` + `calendar.read` | Team scope enforced by API |
| Leave Approval Inbox | `leave.approve` | |
| Attendance Exceptions | `attendance.review` | |
| Team Tasks | `task.assign_team` | |
| Team Reports | `team.report.read` | |
| People Directory (HR) | `employee.read_private` | |
| Employee Records | `employee.read_private` + `employee.update_employment` | |
| Attendance (HR) | `attendance.read_hr` | Added in migration 009 |
| Onboarding/Offboarding | `employee.update_employment` + `account.invite` | Split HR request vs admin action |
| Leave Policies & Adjustments | `leave.policy.manage` + `leave.adjust` | |
| Holiday Calendar | `holiday.manage` | |
| Policies & Acknowledgments | `policy.publish` | |
| HR Requests & Reports | `hr.request.read` + `hr.report.read` | |
| Queue Inbox | `support.workspace` + `ticket.triage` | |
| My Assigned Tickets | `ticket.assigned` | |
| SLAs & Escalations | `ticket.escalate` | |
| FAQ / Knowledge Base | `knowledge.read` to view; `knowledge.manage` for edit | Both codes exist after migration 009 |
| Queue Analytics | `queue.report.read` | |
| Invitations & Accounts | `account.invite` + `account.read` + `account.deactivate` | |
| Roles & Permissions | `role.assign` | |
| Departments/Org Configuration | `org.configure` | |
| Feature Flags | `feature_flag.manage` | Added in migration 009; preserves prior `system.configure` access |
| Integrations | `integration.manage` | |
| Audit & Security Logs | `audit.read_security` | |
| System Health | `system.health` | |

## 5. Scope rules (runtime, not just role)

Every action is evaluated as `(subject, action, resource, org_scope, workflow_state, time)`.

- **Own (O):** resource owner/requester/creator is the user, or the resource is the user's
  own record. Self-approval is always denied (e.g. a manager cannot approve their own
  leave).
- **Team (T):** resource belongs to a current direct report or an explicitly delegated
  subteam. Scope resolves from the current reporting graph on every request; transfers
  change visibility immediately. Former managers lose access.
- **HR (H):** resource is within the user's authorized HR scope (company + assigned
  departments). HR does not automatically see all departments or all tickets.
- **Queue (Q):** resource is a ticket in a queue where the user is a member, with the
  right category grant. Cross-queue reads are denied even for support agents.
- **Config (C):** system-wide configuration; system admin only, with audit.
- **Public-work (V):** only safe fields (name, role, team, manager, business email,
  start date if policy permits). Never personal contact, salary, performance, absence
  reason, or security settings.

Additional hard rules:
- Terminated/suspended/inactive users cannot start new sessions or act, even with a
  valid JWT. Endpoints recheck active status.
- A user cannot change `manager_id`, `role_id`, `employment_status`, or private HR
  fields through a normal profile-edit endpoint.
- Sensitive writes use transactional RPCs (errors `42501` forbidden, `22023` invalid
  input) and write audit rows.

## 6. Enforcement layers

1. **React (UX only):** resolve authorized nav/controls. Never treat as enforcement.
2. **Express API:** verify Supabase JWT, load active account + current grants, validate
   input (Zod), check ownership/reporting/queue/state, mutate in a transaction.
3. **PostgreSQL RLS:** explicit grants per table/storage object; backend-only tables in
   a non-exposed schema. Direct browser access uses RLS; privileged writes go through
   Express with service role.
4. **Audit:** actor, action, entity type/id, before/after (omit secrets), reason,
   request id, timestamp. Production audit data protected from normal app edits.

## 7. Security test grid (run per endpoint/table)

For every protected read/create/edit/delete, test at least these subjects:
unauthenticated; ordinary employee; manager of the owner; manager of another department;
authorized HR user; support agent of the right queue; support agent of the wrong queue;
system admin without content grant; disabled user; user with a stale/revoked grant;
and the self-action attempt (e.g. approve own leave, edit own employment record).

Test reads, creates, edits and deletions - not only route visibility.

## 8. Explicit deny examples

- Requester cannot approve their own leave.
- Support agent in an IT queue cannot read a payroll ticket.
- Terminated worker cannot start a new attendance session.
- Former manager cannot keep team access after transfer.
- User cannot change `manager_id`, `role_id`, or `employment_status` via profile edit.
- System admin does not automatically read sensitive HR case contents or customer
  prices/contracts; exceptional access needs break-glass with time limit, reason and
  audit review.
- HR visibility does not automatically cover all IT/private support ticket details.

## 9. Data ownership

| Data | Owner | Who can read | Who can write |
|---|---|---|---|
| `auth.users` | Supabase Auth | service role | Auth flows only |
| `profiles` | staff member (identity) | self (limited fields) | self (name/avatar/prefs) |
| `employees` / `employee_private` | HR | self (work fields), HR (private) | HR via RPC |
| `departments` | HR / org config | V (name) | HR (`employee.update_employment`) / admin (`org.configure`) |
| `roles`, `permissions`, `role_permissions` | system admin | admin | `role.assign` |
| `user_roles` | system admin | admin / self (own roles) | `role.assign` |
| `attendance events` | staff member | self / manager(T) / HR(H) | self (clock) / correction flow |
| `leave requests` | staff member | self / approver / HR | self (request) / approver (decision) |
| `leave ledger` | system/HR | self / HR | HR (adjust with rationale) |
| `tasks` | creator/assignee | scoped by project/team | creator/assignee per permissions |
| `tickets` | requester + queue members | requester / queue members / HR queue | requester (create) / agent (triage) |
| `policies` | HR | all (published) | HR (`policy.publish`) |
| `audit` | system | `audit.read_security` | system only |

## 10. Open questions to resolve before coding the next slice

Resolved in migration 009 and the slice contract:
- Notification, knowledge-read and feature-flag capabilities now exist explicitly.
- HR attendance reads now use `attendance.read_hr`.
- Company timezone, leave unit (hours), approver routing, retention, shifts and
  approved-leave clock blocking are locked in `attendance-leave-slice-contract.md`.

Still open:
1. Queue membership table (`support_queue_members`) and category grants are not
   implemented. Needed for Phase 4.
2. Task scoping model ("assigned scope", "project/team") is undefined.
3. Whether HR keeps `queue.report.read` (currently granted by 007).
4. Sales/leasing business questions (blueprint section 15) are unanswered; keep
   module labeled "planned" and do not implement financial workflows yet.
5. Multi-company support is deferred; schema allows it later without forcing it now.
6. Exact accrual values, paid local holidays, night-shift business dates and the
   fallback approver account need HR/Admin confirmation (tracked in the slice contract).

## 11. Next steps (recommended order)

1. ~~Resolve the `GAP` permission codes~~ Done in `supabase/migrations/009_permission_gaps.sql`
   (`notification.read`, `knowledge.read`, `feature_flag.manage`, `attendance.read_hr`).
2. ~~Build the menu registry from section 4~~ The existing `client/src/data/nav.js` registry
   now uses the new codes for Knowledge Base and Feature Flags. Notifications stay on the
   header bell, gated by `notification.read` when the notification API lands.
3. Pick **one vertical slice** to prove the model end-to-end before broad UI work:
   recommended = Employee clocks in/out + requests leave + Manager approves + ledger
   updates + calendar reflects it (Phases 2-3 combined). This single flow exercises
   identity, permissions, RLS, audit, notifications, and calendar.
4. Seed test accounts for all five base roles + a multi-role user + a manager from
   another department, then run the security test grid.
5. Only after the slice passes, replace sample data in the remaining modules.

Record decisions and blockers in `docs/activity-log.md`.
