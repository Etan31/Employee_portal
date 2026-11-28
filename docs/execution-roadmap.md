# Execution Roadmap and Prompt Guide

**Status:** follow-along execution plan, created 2026-11-28  
**Purpose:** keep this personal project on one path without re-litigating the broad blueprint on every prompt.  
**Important:** this document does **not** replace the blueprint, permission matrix, RBAC notes, identity notes, or slice contracts. It orders the work and gives one goal per prompt.

---

## 0. How to use this document

Use **one prompt/card at a time**, in order. Each card has:

- **Goal** - the only outcome for that prompt.
- **Read first** - the docs that define correctness.
- **Scope** - what to change.
- **Out of scope** - what to resist adding.
- **Done when** - concrete acceptance checks.
- **Next card** - where to go after it passes.

Rules:

1. Do not start a later card until the current card is done and verified.
2. Do not mix UI, backend and cleanup in one prompt unless the card explicitly says so.
3. If a decision changes a locked contract, add a short entry to the **Decision changelog** at the bottom of this file. Do not silently change behavior.
4. Append progress to `docs/activity-log.md`; do not overwrite existing docs.
5. For UI-only cards, if the page still uses sample data, say so in the UI and in the activity log. Do not call it "backend integrated".

---

## 1. Source-of-truth order

When documents disagree, use this order:

1. **Implemented code, migrations and tests** - `supabase/migrations/006...010`, `client/src/`, `server/`, `shared/`, `tests/`.
2. **Specific contracts** - `docs/permission-matrix-and-glossary.md`, `docs/RBAC.md`, `docs/identity-foundation.md`, `docs/attendance-leave-slice-contract.md`.
3. **Product/design intent** - `PRODUCT.md`, `DESIGN.md`, `README.md`.
4. **Broad blueprint** - `docs/Nexus_Employee_Portal_Blueprint.md`, used for intent and domain inventory only.
5. **This execution roadmap** - used for ordering and prompt cards only.

Known stale areas to ignore:

- Blueprint header still says "not yet implemented" and its work board is stale.
- Blueprint proposes a `features/` folder structure; current repo uses `client/src/pages`, `client/src/data`, `client/src/api`.
- Blueprint schema names differ from migration 010; migration 010 wins.
- Slice contract header says "No code yet"; its implementation-status section wins.
- Contract REST paths under `/api/attendance/*` and `/api/leave/*` are not implemented. RPC-first is the chosen approach below.

---

## 2. Locked architecture for this personal monolith

Keep the project simple and monolithic. Do not introduce microservices, a new app shell, or a large folder migration.

### 2.1 Runtime shape

```text
Browser
  |
  | React SPA (Vite, hash routing)
  | client/src/pages + client/src/data + client/src/api + shared/authorization.js
  |
  +--> Supabase Auth / Postgres RPC / RLS / Storage
  |
  +--> Express API (server/)
         - token verification
         - service-role operations (invitations, identity sync)
         - health checks
         - future scheduled-job entry points
```

### 2.2 Locked decisions

| ID | Decision | Why |
|---|---|---|
| A1 | One deployable product, not microservices. | Personal project; less moving parts. |
| A2 | React SPA stays hash-routed through `client/src/data/nav.js`. | Existing navigation and permissions already work this way. |
| A3 | Supabase Postgres/RLS/RPCs are the source of truth for business data and enforcement. | Already implemented in 006-010; avoids duplicate REST authorization. |
| A4 | UI calls Supabase RPCs directly for ordinary read/write features when RLS can enforce them. | Simplest path; avoids building a duplicate CRUD API. |
| A5 | Express is for service-key work, token-verified endpoints and jobs, not generic CRUD. | Invitations and identity sync need service role; normal data does not. |
| A6 | Client permission checks hide UI; server checks protect service endpoints; DB RLS is final enforcement. | Defense in depth without duplicating business rules everywhere. |
| A7 | Access decisions use capability codes from `get_access_context`, never role names or numeric role IDs. | Already locked in RBAC. |
| A8 | Keep current folders: `client/src/pages`, `client/src/data`, `client/src/api`, `client/src/hooks`, `server`, `shared`. | A `features/` refactor is broad, risky and unnecessary. |
| A9 | Keep global/co-located CSS from `DESIGN.md`; do not introduce Tailwind/styled-components/Storybook. | Avoid style-system churn. |
| A10 | No global state library. Use existing hooks plus small `*.api.js` wrappers. | Enough for this scale. |
| A11 | Background work stays as scripts/jobs (e.g. `scripts/sync-identity.mjs`), not a queue service. | Personal project; cron/script is enough. |
| A12 | Sales & Leasing remains planned until its business questions are answered. | Prevent accidental scope drift. |

