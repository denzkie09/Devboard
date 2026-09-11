# DevBoard

A developer productivity dashboard for organizing projects and tracking tasks on a Kanban-style board — built as a portfolio project to explore full-stack development with Next.js and Supabase.

**Live app:** [devboard-tawny.vercel.app](https://devboard-tawny.vercel.app)

For a deep dive into the architecture, key technical decisions, and bugs solved along the way, see [BUILD_DOCUMENTATION.md](./BUILD_DOCUMENTATION.md).

---

## Features

- **Authentication** — sign up, log in, and log out with secure, cookie-based sessions
- **Projects** — create, rename, and delete projects
- **Kanban board** — each project gets its own board with To Do / In Progress / Done columns
- **Tasks** — create, edit, delete, and move tasks between columns
- **Command palette (⌘K)** — a keyboard-driven command menu for jumping to any page, searching projects by name, and creating a new project without touching the mouse
- **Customizable appearance** — pick an accent color from Settings; it applies instantly and persists across sessions
- **Row-level security** — every user can only ever see and modify their own data, enforced at the database level

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| Language | TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Backend | [Supabase](https://supabase.com) (Postgres + Auth) |
| Command menu | [cmdk](https://cmdk.paco.me/) |
| Icons | [Lucide](https://lucide.dev) |
| Hosting | [Vercel](https://vercel.com) |

## Getting Started

**1. Clone and install**

```bash
git clone https://github.com/denzkie09/Devboard.git
cd Devboard
npm install
```

**2. Set up Supabase**

Create a project at [supabase.com](https://supabase.com), then add a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Run the schema SQL from [BUILD_DOCUMENTATION.md](./BUILD_DOCUMENTATION.md#3-database-schema--row-level-security) in your Supabase project's SQL editor to create the `projects` and `tasks` tables with the correct policies.

**3. Run the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Press **⌘K** (or **Ctrl+K**) anywhere in the dashboard to try the command palette.

## Roadmap

- [ ] GitHub OAuth (to power a real Repositories view, and enable commit-based task linking)
- [ ] Basic analytics across projects
- [ ] In-app AI assistant

## Author

Built by [Denlie](https://github.com/denzkie09).