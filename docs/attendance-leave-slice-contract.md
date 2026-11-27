# Attendance + Leave Slice Contract

**Status:** Phase 0/2/3 design contract. No code yet. This is the first vertical slice:
one employee can clock in/out, request leave, get it approved by their manager, see the
ledger and calendar update. Everything below must be agreed before schema/UI work.

**Why this slice first:** it exercises identity, capabilities, scope checks, RLS, audit,
notifications, timezone handling and calendar in one flow. If this works, the remaining
modules copy the pattern instead of inventing their own.

## 1. Scope

In scope:
- Clock in/out with duplicate/open-shift protection.
- My attendance history (events + derived daily summary).
- Missed-punch correction request and manager review.
- Leave types, policies, requests, approval, cancellation.
- Leave ledger (append-only) and derived balance.
- Team leave calendar and company holidays.
- Audit entries for every decision and balance change.

Out of scope (defer): payroll integration, overtime, biometric devices, variable/rotating
shift scheduling, accrual automation cron, mobile push, AI.

## 2. Decisions locked for this slice

The defaults in the first draft are accepted. Answers to the open questions are folded
in below.

| # | Decision | Locked value | Notes |
|---|---|---|---|
| D1 | Company timezone | `Asia/Manila` | Stored per company; timestamps in UTC, local date derived on write |
| D2 | Workweek | Mon-Fri, excluding company holidays | Configurable later |
| D3 | Expected hours/day | 8 hours | Not used for pay in this slice |
| D4 | Leave unit | **Hours** | Requests and ledger use hours; UI may show day equivalents |
| D5 | Half-day support | Yes | 4 hours AM or PM against a fixed 8-hour shift; stored as hours |
| D6 | Accrual method | Common private-company default: annual grant at year start, monthly pro-rating for new hires, carryover cap 5 days, unused carryover expires Mar 31 | All values configurable per leave type; cron deferred, seed manually |
| D7 | Negative balance | Not allowed except an HR adjustment with reason and audit | |
| D8 | Approver routing | Snapshot current manager at submit. If none, route to a configurable fallback approver, **defaulting to the System Administrator account**. The fallback account needs an explicit `leave.approve` grant; do not grant it to every admin. Scale to role-based fallbacks later. | |
| D9 | Manager transfer mid-request | Snapshot approver at submit; HR/fallback reassigns with audit | |
| D10 | Own leave approval | Always denied | Manager uses their manager or fallback |
| D11 | Overlapping leave | Rejected across active requests | Checked against `leave_request_days` |
| D12 | Holidays/weekends | Excluded from leave hours | Derived from company calendar + workweek |
| D13 | Sick-leave attachments | Not mandatory now; manager accepts/declines. Optional proof upload. Future rule: required after 3 consecutive days absent. Private storage, signed URLs. | Manager/HR read only with case access |
| D14 | Cancellation | Employee may cancel `pending`; `approved` needs approver/HR with reason | |
| D15 | Retention | 1 year for attendance events and medical attachments | Audit and ledger retained with the same 1-year default unless legal policy says longer |
| D16 | Shifts | Fixed shifts; some employees are assigned a specific 8-hour shift | Add `shifts` + `employee_shifts`; schema allows multiple shifts and effective dates |
| D17 | Approved leave vs clock-in | Approved leave **blocks clock-in** for the covered hours/date | Clear message; correction path remains |
| D18 | Attendance purpose | Informational for this slice | No payroll discipline, no overtime calculation |
| D19 | Holidays | Private-company default: no work, no pay; local/regional holidays are configurable and paid only when explicitly marked | `holidays.is_paid` |
| D20 | Payroll | Out of scope | Do not infer pay from attendance |

## 3. Actors and capabilities