### 2.3 RPC-first vs REST

Do **not** create `/api/attendance/*`, `/api/leave/*`, `/api/calendar`, etc. by default.

Use this rule:

| Need | Use |
|---|---|
| Browser reads/writes with user context and RLS | Supabase RPC from `client/src/api/*.api.js` |
| Action needs service key, email delivery, or privileged Auth call | Express endpoint in `server/routes/*` |
| Scheduled maintenance/retention/accrual | Script or Express-invoked job with service key |
| External webhook | Express endpoint with verified signature |

If a REST endpoint is later needed, document why RPC-first was insufficient before adding it.

---

## 3. Current folder audit

### 3.1 Keep as active architecture

| Path | Reason |
|---|---|
| `client/src/App.jsx`, `useNavigation.js`, `data/nav.js`, `utils/access.js` | Routing and permission filtering. |
| `client/src/pages/**`, `layouts/**`, `components/**` | Current UI shell and pages. |
| `client/src/api/auth.api.js`, `staff.api.js`, `lib/supabaseClient.js` | Existing Supabase boundary. |
| `client/src/hooks/**` | Session/access/app data/UI state. |
| `server/**`, `shared/authorization.js` | Service API and shared access validator. |
| `supabase/migrations/006-010` | Authoritative schema path. |
| `tests/**` | Database/API/browser checks. |
| `scripts/sync-identity.mjs` | Active worker entry point. |
| `docs/**`, `README.md`, `PRODUCT.md`, `DESIGN.md` | Product/design/execution documentation. |

### 3.2 Keep but treat as historical, not active

| Path | Rule |
|---|---|
| `supabase/migrations/v1/**`, `v2/**`, `supabase/rls-setup.sql`, `supabase/bootstrap.sql` | Do not apply to an existing project. Keep as history until a cleanup prompt explicitly archives them. |
| `docs/Nexus_Employee_Portal_Blueprint.pdf`, `docs/mermaid-diagram.png`, `ds-bundle/**`, `.design-sync/**` | Design/planning artifacts; not runtime code. |
| `client/dist/**` | Build output; ignore in source work. |
| `tests/*.png` | Browser test screenshots; gitignored artifacts. |
| Root `package.json` and `server/package.json` | Both are currently used: root runs tests/build and server deploy uses `server/`. Do not consolidate yet. |

### 3.3 Cleanup candidates for Card P0 only

| Path | Finding | Action |
|---|---|---|
| `client/src/data/orgSample.js` | No imports found. | Removed in P0 after import verification. |
| `client/src/data/profileData.js` | No imports found; explicitly sample. | Removed in P0 after import verification. |
| `client/src/data/events.js` | No imports found. | Removed in P0 after import verification. |
| `scripts/refactor.cjs`, `scripts/structure.sh` | Not referenced by package scripts. | Removed in P0 after import verification. |
| `client/src/pages/PageStub/PageStub.jsx` | Still used as fallback for unavailable routes. | Keep until all intended routes are mapped; do not remove early. |

### 3.4 Sample-data modules to remove only when their feature is wired

| Module | Used by | Remove/replace when |
|---|---|---|
| `data/timeManagement.js` | Time Management, Dashboard | Cards E1-E6. |
| `data/tasks.js`, `data/people.js` | Task Box, Dashboard | Card T1/T2. |
| `data/calendarEvents.js` | Calendar, Dashboard, Time Management | Card C1 or E2, whichever removes the dependency last. |
| `data/helpdesk.js` | Helpdesk | Card S2. |
| `data/policies.js` | HR Policies | Card H8 or P2. |
| `data/settings.js` | Settings | Card SET1. |
| `data/notifications.js`, `data/apps.js`, `data/requests.js`, `data/shift.js` | Dashboard/Time Management support samples | Remove when consuming page is rewired. |

**Cleanup rule:** never delete a sample module while a page still imports it. Wire first, then delete.

---

## 4. Current feature status

