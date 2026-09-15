"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ClipboardList, CheckCircle2, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getProfile, type Profile } from "@/lib/profiles";
import {
  getMySubmission,
  submitWork,
  getAssignmentStatus,
  type Submission,
  type AssignmentStatus,
} from "@/lib/submissions";

type AssignmentInfo = {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
};

export default function AssignmentDetailPage() {
  const params = useParams<{ assignmentId: string }>();
  const { assignmentId } = params;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Student submission state
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Teacher status state
  const [statuses, setStatuses] = useState<AssignmentStatus[]>([]);

  useEffect(() => {
    load();
  }, [assignmentId]);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("id, class_id, title, description, due_date")
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw new Error(assignmentError.message);
      setAssignment(assignmentData);

      const profileData = await getProfile();
      setProfile(profileData);

      if (profileData?.role === "student") {
        const submission = await getMySubmission(assignmentId);
        setMySubmission(submission);
        setContent(submission?.content ?? "");
      } else if (profileData?.role === "teacher") {
        const statusData = await getAssignmentStatus(assignmentId);
        setStatuses(statusData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load assignment."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const result = await submitWork(assignmentId, content);
      setMySubmission(result);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isTeacher = profile?.role === "teacher";
  const submittedCount = statuses.filter((s) => s.status === "submitted").length;

  return (
    <div>
      {assignment && (
        <a
          href={`/dashboard/classroom/${assignment.class_id}`}
          className="text-sm text-foreground-muted underline hover:text-foreground"
        >
          ← Back to class
        </a>
      )}

      {loading && (
        <p className="mt-4 text-sm text-foreground-muted">Loading...</p>
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {!loading && assignment && (
        <>
          <div className="mt-2 mb-6">
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
              <ClipboardList size={22} className="text-accent" />
              {assignment.title}
            </h1>
            {assignment.description && (
              <p className="mt-2 text-sm text-foreground-muted">
                {assignment.description}
              </p>
            )}
            {assignment.due_date && (
              <p className="mt-2 text-xs text-foreground-muted">
                Due {new Date(assignment.due_date).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Student: submission form */}
          {!isTeacher && (
            <div className="rounded-lg border border-border-color bg-surface p-5">
              <div className="mb-3 flex items-center gap-2">
                {mySubmission ? (
                  <CheckCircle2 size={16} className="text-accent" />
                ) : (
                  <Circle size={16} className="text-foreground-muted" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {mySubmission ? "Submitted" : "Not started"}
                </span>
                {mySubmission && (
                  <span className="text-xs text-foreground-muted">
                    on {new Date(mySubmission.submitted_at).toLocaleString()}
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                <label className="mb-1 block text-sm text-foreground-muted">
                  Your work (paste text, a link, or notes)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  required
                  placeholder="e.g. https://github.com/you/repo or your written answer..."
                  className="mb-3 w-full rounded-md border border-border-color bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />

                {submitError && (
                  <p className="mb-3 text-sm text-danger">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {submitting
                    ? "Submitting..."
                    : mySubmission
                    ? "Update submission"
                    : "Submit"}
                </button>
              </form>
            </div>
          )}

          {/* Teacher: status overview */}
          {isTeacher && (
            <div className="rounded-lg border border-border-color bg-surface p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Submission status ({submittedCount}/{statuses.length})
              </h2>

              {statuses.length === 0 ? (
                <p className="text-sm text-foreground-muted">
                  No students in this class yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {statuses.map((s) => (
                    <li
                      key={s.student_id}
                      className="flex items-center justify-between rounded-md border border-border-color bg-background px-3 py-2 text-sm"
                    >
                      <span className="text-foreground">
                        {s.display_name || s.email}
                      </span>
                      <span
                        className={`flex items-center gap-1.5 text-xs ${
                          s.status === "submitted"
                            ? "text-accent"
                            : "text-foreground-muted"
                        }`}
                      >
                        {s.status === "submitted" ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <Circle size={14} />
                        )}
                        {s.status === "submitted" ? "Submitted" : "Not started"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}