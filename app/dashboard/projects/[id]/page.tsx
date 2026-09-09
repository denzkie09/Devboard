"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTasks, type Task, type TaskStatus } from "../../../../lib/tasks";
import { createClient } from "../../../../lib/supabase/client";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

export default function ProjectBoardPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [projectName, setProjectName] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBoard();
  }, [projectId]);

  async function loadBoard() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();

      if (projectError) {
        throw new Error(projectError.message);
      }

      setProjectName(project?.name ?? "Untitled project");

      const taskData = await getTasks(projectId);
      setTasks(taskData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load board.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <a
          href="/dashboard/projects"
          className="text-sm text-neutral-500 underline hover:text-black"
        >
          ← Back to projects
        </a>
        <h1 className="mt-2 text-2xl font-semibold">
          {loading ? "Loading..." : projectName}
        </h1>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter(
              (task) => task.status === column.status
            );

            return (
              <div
                key={column.status}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
              >
                <h2 className="mb-3 text-sm font-medium text-neutral-600">
                  {column.label}{" "}
                  <span className="text-neutral-400">
                    ({columnTasks.length})
                  </span>
                </h2>

                <div className="flex flex-col gap-2">
                  {columnTasks.length === 0 && (
                    <p className="text-xs text-neutral-400">No tasks yet.</p>
                  )}

                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-md border border-neutral-200 bg-white p-3"
                    >
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.description && (
                        <p className="mt-1 text-xs text-neutral-500">
                          {task.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {/* "Add task" button goes here in the next file */}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}