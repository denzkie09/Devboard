# DevBoard — Build Documentation

A developer productivity dashboard built as a portfolio project, covering authentication, project/task management, and a Kanban-style board.

**Live app:** https://devboard-tawny.vercel.app
**Stack:** Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres) · cmdk

---

## 1. Architecture Overview

DevBoard follows a simple three-layer structure:

```
app/                    → Routes (Next.js App Router)
  ├─ page.tsx             Landing page
  ├─ manifest.ts           PWA web app manifest
  ├─ login/, signup/       Auth pages (outside the dashboard layout)
  ├─ dashboard/
  │   ├─ layout.tsx        Shared sidebar + shell + command palette
  │   ├─ page.tsx           Dashboard home (stats, recent projects)
  │   ├─ projects/
  │   │   ├─ page.tsx        Project list (create/edit/delete)
  │   │   └─ [id]/page.tsx    Kanban board for one project
  │   ├─ repositories/       Placeholder (future GitHub OAuth feature)
  │   └─ settings/           Personal info, appearance, logout
  └─ components/
      ├─ Sidebar.tsx              Nav, user footer, ⌘K hint
      ├─ CommandPalette.tsx       Global Cmd/Ctrl+K command menu
      ├─ ThemeInitializer.tsx     Applies the saved accent color on load
      └─ ServiceWorkerRegister.tsx Registers the PWA service worker

lib/
  ├─ supabase/client.ts     Browser Supabase client
  ├─ supabase/middleware.ts  Session refresh + route protection
  ├─ projects.ts             Project data-access functions
  ├─ tasks.ts                Task data-access functions
  └─ theme.ts                Accent color presets + persistence

public/
  ├─ sw.js                  Service worker (network-first caching)
  └─ icons/                 Generated app icons (192, 512, maskable)

proxy.ts                  Next.js 16 middleware entry point
```

The core principle: **UI components never talk to Supabase directly.** Every database operation goes through a typed function in `lib/projects.ts` or `lib/tasks.ts`. This keeps components focused on rendering and state, and means there's one place to fix a bug or change a query — not one per component that happens to need that data.

---

## 2. Authentication

### How it works

Supabase Auth handles sign-up, login, and session storage. The `@supabase/ssr` package is used instead of the plain `supabase-js` client because it stores the session in **cookies** rather than `localStorage` — cookies can be read by Next.js middleware on the server, which is what makes route protection possible.

- `lib/supabase/client.ts` — creates a browser-side Supabase client via `createBrowserClient`.
- `lib/supabase/middleware.ts` — runs on every request, refreshes the session, and redirects unauthenticated users away from `/dashboard/*`.
- `proxy.ts` — Next.js 16 renamed `middleware.ts` to `proxy.ts` as the file that wires this into the request pipeline.

### A bug worth understanding: the login redirect race condition

Early on, login would succeed (no error, valid credentials) but the app stayed on `/login` with no visible error. The cause: after `supabase.auth.signInWithPassword()` resolves, the session cookie is set client-side. The original code then called `router.push("/dashboard")`, which is a **soft, client-side navigation**. In some cases, the request Next.js sends for that navigation doesn't reliably reflect the just-set cookie state by the time middleware evaluates it — so middleware treats the user as still unauthenticated and silently redirects back to `/login`.

**Fix:** replace `router.push()` with a hard navigation:

```ts
router.refresh();
window.location.href = "/dashboard";
```

`window.location.href` forces a full page reload, which guarantees the browser sends the fresh cookie with the new request. This is a common gotcha in Next.js + Supabase SSR setups and worth remembering for any auth flow that redirects immediately after a client-side sign-in.

### Logout follows the same pattern

`supabase.auth.signOut()` followed by `window.location.href = "/login"` — for the same reason: a hard redirect ensures the now-cleared session is respected on the very next request.

---

## 3. Database Schema & Row Level Security

Two tables: `projects` and `tasks`, both with Row Level Security (RLS) enabled.

```sql
projects (id, user_id, name, description, created_at, updated_at)
tasks    (id, project_id, user_id, title, description, status, position, created_at, updated_at)
```

**Key design decisions:**