| Area | Current state | Next card |
|---|---|---|
| Auth, RBAC, access context | Backend and client/server checks implemented. | D1 verification only. |
| Identity/onboarding/invitations | Backend and admin/staff UI partly real. | D1 verification. |
| Employee Profile | Real `profiles`/staff record. | No immediate work. |
| Employee Directory / HR People | Real `getDirectory()` data. | Small UI polish later. |
| Dashboard | Mostly sample data. | E6. |
| Time Management | Sample data; backend RPCs ready in 010. | E1-E6. |
| Task Box | Sample/local data. | T1/T2. |
| Calendar | Static holiday/event arrays. | C1. |
| HR Policies | Static data. | P2. |
| Helpdesk | Static/local tickets. | S1/S2. |
| Settings | `localStorage` only. | SET1. |
| Manager workspace | Team page exists; corrections and leave approval UI not wired. | M1-M4. |
| HR workspace | Employee/lifecycle pages real; attendance/leave config mostly stub. | H1-H7. |
| Support workspace | Mostly stub/static. | S1/S2. |
| System Admin | Roles/accounts/audit mostly real. | A1/A2. |
| Full security grid | Partial database tests. | Q1-Q3. |

---

## 5. Execution phases

```text
P  Architecture + cleanup + deployment verification
E  Employee UI pass (time/attendance/leave first, because SQL is ready)
M  Manager UI pass
H  HR UI pass
A  System Admin UI pass
S  Support Agent UI pass
T/P/C/SET  Remaining employee-domain UI passes
B  Backend pass for features that are still sample/local
Q  Hardening, security grid, retention, deployment
```

The order is intentional:

1. **Lock architecture and clean obvious dead files.**
2. **Wire the ready backend slice into real UI.**
3. **Complete each role's UI surface.**
4. **Only then build backend for still-sample features.**
5. **Harden and deploy last.**

---

# 6. Prompt cards

## P0 - Architecture lock and small cleanup

- **Goal:** make this document the follow-along plan and remove only clearly unused files.
- **Read first:** this file; `README.md`; `DESIGN.md`.
- **Scope:**
  - Confirm no code changes are needed for the monolith architecture in section 2.
  - Grep-import the cleanup candidates in section 3.3; remove only files with zero imports.
  - Do not touch sample modules still in use.
- **Out of scope:** folder restructuring, package consolidation, deleting migrations, restyling pages.
- **Done when:**
  - This doc exists and is read first for future prompts.
  - Only confirmed-unused candidates are removed.
  - `pnpm build` and `pnpm test:rbac` still pass.
- **Next:** D1.

## D1 - Deployment gate verification, no new SQL

- **Goal:** confirm the database/Auth foundation is actually deployed and safe.
- **Read first:** `docs/identity-foundation.md`, `docs/RBAC.md`, `supabase/SETUP.md`, `docs/attendance-leave-slice-contract.md` section 13.
- **Scope:**
  - Verify migrations 006-010 are applied in the target Supabase project, in order.
  - Verify public signup is disabled, email confirmation/SMTP configured, invite redirect set.
  - Verify `pnpm sync:identity` can run from one scheduled worker.
  - Verify a suspended user loses access with an existing session.
- **Out of scope:** writing new migrations, redesigning invitations, changing role grants.
- **Done when:**
  - A short checklist entry is appended to `docs/activity-log.md`.
  - Any failed gate is listed as a blocking item, not worked around in UI.
- **Next:** E1.

---

## E1 - Employee Time Management: clock in/out UI

- **Goal:** replace the sample punch controls with real RPC calls.
- **Read first:** `docs/attendance-leave-slice-contract.md` sections 2, 6, 9; migration 010 functions `clock_attendance`, `my_attendance`.
- **Scope:**
  - Add `client/src/api/time.api.js` with wrappers for `clock_attendance` and `my_attendance`.
  - Wire `TimeManagement.jsx` punch buttons and today's status to real data.
  - Show clear errors for already clocked in, no open shift, and approved-leave blocking.
- **Out of scope:** leave list, corrections, styling redesign.
- **Done when:**
  - Clock in/out works for an Employee with `time.self`.
  - Duplicate punch and leave-block errors are readable.
  - No direct table writes from client.
- **Next:** E2.

## E2 - Employee attendance history and correction requests

