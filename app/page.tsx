import { LayoutDashboard, KanbanSquare, GitBranch, ArrowRight } from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Projects",
    description: "Organize your work into projects you can create, rename, and revisit anytime.",
  },
  {
    icon: KanbanSquare,
    title: "Kanban boards",
    description: "Track tasks through To Do, In Progress, and Done — built for how developers actually work.",
  },
  {
    icon: GitBranch,
    title: "Repositories",
    description: "Link your GitHub repos to projects and keep code and tasks in one place. (Coming soon)",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="flex min-h-[85vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <span className="rounded-full border border-border-color bg-surface px-4 py-1 text-xs font-medium text-foreground-muted">
          Built with Next.js &amp; Supabase
        </span>

        <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          Dev<span className="text-accent">Board</span>
        </h1>

        <p className="max-w-md text-base text-foreground-muted">
          A developer productivity dashboard for managing projects, tasks,
          and GitHub activity in one place.
        </p>

        <a
          href="/dashboard"
          className="group mt-2 flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:opacity-90 hover:shadow-accent/30"
        >
          Go to Dashboard
          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </a>
      </section>

      {/* Feature highlights */}
      <section className="mx-auto grid max-w-4xl grid-cols-1 gap-4 px-4 pb-24 sm:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border border-border-color bg-surface p-5 transition-transform hover:-translate-y-1"
          >
            <feature.icon size={22} className="mb-3 text-accent" />
            <h2 className="mb-1 text-sm font-semibold text-foreground">
              {feature.title}
            </h2>
            <p className="text-xs leading-relaxed text-foreground-muted">
              {feature.description}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}