- **`user_id` is duplicated on `tasks`**, even though a task's project already implies an owner. This avoids a join in every RLS policy check (`auth.uid() = user_id` is a single-column comparison instead of a subquery into `projects`), which keeps queries simpler and faster.
- **RLS policies handle all access control** — there is no manual `.eq("user_id", ...)` filtering in application code for `projects`. The policies (`select`/`insert`/`update`/`delete`, each checking `auth.uid() = user_id`) mean a user physically cannot query another user's rows, even if the client code had a bug. This pushes the security boundary into the database rather than trusting every call site to remember the filter.
- **`status` uses a check constraint** (`todo` / `in_progress` / `done`) rather than a free-text column, preventing typos from creating a "phantom" column that would never render in the UI.
- **`position` exists for future ordering** within a column (e.g. if drag-and-drop or manual reordering is added later) — new tasks are appended with `position = count of existing tasks in that column`.
- **Cascade deletes**: deleting a project removes its tasks automatically (`on delete cascade`), so there's no orphaned data to clean up manually.

---

## 4. The Kanban Board

### Status changes instead of drag-and-drop

Drag-and-drop (via `@dnd-kit/core`) was built and worked, but was deliberately replaced with explicit action buttons ("Start", "Mark done", "Reopen", "Back to To Do"). Reasoning:

- Drag-and-drop adds real complexity: pointer event handling, drop-zone detection, and conflicts with click events inside cards (editing/deleting a task while a drag listener is attached to the same element requires manually stopping event propagation).
- A `STATUS_ACTIONS` lookup table maps each status to its valid next moves, so the UI only ever shows actions that make sense for a task's current state — this is arguably *clearer* to a user than inferring drag targets.

```ts
const STATUS_ACTIONS: Record<TaskStatus, { target: TaskStatus; label: string }[]> = {
  todo: [{ target: "in_progress", label: "Start" }],
  in_progress: [
    { target: "todo", label: "Back to To Do" },
    { target: "done", label: "Mark done" },
  ],
  done: [{ target: "in_progress", label: "Reopen" }],
};
```

### Optimistic updates with rollback

Moving a task, creating it, editing it, or deleting it all update React state **immediately**, before the Supabase call resolves. If the call fails, the change is rolled back and an error is shown. This makes the UI feel instant rather than waiting on a network round-trip for every interaction — a pattern worth using anywhere a write is very likely to succeed but you don't want to block on confirming it.

### Dynamic routing

Each project's board lives at `app/dashboard/projects/[id]/page.tsx` — the `[id]` folder is Next.js's syntax for a dynamic route segment. `useParams<{ id: string }>()` reads the project ID from the URL, which is then used to fetch that project's name and its tasks.

### A build-breaking gotcha: `useSearchParams` requires a Suspense boundary

When the command palette's "New project" action was added (navigating to `/dashboard/projects?new=true`), the projects page started reading the URL with `useSearchParams()`. This worked fine in local dev but **broke the production build entirely**:

```
Error occurred prerendering page "/dashboard/projects"
Export encountered an error on /dashboard/projects/page: /dashboard/projects, exiting the build.
```

The cause: Next.js tries to statically prerender pages during `next build` wherever possible. `useSearchParams()` makes a page's output depend on the URL at request time, which is fundamentally incompatible with static prerendering unless the component reading it is wrapped in `<Suspense>` — without that boundary, Next.js doesn't know how to produce a static shell and fails the build outright rather than silently guessing.

**Fix:** split the page into two components — an inner one that calls `useSearchParams()`, and the actual default-exported page component, which does nothing but wrap the inner one in `<Suspense>`:

```tsx
export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageContent />
    </Suspense>
  );
}

function ProjectsPageContent() {
  const searchParams = useSearchParams();
  // ...rest of the page
}
```

This is a very common trap: `useSearchParams()` works fine in `npm run dev` (no static prerendering happens there), so the bug only surfaces at build/deploy time — worth testing `npm run build` locally before pushing any change that touches URL params, rather than relying on Vercel's build to catch it.

---

## 5. Design System

Tailwind v4 uses CSS-based theming instead of a `tailwind.config.js` color palette. Tokens are defined once in `app/globals.css` as CSS variables, then registered with `@theme inline` so they become real Tailwind utility classes (`bg-surface`, `text-foreground-muted`, `bg-accent`, etc.) usable anywhere in the app:

```css
:root {
  --background: #12141a;
  --surface: #1b1e27;
  --border-color: #2a2e3a;
  --foreground: #edeff3;
  --foreground-muted: #9aa1b2;
  --accent: #f2b705;
  --danger: #f2555a;
}
```

This gives a "dark developer console" identity (deep charcoal-navy background, warm amber accent reserved for primary actions) instead of default Tailwind grays, and means a future palette change only requires editing these variables in one place rather than hunting down hardcoded `bg-neutral-100` classes across every file.

