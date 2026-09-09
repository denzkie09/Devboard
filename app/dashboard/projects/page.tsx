"use client";

import { useEffect, useState } from "react";
import { createProject, getProjects, type Project } from "../../../lib/Projects";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

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

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
          <p className="text-sm text-neutral-500">
            You don't have any projects yet.
          </p>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-lg border border-neutral-200 p-4"
            >
              <h2 className="font-medium">{project.name}</h2>
              {project.description && (
                <p className="mt-1 text-sm text-neutral-500">
                  {project.description}
                </p>
              )}
              <p className="mt-3 text-xs text-neutral-400">
                Created {new Date(project.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}