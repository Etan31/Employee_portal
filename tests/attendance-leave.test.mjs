import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migrations = [
  'supabase/migrations/006_rbac.sql',
  'supabase/migrations/007_hr_support_authorization.sql',
  'supabase/migrations/008_identity_foundation.sql',
  'supabase/migrations/009_permission_gaps.sql',
  'supabase/migrations/010_attendance_leave.sql',
];

const userIds = {
  admin: '00000000-0000-0000-0000-000000000001',
  manager: '00000000-0000-0000-0000-000000000002',
  employee: '00000000-0000-0000-0000-000000000003',
  hr: '00000000-0000-0000-0000-000000000004',
  other: '00000000-0000-0000-0000-000000000005',
};

async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb, email_confirmed_at timestamptz, invited_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;`);
  await db.exec(fs.readFileSync('supabase/bootstrap.sql', 'utf8'));

  for (const [name, id] of Object.entries(userIds)) {
    await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,now())', [id, `${name}@example.test`]);
  }
  await db.query(`UPDATE public.profiles SET first_name=v.first_name,last_name=v.last_name,role_id=v.role_id,is_active=true
    FROM (VALUES
      ($1::uuid,'Ada','Admin',1::bigint),
      ($2::uuid,'Mia','Manager',2::bigint),
      ($3::uuid,'Eli','Employee',3::bigint),
      ($4::uuid,'Hana','HR',4::bigint),
      ($5::uuid,'Oscar','Other',3::bigint)
    ) AS v(id,first_name,last_name,role_id)
    WHERE public.profiles.id=v.id`, Object.values(userIds));

  for (const file of migrations) {
    await db.exec(fs.readFileSync(file, 'utf8'));
  }

  const employees = Object.fromEntries((await db.query(
    'SELECT id, auth_user_id FROM public.employees'
  )).rows.map(row => [Object.entries(userIds).find(([, id]) => id === row.auth_user_id)[0], row.id]));

  const department = (await db.query(
    "INSERT INTO public.departments(company_id,name) VALUES((SELECT id FROM public.companies LIMIT 1),'Operations') RETURNING id"
  )).rows[0].id;

  await db.query('UPDATE public.employees SET department_id=$1 WHERE id = ANY($2::uuid[])', [
    department,
    [employees.admin, employees.manager, employees.employee, employees.hr, employees.other],
  ]);
  await db.query('UPDATE public.employees SET manager_id=$1 WHERE id = ANY($2::uuid[])', [
    employees.manager,
    [employees.employee, employees.other],
  ]);

  return { db, employees };
}

async function asUser(db, id) {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', 'authenticated', false)", [id]);
  await db.exec('SET ROLE authenticated');
}

async function asSystem(db) {
  await db.exec('RESET ROLE');
}

async function call(db, fn, args = []) {
  const placeholders = args.map((_, index) => `$${index + 1}`).join(',');
  const { rows } = await db.query(`SELECT public.${fn}(${placeholders}) AS result`, args);
  return rows[0]?.result;
}

test('attendance/leave slice enforces hours, balances, fallback approval and scopes', async () => {
  const { db, employees } = await setup();
  try {
    // HR configures a fixed day shift and assigns it.
    await asUser(db, userIds.hr);
    const shiftId = await call(db, 'save_shift', ['day', 'Day Shift', '09:00', '18:00', 60]);
    await call(db, 'assign_shift', [employees.employee, shiftId, '2020-01-01', null]);
    await call(db, 'assign_shift', [employees.other, shiftId, '2020-01-01', null]);
    const studyId = await call(db, 'save_leave_type', ['study', 'Study Leave', true, true, 24]);
    await call(db, 'save_leave_policy', [studyId, 'monthly', 10, 60, 20, false, '2026-01-01', null]);
    await call(db, 'save_holiday', ['2026-12-25', 'Christmas Day', true]);
    const catalog = await call(db, 'leave_catalog');
    assert.ok(catalog.types.some(item => item.code === 'study' && item.requires_attachment));
    assert.ok(catalog.holidays.some(item => item.name === 'Christmas Day'));

    // Employee clocks in, cannot double clock in, then clocks out.
    await asUser(db, userIds.employee);
    const clockIn = await call(db, 'clock_attendance', ['clock_in', '2026-11-27T09:00:00+08:00']);
    assert.equal(clockIn.event_type, 'clock_in');
    await assert.rejects(call(db, 'clock_attendance', ['clock_in', '2026-11-27T09:01:00+08:00']), /already clocked in/);
    await call(db, 'clock_attendance', ['clock_out', '2026-11-27T18:00:00+08:00']);
    await assert.rejects(call(db, 'clock_attendance', ['clock_out', '2026-11-27T18:01:00+08:00']), /No open shift/);

    const attendance = await call(db, 'my_attendance', ['2026-11-27', '2026-11-27']);
    assert.equal(attendance.events.length, 2);

    // Missed-punch correction: request, manager review, event created.
    const correctionId = await call(db, 'request_attendance_correction', [
      '2020-01-02', 'clock_in', '2020-01-02T09:00:00+08:00', 'Missed punch entry',
    ]);
    await asUser(db, userIds.manager);
    await call(db, 'review_attendance_correction', [correctionId, 'approved', null]);
    await asUser(db, userIds.employee);
    const corrected = await call(db, 'my_attendance', ['2020-01-01', '2020-01-03']);
    assert.equal(corrected.events.length, 1);

    // Leave is counted in hours. 2 working days x 8h.
    const leaveId = await call(db, 'create_leave_request', [
      (await db.query("SELECT id FROM public.leave_types WHERE code='annual'")).rows[0].id,
      '2026-12-01', '2026-12-02', null, null, 'Family trip',
    ]);
    const pending = await db.query('SELECT total_hours, status, approver_id FROM public.leave_requests WHERE id=$1', [leaveId]);
    assert.equal(Number(pending.rows[0].total_hours), 16);
    assert.equal(pending.rows[0].status, 'pending');
    assert.equal(pending.rows[0].approver_id, employees.manager);

    await assert.rejects(call(db, 'create_leave_request', [
      (await db.query("SELECT id FROM public.leave_types WHERE code='annual'")).rows[0].id,
      '2026-12-02', '2026-12-02', null, null, 'Overlap',
    ]), /Leave already exists/);

    // Manager sees and approves it.
    await asUser(db, userIds.manager);
    const queue = await call(db, 'pending_leave_approvals');
    assert.equal(queue.length, 1);
    assert.equal(queue[0].id, leaveId);
    await call(db, 'decide_leave_request', [leaveId, 'approved', 'Approved']);

    await asUser(db, userIds.employee);
    const balances = await call(db, 'my_leave_balances');
    const annual = balances.find(item => item.code === 'annual');
    assert.equal(Number(annual.balance_hours), 104);
    assert.equal(Number(annual.used_hours), 16);

    // Approved leave blocks clock-in.
    await assert.rejects(call(db, 'clock_attendance', ['clock_in', '2026-12-01T09:00:00+08:00']), /clock-in is blocked/);

    // Partial day = 4 hours.
    const halfDayId = await call(db, 'create_leave_request', [
      (await db.query("SELECT id FROM public.leave_types WHERE code='annual'")).rows[0].id,
      '2026-12-04', '2026-12-04', '09:00', '13:00', 'Half day',
    ]);
    const halfDay = await db.query('SELECT total_hours FROM public.leave_requests WHERE id=$1', [halfDayId]);
    assert.equal(Number(halfDay.rows[0].total_hours), 4);

    // Fallback approver: an employee without a manager routes to the admin.
    await asSystem(db);
    await db.query('UPDATE public.employees SET manager_id=NULL WHERE id=$1', [employees.employee]);
    await asUser(db, userIds.employee);
    const fallbackId = await call(db, 'create_leave_request', [
      (await db.query("SELECT id FROM public.leave_types WHERE code='annual'")).rows[0].id,
      '2026-12-08', '2026-12-08', null, null, 'Fallback route',
    ]);
    const fallback = await db.query('SELECT approver_id FROM public.leave_requests WHERE id=$1', [fallbackId]);
    assert.equal(fallback.rows[0].approver_id, employees.admin);

    await asUser(db, userIds.admin);
    const adminQueue = await call(db, 'pending_leave_approvals');
    assert.ok(adminQueue.some(item => item.id === fallbackId));
    await call(db, 'decide_leave_request', [fallbackId, 'approved', 'Fallback approval']);

    // Restore the reporting line before checking manager scope.
    await asSystem(db);
    await db.query('UPDATE public.employees SET manager_id=$1 WHERE id=$2', [employees.manager, employees.employee]);

    // RLS: employee sees own attendance, manager sees direct report, others do not.
    await asUser(db, userIds.employee);
    assert.equal((await db.query('SELECT * FROM public.attendance_events')).rows.length, 3);
    await asUser(db, userIds.manager);
    assert.equal((await db.query('SELECT * FROM public.attendance_events')).rows.length, 3);
    await asUser(db, userIds.other);
    assert.equal((await db.query('SELECT * FROM public.attendance_events')).rows.length, 0);
    await asUser(db, userIds.admin);
    assert.equal((await db.query('SELECT * FROM public.attendance_events')).rows.length, 0);
    await asUser(db, userIds.hr);
    assert.equal((await db.query('SELECT * FROM public.attendance_events')).rows.length, 3);

    // HR can adjust a balance; negative paid balance is refused at request time.
    await asUser(db, userIds.hr);
    await call(db, 'adjust_leave_balance', [employees.employee,
      (await db.query("SELECT id FROM public.leave_types WHERE code='annual'")).rows[0].id, -10, 'Correction']);
    await asUser(db, userIds.employee);
    const adjusted = await call(db, 'my_leave_balances');
    assert.equal(Number(adjusted.find(item => item.code === 'annual').balance_hours), 86);

    // Paid leave cannot overdraw the remaining balance.
    await assert.rejects(call(db, 'create_leave_request', [
      (await db.query("SELECT id FROM public.leave_types WHERE code='annual'")).rows[0].id,
      '2027-01-04', '2027-01-22', null, null, 'Too much leave',
    ]), /Insufficient leave balance/);

    // Unpaid leave is not balance-limited.
    const lwopId = await call(db, 'create_leave_request', [
      (await db.query("SELECT id FROM public.leave_types WHERE code='lwop'")).rows[0].id,
      '2027-02-01', '2027-02-01', null, null, 'Unpaid personal leave',
    ]);
    await asUser(db, userIds.manager);
    await call(db, 'decide_leave_request', [lwopId, 'approved', 'Approved unpaid leave']);
    await asUser(db, userIds.employee);
    const withUnpaid = await call(db, 'my_leave_balances');
    const lwop = withUnpaid.find(item => item.code === 'lwop');
    assert.equal(lwop.is_paid, false);
    assert.equal(Number(lwop.used_hours), 8);

    // Self-approval is denied even if the approver field is pointed at the requester.
    await asUser(db, userIds.manager);
    const managerLeave = await call(db, 'create_leave_request', [
      (await db.query("SELECT id FROM public.leave_types WHERE code='annual'")).rows[0].id,
      '2027-03-01', '2027-03-01', null, null, 'Manager leave',
    ]);
    await asSystem(db);
    await db.query('UPDATE public.leave_requests SET approver_id=$1 WHERE id=$2', [employees.manager, managerLeave]);
    await asUser(db, userIds.manager);
    await assert.rejects(call(db, 'decide_leave_request', [managerLeave, 'approved', 'Self approval']), /Access denied/);

    // Browser users cannot write directly to the tables.
    await asUser(db, userIds.employee);
    await assert.rejects(db.query(
      `INSERT INTO public.attendance_events(company_id,employee_id,event_type,occurred_at,local_date,timezone)
       VALUES((SELECT id FROM public.companies LIMIT 1),$1,'clock_in',now(),current_date,'Asia/Manila')`,
      [employees.employee]
    ), /permission denied/);

    // Manager sees the team calendar; an unrelated employee does not.
    await asUser(db, userIds.manager);
    const teamCalendar = await call(db, 'team_leave_calendar', ['2026-12-01', '2026-12-31']);
    assert.ok(teamCalendar.length >= 2);
    await asUser(db, userIds.other);
    await assert.rejects(call(db, 'team_leave_calendar', ['2026-12-01', '2026-12-31']), /Access denied/);
  } finally {
    await asSystem(db);
    await db.close();
  }
});
