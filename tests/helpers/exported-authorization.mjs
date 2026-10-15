import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

/** Reproduce exported grants with synthetic identities; never load staff contact fields. */
export async function exportedAuthorizationFixture({ applyFollowup = true } = {}) {
  const { roleSets, grants } = JSON.parse(fs.readFileSync('tests/fixtures/exported-authorization.json', 'utf8'));
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;`);
    await db.exec(fs.readFileSync('supabase/bootstrap.sql', 'utf8'));
    await db.exec(fs.readFileSync('supabase/migrations/006_rbac.sql', 'utf8'));
    await db.exec('DELETE FROM public.role_permissions');
    for (const grant of grants) {
      if (!grant.role || !grant.permission) throw new Error('Invalid exported grant');
      await db.query('INSERT INTO public.role_permissions SELECT id, $1 FROM public.roles WHERE code = $2', [grant.permission, grant.role]);
    }
    const accounts = [];
    for (const [index, codes] of roleSets.entries()) {
      const id = `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`;
      const primaryRole = codes.find(code => code !== 'employee') || 'employee';
      await db.query('INSERT INTO auth.users(id, email) VALUES ($1, $2)', [id, `${primaryRole}@example.test`]);
      await db.query('UPDATE public.profiles SET is_active = true WHERE id = $1', [id]);
      for (const code of codes) await db.query('INSERT INTO public.user_roles(user_id, role_id) SELECT $1, id FROM public.roles WHERE code = $2', [id, code]);
      accounts.push({id, code:primaryRole});
    }
    if (applyFollowup) await db.exec(fs.readFileSync('supabase/migrations/007_hr_support_authorization.sql', 'utf8'));
    const accessFor = async code => {
      const account = accounts.find(item => item.code === code);
      if (!account) throw new Error(`Missing exported role fixture: ${code}`);
      await db.exec('RESET ROLE');
      await db.query("SELECT set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', 'authenticated', false)", [account.id]);
      await db.exec('SET ROLE authenticated');
      return (await db.query('SELECT public.get_access_context() AS access')).rows[0].access;
    };
    return {db, accessFor, accounts};
  } catch (error) { await db.close(); throw error; }
}