### User-selectable accent color

`lib/theme.ts` defines five accent presets (Amber, Teal, Violet, Rose, Sky). Choosing one in Settings calls `applyAccent()`, which overwrites the `--accent` / `--accent-foreground` CSS variables directly on `document.documentElement` and saves the choice to `localStorage`. Because every component styles itself with `bg-accent` / `text-accent` rather than a hardcoded color, the entire app re-colors instantly with no reload. `ThemeInitializer` (mounted once in the root layout) re-applies the saved choice on every page load, since CSS variables set via JS don't persist across a fresh document load on their own.

---

## 6. Command Palette (⌘K)

A global, keyboard-driven command menu — the feature intended to make DevBoard feel distinct from a generic Trello/Slack-style clone, rather than adding a chat or notifications feature that would just be a shallower version of what those tools already do well.

**Why this feature, specifically:** the goal was something that showcases frontend/UX craft without depending on external services (unlike, say, a GitHub webhook integration), is fully demoable in a few seconds for anyone reviewing the project, and borrows a pattern developers already recognize and trust from tools like Linear and Raycast.

**How it's built:**

- Uses [`cmdk`](https://cmdk.paco.me/), an unstyled, accessible command menu primitive — it provides fuzzy filtering, keyboard navigation (arrows, enter, escape), and a modal wrapper (`Command.Dialog`) for free, styled here with the same dark theme tokens as the rest of the app.
- A single `keydown` listener on `document` (in `CommandPalette.tsx`) opens the palette on `Cmd+K` / `Ctrl+K` from anywhere in the dashboard.
- **Three command groups:**
  - *Navigate* — jump to Dashboard, Projects, Repositories, or Settings
  - *Actions* — "New project" (navigates to the projects page with `?new=true`, which the page reads on load to auto-open the create form) and "Log out"
  - *Projects* — fetched live via `getProjects()` each time the palette opens, letting you type a project's name to jump straight to its board
- A small "Quick search ⌘K" badge in the Sidebar footer exists purely for discoverability — without it, a feature like this is easy for a first-time visitor to miss entirely.

---

## 7. Progressive Web App (Installable on Desktop & Mobile)

DevBoard is installable as a standalone app on Windows, macOS, Android, and iOS, without maintaining a separate native codebase. This section explains every moving part and why each decision was made.

### Why a PWA, and why first

Three real options exist for making a web app feel native: a **PWA** (near-zero code change, works everywhere immediately), **Tauri** (a genuine native desktop binary, wrapping the existing web app in a lightweight Rust shell), and **Capacitor** (a genuine native mobile app, publishable to app stores, also wrapping the existing web app). The PWA was built first because it required no new build tooling, no changes to existing application code, and covers both desktop and mobile in a single pass — Tauri and Capacitor remain available as later additions that wrap this same app without any of this work being wasted.

### The manifest (`app/manifest.ts`)

Next.js 16 treats `app/manifest.ts` as a special file convention: it's automatically compiled and served at `/manifest.webmanifest`, with Next.js injecting the correct `<link rel="manifest">` tag into `<head>` — no manual HTML required.

Key fields and the reasoning behind each:

- **`start_url: "/dashboard"`** — deliberately not `"/"`. Someone launching the *installed app* almost certainly wants the app itself, not the marketing landing page. Since `/dashboard` is already auth-protected by existing middleware, an unauthenticated user launching the installed icon is automatically redirected to `/login` — no new logic needed to handle this case.
- **`display: "standalone"`** — the single setting responsible for the app opening in its own chromeless window instead of a browser tab. This is what makes it *feel* like a real app rather than a bookmarked website.
- **Three icon entries** — a 192px and 512px icon for general use, plus a *third*, separate 512px icon marked `purpose: "maskable"`. Android's launcher applies its own shape mask (circle, squircle, rounded square depending on the device) to app icons. A maskable icon needs its important content kept within a safe zone near the center, with the background color filling all the way to the edges — otherwise the OS's mask can clip meaningful parts of the artwork. This is why the maskable icon is a *separate generated file*, not a reused copy of the regular icon: the regular icon has rounded corners baked in with transparent corners, which would look broken if Android's mask were applied on top.

### The icons

Generated programmatically (Python + Pillow) rather than exported from a design tool, using the exact brand color (`#f2b705`) and a `</>` glyph matching the Sidebar's logo mark. This guarantees pixel-perfect brand consistency, and makes future changes (e.g. an accent color change) a one-line script edit rather than a re-export step.

### The service worker (`public/sw.js`)

A service worker is technically what makes a web app *qualify* as an installable PWA in Chrome/Edge's eyes, separate from the manifest. DevBoard's implementation uses a **network-first** caching strategy, which was a deliberate choice over the more commonly tutorialized "cache-first" approach:

```js
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
```

**Why network-first, not cache-first:** DevBoard is a data-driven app backed by Supabase — projects and tasks change constantly. A cache-first strategy (serve cached content immediately, refresh in the background) would risk showing stale task data on launch, which is actively misleading for a productivity tool. Network-first means the app always tries to fetch live data first, and only falls back to a cached response if there's no network at all — preserving offline resilience (no blank browser error page) without ever showing outdated information when a connection is available.

The service worker also handles its own cache lifecycle: on `install`, it pre-caches a minimal "app shell"; on `activate`, it deletes any previously cached versions that don't match the current `CACHE_NAME`, preventing stale caches from accumulating across deployments.

### Wiring it into the root layout

Two additions to `app/layout.tsx`:

- **`export const viewport: Viewport = { themeColor: "#12141a" }`** — colors the browser's own UI chrome (and the Android status bar) to match the app's dark background. In recent Next.js versions, `themeColor` moved out of the `metadata` export into a dedicated `viewport` export.
- **`appleWebApp: { capable: true, ... }` inside `metadata`** — iOS Safari has historically ignored parts of the standard web manifest spec and uses its own proprietary meta tags instead. Without this, "Add to Home Screen" on iPhone would open a plain Safari tab instead of a standalone app window.

**Why service worker registration lives in its own tiny client component (`ServiceWorkerRegister.tsx`)** rather than inline in the layout: `navigator.serviceWorker` only exists in the browser, never during server rendering. Since `layout.tsx` renders on the server, referencing browser-only APIs directly there would break SSR. Isolating browser-only logic into a `"use client"` component with a `useEffect` (which only ever fires after mount, in the browser) is the same pattern already used for `ThemeInitializer` — a small, reusable convention for "this needs to run client-side only, and needs no UI."

---

## 8. Notable Bugs Fixed Along the Way

Documented here because the fixes are more instructive than the bugs themselves:

| Issue | Cause | Fix |
|---|---|---|
| Login form had no password field | Missing `<input>` in JSX | Added the field |
| Login button didn't work | `e.preventDefault` referenced but never called (missing `()`) | Called it properly |
| Stuck on `/login` after correct credentials | Soft navigation raced with cookie propagation | Hard redirect via `window.location.href` |
| Sidebar links 404'd | Pages referenced in nav were never actually created | Built the missing pages, or added honest "Coming soon" placeholders |
| `/dashboard/projects` 404'd despite the file existing | File was named `projects_page.tsx` instead of the Next.js–required `page.tsx` | Renamed the file |
| Dev server blocked static assets, login silently did nothing | Testing via a network IP (`192.168.1.41`) instead of `localhost`, hitting Next.js 16's dev-origin restrictions | Used `localhost` instead |
| Hydration mismatch warning after a file edit | Stale `.next` build cache serving old HTML against new client code | Cleared `.next` and hard-refreshed |
| Production build failed after adding the command palette's "New project" action | `useSearchParams()` used without a `<Suspense>` boundary, incompatible with static prerendering | Split the page into an inner component and a `<Suspense>`-wrapped default export |

---

## 9. Deferred (v2) Features

These were scoped out of the MVP deliberately, to ship a working core first:

- **GitHub OAuth** — would make the Repositories page functional (linking real repos to projects), and could enable commit-message-based task linking (e.g. a commit containing `fixes DB-12` auto-marks that task done) as a further extension.
- **Analytics** — activity/progress tracking across projects.
- **AI assistant** — in-app help or automation.
- **Tauri desktop build** — a genuine native installer (.exe/.dmg), wrapping the existing app in a lightweight Rust shell, layered on top of the PWA work already done.
- **Capacitor mobile build** — a genuine installable Android/iOS app, publishable to app stores, also wrapping the existing app.

---

## 10. Local Development

```bash
npm install
npm run dev
```

Requires a `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Run the SQL in `supabase/migrations/` (or the schema in Section 3) against your Supabase project before first use.

**Before pushing any change touching routing or URL params**, run `npm run build` locally first — some errors (like the `useSearchParams` Suspense issue above) only surface during production builds, not in `next dev`.