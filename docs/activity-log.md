# Activity Log

Record significant changes, decisions, and blockers here. Format: date, summary,
decision/outcome. Reference this when returning to the codebase after gaps.

---

## 2026-07-07 — Codebase audit against CLAUDE.md: findings + fixes

Analyzed the repo against CLAUDE.md, documented the mistakes found, and fixed them.

### Mistakes found & how they were fixed

| # | Mistake | Why it mattered | Fix |
|---|---------|-----------------|-----|
| 1 | `DashboardLayout.jsx` logged the user's email to the browser console every render; `auth.hooks.jsx` logged full profile data | PII leak to the browser console + violates "no console.log in production" | Deleted the PII/debug logs; added `client/src/utils/logger.js` (no-ops in prod) and routed remaining error logs through it |
| 2 | `console.*` scattered in `server/app.js`, `auth.middleware.js`, `index.js` | Same rule; unstructured logging | Added `server/utils/logger.js` (level-aware, no new dependency); routed all server logs through it |
| 3 | Userland `path` package (`^0.12.7`) in root `package.json` | Shadows Node's built-in `path`; unmaintained footgun; unused | Removed from dependencies |
| 4 | `package-lock.json` committed in a pnpm-only repo | Violates "always pnpm"; risks split lockfiles | `git rm --cached`, deleted, and gitignored `package-lock.json`/`yarn.lock` |
| 5 | Supabase admin client instantiated 3x on the server | DRY / single-client guidance; duplicated config | `auth.middleware.js` and `profiles.routes.js` now import the shared `utils/supabaseAdmin.js` |
| 6 | No startup env validation | Missing keys failed opaquely on first request | `server/env.js` now asserts `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET` and exits with a clear message |
| 7 | No security headers; unbounded request body | CLAUDE.md requires CSP/X-Frame-Options/HSTS and payload limits (DoS) | Added a no-dep `securityHeaders` middleware and a 1mb body limit in `server/app.js` |
| 8 | README was the default Vite template (and told you to `cd client`, which has no `package.json`) | Wrong setup instructions; no architecture/endpoint docs | Rewrote `README.md` with accurate stack, structure, env, run commands, and API table |

### Decisions

- Logging: chose a no-dependency logger seam over adding Pino/Winston (KISS + "no unnecessary
  deps"). The interface is small enough that Pino can drop in later without touching call sites.
- CSP: scoped to allow the SPA's Supabase REST + realtime websocket calls and PrimeReact inline
  styles, so the Render-served SPA keeps working.

### Verified as fine (no change needed)

- RLS is present (`supabase/rls-setup.sql`).
- `.env` is not tracked by git.
- Dev scripts (`scripts/*`) keep their `console.*` — they are tooling, not production code.

### Risks noted, left out of scope

- Express version mismatch: root `^5` vs `server/package.json` `^4`. The `app.get("/(.*)")`
  catch-all works under the server's Express 4 but would throw under Express 5 (path-to-regexp
  change). Revisit if the server is upgraded.
- `server/api/index.js` appears orphaned — Vercel uses the root `api/index.js`.
- Stray `.claude/worktrees/thirsty-swartz-0ff220/` leftover copy of the repo.

---

## 2026-07-07 — ESLint config: add Node env for the server

Follow-up to the audit. `eslint.config.js` linted every file as browser code and did not ignore
vendored tooling, so `server/*` reported `process is not defined` and thousands of errors came
from `.agents/skills/**`.

- Scoped the React/browser block to `client/**`.
- Added a Node block (`globals.node`, ESM) for `server/**`, `api/**`, and `*.config.js`, with
  `no-unused-vars` set to `{ argsIgnorePattern: '^_', ignoreRestSiblings: true }`.
- Ignored generated/vendored dirs: `client/dist`, `.agents`, `.claude`, `ds-bundle`,
  `.design-sync`, `.ds-sync`.
- Code touch-ups for a clean server lint: renamed the unused Express error-handler arg to
  `_next` (`server/app.js`), and attached `{ cause: error }` to the re-thrown token error
  (`server/middleware/auth.middleware.js`).

Result: `eslint server api eslint.config.js` passes with 0 problems. Remaining `pnpm run lint`
errors are all in `client/**` (project-wide unused `import React` under React 19, plus a couple
of hook/dead-code issues) — pre-existing and out of scope for this change.

---

## 2026-07-07 — Dynamic error/auth pages (400/401/403/404/500/502/503/504)

Built the error-page contract required by CLAUDE.md's "Error Pages & Status Codes" section
(nothing existed before this: no `ErrorBoundary`, `NotFound`, `AuthError`, or `ServerError`
anywhere in the repo).

New: `client/src/pages/ErrorPage/{ErrorPage.jsx,ErrorPage.css,errorContent.js}`,
`client/src/components/ErrorBoundary/ErrorBoundary.jsx`. Modified: `main.jsx` (wraps `App`
in the boundary, nested inside `AuthProvider` so the fallback can still call `useAuth()`),
`App.jsx` (routing rewire, see below). Full contract record filled into CLAUDE.md itself
next to the template it was implementing.

"Dynamic, reacts to user activity" is concrete, not decorative: quick-links on 404/403 are
built from `filterNavItemsByRole`, so two different roles see different recovery links; 404
shows the actual attempted hash; a `sessionStorage` key remembers the last valid route so
"go back" survives a hard reload landing directly on a broken link.

Two real bugs fixed in `App.jsx` (a hand-rolled hash router, no react-router) while wiring
this in — found by a research pass before writing any code, not by inspection after:

1. **False 404 → mislabeled stub.** An unknown hash previously fell through to
   `<PageStub title={activeItem.label}/>`, where `activeItem` silently defaulted to the
   first permitted nav item (Dashboard) — a broken link rendered as a wrongly-titled
   "Dashboard — coming soon" instead of an actual not-found page. Fixed by looking up the
   requested route against the full (unfiltered) `NAV_ITEMS` list first.
2. **403 would have been dead code as first scoped.** The initial design gated the 403
   check on the role-*filtered* nav list — but that list has already dropped anything the
   role can't see, so the item found there can never fail a role check, and a truly
   restricted route would fall through to the *filtered* list's first item, indistinguishable
   from the 404 case. A second-pass review agent caught this before implementation. Fixed
   by checking membership in the filtered list against a lookup in the *unfiltered* list.
   No nav item sets `allowedRoles` today, so this is real, correct, but currently inert
   infrastructure — it activates the moment one does, without touching `App.jsx` again.

Also replaced a silent `location.hash = "#/login"` redirect (user saw nothing) with an
explicit standalone `<AuthError code={401}/>` screen, per CLAUDE.md's literal example
(`if (!session) return <AuthError code={401} />`).

**Decisions:** global co-located CSS (not CSS Modules) and CSS-only `@keyframes` stagger
(not framer-motion/motion) — both because they're the project's actual existing convention
(confirmed by search, not assumed) and CLAUDE.md's own "no unnecessary deps" rule. Detail
and reasoning recorded in CLAUDE.md's Error Pages section directly.

**Verified:** `pnpm run lint` and `pnpm run build` (see below). Visual/interaction
verification (staggered entrance, reduced-motion, role-based quick-link differences) needs
manual browser confirmation — no browser-automation tool was available in this session for
this stack.
