"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
  type Project,
} from "../../../lib/Projects";

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageContent />
    </Suspense>
  );
}

function ProjectsPageContent() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setShowForm(true);
    }
  }, [searchParams]);

  async function loadProjects() {
    setLoading(true);
    setError("");

    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      await createProject(name, description || undefined);
      setName("");
      setDescription("");
      setShowForm(false);
      await loadProjects();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create project."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(project: Project) {
    setEditingId(project.id);
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditError("");
    setConfirmDeleteId(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditError("");
  }

  async function handleSaveEdit(e: React.FormEvent, id: string) {
    e.preventDefault();
    setEditSubmitting(true);
    setEditError("");

    try {
      await updateProject(id, {
        name: editName,
        description: editDescription || null,
      });
      setEditingId(null);
      await loadProjects();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update project."
      );
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError("");

    try {
      await deleteProject(id);
      setConfirmDeleteId(null);
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          {showForm ? "Cancel" : "New project"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-lg border border-border-color bg-surface p-4"
        >
          <label className="mb-1 block text-sm text-foreground-muted">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mb-3 w-full rounded-md border border-border-color bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />

          <label className="mb-1 block text-sm text-foreground-muted">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mb-3 w-full rounded-md border border-border-color bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />

          {formError && (
            <p className="mb-3 text-sm text-danger">{formError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create project"}
          </button>
        </form>
      )}

      {loading && (
        <p className="text-sm text-foreground-muted">Loading projects...</p>
      )}

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <div className="rounded-lg border border-dashed border-border-color p-8 text-center">
          <p className="text-sm text-foreground-muted">
            You don't have any projects yet.
          </p>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const isEditing = editingId === project.id;
            const isConfirmingDelete = confirmDeleteId === project.id;
            const isDeleting = deletingId === project.id;

            return (
              <div
                key={project.id}
                className="rounded-lg border border-border-color bg-surface p-4"
              >
                {isEditing ? (
                  <form onSubmit={(e) => handleSaveEdit(e, project.id)}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="mb-2 w-full rounded-md border border-border-color bg-background px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="mb-2 w-full rounded-md border border-border-color bg-background px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                    />

                    {editError && (
                      <p className="mb-2 text-xs text-danger">{editError}</p>
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
                        onClick={cancelEditing}
                        className="rounded-md border border-border-color px-3 py-1 text-xs font-medium text-foreground-muted hover:bg-background"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <a
                      href={`/dashboard/projects/${project.id}`}
                      className="font-medium text-foreground underline-offset-2 hover:text-accent hover:underline"
                    >
                      {project.name}
                    </a>
                    {project.description && (
                      <p className="mt-1 text-sm text-foreground-muted">
                        {project.description}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-foreground-muted/60">
                      Created {new Date(project.created_at).toLocaleDateString()}
                    </p>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => startEditing(project)}
                        className="text-xs font-medium text-foreground-muted underline hover:text-foreground"
                      >
                        Edit
                      </button>

                      {isConfirmingDelete ? (
                        <span className="flex items-center gap-2 text-xs">
                          <span className="text-foreground-muted">Delete this project?</span>
                          <button
                            onClick={() => handleDelete(project.id)}
                            disabled={isDeleting}
                            className="font-medium text-danger underline disabled:opacity-50"
                          >
                            {isDeleting ? "Deleting..." : "Yes, delete"}
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
                          onClick={() => setConfirmDeleteId(project.id)}
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
      )}
    </div>
  );
}