# Moneliq — Frontend (Next.js)

## Overview
Small SPA on Next.js (App Router) with authorization, balance/currency table and theming (light/dark + custom `member*/partner*`). Dev-server on Turbopack. Lint/formatting — ESLint + Prettier + Husky. Data loading via fetch/SWR.

## Tech Stack
- Next.js 15, React 18, TypeScript
- Tailwind CSS 4 + HeroUI (UI components/themes)
- Zustand (user state), SWR (cache/refetch)
- next-themes (theme switching)
- ESLint/Prettier/Husky/lint-staged (code quality)y)

## Prerequisites
- Node.js 20+ (LTS)
- pnpm 9+

## Setup
```bash
pnpm i
pnpm dev       # run local dev server (Turbopack)
pnpm build     # production build
pnpm start     # run built app
pnpm lint      # lint + autofixes
```

### Env
If API endpoints are set via config (`app/config/site.ts`), specify them there. For .env (if needed): create `.env.local` and use via `process.env.*`.

## Theming
Use `next-themes` with `attribute="class"` and an explicit `value` map:
- `light`, `dark`
- `memberLight`, `memberDark`
- `partnerLight`, `partnerDark`

Switch changes pairs depending on role. On logout theme resets to default (`dark`). (Solution: simple and predictable; avoided `useSyncExternalStore` cycles.)

## Data & Error States
- Loading via `fetch`/SWR with disabled cache for server calls, in UI — skeleton/empty/error.
- A common thin client (timeout + retry for GET) and a single `ErrorState`/`EmptyState` components are recommended (see the “Architecture & Trade-offs” section).

## Accessibility
- Semantic landmarks: `<header> / <main id="main"> / <footer>`, `<nav aria-label="Main">`, skip-link `href="#main"`.
- Table: `table > thead > th[scope="col"]`, rows — `th[scope="row"]` (if applicable).
- Navigation: `aria-current="page"` on active link.
- Theme switcher: keyboard accessible (`<input>` by HeroUI), fixed `aria-label`.

## Testing (optional)
- Manual scenarios: list/details loading, API errors, theme switching, login/logout.
- Vitest/RTL and snapshots for key components can be added if needed.

## Architecture & Trade-offs (коротко)
- **Topics:** simple scheme with `next-themes` and explicit `value`-map was chosen, without third-party effects in the store → less “races” on hydration.
- **State:** global auth in Zustand; UI-solutions (themes) — in components; separated business events (login/logout) and visual layer.
- **Loading:** lightweight fetch-client instead of complex abstractions; SWR — for instant UI and revalidate.
- **A11y:** landmarks/skip-link/`aria-current`; minimal cost of implementation with good return on availability.
