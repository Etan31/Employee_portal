# Identity foundation implementation

Step 1 means Phase 1 of the roadmap, supported by the decisions in Section 1.
Section 2 defines personas, not the attendance milestone (Phase 2).

## Initial assessment — 15 October 2026

Implemented: five additive roles, current database permission resolution, route guards,
restricted profile updates, audited role assignment, last-administrator protection.
Missing: company membership, staff records separate from Auth, departments/reporting,
real directory/profile/organization data, scoped HR access, invitation request/acceptance,
employment eligibility, suspension/offboarding, effective grants and lifecycle tests.
Other modules are prototypes or guarded placeholders, not finished workflows.

## Work order

- [x] Company/staff/private-data schema and current eligibility checks.
- [x] Safe directory, current reporting scopes and HR-owned staff changes.
- [x] HR provision request → administrator invite → verified acceptance.
- [x] Suspension/deactivation, audit and effective role grants.
- [x] Replace foundation sample data with working screens.
- [x] Database/API/browser checks and deployment instructions.
- [ ] Apply and verify in staging/production, including actual email delivery and Auth settings.

## Contracts before implementation

Companies own departments and staff. HR may maintain employment records only within
their own company. Administrators manage identities in their own company; they do not
receive private HR access. Managers see current direct reports' work fields only.
Every staff member retains Employee capabilities, with additional roles explicit.
Support queue membership remains a separate future domain, never implied by staff access.

Directory fields: name, work email, job title, department and manager. Hire dates and
employment status are available to self/authorized HR, not the public directory.
Private HR data is stored separately and has no default administrator read grant.
Sensitive writes use transactional RPCs; Auth email delivery uses Express plus a
recoverable provisioning state. No invitation secrets are stored in application tables.

Single initial company: Nexus; timezone Asia/Manila (working default from this workspace,
must be confirmed before attendance). Existing profiles are explicitly migrated into that
company, preserving activity/assignments; unknown employment details remain unfilled.
Future companies require explicit provisioning rather than automatic signup membership.

Acceptance: cross-company/private reads denied; transfer immediately changes team scope;
inactive staff denied with old JWT; arbitrary signup remains unassigned; invitation cannot
activate before verified acceptance; role/suspension races preserve an administrator;
failed provisioning remains inactive and retryable; all lifecycle writes are audited.