| Action | Capability | Scope |
|---|---|---|
| Clock in/out | `time.self` | Own |
| Read own attendance/leave | `time.self` | Own |
| Request leave | `time.self` | Own |
| Request correction | `time.self` | Own |
| Read team attendance/leave | `attendance.review` / `team.read` | Current direct reports |
| Approve/reject leave | `leave.approve` | Current direct reports / delegate |
| Review corrections | `attendance.review` | Current direct reports |
| Read private employment data | `employee.read_private` | Authorized HR scope |
| Read company attendance | `attendance.read_hr` | Authorized HR scope (added in migration 009) |
| Manage leave types/policies | `leave.policy.manage` | Company |
| Adjust balances | `leave.adjust` | Company, reason required |
| Manage holidays | `holiday.manage` | Company |
| Manage shifts/assignments | `employee.update_employment` | Authorized HR scope |
| Read HR reports | `hr.report.read` | Authorized HR scope |
| System admin | none of the above by default | Must be explicitly granted |

`attendance.read_hr` is added by migration 009. HR still needs `employee.read_private`
for private employment fields; the two are separate on purpose. Shift definitions and
assignments are HR employment data, so they reuse `employee.update_employment` rather
than inventing a new capability for this slice.

## 4. Data model

All tables get `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`,
`updated_at` where mutable, `company_id` FK, and RLS enabled. Index FKs and date columns.

### 4.0 Shifts

Fixed shifts, with optional per-employee assignment. This keeps the slice simple while
leaving room for rotating schedules later.

`shifts`
| Column | Type | Notes |
|---|---|---|
| `company_id` | uuid | FK companies |
| `code` | text | unique per company |
| `name` | text | e.g. `Day`, `Mid`, `Night` |
| `start_time` | time | local company time |
| `end_time` | time | may be earlier than start for a night shift |
| `break_minutes` | integer | default 60 |
| `is_active` | boolean | |

`employee_shifts`
| Column | Type | Notes |
|---|---|---|
| `employee_id` | uuid | FK employees |
| `shift_id` | uuid | FK shifts |
| `effective_from` | date | |
| `effective_to` | date nullable | null = current |

Constraint: no overlapping effective ranges per employee. Current shift is resolved by
`effective_from <= today AND (effective_to IS NULL OR effective_to >= today)`.

### 4.1 Attendance

`attendance_events`
| Column | Type | Notes |
|---|---|---|
| `company_id` | uuid | FK companies |
| `employee_id` | uuid | FK employees |
| `event_type` | text | `clock_in` or `clock_out` |
| `occurred_at` | timestamptz | UTC instant |
| `local_date` | date | derived from company timezone at write time |
| `timezone` | text | originating timezone, e.g. `Asia/Manila` |
| `source` | text | `web`, `mobile`, `correction` |
| `correction_request_id` | uuid nullable | links a corrected punch |
| `created_by` | uuid | actor (`auth.uid()`) |

Constraints/indexes:
- index `(employee_id, occurred_at desc)`, `(company_id, local_date)`.
- open-shift validation in RPC: no `clock_in` while an open shift exists; no `clock_out`
  without an open `clock_in`. Do not rely on a unique index alone because multiple
  sessions per day are possible.

`attendance_correction_requests`
| Column | Type | Notes |
|---|---|---|
| `employee_id` | uuid | requester |
| `target_date` | date | local date |
| `requested_event_type` | text | `clock_in` / `clock_out` |
| `requested_time` | timestamptz | corrected instant |
| `reason` | text | required, min length |
| `status` | text | `pending`, `approved`, `rejected`, `cancelled` |
| `reviewed_by` | uuid nullable | manager |
| `reviewed_at` | timestamptz nullable | |
| `decision_reason` | text nullable | required on reject |

### 4.2 Leave

`leave_types`
| Column | Type | Notes |
|---|---|---|
| `code` | text | unique per company |
| `name` | text | |
| `unit` | text | `hours` (default); `days` retained for future types |
| `requires_attachment` | boolean | false now; policy can require after N consecutive days |
| `attachment_after_hours` | numeric nullable | e.g. 24 hours (3 x 8h) for the future sick-leave rule |
| `is_paid` | boolean | payroll out of scope, informational |
| `is_active` | boolean | |

`leave_policies`
| Column | Type | Notes |
|---|---|---|
| `leave_type_id` | uuid | FK |
| `accrual_method` | text | `manual`, `annual`, `monthly` |
| `accrual_rate` | numeric | **hours** per period |
| `max_balance` | numeric nullable | hours |
| `carryover_max` | numeric nullable | hours |
| `effective_from` | date | |
| `effective_to` | date nullable | |

