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
