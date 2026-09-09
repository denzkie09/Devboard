"use client";

import { useEffect, useState } from "react";
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
  type Project,
} from "../../../lib/Projects";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Which project (if any) is currently being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  // Which project (if any) is pending delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

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
    // Close the delete-confirm state if it was open on another card
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
        <h1 className="text-2xl font-semibold">Projects</h1>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          {showForm ? "Cancel" : "New project"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-lg border border-neutral-200 p-4"
        >
          <label className="mb-1 block text-sm text-neutral-600">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />

          <label className="mb-1 block text-sm text-neutral-600">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />

          {formError && (
            <p className="mb-3 text-sm text-red-600">{formError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create project"}
          </button>
        </form>
      )}

      {loading && (
        <p className="text-sm text-neutral-500">Loading projects...</p>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
          <p className="text-sm text-neutral-500">
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
                className="rounded-lg border border-neutral-200 p-4"
              >
                {isEditing ? (
                  <form onSubmit={(e) => handleSaveEdit(e, project.id)}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="mb-2 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="mb-2 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
                    />

                    {editError && (
                      <p className="mb-2 text-xs text-red-600">{editError}</p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={editSubmitting}
                        className="rounded-md bg-black px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                      >
                        {editSubmitting ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    
                      <a href={`/dashboard/projects/${project.id}`}
                        className="font-medium underline-offset-2 hover:underline">
                        {project.name}
                        </a>
                    {project.description && (
                      <p className="mt-1 text-sm text-neutral-500">
                        {project.description}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-neutral-400">
                      Created {new Date(project.created_at).toLocaleDateString()}
                    </p>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => startEditing(project)}
                        className="text-xs font-medium text-neutral-600 underline hover:text-black"
                      >
                        Edit
                      </button>

                      {isConfirmingDelete ? (
                        <span className="flex items-center gap-2 text-xs">
                          <span className="text-neutral-600">Delete this project?</span>
                          <button
                            onClick={() => handleDelete(project.id)}
                            disabled={isDeleting}
                            className="font-medium text-red-600 underline disabled:opacity-50"
                          >
                            {isDeleting ? "Deleting..." : "Yes, delete"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-neutral-500 underline"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(project.id)}
                          className="text-xs font-medium text-red-600 underline hover:text-red-700"
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