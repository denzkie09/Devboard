# DevBoard — Build Documentation

A developer productivity dashboard built as a portfolio project, covering authentication, project/task management, a Kanban-style board, and a multi-role Classroom feature for teachers and students.

**Live app:** https://devboard-tawny.vercel.app
**Stack:** Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres) · cmdk

---

## 1. Architecture Overview

```
app/
  ├─ page.tsx               Landing page
  ├─ manifest.ts             PWA web app manifest
  ├─ login/, signup/         Auth pages (signup includes role selection)
  ├─ dashboard/
  │   ├─ layout.tsx          Shared sidebar + shell + command palette
  │   ├─ page.tsx             Dashboard home (stats, recent projects)
  │   ├─ projects/            Personal project/task CRUD + Kanban board
  │   ├─ classroom/
  │   │   ├─ page.tsx          Class list (role-based: create vs. join)
  │   │   └─ [id]/page.tsx      Class detail: roster (teacher), assignments
  │   ├─ assignments/
  │   │   └─ [assignmentId]/page.tsx   Submission (student) / grading (teacher)
  │   ├─ repositories/        Placeholder (future GitHub OAuth feature)
  │   └─ settings/            Personal info, role display, appearance, logout
  └─ components/
      ├─ Sidebar.tsx, CommandPalette.tsx, ThemeInitializer.tsx, ServiceWorkerRegister.tsx

lib/
  ├─ supabase/                Browser client + middleware (session/route protection)
  ├─ projects.ts, tasks.ts     Personal project/task data access
  ├─ profiles.ts               Read-only role/display-name access
  ├─ classes.ts                 Class create/join/roster
  ├─ assignments.ts             Assignment CRUD (teacher) / read (both)
  ├─ submissions.ts             Student submission + status-with-names (teacher)
  ├─ grades.ts                  Grade/feedback upsert (teacher)
  └─ theme.ts                   Accent color presets + persistence

public/                     PWA icons + service worker
proxy.ts                    Next.js 16 middleware entry point
```

The core principle carried through the whole project: **UI components never talk to Supabase directly for anything beyond auth state.** Every database read/write goes through a typed function in `lib/`, keeping access-control logic out of components and in one place per concern.

---

## 2. Authentication

Supabase Auth (`@supabase/ssr`, cookie-based sessions) handles sign-up, login, and route protection via middleware. Two bugs worth remembering from this part of the build:

- **Login redirect race condition:** `router.push()` after sign-in is a soft client-side navigation that can race against the just-set session cookie, causing middleware to redirect back to `/login` with no visible error. Fixed with a hard navigation: `router.refresh(); window.location.href = "/dashboard";`. The same pattern applies to logout.
- **`useSearchParams()` requires a `<Suspense>` boundary** or the production build fails outright during static prerendering — this only surfaces in `npm run build`, never in `npm run dev`, so it's worth building locally before every push that touches URL params.

---

## 3. Database Schema & Row Level Security (Personal Projects)

```sql
projects (id, user_id, name, description, created_at, updated_at)
tasks    (id, project_id, user_id, title, description, status, position, created_at, updated_at)
```

Both tables use RLS exclusively for access control (no manual `.eq("user_id", ...)` filtering in application code). `user_id` is duplicated on `tasks` even though it's implied by the parent project, specifically to keep RLS policy checks to a single-column comparison rather than a subquery — a pattern that becomes especially relevant later in the Classroom schema, where lookups chain much deeper.

---

## 4. The Kanban Board

Status changes ("Start" / "Mark done" / "Reopen") replaced drag-and-drop after drag-and-drop was built and found to add real complexity (pointer event handling, conflicts between drag listeners and click handlers) for limited benefit over explicit buttons. All task mutations use optimistic UI updates with rollback on failure.

---

## 5. Design System

Tailwind v4's CSS-based theming (`@theme inline` in `globals.css`) defines the app's dark "developer console" palette as CSS variables, making every component's color a token (`bg-surface`, `text-accent`, etc.) rather than a hardcoded value. A user-selectable accent color (`lib/theme.ts`, 5 presets) is applied by directly overwriting those variables via JS and persisting the choice to `localStorage`, re-applied on each load by `ThemeInitializer`.

**A hydration lesson from this system:** reading `localStorage` *during a component's initial render* (e.g. `useState(getSavedAccentId())`) causes a server/client mismatch, since `localStorage` doesn't exist during server rendering — the server always falls back to a default, while the client's first render already has the real value. Fix: initialize state to a fixed default on both sides, then read the real value inside `useEffect`, which only ever runs after hydration completes.

---

## 6. Command Palette (⌘K)