`leave_ledger_entries` (append-only; never update/delete)
| Column | Type | Notes |
|---|---|---|
| `employee_id` | uuid | |
| `leave_type_id` | uuid | |
| `entry_type` | text | `accrual`, `usage`, `adjustment`, `correction`, `carryover`, `expiry` |
| `amount` | numeric | positive credit, negative debit |
| `effective_date` | date | |
| `reference_type` | text nullable | `leave_request`, `manual`, etc. |
| `reference_id` | uuid nullable | |
| `reason` | text | required for adjustment/correction |
| `created_by` | uuid | |

Index `(employee_id, leave_type_id, effective_date)`.

`leave_requests`
| Column | Type | Notes |
|---|---|---|
| `employee_id` | uuid | requester |
| `leave_type_id` | uuid | |
| `approver_id` | uuid | snapshot at submit; fallback approver when no manager |
| `start_date` / `end_date` | date | |
| `start_time` / `end_time` | time nullable | optional; omit for full-day requests |
| `total_hours` | numeric | computed excluding weekends/holidays; 8h per full shift day |
| `reason` | text | |
| `status` | text | `draft`, `pending`, `approved`, `rejected`, `cancelled` |
| `submitted_at` | timestamptz nullable | |
| `decided_by` / `decided_at` | uuid/timestamptz nullable | |
| `decision_reason` | text nullable | required on reject/cancel |

`leave_request_days` (one row per working date; supports partial days)
| Column | Type | Notes |
|---|---|---|
| `leave_request_id` | uuid | FK |
| `work_date` | date | |
| `hours` | numeric | e.g. 8 for full day, 4 for half day |
| `day_portion` | text nullable | `full`, `am`, `pm`; convenience label |

Unique `(leave_request_id, work_date)`. Overlap check is against these rows, not just
the date range. A request cannot overlap an approved or pending request for the same
employee and leave type unless policy explicitly allows it.

`leave_request_attachments` (private storage)
| Column | Type | Notes |
|---|---|---|
| `leave_request_id` | uuid | |
| `storage_path` | text | private bucket path |
| `file_name` / `mime_type` / `size_bytes` | | |
| `uploaded_by` | uuid | |

`leave_request_events` (append-only workflow history)
| Column | Type | Notes |
|---|---|---|
| `leave_request_id` | uuid | |
| `actor_id` | uuid | |
| `action` | text | `submitted`, `approved`, `rejected`, `cancelled`, `reassigned` |
| `from_status` / `to_status` | text | |
| `reason` | text nullable | |

`holidays`
| Column | Type | Notes |
|---|---|---|
| `holiday_date` | date | unique per company |
| `name` | text | |
| `is_paid` | boolean | default false; local/regional holidays are opt-in |

### 4.3 Derived views (not tables)

- `v_employee_leave_balance` = `sum(amount)` per employee/type from ledger, in hours.
- `v_daily_attendance` = events + approved leave + holiday + workweek + current shift ->
  `present`, `late`, `absent`, `on_leave`, `holiday`, `weekend`, `incomplete`.
- Never store a mutable `balance` column. Derive it; cache later only if measured.

## 5. State machines

Attendance event: no state; validated at insert. A clock-in is rejected when an approved
leave request covers the current local date/time (D17). The employee must use the
correction path or contact HR.

Correction request:
`pending -> approved | rejected | cancelled` (terminal).

Leave request:
`draft -> pending -> approved | rejected`
`pending -> cancelled`
`approved -> cancelled` (approver/HR only, with reason)
No transition back to pending. Re-submission creates a new request.

All transitions run in a transaction that also writes `leave_request_events` and
`staff_audit`/`access_audit` as appropriate.

## 6. API / RPC contracts

Prefer transactional Postgres RPCs for writes, wrapped by Express endpoints. Direct
Supabase reads use RLS. Errors: `42501` forbidden, `22023` invalid input, `23505`
conflict, `P0001` business rule.

