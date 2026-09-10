"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
  type Task,
  type TaskStatus,
} from "../../../../lib/tasks";
import { createClient } from "../../../../lib/supabase/client";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

// What each status can move to, and the button label for each move
const STATUS_ACTIONS: Record<
  TaskStatus,
  { target: TaskStatus; label: string }[]
> = {
  todo: [{ target: "in_progress", label: "Start" }],
  in_progress: [
    { target: "todo", label: "Back to To Do" },
    { target: "done", label: "Mark done" },
  ],
  done: [{ target: "in_progress", label: "Reopen" }],
};

export default function ProjectBoardPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [projectName, setProjectName] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addingToStatus, setAddingToStatus] = useState<TaskStatus | null>(
    null
  );
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

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

  function startAddingTask(status: TaskStatus) {
    setAddingToStatus(status);
    setNewTitle("");
    setNewDescription("");
    setCreateError("");
  }

  function cancelAddingTask() {
    setAddingToStatus(null);
    setCreateError("");
  }

  async function handleCreateTask(e: React.FormEvent, status: TaskStatus) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      await createTask(projectId, newTitle, newDescription || undefined, status);
      setAddingToStatus(null);
      const taskData = await getTasks(projectId);
      setTasks(taskData);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create task."
      );
    } finally {
      setCreating(false);
    }
  }

  function startEditingTask(task: Task) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditError("");
    setConfirmDeleteId(null);
  }

  function cancelEditingTask() {
    setEditingId(null);
    setEditError("");
  }

  async function handleSaveTaskEdit(e: React.FormEvent, id: string) {
    e.preventDefault();
    setEditSubmitting(true);
    setEditError("");

    try {
      await updateTask(id, {
        title: editTitle,
        description: editDescription || null,
      });
      setEditingId(null);
      const taskData = await getTasks(projectId);
      setTasks(taskData);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update task."
      );
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeleteTask(id: string) {
    setDeletingId(id);
    setError("");

    try {
      await deleteTask(id);
      setConfirmDeleteId(null);
      const taskData = await getTasks(projectId);
      setTasks(taskData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMoveTask(id: string, target: TaskStatus) {
    setMovingId(id);
    setError("");

    // Optimistic update so the card jumps columns immediately
    const previous = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: target } : t))
    );

    try {
      await updateTask(id, { status: target });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move task.");
      setTasks(previous); // roll back on failure
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <a
          href="/dashboard/projects"
          className="text-sm text-foreground-muted underline hover:text-foreground"
        >
          ← Back to projects
        </a>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          {loading ? "Loading..." : projectName}
        </h1>
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter(
              (task) => task.status === column.status
            );
            const isAdding = addingToStatus === column.status;

            return (
              <div
                key={column.status}
                className="rounded-lg border border-border-color bg-surface p-3"
              >
                <h2 className="mb-3 text-sm font-medium text-foreground-muted">
                  {column.label}{" "}
                  <span className="text-foreground-muted/60">
                    ({columnTasks.length})
                  </span>
                </h2>

                <div className="flex flex-col gap-2">
                  {columnTasks.length === 0 && !isAdding && (
                    <p className="text-xs text-foreground-muted">
                      No tasks yet.
                    </p>
                  )}

                  {columnTasks.map((task) => {
                    const isEditing = editingId === task.id;
                    const isConfirmingDelete = confirmDeleteId === task.id;
                    const isDeleting = deletingId === task.id;
                    const isMoving = movingId === task.id;

                    return (
                      <div
                        key={task.id}
                        className="rounded-md border border-border-color bg-background p-3"
                      >
                        {isEditing ? (
                          <form onSubmit={(e) => handleSaveTaskEdit(e, task.id)}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              required
                              className="mb-2 w-full rounded-md border border-border-color bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                            />
                            <textarea
                              value={editDescription}
                              onChange={(e) =>
                                setEditDescription(e.target.value)
                              }
                              rows={2}
                              className="mb-2 w-full rounded-md border border-border-color bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                            />

                            {editError && (
                              <p className="mb-2 text-xs text-danger">
                                {editError}
                              </p>
                            )}

                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={editSubmitting}
                                className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
                              >
                                {editSubmitting ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditingTask}
                                className="rounded-md border border-border-color px-3 py-1 text-xs font-medium text-foreground-muted hover:bg-surface"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-foreground">
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="mt-1 text-xs text-foreground-muted">
                                {task.description}
                              </p>
                            )}

                            {/* Status-change buttons */}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {STATUS_ACTIONS[task.status].map((action) => (
                                <button
                                  key={action.target}
                                  onClick={() =>
                                    handleMoveTask(task.id, action.target)
                                  }
                                  disabled={isMoving}
                                  className="rounded-md border border-accent px-2 py-1 text-xs font-medium text-accent hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                                >
                                  {isMoving ? "Moving..." : action.label}
                                </button>
                              ))}
                            </div>

                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => startEditingTask(task)}
                                className="text-xs font-medium text-foreground-muted underline hover:text-foreground"
                              >
                                Edit
                              </button>

                              {isConfirmingDelete ? (
                                <span className="flex items-center gap-2 text-xs">
                                  <span className="text-foreground-muted">
                                    Delete?
                                  </span>
                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    disabled={isDeleting}
                                    className="font-medium text-danger underline disabled:opacity-50"
                                  >
                                    {isDeleting ? "Deleting..." : "Yes"}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-foreground-muted underline"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(task.id)}
                                  className="text-xs font-medium text-danger underline hover:opacity-80"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isAdding ? (
                  <form
                    onSubmit={(e) => handleCreateTask(e, column.status)}
                    className="mt-2 rounded-md border border-border-color bg-background p-2"
                  >
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Task title"
                      required
                      className="mb-2 w-full rounded-md border border-border-color bg-surface px-2 py-1 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
                    />
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Description (optional)"
                      rows={2}
                      className="mb-2 w-full rounded-md border border-border-color bg-surface px-2 py-1 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
                    />

                    {createError && (
                      <p className="mb-2 text-xs text-danger">
                        {createError}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={creating}
                        className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        {creating ? "Adding..." : "Add task"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelAddingTask}
                        className="rounded-md border border-border-color px-3 py-1 text-xs font-medium text-foreground-muted hover:bg-surface"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => startAddingTask(column.status)}
                    className="mt-2 w-full rounded-md border border-dashed border-border-color py-1.5 text-xs text-foreground-muted hover:border-accent hover:text-accent"
                  >
                    + Add task
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}