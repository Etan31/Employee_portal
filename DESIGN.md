# Nexus Design System

Source of truth for all page work. Tokens live in `client/src/styles/theme.css`; shared
primitives/keyframes in `client/src/styles/global.css`. Brand: professional, clear,
trustworthy — efficient with warmth, never playful (see PRODUCT.md).

## Hard rules

1. **No hardcoded colors.** Every color in page CSS must be a `var(--nx-*)` token. The only
   exceptions: the navy auth gradient (`linear-gradient(160deg, #0f172a 0%, #1e3a5f 55%, #1e40af 100%)`)
   on standalone screens, rgba() shadows/overlays derived from token colors, and
   `client/public/favicon.svg` (a standalone file outside the CSS cascade — browsers don't
   apply page CSS custom properties to it, so its colors are a hardcoded snapshot of
   `--nx-logo-bg`/`--nx-accent`; keep them in sync if those tokens ever change). The in-app
   logo mark (`components/NexusLogo/NexusLogo.jsx`) uses the real `var(--nx-*)` tokens and
   is the source of truth for the same dark-box "N" glyph. `--nx-logo-bg` itself is scoped
   to the logo only (see its comment in theme.css) — don't reuse it as a general surface color.
   Cool-gray hexes (`#111827 #374151 #6b7280 #9ca3af #e5e7eb #e8eaed #f8f9fb`) map to slate
   tokens: `--nx-ink / --nx-text / --nx-text-soft / --nx-text-muted / --nx-border / --nx-border / --nx-bg`.
2. **Type scale only** (`--nx-fs-*`): page h1 = `xl`/600, section h2 = `lg`/600, card h3 =
   `md`/600, body = `base`, meta/secondary = `sm`, badges/labels = `xs`. One h1 per page.
   Real heading elements (h1/h2/h3), not styled divs. No px font sizes, no odd rem values.
3. **Spacing scale only** (`--nx-sp-1..7` = 4/8/12/16/24/32/48). Page shell padding:
   `var(--nx-sp-6) var(--nx-sp-6)` desktop, `var(--nx-sp-4)` phone. No `7px 13px`-style values.
4. **Breakpoints: 1200 / 900 / 560 only.**
5. **Fonts:** Plus Jakarta Sans is loaded once in global.css. Delete any `@import url(...fonts...)`
   from page CSS. No `font-family` declarations in page CSS (inherit from body). Exception:
   Login's Cormorant Garamond tagline keeps its own import.
6. **Status colors:** success/danger/warning/violet tokens + their `-soft`/`-strong` pairs.
   Text on soft backgrounds uses the `-strong` variant (AA contrast). Use the shared
   `.nx-status-pill` + modifiers from global.css — do NOT define your own pill/badge base.
7. **Class naming:** every class is page-prefixed (`nxdb-`, `nxtb-`, `nxtm-`, `cal-`, `ph-`,
   `org-`, `hrp-`, `hd-`, `emp-`, `set-` ...) except shared `nx-*` primitives already in
   global.css. Before adding any class that sounds generic, grep the other page CSS files
   for the same name — CSS here is global and lazy-loaded page CSS persists across navigation.
8. **Motion:** entrances use the canonical keyframes (`nx-fade-in`, `nx-slide-in`,
   `nx-scale-in` — do not redefine) with `var(--nx-dur*)` and `var(--nx-ease*)`; stagger list
   items ≤60ms steps, total entrance ≤400ms. Transitions: named properties only (never
   `transition: all`), `var(--nx-dur-fast)`. A global reduced-motion blanket exists in
   global.css — page-level overrides no longer required, but never rely on animation for
   content visibility (content must be visible if animations never run).
9. **Radius:** `--nx-radius-sm` (8) controls, `--nx-radius` (12) inputs/buttons/tiles,
   `--nx-radius-lg` (18) cards. Buttons follow Login's pattern: primary = `--nx-primary` bg,
   white text, hover `filter: brightness(0.88)` + `translateY(-1px)`; secondary = 1.5px
   `--nx-border-strong` border, hover border/text `--nx-primary`.
10. **Data-driven:** no user-visible strings/numbers hardcoded in JSX that belong to data
    (lists, stats, options). They live in `client/src/data/*.js` modules, loaded via
    `useAsyncData(() => import("../data/x.js"))` where the data is page-sized; module-level
    static import is fine for tiny constant sets (nav, month names). Show loading state via
    `.nx-page-loading` / skeleton while data resolves. Derive computed stats (counts, sums) —
    never hardcode them.
11. **Accessibility:** WCAG AA contrast (soft-bg text uses `-strong` tokens); color never the
    only signal (pair with label/icon); focus-visible styles on interactive elements;
    `aria-expanded`/`aria-label` on toggles and icon-only buttons.
12. **No new dependencies. No emojis in code or comments. No console.log** (use
    `client/src/utils/logger.js`). One-line comments only where logic is non-obvious.

## Shared infrastructure (already built — use, don't recreate)

- `hooks/useAsyncData.js` — `{ data, loading, error }` over a dynamic import loader.
- `hooks/appData.hooks.jsx` — `useAppData()` → `{ notifications, markNotificationRead,
  markAllNotificationsRead, tasks, addTask, leaveRequests, addLeaveRequest }` (provider is in main.jsx).
- `utils/orgData.js` — `flattenOrgTree()`, `getOrgStats()` derived from `data/orgSample.js`.
- `data/notifications.js`, `data/settings.js` — shaped like the real Supabase tables.
- `components/Icon/Icon.jsx` — `<Icon name size className/>`, stroke inherits currentColor.
- `pages/ErrorPage/ErrorPage.jsx` — `NotFound`, `AuthError`, `ServerError` (do not re-implement).
