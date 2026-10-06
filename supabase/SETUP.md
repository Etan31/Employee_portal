# Set up a replacement Supabase project

This creates a fresh database; it does not restore the deleted project's users or records.
The current portal connects authentication and profiles to Supabase. Other screens currently
use demo data from client/src/data and do not persist their changes to this database.

## 1. Create the project

Visit https://supabase.com/dashboard and create a new project in your organization.
Choose a name such as employee-portal-dev, save a strong database password privately,
and choose a nearby region. Wait until provisioning finishes.

## 2. Create the database tables

In the new project's SQL Editor, create a query, paste all of supabase/bootstrap.sql,
and run it once. It runs in a transaction and creates roles, profiles, notifications,
and office_location_history, with RLS and automatic profile creation.

Use this bootstrap alone. The historical v1 and v2 folders overlap, and the old
rls-setup.sql is an example script with duplicate policies and references to missing tables.
No storage buckets are required by the current auth/profile integration.

## 3. Configure local authentication

In Authentication settings, keep Email/password authentication enabled.
Set the Site URL to http://localhost:5173 and add http://localhost:5173/** to the
allowed redirect URLs. If Vite uses another port, use that port instead.

Keep email confirmation enabled. To get a test login immediately, go to
Authentication > Users > Add user > Create new user. Enter your test email and
a unique password and enable Auto Confirm User for that test account.
The database trigger creates its employee profile automatically.
The demo credentials displayed on the login screen are not automatically created.

For an admin account, create the user first, then run this in SQL Editor,
replacing the email with your own account's email:

```sql
update public.profiles
set role_id = (select id from public.roles where name = 'admin')
where email = 'YOUR_ADMIN_EMAIL';
```

## 4. Replace the local environment values

Copy the project URL and publishable key from the project's Connect dialog or
Settings > API Keys into the ROOT .env file using the names in .env.example:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
ALLOWED_ORIGINS=http://localhost:5173
PORT=3000
NODE_ENV=development
```

The secret key is needed for the Express backend. Enter it directly in .env;
never send it through chat or prefix it with VITE_. Frontend login only needs
the two VITE_ values. Remove the old VITE_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_KEY and SUPABASE_JWT_SECRET entries when migrating to the
new values. Never commit .env. The application still accepts legacy anon/service
keys for existing projects, but no JWT signing secret is needed for this setup.

## 5. Restart and verify

Restart the frontend from the repository root with pnpm dev. If pnpm is not
installed, npm run dev also runs the existing script without installing anything
or creating a different lockfile.

For the optional backend, run node server/index.js from the repository root
in another terminal. It loads the same root .env file.

Close other tabs of the old portal. In DevTools > Application > Local Storage,
delete only the deleted project's sb-OLD_PROJECT_REF-auth-token entry.
The new project's URL gives it a separate session storage key.

Log in with the account you created. In Network, password login and the profile
query should succeed, and there should be no repeated failed refresh requests.
In Table Editor > profiles, confirm that your account has the expected role.
Edit your first/last name in the portal and reload to verify that the change persists.
If the backend is running, http://localhost:3000/health/db should report a reachable database.

To check profile access, sign in as two different employee accounts. Each should
only be able to read its own profile. Anonymous requests must not read profiles,
and browser requests must not change role_id or is_active. Admin role changes
are performed in the dashboard or through the authorized backend.

The bootstrap has not been executed until you run it in your new project.
