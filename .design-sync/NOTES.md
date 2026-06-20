# Design-Sync Notes — Nexus Employee Portal

## Setup

- **Shape**: package (no Storybook)
- **Entry**: `.design-sync/ds-entry.jsx` (custom entry — NOT from node_modules dist, because this app has no dist/)
- **Node-modules**: `./node_modules` (root)
- **Build command**: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --entry ./.design-sync/ds-entry.jsx --out ./ds-bundle`
- **Validate command**: `node .ds-sync/package-validate.mjs ./ds-bundle`

## Key decisions

- **Auth isolation**: `Login` and `DashboardLayout` depend on `useAuth()` → `supabaseClient.js` → `import.meta.env` (Vite-only). Both are reimplemented as standalone components in `ds-entry.jsx` with mock default props and no Supabase import.
- **CSS entry**: `cssEntry` is set to `client/src/styles/theme.css` (NOT `global.css`). Reason: the converter appends cssEntry verbatim to `_ds_bundle.css`. `global.css` contains `@import './theme.css'` which would land as a dangling reference. `theme.css` has no @imports so it's safe to append raw.
- **global.css IS imported in ds-entry.jsx**: This lets esbuild inline theme.css (resolving the @import) so the token variables are available in the bundle. The cssEntry is a separate path (theme.css without @imports) to avoid the raw-append problem.
- **Login CSS**: `.design-sync/login-ds.css` replaces `Login.css` — identical except the mobile breakpoint `background-image: url("/truck_bg.jpg")` is replaced with a CSS gradient (`linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #1e40af 100%)`). The original absolute URL `/truck_bg.jpg` caused esbuild to fail trying to resolve it as a file.
- **Default exports**: `OrgChartView` and `Organization` are default exports — re-exported in ds-entry.jsx as `export { default as OrgChartView }`.
- **Fonts**: Inter and Plus Jakarta Sans are remote (Google Fonts via @import in global.css). `[FONT_REMOTE]` is expected and non-blocking.
- **NexusLogo authored preview**: SVG fills use `fill="var(--nx-accent)"` which renders blank in the floor card (CSS variables not resolved against transparent background). Authored preview wraps it in a dark sidebar background (`#0f172a`) so the two-tone diamond is visible.
- **Icon authored preview**: Floor card rendered only a 20px SVG with no text (RENDER_THIN). Authored preview shows a grid of icon names with labels.

## Known render warns

- `[FONT_REMOTE]` "Inter", "Plus Jakarta Sans" — expected, Google Fonts served at runtime.

## Re-sync risks

- `ds-entry.jsx` standalone `DashboardLayout` and `Login` will drift as the real components evolve. Check that the nav items, dropdown menu items, and form fields match when re-syncing.
- `login-ds.css` clones `Login.css` — if Login.css gains new rules, propagate them (minus the `background-image: url("/truck_bg.jpg")` line).
- Screen components (Dashboard, TaskBox, Profile, TimeManagement, Organization) import mock data from their own source files. If those data structures change, the preview may break.
- `[FONT_REMOTE]` means font rendering in previews depends on network access to Google Fonts. Offline renders may fall back to system fonts.
- The converter scripts in `.ds-sync/` are staged from the skill base dir on each sync run — they are NOT committed (gitignored). Re-sync reinstalls them automatically.
