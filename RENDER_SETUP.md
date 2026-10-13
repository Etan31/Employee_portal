# Deploy React and Express together on Render

The root render.yaml configures one Free Node web service. Express serves the
built frontend from client/dist and the API from /api/protected. Supabase hosts
authentication and the database. No Render Postgres database is needed.

## Before deploying

- Ensure the replacement Supabase project has the schema from supabase/bootstrap.sql
  and a confirmed test user (see supabase/SETUP.md).
- Get the replacement project's secret key from Supabase Settings > API Keys.
  Enter it directly in Render, not in source code or chat.
- Commit and push the deployment changes to the branch you will deploy in
  https://github.com/Etan31/Employee_portal. Keep .env untracked.

## Recommended: Blueprint deployment

1. Sign in at https://dashboard.render.com.
2. Choose New > Blueprint and connect the Employee_portal GitHub repository.
3. Select the branch containing the updated root render.yaml.
4. Review the service: one Node web service named nexus, plan Free.
5. When prompted, set SUPABASE_SECRET_KEY to the new project's secret key.
6. Deploy and wait for the service to show Live. Use the actual onrender.com
   URL assigned by Render; it might not be nexus.onrender.com.

The Blueprint sets the public Supabase URL/key, server Supabase URL, Node
version, production environment, and health-check path. Dev dependencies are
installed during the build because Vite is needed to compile the frontend.

## Alternative: create a Web Service manually

Connect the same repository and branch and use these settings:

- Root Directory: leave empty (use the repository root).
- Runtime: Node.
- Instance Type: Free.
- Build Command: pnpm install --frozen-lockfile --prod=false && pnpm build
- Start Command: node server/index.js
- Health Check Path: /health

Add environment variables:

```dotenv
NODE_ENV=production
NODE_VERSION=22.20.0
VITE_SUPABASE_URL=https://vqdnrzsjkakubsiyqmfq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_4dYk6CbHLHRtLvJsYb6Z_A_blTbs7-_
SUPABASE_URL=https://vqdnrzsjkakubsiyqmfq.supabase.co
SUPABASE_SECRET_KEY=YOUR_NEW_PROJECT_SECRET_KEY
```

Do not set VERCEL. Render supplies PORT and RENDER_EXTERNAL_URL. The server
uses RENDER_EXTERNAL_URL as its default allowed origin on Render; set
ALLOWED_ORIGINS only if you also need to permit another frontend origin.

## Finish Supabase configuration

Set Authentication > URL Configuration > Site URL to your actual Render URL.
Add https://YOUR_RENDER_HOST/** to allowed redirect URLs. Keep localhost
redirects if you still develop locally. Existing password login does not need
a redirect, but confirmation/recovery links need the correct hosted URL.

## Verify the deployment

- Open the Render URL: the login page and its video should load.
- Open /health: expect status ok.
- Open /health/db: expect db reachable. A 503 generally means the new secret
  key, project URL or database schema needs attention; inspect Render logs.
- Sign in using your confirmed new Supabase account.
- Edit your name and reload to check profile persistence.
- Check DevTools for blocked requests or repeated failed refresh requests.

Changing a VITE_ variable requires a rebuild because Vite embeds it in the
frontend during compilation. Never prefix a server secret with VITE_.

Free Render services sleep after 15 minutes without traffic. A cold start can
take about a minute. Supabase Free projects can pause after low activity.
Tasks, leave requests and attendance currently use local demo data; deploying
the app does not make those features persist to the database.

References: https://render.com/docs/infrastructure-as-code,
https://render.com/docs/blueprint-spec, https://render.com/docs/free.