- **Goal:** show real attendance history and allow missed-punch requests.
- **Read first:** contract sections 5-9; RPCs `my_attendance`, `request_attendance_correction`.
- **Scope:**
  - Replace sample attendance rows with `my_attendance`.
  - Add correction request form: date, event type, time, reason.
  - Show pending/approved/rejected correction status.
- **Out of scope:** manager review UI (M4), derived daily summaries.
- **Done when:**
  - Employee can submit a correction and see it in their history.
  - Duplicate pending correction error is handled.
  - `data/timeManagement.js` attendance arrays are no longer used by TimeManagement.
- **Next:** E3.

## E3 - Employee leave balances and leave catalog

- **Goal:** show hour-based balances and active leave types from RPCs.
- **Read first:** contract decisions D2-D7; RPCs `leave_catalog`, `my_leave_balances`.
- **Scope:**
  - Wire balance cards and leave type selector to real data.
  - Display hours, not days.
  - Show "not balance-limited" for unpaid leave types.
- **Out of scope:** request form, attachment upload.
- **Done when:**
  - Balances match `my_leave_balances()`.
  - Opening balances and used hours are visible.
  - Sample `LEAVE_BALANCES` are removed from this page.
- **Next:** E4.

## E4 - Employee leave request creation

- **Goal:** submit real leave requests in hours, including half-days.
- **Read first:** contract sections 2, 6, 9; RPC `create_leave_request`.
- **Scope:**
  - Wire date range, optional start/end time, type and reason to `create_leave_request`.
  - Show computed working days/hours and allowed types.
  - Handle insufficient balance, overlap, weekend/holiday-only and no-approver errors.
- **Out of scope:** attachments, cancellation, approval UI.
- **Done when:**
  - Full-day and half-day requests create correct `total_hours`.
  - Negative validation messages are user-readable.
  - No sample leave request is submitted.
- **Next:** E5.

## E5 - Employee leave list, attachments and cancellation

- **Goal:** complete the employee's own leave workflow.
- **Read first:** contract sections 5-8; RPCs `my_leave_requests`, `add_leave_attachment`, `cancel_leave_request`.
- **Scope:**
  - Wire leave request list with status, days and reason.
  - Add attachment metadata form for pending requests (storage upload can be deferred if bucket is not ready; say so).
  - Add cancel with reason for pending requests; approved cancellation only when backend allows.
- **Out of scope:** production Storage bucket policy and signed URLs unless D2 says it is ready.
- **Done when:**
  - Employee can view, attach to and cancel requests through RPCs.
  - `data/timeManagement.js` leave request arrays are no longer used by TimeManagement.
- **Next:** E6.

## E6 - Dashboard de-sampling for employee time data

- **Goal:** remove Time Management-derived sample data from the Employee dashboard.
- **Read first:** `Dashboard.jsx`, `appData.hooks.jsx`, E1-E5 outputs.
- **Scope:**
  - Replace pending leave count and upcoming leave panel with RPC-backed data.
  - Keep non-time widgets as clearly marked placeholders if still sample.
  - Remove only imports that are now unused.
- **Out of scope:** full dashboard redesign, task/calendar backend.
- **Done when:**
  - Dashboard leave/time numbers match real data.
  - `useAppData()` no longer seeds time-management samples.
- **Next:** M1.

---

## M1 - Manager team attendance view

- **Goal:** show direct-report attendance using `team_attendance`.
- **Read first:** contract actors/RLS; `client/src/data/nav.js`; migration 010 `team_attendance`.
- **Scope:**
  - Wire Manager workspace attendance page/table.
  - Gate route with `manager.workspace + attendance.review`.
  - Show only direct-report scope from backend.
- **Out of scope:** corrections review, payroll, late/discipline logic.
- **Done when:**
  - Manager sees direct reports only.
  - Employee without `attendance.review` cannot access route or data.
- **Next:** M2.

## M2 - Manager leave approval inbox

- **Goal:** approve/reject requests routed to the manager.
- **Read first:** contract D8, actors, sections 5-9; RPCs `pending_leave_approvals`, `decide_leave_request`.
- **Scope:**
  - Wire pending queue with employee, type, dates, hours, reason, attachments.
  - Add approve/reject with required rejection reason.
  - Handle insufficient balance and self-approval errors.