Built with [`cmdk`](https://cmdk.paco.me/) as DevBoard's differentiating feature — chosen over ideas like GitHub webhook integration specifically because it's self-contained (no external services), fully demoable in seconds, and borrows a pattern (Linear/Raycast-style command menus) developers already trust. Covers navigation, quick actions ("New project," now "Go to Classroom"), and live project search — all via three `cmdk` command groups.

---

## 7. Progressive Web App

DevBoard installs as a standalone app on desktop and mobile via a web manifest (`app/manifest.ts`), a generated icon set (including a separate maskable variant for Android's icon-shape masking), and a **network-first** service worker — deliberately not cache-first, since a data-driven app risks showing stale tasks/assignments if cached content were served before a live fetch. This was built before considering Tauri (desktop) or Capacitor (mobile) specifically because it requires zero new tooling and covers both platforms in one pass; those remain available later as wrappers around the same app.

---

## 8. Classroom: Roles, Classes, Assignments & Grading

This is the largest and most architecturally involved feature in DevBoard, built to explore multi-user access control patterns beyond a single-owner CRUD app. It adds two roles — teacher and student — with teachers creating classes and assignments, students joining classes and submitting work, and teachers grading submissions.

### 8.1 Why roles can't be self-editable

The foundational constraint: a user's role **cannot** live anywhere the user can edit it themselves. Supabase lets a signed-in user freely rewrite their own `user_metadata` via `supabase.auth.updateUser()` — if role lived there, any student could open dev tools and call that method to promote themselves to teacher.

**Solution:** a `profiles` table with no `insert` or `update` RLS policy for regular users at all. The only way a row is created is a database trigger (`handle_new_user()`, `security definer`) firing on `auth.users` insert — i.e., only at the exact moment of signup, reading the role from signup metadata. A second trigger (`prevent_role_change()`) forcibly resets `role` to its prior value on every update, as defense-in-depth even if a future policy change accidentally allowed updates. The role choice is made once, at signup, and is permanent — the signup UI says so explicitly rather than letting someone discover it later.

### 8.2 Classes and the join-code chicken-and-egg problem

```sql
classes       (id, teacher_id, name, join_code, created_at)
class_members (id, class_id, student_id, joined_at)
```

A student needs to look up a class by its join code *before* becoming a member — but the natural RLS policy ("students can see classes they belong to") can't apply yet, since they don't belong yet. Exposing the whole `classes` table for lookup-by-code would leak every class's data to every user.

**Solution:** `join_class(code)`, a `security definer` Postgres function. It runs with elevated privileges specifically to do one narrow thing — look up a class by code and insert a `class_members` row for the calling user (`auth.uid()`) — without ever exposing `classes` directly to non-members. This is a recurring pattern throughout the Classroom feature: whenever RLS creates an unsolvable ordering problem, a narrowly-scoped `security definer` function bridges it, rather than weakening the RLS policy itself.

### 8.3 The RLS infinite recursion bug

Early on, loading a class failed with `infinite recursion detected in policy for relation "classes"`. The cause: the "students can view classes they belong to" policy on `classes` queried `class_members`; the "teachers can view rosters" policy on `class_members` queried `classes`. Each policy's evaluation triggered the other's, looping forever.

**Fix:** extract each cross-table check into its own `security definer`, `stable` SQL function:

```sql
create function is_class_member(target_class_id uuid) returns boolean
  security definer as $$
    select exists (select 1 from class_members
      where class_id = target_class_id and student_id = auth.uid());
  $$ language sql;

create function is_class_teacher(target_class_id uuid) returns boolean
  security definer as $$
    select exists (select 1 from classes
      where id = target_class_id and teacher_id = auth.uid());
  $$ language sql;
```

Because these run as `security definer`, RLS is not re-evaluated *inside* them — breaking the cycle. Every later policy in the Classroom schema (assignments, submissions, grades) builds on these two functions rather than writing fresh cross-table subqueries, both for consistency and to avoid reintroducing the same recursion as the schema grows.

**General lesson:** any time two tables' RLS policies need to reference each other, at least one side needs to go through a `security definer` function rather than a direct policy subquery.

### 8.4 Assignments, submissions, and grades: three tables, not one

```sql
assignments             (id, class_id, teacher_id, title, description, due_date, ...)
assignment_submissions  (id, assignment_id, student_id, content, submitted_at, ...)
assignment_grades       (id, submission_id, grade, feedback, graded_by, graded_at, ...)
```

Submissions and grades are deliberately split into separate tables rather than adding `grade`/`feedback` columns directly to `assignment_submissions`. Reasoning: Postgres RLS operates per-row, not per-column. If a submission's content and its grade lived in the same row, the student's "I can update my own submission" policy would need to somehow exclude just the grade/feedback columns from that permission — awkward and error-prone to express in RLS. Splitting into two tables means each gets a simple, single-purpose policy: students write to `assignment_submissions`, teachers write to `assignment_grades`, with no column-level carve-outs needed anywhere.

The cost of this normalization: grading policies can't check `is_class_teacher()` directly, since a grade only knows its `submission_id` — not which class it belongs to. Each grading policy has to walk the chain (grade → submission → assignment → `is_class_teacher(assignment.class_id)`) via an `exists (...)` subquery. This is more verbose than earlier policies, but avoids a worse alternative: denormalizing `class_id` directly onto the grades table, which would risk that copy drifting out of sync with the submission's actual class.

### 8.5 Exposing names safely: security-definer views with authorization gates

A recurring problem: teachers need to see student names/emails (for rosters and grading), but `profiles` RLS only lets a user read their own row — a teacher has no legitimate way to read another user's profile through normal RLS. Broadening `profiles`' select policy to "anyone can read anyone's profile" would leak every user's data to every other user, which is far too permissive just to solve this one case.

**Solution:** two `security definer` functions — `get_class_roster_with_names(class_id)` and `get_assignment_status(assignment_id)` — that join `class_members` / `assignment_submissions` against `profiles` and `auth.users`, but **only after an explicit authorization check inside the function body**:

```sql
if not public.is_class_teacher(target_class_id) then
  raise exception 'Not authorized to view this roster';
end if;
```

This check is the actual security boundary, not a formality — because the function runs with elevated privileges, it technically *could* return any student's data to any caller if this check were missing. Every `security definer` function in this schema follows the same shape: do the minimum privileged lookup needed, gate it with an explicit ownership check, and return only what's necessary (never, say, a full `profiles` row when only a name and email are needed).

`get_assignment_status` evolved across two phases: it started (Phase 4) returning just submission status per student, then was extended (Phase 5, via `create or replace function`) to also return submission content and grade/feedback in the same call — avoiding N+1 round-trips per student when a teacher opens an assignment to grade it.

### 8.6 Route structure: URLs don't need to mirror data hierarchy

The assignment detail page was initially planned as a deeply nested route (`/dashboard/classroom/[id]/assignments/[assignmentId]`), mirroring the data's parent-child relationship. This was reconsidered: the page never actually used the class ID from the URL for anything — it already fetches the assignment row directly by ID, and that row includes `class_id` for the one place it's needed (the "back to class" link).

**Decision:** flatten the route to `/dashboard/assignments/[assignmentId]`, a peer of `/dashboard/classroom` and `/dashboard/projects` rather than nested inside either. General takeaway: a URL's structure should reflect what's actually needed to load and link the page, not necessarily the full conceptual hierarchy of the underlying data — nesting a route "because that's how the data relates" is a cost (deeper folders, longer relative imports) that isn't always paying for anything.

---

## 9. Notable Bugs Fixed Along the Way

| Issue | Cause | Fix |
|---|---|---|
| Login form had no password field / button didn't work | Missing `<input>`; `e.preventDefault` never called | Added the field; called `preventDefault()` |
| Stuck on `/login` after correct credentials | Soft navigation raced with cookie propagation | Hard redirect via `window.location.href` |
| `/dashboard/projects` 404'd despite the file existing | File named `projects_page.tsx` instead of `page.tsx` | Renamed the file |
| Production build failed after adding `?new=true` handling | `useSearchParams()` without a `<Suspense>` boundary | Split into an inner component + `<Suspense>`-wrapped default export |
| Hydration mismatch on the accent-color picker | `localStorage` read during initial render, differing between server/client | Moved the read into `useEffect` |
| `infinite recursion detected in policy for relation "classes"` | Two RLS policies on different tables each queried the other | Extracted `is_class_member()` / `is_class_teacher()` as `security definer` functions |
| SQL migration failed: `relation "class_members" does not exist` | A policy on `classes` referenced `class_members` before that table was created | Reordered the migration script |
| `lib/submissions.ts` broke with 20+ cascading TypeScript errors | A find-and-replace edit accidentally deleted a function's declaration line, desyncing the parser for everything after it | Restored the missing declaration |

---

## 10. Deferred (v2) Features

- **GitHub OAuth** — would power a real Repositories view and could enable commit-based task linking.
- **Analytics** — activity/progress tracking across projects and classes.
- **AI assistant** — in-app help or automation.
- **Tauri desktop build / Capacitor mobile build** — genuine native wrappers around the existing PWA-ready app.
- **Numeric grading & gradebook views** — grades are currently free-text (so "95," "A," or "Pass" all work); a future version could add structured numeric grading with class-wide averages.

---

## 11. Local Development

```bash
npm install
npm run dev
```

Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Run all SQL migrations in order (personal projects/tasks schema, then Classroom Phases 1–5) against your Supabase project's SQL editor before first use.

**Before pushing any change touching routing or URL params**, run `npm run build` locally — some errors only surface during production builds, not `next dev`.