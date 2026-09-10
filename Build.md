# DevBoard — Build Documentation

A developer productivity dashboard built as a portfolio project, covering authentication, project/task management, and a Kanban-style board.

**Live app:** https://devboard-tawny.vercel.app
**Stack:** Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres)

---

## 1. Architecture Overview

DevBoard follows a simple three-layer structure:

```
app/                    → Routes (Next.js App Router)
  ├─ page.tsx             Landing page
  ├─ login/, signup/       Auth pages (outside the dashboard layout)
  ├─ dashboard/
  │   ├─ layout.tsx        Shared sidebar + shell
  │   ├─ page.tsx           Dashboard home
  │   ├─ projects/
  │   │   ├─ page.tsx        Project list (create/edit/delete)
  │   │   └─ [id]/page.tsx    Kanban board for one project
  │   ├─ repositories/       Placeholder (future GitHub OAuth feature)
  │   └─ settings/           Account info + logout
  └─ components/            Shared UI (Sidebar)

lib/
  ├─ supabase/client.ts     Browser Supabase client
  ├─ supabase/middleware.ts  Session refresh + route protection
  ├─ projects.ts             Project data-access functions
  └─ tasks.ts                Task data-access functions

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

---

## 6. Notable Bugs Fixed Along the Way

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

---

## 7. Deferred (v2) Features

These were scoped out of the MVP deliberately, to ship a working core first:

- **GitHub OAuth** — would make the Repositories page functional (linking real repos to projects).
- **Analytics** — activity/progress tracking across projects.
- **AI assistant** — in-app help or automation.

---

## 8. Local Development

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