- **Out of scope:** HR-wide leave history, fallback admin queue UI (A1).
- **Done when:**
  - Manager can decide only requests where `approver_id = self`.
  - Ledger changes after approval, visible in employee balances.
- **Next:** M3.

## M3 - Manager team leave calendar

- **Goal:** show approved team leave in a calendar/list.
- **Read first:** RPC `team_leave_calendar`; existing `Calendar.jsx` patterns.
- **Scope:**
  - Wire a team leave view for managers using date range.
  - Use hours/day portions rather than sample leave events.
  - Keep the existing visual language from `DESIGN.md`.
- **Out of scope:** company-wide calendar, holiday backend.
- **Done when:**
  - Manager sees only approved leave for direct reports.
  - Unauthorized employee gets no data and cannot open route.
- **Next:** M4.

## M4 - Manager correction review

- **Goal:** approve/reject missed-punch corrections.
- **Read first:** RPC `review_attendance_correction`; contract correction state machine.
- **Scope:**
  - Add correction review UI in Manager workspace.
  - Show target date, requested event/time and reason.
  - Require rejection reason.
- **Out of scope:** editing raw punches, retroactive payroll.
- **Done when:**
  - Manager decision updates status.
  - Approved correction creates an attendance event through RPC.
- **Next:** H1.

---

## H1 - HR attendance overview

- **Goal:** give HR company-wide read-only attendance visibility.
- **Read first:** `attendance.read_hr`; RPC `team_attendance`; RLS policies for attendance.
- **Scope:**
  - Wire HR Attendance module from `nav.js` to real company attendance.
  - Filter by employee/date; no direct table writes.
- **Out of scope:** editing employee punches directly.
- **Done when:**
  - HR sees company employees; manager sees only direct reports.
  - System Admin without HR grant sees no HR attendance data.
- **Next:** H2.

## H2 - HR leave request history and balances

- **Goal:** let HR inspect any employee's leave requests and balances.
- **Read first:** RPCs `staff_leave_requests`, `employee_leave_balances`.
- **Scope:**
  - Employee selector from directory.
  - Show request history and balance breakdown.
  - Do not expose this to managers unless they are approver.
- **Out of scope:** adjusting balances (H4).
- **Done when:**
  - HR can inspect chosen employee.
  - Unauthorized roles cannot call/read data.
- **Next:** H3.

## H3 - HR leave types and policies configuration

- **Goal:** manage leave types and policies through RPCs.
- **Read first:** RPCs `save_leave_type`, `save_leave_policy`; contract D4-D7.
- **Scope:**
  - Wire forms for code/name/paid/attachment fields.
  - Wire policy effective date, accrual method/rate, caps, allow negative.
  - Keep hours as the only unit in UI.
- **Out of scope:** accrual cron, carryover expiry job.
- **Done when:**
  - HR saves changes through RPC and `leave_catalog()` reflects them.
  - Non-HR roles cannot open route or call RPC successfully.
- **Next:** H4.

## H4 - HR balance adjustments

- **Goal:** allow audited manual leave balance corrections.
- **Read first:** RPC `adjust_leave_balance`; ledger model; contract D7.
- **Scope:**
  - Adjustment form: employee, leave type, signed hours, reason.
  - Show resulting balance.
- **Out of scope:** negative balance allowed by policy; only HR adjustment can create it.
- **Done when:**
  - Adjustment writes ledger + staff_audit.
  - Reason is mandatory and visible in audit.
- **Next:** H5.

## H5 - HR holidays and shifts

- **Goal:** manage company holidays and fixed shifts.
- **Read first:** RPCs `save_holiday`, `save_shift`, `assign_shift`; contract D12-D16.
- **Scope:**
  - Holiday list/editor with paid flag.
  - Shift list/editor and employee assignment with effective dates.
  - Overlap error handling.
- **Out of scope:** rotating shifts, biometrics, payroll.
- **Done when:**
  - New holiday excludes leave hours.
  - Assigned shift changes leave hour calculation.
- **Next:** H6.

## H6 - HR fallback approver configuration

- **Goal:** expose the configured fallback approver safely.
- **Read first:** `set_fallback_leave_approver`; D8; `leave.approve_fallback`.
- **Scope:**
  - HR/Admin can view and set fallback approver from active employees.
  - Show explanation that fallback only receives routed requests.
- **Out of scope:** role-based fallback rules.
- **Done when:**
  - Changing fallback affects new requests with no active manager.
  - No company-wide approval access is granted.
