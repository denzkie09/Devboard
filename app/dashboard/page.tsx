"use client";

import { useEffect, useState } from "react";
import {
  FolderKanban,
  ListTodo,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
} from "lucide-react";
import { getProjects, type Project } from "../../lib/Projects";
import { createClient } from "../../lib/supabase/client";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskCounts, setTaskCounts] = useState({
    todo: 0,
    in_progress: 0,
    done: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const projectData = await getProjects();
      setProjects(projectData);

      const supabase = createClient();
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("status");

      if (tasksError) {
        throw new Error(tasksError.message);
      }

      const counts = { todo: 0, in_progress: 0, done: 0 };
      for (const task of tasks ?? []) {
        counts[task.status as keyof typeof counts]++;
      }
      setTaskCounts(counts);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    { label: "Projects", value: projects.length, icon: FolderKanban },
    { label: "To Do", value: taskCounts.todo, icon: ListTodo },
    { label: "In Progress", value: taskCounts.in_progress, icon: Clock },
    { label: "Done", value: taskCounts.done, icon: CheckCircle2 },
  ];

  const recentProjects = projects.slice(0, 4);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Welcome back. Here's what's happening.
          </p>
        </div>
        <a
          href="/dashboard/projects"
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          <Plus size={16} />
          New project
        </a>
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border-color bg-surface p-4"
          >
            <stat.icon size={18} className="mb-2 text-accent" />
            <p className="text-2xl font-semibold text-foreground">
              {loading ? "—" : stat.value}
            </p>
            <p className="text-xs text-foreground-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent projects */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Recent projects
        </h2>
        {projects.length > 0 && (
          <a
            href="/dashboard/projects"
            className="flex items-center gap-1 text-xs font-medium text-foreground-muted hover:text-accent"
          >
            View all
            <ArrowRight size={12} />
          </a>
        )}
      </div>

      {loading && (
        <p className="text-sm text-foreground-muted">Loading...</p>
      )}

      {!loading && projects.length === 0 && (
        <div className="rounded-lg border border-dashed border-border-color p-8 text-center">
          <FolderKanban size={24} className="mx-auto mb-3 text-foreground-muted" />
          <p className="text-sm font-medium text-foreground">
            No projects yet
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            Create your first project to start tracking tasks on a board.
          </p>
          <a
            href="/dashboard/projects"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            <Plus size={16} />
            New project
          </a>
        </div>
      )}

      {!loading && recentProjects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recentProjects.map((project) => (
            <a
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="rounded-lg border border-border-color bg-surface p-4 transition-transform hover:-translate-y-1"
            >
              <FolderKanban size={18} className="mb-2 text-accent" />
              <p className="truncate text-sm font-medium text-foreground">
                {project.name}
              </p>
              <p className="mt-1 truncate text-xs text-foreground-muted">
                {project.description || "No description"}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}