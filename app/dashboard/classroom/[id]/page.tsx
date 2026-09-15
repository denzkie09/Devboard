"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, Check, Users, Plus, ClipboardList, Trash2 } from "lucide-react";
import { getClass, getClassRoster, type ClassRow, type RosterMember } from "../../../../lib/classes";
import { getAssignments, createAssignment, deleteAssignment, type Assignment } from "../../../../lib/assignments";
import { getProfile, type Profile } from "../../../../lib/profiles";

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;

  const [classData, setClassData] = useState<ClassRow | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Create assignment (teacher)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [classId]);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [classRow, profileData] = await Promise.all([
        getClass(classId),
        getProfile(),
      ]);

      if (!classRow) {
        throw new Error("Class not found, or you don't have access to it.");
      }

      setClassData(classRow);
      setProfile(profileData);

      const assignmentData = await getAssignments(classId);
      setAssignments(assignmentData);

      if (profileData?.role === "teacher") {
        const rosterData = await getClassRoster(classId);
        setRoster(rosterData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load class.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyCode() {
    if (!classData) return;
    navigator.clipboard.writeText(classData.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      await createAssignment(
        classId,
        title,
        description || undefined,
        dueDate || undefined
      );
      setTitle("");
      setDescription("");
      setDueDate("");
      setShowCreateForm(false);
      const assignmentData = await getAssignments(classId);
      setAssignments(assignmentData);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create assignment."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteAssignment(id: string) {
    setDeletingId(id);
    try {
      await deleteAssignment(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete assignment."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const isTeacher = profile?.role === "teacher";

  return (
    <div>
      <a
        href="/dashboard/classroom"
        className="text-sm text-foreground-muted underline hover:text-foreground"
      >
        ← Back to Classroom
      </a>

      {loading && (
        <p className="mt-4 text-sm text-foreground-muted">Loading...</p>
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {!loading && classData && (
        <>
          <div className="mt-2 mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">
              {classData.name}
            </h1>

            {isTeacher && (
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 rounded-md border border-border-color bg-surface px-3 py-1.5 text-xs text-foreground-muted hover:text-accent"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {classData.join_code}
              </button>
            )}
          </div>

          {/* Roster (teacher only) */}
          {isTeacher && (
            <div className="mb-6 rounded-lg border border-border-color bg-surface p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users size={16} />
                Roster ({roster.length})
              </h2>

              {roster.length === 0 ? (
                <p className="text-sm text-foreground-muted">
                  No students have joined yet. Share the join code above.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {roster.map((member) => (
                    <li
                      key={member.student_id}
                      className="rounded-md border border-border-color bg-background px-3 py-2 text-sm text-foreground"
                    >
                      {member.display_name || member.email}
                      <span className="ml-2 text-xs text-foreground-muted">
                        joined {new Date(member.joined_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Assignments */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ClipboardList size={16} />
              Assignments
            </h2>
            {isTeacher && (
              <button
                onClick={() => setShowCreateForm((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90"
              >
                <Plus size={14} />
                {showCreateForm ? "Cancel" : "New assignment"}
              </button>
            )}
          </div>

          {showCreateForm && (
            <form
              onSubmit={handleCreateAssignment}
              className="mb-4 rounded-lg border border-border-color bg-surface p-4"
            >
              <label className="mb-1 block text-sm text-foreground-muted">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mb-3 w-full rounded-md border border-border-color bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />

              <label className="mb-1 block text-sm text-foreground-muted">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mb-3 w-full rounded-md border border-border-color bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />

              <label className="mb-1 block text-sm text-foreground-muted">
                Due date (optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mb-3 w-full rounded-md border border-border-color bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />

              {createError && (
                <p className="mb-3 text-sm text-danger">{createError}</p>
              )}

              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create assignment"}
              </button>
            </form>
          )}

          {assignments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-color p-8 text-center">
              <p className="text-sm font-medium text-foreground">
                No assignments yet
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                {isTeacher
                  ? "Create your first assignment for this class."
                  : "Your teacher hasn't posted any assignments yet."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-lg border border-border-color bg-surface p-4"
                >
                  <div className="flex items-start justify-between">
                    <a
                      href={`/dashboard/classroom/${classId}/assignments/${assignment.id}`}
                      className="font-medium text-foreground hover:text-accent hover:underline"
                    >
                      {assignment.title}
                    </a>
                    {isTeacher && (
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        disabled={deletingId === assignment.id}
                        className="text-foreground-muted hover:text-danger disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {assignment.description && (
                    <p className="mt-1 text-sm text-foreground-muted">
                      {assignment.description}
                    </p>
                  )}
                  {assignment.due_date && (
                    <p className="mt-2 text-xs text-foreground-muted">
                      Due {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}