| Method / path | Auth | Body / query | Result | Errors |
|---|---|---|---|---|
| `POST /api/attendance/clock` | `time.self` | `{ event_type, occurred_at, timezone? }` | `{ event }` | 400 invalid, 409 duplicate/open shift/approved leave, 403 inactive |
| `GET /api/attendance/me` | `time.self` | `from`, `to` | `{ events, days }` | 400 range |
| `POST /api/attendance/corrections` | `time.self` | `{ target_date, requested_event_type, requested_time, reason }` | `{ request }` | 400, 409 duplicate |
| `GET /api/attendance/corrections/me` | `time.self` | | `{ requests }` | |
| `GET /api/attendance/team` | `attendance.review` | `from`, `to` | scoped roster + exceptions | 403 |
| `POST /api/attendance/corrections/:id/decision` | `attendance.review` | `{ decision, reason }` | `{ request }` | 403 scope, 409 state |
| `GET /api/leave/types` | `time.self` | | active types + policy summary | |
| `GET /api/leave/balances/me` | `time.self` | | derived balances | |
| `POST /api/leave/requests` | `time.self` | `{ leave_type_id, start_date, end_date, start_time?, end_time?, total_hours?, reason, attachment_ids? }` | `{ request }` | 400, 409 overlap/insufficient balance, 403 self-approval guard |
| `GET /api/leave/requests/me` | `time.self` | `status?` | `{ requests }` | |
| `POST /api/leave/requests/:id/cancel` | `time.self` | `{ reason }` | `{ request }` | 403, 409 state |
| `GET /api/leave/approvals` | `leave.approve` | `status=pending` | scoped queue | 403 |
| `POST /api/leave/requests/:id/decision` | `leave.approve` | `{ decision, reason }` | `{ request }` | 403 not approver/self, 409 state |
| `GET /api/calendar` | `calendar.read` | `from`, `to`, `scope=me|team|company` | events filtered by scope | 403 scope |
| `POST /api/leave/adjustments` | `leave.adjust` | `{ employee_id, leave_type_id, amount, reason }` | `{ entry }` | 400 reason, 403 |
| `POST /api/holidays` | `holiday.manage` | `{ date, name, is_paid }` | `{ holiday }` | 400 duplicate |

## 7. RLS policy intents

- `attendance_events`: select when `employee_id = self`; or actor has `attendance.review`
  and employee is a current direct report; or actor has `employee.read_private` and
  employee is in authorized HR scope. Insert only via RPC.
- `attendance_correction_requests`: select self or reviewer scope; insert self; update
  reviewer only, via RPC.
- `leave_requests`: select self, `approver_id = self`, or HR scope; insert self; update
  only via decision/cancel RPCs.
- `leave_request_days` / `leave_request_attachments`: inherit request access; attachments
  additionally require request visibility.
- `leave_ledger_entries`: select self or HR scope; insert only via RPC; no update/delete.
- `leave_types` / `leave_policies` / `holidays`: read all active company rows; write HR.
- `leave_request_events`: read with request; append only via RPC.
- Deny direct writes from browser to all event/ledger/workflow tables; revoke and use
  security-definer RPCs that recheck current grants and active status.

## 8. Audit events

Every row in `staff_audit` / `access_audit` should capture actor, action, entity type/id,
before/after (no attachment contents), reason, request id, timestamp:
- `attendance.clock_in`, `attendance.clock_out`, `attendance.correction.request`,
  `attendance.correction.decide`
- `leave.request.submit`, `leave.request.decision`, `leave.request.cancel`,
  `leave.request.reassign`, `leave.balance.adjust`, `holiday.create`
- `leave.policy.update`, `leave.type.update`

## 9. Acceptance test grid