- **Next:** H7.

## H7 - HR HR-requests placeholder cleanup decision

- **Goal:** decide whether HR Requests remain a stub or become a UI-only placeholder.
- **Read first:** `nav.js`, blueprint sections on HR requests.
- **Scope:**
  - If no backend contract exists, keep as stub with a clear "planned" label.
  - Do not invent schema or endpoints in this card.
- **Out of scope:** new HR request feature implementation.
- **Done when:**
  - Route behavior is explicit and documented in this roadmap.
- **Next:** A1.

## H8 - HR Policies UI-only pass

- **Goal:** improve HR Policies UI without faking backend completion.
- **Read first:** `DESIGN.md`, `data/policies.js`, blueprint policy workflow.
- **Scope:**
  - Keep static content but mark sample data.
  - Prepare UI shape for future version/acknowledgment backend.
- **Out of scope:** policy schema and acknowledgment RPCs (B3).
- **Done when:**
  - Page looks production-shaped but is clearly labeled sample/local.
  - No one mistakes it for implemented policy backend.
- **Next:** A1.

---

## A1 - System Admin fallback approval queue

- **Goal:** let the configured fallback approver see and decide routed requests.
- **Read first:** `leave.approve_fallback`, RPC `pending_leave_approvals`.
- **Scope:**
  - Reuse M2 approval inbox but gate with `leave.approve OR leave.approve_fallback`.
  - Queue stays filtered by `approver_id = self`.
- **Out of scope:** admin seeing all leave/HR data.
- **Done when:**
  - Admin can approve only routed requests.
  - Admin cannot open HR attendance or private leave history without HR grants.
- **Next:** A2.

## A2 - System Admin workspace closeout

- **Goal:** confirm Roles, Accounts, Audit, Organization and Health surfaces are intentionally aligned.
- **Read first:** `docs/RBAC.md`, `docs/identity-foundation.md`, `nav.js`.
- **Scope:**
  - Verify shown modules match capabilities.
  - Fix labels/routes only; no new admin powers.
  - Document break-glass as a rule, not code.
- **Out of scope:** implementing break-glass workflow.
- **Done when:**
  - No admin module implies automatic HR/commercial access.
  - Break-glass rule is appended to decision changelog.
- **Next:** S1.

---

## S1 - Support Agent UI shape and ticket/task distinction

- **Goal:** make Helpdesk visually and semantically ticket-based, not task-based.
- **Read first:** permission matrix glossary "Critical distinctions"; `data/helpdesk.js`.
- **Scope:**
  - Clarify tickets, queues, SLA/priority labels.
  - Preserve "Task" wording only for Task Box domain.
  - Keep local state for now.
- **Out of scope:** ticket backend, queue membership.
- **Done when:**
  - Priority labels do not rely on color alone.
  - No Create Ticket button creates a task.
- **Next:** S2.

## S2 - Support workspace queue views as UI-only placeholders

- **Goal:** define support workspace pages without inventing backend authorization.
- **Read first:** blueprint Phase 4; permission matrix support capabilities.
- **Scope:**
  - Wire stub pages for Queue Inbox, My Assigned Tickets, Escalations, Knowledge Base, Queue Analytics.
  - Clearly mark sample/local data.
- **Out of scope:** `support_queue_members`, ticket schema, SLA jobs.
- **Done when:**
  - Support role sees only authorized workspaces.
  - Placeholder status is explicit in UI and activity log.
- **Next:** T1.

---

## T1 - Task Box UI cleanup

- **Goal:** keep Task Box as a task-only UI with sample data clearly marked.
- **Read first:** permission matrix distinction; `data/tasks.js`, `data/people.js`.
- **Scope:**
  - Remove task/ticket wording confusion.
  - Preserve task priorities `critical/high/medium/low` with text labels.
- **Out of scope:** task backend.
- **Done when:**
  - Task Box never mentions support tickets as tasks.
- **Next:** T2.

## T2 - Task assignment scope decision record

- **Goal:** write down the task scope model before backend work.
- **Read first:** permission matrix open questions; blueprint task workflow.
- **Scope:**
  - Decide in one short changelog entry whether tasks are self-only, team-assigned, or project-scoped for MVP.
  - Keep the simplest option that fits current manager UI.
