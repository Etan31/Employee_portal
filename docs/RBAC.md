# RBAC setup

The portal uses Supabase Auth for identity and database permissions for access. The client and Express share `get_access_context`; neither grants access from role names or numeric IDs.

## Apply to the existing project

**After the implemented 006 migration:** apply `supabase/migrations/007_hr_support_authorization.sql` once in SQL Editor, then sign in again (or refocus the portal to revalidate access). The supplied export has HR and Support assignments without permissions for those roles. This follow-up explicitly adds their shared employee and workspace capabilities. It leaves Admin/Manager grants and all account assignments intact. A private migration marker prevents retries from restoring rights revoked afterward. No rerun of 006 is required for this follow-up.

Successful login selects `#/admin`, `#/manager`, `#/hr`, `#/support`, or `#/dashboard` from current effective permissions. Multi-role users can access every workspace they have been granted; an authorized requested destination takes precedence. Workspace child routes require both their workspace-entry capability and their action capability. Role names alone grant no access.

1. Back up the database and inspect existing roles and identity-table policies. Apply the entire `supabase/migrations/006_rbac.sql` in Supabase SQL Editor before deploying this client/API. Do not rerun `bootstrap.sql` on an existing project.
   Retries reuse compatible tables/indexes and replace migration-owned functions, policies and the profile trigger. Populated role codes are preserved; only missing/blank codes are filled. Existing codes must be unique lowercase identifiers matching the intended permission seeds. A mismatched table definition stops the migration for inspection rather than deleting data. Do not rerun the legacy `rls-setup.sql` (it contains a duplicate policy and assumes additional tables).
2. The migration recognizes `admin`/`System Administrator`, `manager`, `employee`, `hr`/`HR Admin`/`HR Administrator`, and `Support Agent`. Duplicate aliases stop the transaction; reconcile duplicate role records first. Other role names are preserved but receive no automatic permissions. Check their grants explicitly.
3. First-time setup is recorded in the private `rbac_private.migration_state` table, not inferred from whether the RBAC tables exist. When the role-grant table is empty on the first run, standard grants are seeded once; if it already contains grants, those are treated as administrator-configured and left unchanged. Legacy `profiles.role_id` assignments are imported once, per missing user/role pair, including when `user_roles` already has some rows. Retries do not restore grants or role assignments removed later. If configured grants do not include `role.assign`, migration stops before changing access policies; provision that capability deliberately. `user_roles` becomes authoritative; changing `profiles.role_id` afterward is rejected.
4. Disable public signup in Supabase Authentication settings. Newly created identities are inactive and unassigned even if signup remains enabled. Provision accounts through the trusted Supabase dashboard; activate approved profiles there and assign roles through an existing admin's **Roles & Permissions** page.
5. Test one account per role plus a multi-role account. Verify the login destination, direct forbidden URLs, profile editing, role removal and inactive-account denial.

For a fresh database, run `bootstrap.sql` first, then `006_rbac.sql`. To provision the first administrator after migration, run the following in the trusted SQL Editor, replacing the placeholder with the intended existing account:

```sql
begin;
update public.profiles set is_active = true where email = 'YOUR_ADMIN_EMAIL';
insert into public.user_roles(user_id, role_id)
select p.id, r.id from public.profiles p cross join public.roles r
where p.email = 'YOUR_ADMIN_EMAIL' and r.code = 'admin'
on conflict do nothing;
commit;
```

The migration deliberately replaces all existing policies on `profiles`, `roles` and `notifications`, since leftover permissive policies could bypass the new restrictions. Profile reads are limited to `id`, `email`, `first_name`, `last_name` and `avatar_url`; sensitive fields such as `role_id` and `is_active` are not directly selectable by authenticated clients. The legacy `is_admin()` helper now checks the `role.assign` capability, preserving administrator checks in policies on other tables without making admins a general bypass for confidential profile fields. Review custom policies that use this helper and verify their intended capabilities before deployment. The `user_roles.granted_by` foreign key is reconciled to `auth.users(id)`. Existing operational tables beyond identity/access are not migrated into new business workflows by this change.

## Routes and enforcement

- Employee routes stay at their existing hashes; `#/admin`, `#/hr`, `#/manager` and `#/support` are workspace homes. `client/src/data/nav.js` defines every route's required capability.
- Admin accounts, role assignments and security audit are functional. Other workspace modules have guarded URLs and clearly marked unavailable screens; their business workflows are not implemented.
- The sidebar, route guard, login destination and error recovery use the same permission registry. A capability is required even for hidden routes. Custom roles may combine existing capabilities without login changes.
- `GET /api/protected/access-context` returns the authenticated account's current access. Invalid sessions return 401; inactive/unassigned accounts and permission denials return 403; access-resolution failures return 503.
- Profile API reads/updates are self-only. Updates accept only `first_name`, `last_name`, `avatar_url`. The account-list API returns only ID, email and active status to `account.read` holders.
- `get_role_administration`, `set_user_roles` and `get_access_audit` validate current database permissions. Role changes require a reason, write audit rows atomically and cannot remove the last active role administrator. Direct client access to grant/audit tables is denied.
- The client revalidates on auth changes, window focus and every minute. Database/API checks use current grants for each request. Account switches and logout discard mounted private application state.

New roles require a unique `roles.code`, `role_permissions` rows, and `user_roles` assignments. Include desired employee capabilities explicitly. Do not add wildcard admin grants. Operational permissions currently control module entry only; future APIs must also enforce team, queue, ownership and workflow scopes before those modules become available.

## Validation

- `pnpm run test:rbac`: real PostgreSQL migration/RLS tests using PGlite, plus API middleware tests.
- `pnpm run test:rbac:browser`: Playwright with local mocked Supabase responses and Microsoft Edge; no live credentials/data. Uses port 5179 and shuts down its test server.
- `pnpm run build`: production client build.

The migration must still be applied and smoke-tested against the actual Supabase project. Local tests do not confirm deployed policies or provider signup settings. Employee demo modules remain sample-data features.