Run each against a seeded company with Employee, Manager (owner's), Manager (other dept),
HR, Support Agent, System Admin, multi-role, disabled user.

| # | Scenario | Expected |
|---|---|---|
| A1 | Employee clocks in twice without clocking out | 409, no second event |
| A2 | Employee clocks out with no open shift | 409 |
| A3 | Clock at 23:59 local / 15:59 UTC | `local_date` uses company timezone |
| A4 | Employee reads another employee's events | 403 / empty |
| A5 | Manager reads direct report events | allowed, team scope |
| A6 | Manager reads other department | 403 |
| A7 | HR reads attendance | allowed only with `attendance.read_hr` |
| A8 | System admin reads attendance without HR grant | 403 |
| A9 | Suspended user with old JWT clocks in | 403 |
| A10 | Clock in on approved leave | 409, no event |
| A11 | Night shift crosses midnight | events attach to the correct shift/day |
| L1 | Employee submits valid leave | `pending`, approver snapshot |
| L2 | Submit overlapping leave | 409 |
| L3 | Submit leave exceeding balance | 409 (negative balance denied) |
| L4 | Submit leave spanning weekend + holiday | `total_hours` excludes them |
| L5 | Half-day request | `total_hours` = 4 for that date |
| L6 | Manager approves direct report | `approved` + negative ledger entry atomically |
| L7 | Manager rejects without reason | 400 |
| L8 | Manager approves own leave | 403 |
| L9 | Other manager approves | 403 |
| L10 | HR adjusts balance without reason | 400 |
| L11 | HR adjusts with reason | ledger entry + audit |
| L12 | Two approvals race | one succeeds, second 409; ledger stays consistent |
| L13 | Employee cancels pending | `cancelled` |
| L14 | Employee cancels approved | 403 unless approver/HR |
| L15 | Calendar shows approved leave to team, hides reason | allowed fields only |
| L16 | Disabled user requests leave | 403 |
| L17 | Employee with no manager submits leave | routed to fallback approver, not auto-approved |
| L18 | Fallback approver is the requester | blocked or escalated, never self-approved |
| L19 | Sick leave > 3 consecutive days | optional now; future policy can require proof |
| L20 | Approved leave covers current shift | clock-in blocked with a clear message |

## 10. Edge cases to design for now

- Timezone/DST: store UTC, derive local date at write; test a DST-free zone first.
- Night shift crossing midnight: resolve the shift window from `employee_shifts`; attach
  events to the shift's business date, not blindly to `local_date`.
- Manager transfer between submit and decision: snapshot approver; fallback/HR reassigns
  with audit.
- Employee with no manager: route to the configured fallback approver (default: System
  Administrator account with an explicit `leave.approve` grant), never auto-approve.
- Fallback approver is also the requester: route one level up; if none, block submission
  with a clear message instead of self-approval.
- Leave crossing month/year: one ledger usage entry per request with
  `effective_date = start_date`; split only if policy requires per-period reporting.
- Attachments: private bucket, signed URL expiry, no public URLs, virus scanning later.
- Optional proof for sick leave now; require it after 3 consecutive days (24h) in a
  future policy change. Manager/HR read only with case access.
- Idempotency: decision/cancel endpoints accept `Idempotency-Key` or reject repeated
  transitions with 409.
- Clock source: server time authoritative; client timestamp only as a hint and stored.
- Retention job: purge attendance events and medical attachments after 1 year; keep
  audit/ledger according to the same default until legal says otherwise.
- Rounding: store hours to two decimals; reject values that are not in the configured
  increment (default 0.5h).

## 11. Remaining open questions (not blockers for schema)

The 10 original questions are answered in Section 2. These are follow-ups for HR/Admin:

1. Exact accrual values per leave type (hours/year, carryover cap, expiry date).
2. Which local/regional holidays are paid, and who maintains the list.
3. Night-shift business-date rule if a shift crosses midnight.
4. The specific fallback approver account and whether a dedicated role replaces it later.
5. Whether the 3-consecutive-day sick-leave proof rule counts calendar days or working days.
6. Whether lateness should ever feed payroll; currently informational only.
7. Whether leave can be requested in 0.5h increments or only whole/half days.
8. Retention exceptions for legal holds or investigations.

## 12. Definition of done

- Schema migration + RLS + RPCs applied in staging, including shifts and `attendance.read_hr`.
- API endpoints return documented errors.
- Employee, Manager and HR screens read/write real data (no sample arrays).
- Approved leave blocks clock-in; night-shift boundaries behave correctly.
- Acceptance grid passes for all roles, including negative cases.
- Audit rows verified for submit/decision/adjust.
- Timezone and concurrency tests pass.
- 1-year retention job exists (or is scheduled) for attendance events and attachments.
- `pnpm test:rbac` and the new slice tests run in CI.