- **Out of scope:** schema, RPCs, UI changes.
- **Done when:**
  - Decision is in the changelog below and referenced from B1.
- **Next:** C1.

## C1 - Calendar page real holiday data

- **Goal:** use company holidays from `leave_catalog()`/`my_attendance()` instead of static PH arrays.
- **Read first:** RPC `leave_catalog`; contract holidays; `data/calendarEvents.js`.
- **Scope:**
  - Wire Calendar holiday panel to company holidays.
  - Keep personal events as placeholders if no backend exists.
- **Out of scope:** event backend, recurring holidays.
- **Done when:**
  - Calendar holidays match configured company holidays.
  - Static holiday arrays are no longer used for company holidays.
- **Next:** SET1.

## SET1 - Settings preference source decision

- **Goal:** decide which settings stay local and which need database preferences.
- **Read first:** `data/settings.js`, identity/preferences capabilities.
- **Scope:**
  - Keep local-only preferences local if they are display-only.
  - Mark timezone/locale/notification preferences as backend-pending if not persisted.
- **Out of scope:** preferences schema migration.
- **Done when:**
  - Changelog records local vs backend-pending settings.
- **Next:** B1.

---

## B1 - Backend for Tasks

- **Goal:** implement the smallest task backend matching T2.
- **Read first:** T2 decision; permission matrix; blueprint task workflow.
- **Scope:** one migration with tasks, comments/activity if needed, RLS, RPCs, tests; then wire T1 UI.
- **Out of scope:** tickets, projects as a new domain, assignments beyond chosen scope.
- **Done when:** Task Box uses RPCs and sample arrays are deleted.
- **Next:** B2.

## B2 - Backend for Helpdesk tickets and queues

- **Goal:** implement tickets separately from tasks.
- **Read first:** support queue decision from S2; permission matrix.
- **Scope:** tickets, queue membership, categories, priority labels, assigned queue scope, RLS/RPCs/tests; wire S1/S2 UI.
- **Out of scope:** SLA automation and AI suggestions until later.
- **Done when:** cross-queue denial tests pass and ticket UI is real.
- **Next:** B3.

## B3 - Backend for Policies and acknowledgments

- **Goal:** versioned policies with audience and acknowledgments.
- **Read first:** H8 UI shape; blueprint policy workflow.
- **Scope:** policy versions, publish, audience, acknowledgment RPCs, RLS/tests; wire H8.
- **Out of scope:** document storage UI complexity; use simple text/markdown first.
- **Done when:** HR publishes and Employee acknowledges with audit trail.
- **Next:** B4.

## B4 - Backend for remaining employee/org data

- **Goal:** replace remaining local-only directory/org/request samples where needed.
- **Read first:** identity foundation; current `getDirectory()` behavior.
- **Scope:** only gaps discovered after UI passes; no broad org rewrite.
- **Out of scope:** multi-company support.
- **Done when:** no page silently uses sample data as real data.
- **Next:** B5.

## B5 - Backend for preferences and notification outbox

- **Goal:** persist only preferences and notifications that matter operationally.
- **Read first:** SET1 decision; existing `notifications` table.
- **Scope:** preference fields, outbox pattern for leave/attendance/ticket events, worker.
- **Out of scope:** push notifications, email templates beyond needed events.
- **Done when:** notification reads/marks work with real rows.
- **Next:** Q1.

---

## Q1 - Full security grid

- **Goal:** prove every role/scope rule from the permission matrix.
- **Read first:** `docs/permission-matrix-and-glossary.md` sections 5-8; contract acceptance grid.
- **Scope:** add missing database/browser tests, including manager from another department and system-admin no-HR-access checks.
- **Out of scope:** new features.
- **Done when:** all grid rows pass; failures are fixed before Q2.
- **Next:** Q2.

## Q2 - Retention and operational jobs

- **Goal:** schedule the one-year attendance/medical attachment cleanup.
- **Read first:** contract D17; migration 010 tables.
- **Scope:** one script/job, dry-run flag, audit summary, retention tests.
- **Out of scope:** legal hold workflow unless explicitly requested.
- **Done when:** retention can be run safely and reported.
- **Next:** Q3.

## Q3 - Production/staging deployment checklist

