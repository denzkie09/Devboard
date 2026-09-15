"use client";

import { useEffect, useState } from "react";
import { School, Plus, Users, Copy, Check } from "lucide-react";
import { createClass, getMyClasses, joinClass, type ClassRow } from "../../../lib/classes";
import { getProfile, type Profile } from "../../../lib/profiles";

export default function ClassroomPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create class (teacher)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [className, setClassName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Join class (student)
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [profileData, classData] = await Promise.all([
        getProfile(),
        getMyClasses(),
      ]);
      setProfile(profileData);
      setClasses(classData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classroom.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      await createClass(className);
      setClassName("");
      setShowCreateForm(false);
      await load();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create class."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinClass(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setJoinError("");

    try {
      await joinClass(joinCode);
      setJoinCode("");
      setShowJoinForm(false);
      await load();
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Failed to join class."
      );
    } finally {
      setJoining(false);
    }
  }

  function handleCopyCode(classId: string, code: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(classId);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const isTeacher = profile?.role === "teacher";

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Classroom
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {isTeacher
              ? "Create classes and assign work to your students."
              : "Join a class to see assignments from your teacher."}
          </p>
        </div>

        {!loading && isTeacher && (
          <button
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            <Plus size={16} />
            {showCreateForm ? "Cancel" : "Create class"}
          </button>
        )}

        {!loading && !isTeacher && (
          <button
            onClick={() => setShowJoinForm((prev) => !prev)}
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            <Plus size={16} />
            {showJoinForm ? "Cancel" : "Join class"}
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {/* Create class form (teacher) */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateClass}
          className="mb-6 rounded-lg border border-border-color bg-surface p-4"
        >
          <label className="mb-1 block text-sm text-foreground-muted">
            Class name
          </label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="e.g. Intro to Web Development"
            required
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
            {creating ? "Creating..." : "Create class"}
          </button>
        </form>
      )}

      {/* Join class form (student) */}
      {showJoinForm && (
        <form
          onSubmit={handleJoinClass}
          className="mb-6 rounded-lg border border-border-color bg-surface p-4"
        >
          <label className="mb-1 block text-sm text-foreground-muted">
            Join code
          </label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="e.g. K3F9-QP2X"
            required
            className="mb-3 w-full rounded-md border border-border-color bg-background px-3 py-2 text-sm uppercase text-foreground focus:border-accent focus:outline-none"
          />

          {joinError && (
            <p className="mb-3 text-sm text-danger">{joinError}</p>
          )}

          <button
            type="submit"
            disabled={joining}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {joining ? "Joining..." : "Join class"}
          </button>
        </form>
      )}

      {loading && (
        <p className="text-sm text-foreground-muted">Loading...</p>
      )}

      {!loading && classes.length === 0 && (
        <div className="rounded-lg border border-dashed border-border-color p-8 text-center">
          <School size={24} className="mx-auto mb-3 text-foreground-muted" />
          <p className="text-sm font-medium text-foreground">
            {isTeacher ? "No classes yet" : "Not in any classes yet"}
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            {isTeacher
              ? "Create your first class to start assigning work."
              : "Ask your teacher for a join code to get started."}
          </p>
        </div>
      )}

      {!loading && classes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((classRow) => (
            <a
              key={classRow.id}
              href={`/dashboard/classroom/${classRow.id}`}
              className="rounded-lg border border-border-color bg-surface p-4 transition-transform hover:-translate-y-1"
            >
              <School size={18} className="mb-2 text-accent" />
              <p className="font-medium text-foreground">{classRow.name}</p>

              {isTeacher && (
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    handleCopyCode(classRow.id, classRow.join_code);
                  }}
                  className="mt-2 flex w-fit items-center gap-1.5 rounded-md border border-border-color bg-background px-2 py-1 text-xs text-foreground-muted hover:text-accent"
                >
                  {copiedId === classRow.id ? (
                    <Check size={12} />
                  ) : (
                    <Copy size={12} />
                  )}
                  {classRow.join_code}
                </div>
              )}

              <p className="mt-3 flex items-center gap-1 text-xs text-foreground-muted">
                <Users size={12} />
                {isTeacher ? "View roster" : "View assignments"}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}