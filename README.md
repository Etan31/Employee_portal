# Nexus Employee Portal

Internal HR self-service tool. Employees submit and track leave requests, view attendance and
work-hour history, check leave balances, and see upcoming public holidays. See `PRODUCT.md` for
product intent and design principles.

## Stack

- **Frontend:** React 19 + Vite, PrimeReact, Chart.js (lives at the repo root)
- **Backend:** Node + Express (`server/`)
- **Database / Auth:** Supabase (Postgres + Auth, RLS enforced)
- **Package manager:** pnpm (workspace)
- **Hosting:** Vercel (frontend + `api/` serverless), Render (Express server)

## Architecture

```
.
├── index.html            Frontend entry (root IS the Vite app)
├── vite.config.js        Builds to client/dist
├── client/src/           React app: pages/, layouts/, components/, hooks/, lib/, utils/, data/
├── server/               Express API
│   ├── app.js            App wiring: security headers, CORS, routes, static SPA, error handler
│   ├── index.js          Server bootstrap (Render / local)
│   ├── env.js            Loads .env and validates required vars at startup
│   ├── middleware/       JWT verification + RBAC guards
│   ├── routes/           Resource routers (profiles)
│   └── utils/            supabaseAdmin client, logger
├── api/index.js          Vercel serverless entry (re-exports server/app.js)
└── supabase/             SQL migrations, seed, and RLS policies
```

There is no `client/package.json` — the frontend is defined by the **root** `package.json` and
runs from the repo root.

## Prerequisites

- Node 18+
- pnpm (`npm install -g pnpm`)

## Environment

The root `.env` is shared by both apps (Vite reads it; the server loads it via `server/env.js`).
See `.env.example` for the configuration and [supabase/SETUP.md](supabase/SETUP.md)
for creating a fresh or replacement Supabase project.

Client (must be `VITE_`-prefixed, non-secret):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Server (secret, never shipped to the browser):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-secret-key
ALLOWED_ORIGINS=http://localhost:5173
PORT=3000
NODE_ENV=development
```

The server requires `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or legacy
`SUPABASE_SERVICE_KEY`). It verifies user tokens through Supabase Auth, supporting
the current signing keys without a shared JWT secret. The frontend also accepts
the legacy `VITE_SUPABASE_ANON_KEY` configuration.

## Local development

Frontend (from repo root, port 5173):

```bash
pnpm install
pnpm dev
```

Backend (port 3000):

```bash
cd server
pnpm install
pnpm dev      # nodemon; or `pnpm start`
```

Build the frontend for production (outputs to `client/dist`):

```bash
pnpm build
```

## API endpoints

All `/api/protected/*` routes require `Authorization: Bearer <supabase-jwt>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | Liveness check |
| GET | `/health/db` | none | Liveness + Supabase reachability |
| GET | `/api/protected/profiles/me` | JWT | Current user's profile |
| GET | `/api/protected/profiles/:userId` | owner or admin | Fetch a profile |
| PUT | `/api/protected/profiles/:userId` | owner or admin | Update a profile (role change is admin-only) |
| GET | `/api/protected/profiles` | admin | List all profiles |

## Deployment

- **Vercel** serves `client/dist` statically and runs `api/index.js` as a serverless function
  (`vercel.json`). The Express static/catch-all block is skipped when `process.env.VERCEL` is set.
- **Render** runs `node server/index.js`, which also serves the built SPA from `client/dist`.

## Notes

- Use pnpm only; npm/yarn lockfiles are gitignored.
- Never commit `.env` or the Supabase service-role key.
