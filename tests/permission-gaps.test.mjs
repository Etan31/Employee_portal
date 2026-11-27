import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = fs.readFileSync('supabase/migrations/009_permission_gaps.sql', 'utf8');

async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;`);
  await db.exec(fs.readFileSync('supabase/bootstrap.sql', 'utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/006_rbac.sql', 'utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/007_hr_support_authorization.sql', 'utf8'));
  return db;
}

async function grantsFor(db, role) {
  const { rows } = await db.query(
    `SELECT rp.permission_code FROM public.role_permissions rp
     JOIN public.roles r ON r.id = rp.role_id
     WHERE r.code = $1 ORDER BY rp.permission_code`, [role]);
  return rows.map(row => row.permission_code);
}

test('migration 009 adds explicit gap capabilities without broadening HR/admin access', async () => {
  const db = await setup();
  try {
    await db.exec(migration);

    const permissions = (await db.query('SELECT code FROM public.permissions ORDER BY code')).rows.map(row => row.code);
    for (const code of ['notification.read', 'knowledge.read', 'feature_flag.manage', 'attendance.read_hr']) {
      assert.ok(permissions.includes(code), code);
    }

    for (const role of ['employee', 'manager', 'hr_administrator', 'support_agent', 'admin']) {
      assert.ok((await grantsFor(db, role)).includes('notification.read'), role);
      assert.ok((await grantsFor(db, role)).includes('knowledge.read'), role);
    }
    assert.ok((await grantsFor(db, 'admin')).includes('feature_flag.manage'));
    assert.ok((await grantsFor(db, 'hr_administrator')).includes('attendance.read_hr'));
    for (const role of ['employee', 'manager', 'support_agent', 'admin']) {
      assert.equal((await grantsFor(db, role)).includes('attendance.read_hr'), false, role);
    }
  } finally {
    await db.close();
  }
});

test('migration 009 is idempotent and does not restore revoked grants', async () => {
  const db = await setup();
  try {
    await db.exec(migration);
    await db.exec(`DELETE FROM public.role_permissions
      WHERE permission_code = 'feature_flag.manage'
        AND role_id = (SELECT id FROM public.roles WHERE code = 'admin')`);
    await db.exec(migration);

    assert.equal((await grantsFor(db, 'admin')).includes('feature_flag.manage'), false);
    assert.ok((await db.query("SELECT 1 FROM public.permissions WHERE code = 'feature_flag.manage'")).rows.length === 1);
  } finally {
    await db.close();
  }
});