- **Goal:** deploy the slice without surprises.
- **Read first:** `README.md`, `render.yaml`, `vercel.json`, identity foundation deployment section.
- **Scope:** environment vars, Supabase config, Storage bucket, worker schedule, cover redirects, smoke test each role.
- **Out of scope:** new architecture.
- **Done when:** each persona can log in and complete their current authorized flow in staging.
- **Next:** new feature discovery card, only after roadmap review.

---

## 7. Per-role feature coverage target

### Employee

| Feature | UI card | Backend |
|---|---|---|
| Clock in/out | E1 | Done in 010 |
| Attendance history | E2 | Done in 010 |
| Corrections | E2 | Done in 010 |
| Leave balances | E3 | Done in 010 |
| Leave requests | E4-E5 | Done in 010 |
| Dashboard time widgets | E6 | Done in 010 |
| Tasks | T1 | B1 |
| Calendar | C1 | Partial via 010 holidays |
| Policies | H8 | B3 |
| Settings | SET1 | B5 |

### Manager

| Feature | UI card | Backend |
|---|---|---|
| Team attendance | M1 | Done in 010 |
| Leave approvals | M2 | Done in 010 |
| Team leave calendar | M3 | Done in 010 |
| Correction review | M4 | Done in 010 |
| Task assignment scope | T2 | B1 |

### HR Administrator

| Feature | UI card | Backend |
|---|---|---|
| HR attendance overview | H1 | Done in 010 |
| Leave history/balances | H2 | Done in 010 |
| Leave types/policies | H3 | Done in 010 |
| Balance adjustments | H4 | Done in 010 |
| Holidays/shifts | H5 | Done in 010 |
| Fallback approver | H6 | Done in 010 |
| Policies | H8 | B3 |
| HR requests | H7 | Not scoped |

### Support Agent

| Feature | UI card | Backend |
|---|---|---|
| Ticket UI | S1 | B2 |
| Queue views | S2 | B2 |
| Knowledge Base placeholder | S2 | Later |
| Queue analytics placeholder | S2 | Later |

### System Administrator

| Feature | UI card | Backend |
|---|---|---|
| Roles/accounts/audit | A2 | Done in 006-008 |
| Fallback approvals | A1 | Done in 010 |
| Break-glass | A2 rule only | Not implemented |
| Health/integrations | A2 | Partial |

---

## 8. Anti-drift guardrails

Do not add these during the roadmap unless a new explicit card is created:

- Microservices or separate deployables per domain.
- `client/src/features/**` migration.
- New component library, Tailwind, Storybook, Zustand/Redux.
- Generic CRUD admin for every table.
- Payroll, overtime discipline or late deductions.
- Rotating shifts, biometrics, mobile push.
- Sales & Leasing schema or UI.
- Multi-company switching.
- AI/RAG/integrations.
- Break-glass code workflow before the rule is documented.
- REST wrappers for RPC-backed features.

If an idea appears mid-prompt, write it as a **Future idea** at the bottom of a card or in the decision changelog. Do not implement it in the same card.

---

## 9. Done definition for every UI card

A UI card is not done unless:

1. The page reads/writes the intended RPC or clearly states it is still sample/local.
2. Route and action capabilities match `permission-matrix-and-glossary.md`.
3. Errors from RPCs are shown in plain language.
4. No sample array remains for the replaced data.
5. `pnpm build` passes.
6. Relevant tests pass or new tests are added for new behavior.
7. `docs/activity-log.md` gets a short append-only entry.

---

## 10. Decision changelog

Use this table for decisions that change or clarify earlier plans.

| Date | Card | Decision | Supersedes / notes |
|---|---|---|---|
| 2026-11-28 | P0 | Execution ordering is architecture first, Employee UI next, role UI passes, backend-later passes, hardening last. | Supersedes broad blueprint §16 as the active to-do order. |
| 2026-11-28 | P0 | RPC-first is the default for browser data; Express stays small. | Clarifies blueprint REST examples and slice-contract REST paths. |
| 2026-11-28 | P0 | Keep current folder structure; do not migrate to `features/`. | Blueprint §11 remains conceptual only. |
| 2026-11-28 | P0 | Cleanup candidates are removed only after import verification and before feature rewiring; in-use sample modules stay until their feature card. | Prevent accidental deletion of prototype data still driving UI. |
| 2026-11-28 | A2 | Break-glass will be documented as a rule before any code is considered. | No exceptional-access workflow is implemented in this roadmap. |
