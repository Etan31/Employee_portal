import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = fs.readFileSync('supabase/migrations/006_rbac.sql', 'utf8');
// Exercise the role preflight independently; full migration/RLS tests live in rbac.test.mjs.
const preflight = migration.slice(0, migration.indexOf('CREATE TABLE IF NOT EXISTS public.permissions')) + '\nCOMMIT;';
const identityTables = `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE TABLE public.roles(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text UNIQUE NOT NULL);
  CREATE TABLE public.profiles(
    id uuid PRIMARY KEY, email text NOT NULL, first_name text, last_name text, avatar_url text,
    role_id bigint, is_active boolean NOT NULL DEFAULT true
  );
  CREATE TABLE public.notifications(user_id uuid, is_read boolean DEFAULT false);`;
for (const existing of [false, true]) {
  test(`role preflight supports ${existing ? 'existing codes and constraints' : 'the supplied five role names'}`, async () => {
    const db = new PGlite();
    try {
      await db.exec(`${identityTables}
        INSERT INTO public.roles(name) VALUES ('admin'), ('manager'), ('employee'), ('hr administrator'), ('support agent'), ('Custom Reviewer');`);
      if (existing) {
        await db.exec(`ALTER TABLE public.roles ADD COLUMN code text;
          UPDATE public.roles SET code = CASE name WHEN 'Custom Reviewer' THEN 'reviewer_custom' WHEN 'employee' THEN '' ELSE replace(name, ' ', '_') END;
          UPDATE public.roles SET code = NULL WHERE name = 'manager';
          ALTER TABLE public.roles ADD CONSTRAINT roles_code_unique UNIQUE(code);`);
      }
      await db.exec(preflight);
      const rows = (await db.query('SELECT name, code FROM public.roles ORDER BY id')).rows;
      assert.equal(rows.length, 6);
      assert.deepEqual(rows.slice(0, 5).map(row => row.code), ['admin','manager','employee','hr_administrator','support_agent']);
      assert.equal(rows[5].code, existing ? 'reviewer_custom' : 'custom_reviewer');
      // The preflight tolerates its own constraints on retry; the full migration is still one-time.
      await db.exec(preflight);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM public.roles')).rows[0].count, 6);
    } finally { await db.close(); }
  });
}

test('existing permissions table is reused without losing custom permissions', async () => {
  const db = new PGlite();
  try {
    await db.exec(`${identityTables}
      INSERT INTO public.roles(name) VALUES ('employee');
      CREATE TABLE public.permissions(code text PRIMARY KEY);
      INSERT INTO public.permissions VALUES ('custom.review');`);
    const prefix = migration.slice(0, migration.indexOf('ALTER TABLE public.profiles ALTER COLUMN role_id DROP DEFAULT;')) + '\nCOMMIT;';
    // Identity-table references are needed to create user_roles, even for this partial-schema fixture.
    await db.exec('CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);');
    await db.exec(prefix);
    assert.equal((await db.query("SELECT code FROM public.permissions WHERE code = 'custom.review'")).rows.length, 1);
    assert.equal((await db.query("SELECT code FROM public.permissions WHERE code = 'profile.self'")).rows.length, 1);
  } finally { await db.close(); }
});

test('incompatible existing permissions schema aborts before changing data', async () => {
  const db = new PGlite();
  try {
    await db.exec(`${identityTables}
      CREATE TABLE public.permissions(name text PRIMARY KEY);`);
    await assert.rejects(db.exec(preflight), /Cannot convert RBAC schema: public.permissions.code must be text/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query("SELECT to_regclass('public.roles') AS roles")).rows[0].roles, 'roles');
    assert.equal((await db.query("SELECT count(*)::int AS count FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'code'")).rows[0].count, 0);
  } finally { await db.close(); }
});

test('existing empty grant table seeds once and partially populated assignments are backfilled once', async () => {
  const db = new PGlite();
  const migrationSql = fs.readFileSync('supabase/migrations/006_rbac.sql', 'utf8');
  const bootstrapSql = fs.readFileSync('supabase/bootstrap.sql', 'utf8');
  const adminId = '00000000-0000-0000-0000-000000000001';
  const employeeId = '00000000-0000-0000-0000-000000000002';
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;`);
    await db.exec(bootstrapSql);
    await db.query('INSERT INTO auth.users(id, email) VALUES ($1, $2), ($3, $4)',
      [adminId, 'admin@example.test', employeeId, 'employee@example.test']);
    await db.query("UPDATE public.profiles SET role_id = (SELECT id FROM public.roles WHERE name = 'admin') WHERE id = $1", [adminId]);
    await db.query("UPDATE public.profiles SET role_id = (SELECT id FROM public.roles WHERE name = 'employee') WHERE id = $1", [employeeId]);
    await db.exec(`CREATE TABLE public.permissions(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
        description text, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.role_permissions(
        role_id bigint NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
        permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
        PRIMARY KEY(role_id, permission_id)
      );
      CREATE TABLE public.user_roles(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        role_id bigint NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
        assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
        assigned_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, role_id)
      );
      INSERT INTO public.user_roles(user_id, role_id)
      SELECT p.id, r.id FROM public.profiles p CROSS JOIN public.roles r
      WHERE p.id = '${adminId}' AND r.name = 'admin';`);
    await db.exec(migrationSql);

    assert.ok((await db.query("SELECT 1 FROM public.role_permissions WHERE permission_code = 'role.assign'")).rows.length > 0);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.user_roles')).rows[0].count, 2);
    assert.ok((await db.query(`SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.user_roles'::regclass AND contype = 'f'
        AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_roles'::regclass AND attname = 'granted_by')]::smallint[]
        AND confrelid = 'auth.users'::regclass`)).rows.length > 0);

    await db.exec(`DELETE FROM public.user_roles WHERE user_id = '${employeeId}';
      DELETE FROM public.role_permissions
      WHERE role_id = (SELECT id FROM public.roles WHERE name = 'employee') AND permission_code = 'time.self';`);
    await db.exec(migrationSql);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.user_roles WHERE user_id = $1', [employeeId])).rows[0].count, 0);
    assert.equal((await db.query("SELECT count(*)::int AS count FROM public.role_permissions WHERE permission_code = 'time.self' AND role_id = (SELECT id FROM public.roles WHERE name = 'employee')")).rows[0].count, 0);
  } finally { await db.close(); }
});
