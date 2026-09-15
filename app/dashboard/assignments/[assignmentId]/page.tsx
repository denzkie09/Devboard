"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ClipboardList, CheckCircle2, Circle, Award, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getProfile, type Profile } from "@/lib/profiles";
import {
  getMySubmission,
  submitWork,
  getMyGrade,
  getAssignmentStatus,
  type Submission,
  type AssignmentStatus,
} from "@/lib/submissions";
import { gradeSubmission } from "@/lib/grades";

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
  const [myGrade, setMyGrade] = useState<{ grade: string; feedback: string | null } | null>(null);

  // Teacher status state
  const [statuses, setStatuses] = useState<AssignmentStatus[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState("");

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

        if (submission) {
          const grade = await getMyGrade(submission.id);
          setMyGrade(grade);
        }
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

  function toggleExpand(status: AssignmentStatus) {
    if (expandedId === status.student_id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(status.student_id);
    setGradeInput(status.grade ?? "");
    setFeedbackInput(status.feedback ?? "");
    setGradeError("");
  }

  async function handleGrade(e: React.FormEvent, submissionId: string) {
    e.preventDefault();
    setGrading(true);
    setGradeError("");

    try {
      await gradeSubmission(submissionId, gradeInput, feedbackInput || undefined);
      const statusData = await getAssignmentStatus(assignmentId);
      setStatuses(statusData);
      setExpandedId(null);
    } catch (err) {
      setGradeError(
        err instanceof Error ? err.message : "Failed to save grade."
      );
    } finally {
      setGrading(false);
    }
  }

  const isTeacher = profile?.role === "teacher";
  const gradedCount = statuses.filter((s) => s.status === "graded").length;

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

          {/* Student: submission form + grade */}
          {!isTeacher && (
            <div className="flex flex-col gap-4">
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

              {myGrade && (
                <div className="rounded-lg border border-accent bg-surface p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <Award size={16} className="text-accent" />
                    <span className="text-sm font-semibold text-foreground">
                      Grade: {myGrade.grade}
                    </span>
                  </div>
                  {myGrade.feedback && (
                    <p className="text-sm text-foreground-muted">
                      {myGrade.feedback}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Teacher: status overview + grading */}
          {isTeacher && (
            <div className="rounded-lg border border-border-color bg-surface p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Submission status ({gradedCount}/{statuses.length} graded)
              </h2>

              {statuses.length === 0 ? (
                <p className="text-sm text-foreground-muted">
                  No students in this class yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {statuses.map((s) => {
                    const isExpanded = expandedId === s.student_id;
                    const canGrade = s.status !== "not_started" && s.submission_id;

                    return (
                      <li
                        key={s.student_id}
                        className="rounded-md border border-border-color bg-background"
                      >
                        <button
                          onClick={() => canGrade && toggleExpand(s)}
                          disabled={!canGrade}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm disabled:cursor-default"
                        >
                          <span className="text-foreground">
                            {s.display_name || s.email}
                          </span>
                          <span className="flex items-center gap-2">
                            <span
                              className={`flex items-center gap-1.5 text-xs ${
                                s.status === "graded"
                                  ? "text-accent"
                                  : s.status === "submitted"
                                  ? "text-foreground"
                                  : "text-foreground-muted"
                              }`}
                            >
                              {s.status === "graded" ? (
                                <Award size={14} />
                              ) : s.status === "submitted" ? (
                                <CheckCircle2 size={14} />
                              ) : (
                                <Circle size={14} />
                              )}
                              {s.status === "graded"
                                ? `Graded: ${s.grade}`
                                : s.status === "submitted"
                                ? "Submitted"
                                : "Not started"}
                            </span>
                            {canGrade && (
                              <ChevronDown
                                size={14}
                                className={`text-foreground-muted transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            )}
                          </span>
                        </button>

                        {isExpanded && s.submission_id && (
                          <div className="border-t border-border-color p-3">
                            <p className="mb-1 text-xs font-medium text-foreground-muted">
                              Submitted work
                            </p>
                            <p className="mb-3 whitespace-pre-wrap rounded-md border border-border-color bg-surface p-2 text-sm text-foreground">
                              {s.content}
                            </p>

                            <form
                              onSubmit={(e) => handleGrade(e, s.submission_id!)}
                            >
                              <label className="mb-1 block text-xs text-foreground-muted">
                                Grade
                              </label>
                              <input
                                type="text"
                                value={gradeInput}
                                onChange={(e) => setGradeInput(e.target.value)}
                                placeholder="e.g. 95, A, Pass"
                                required
                                className="mb-2 w-full rounded-md border border-border-color bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                              />

                              <label className="mb-1 block text-xs text-foreground-muted">
                                Feedback (optional)
                              </label>
                              <textarea
                                value={feedbackInput}
                                onChange={(e) =>
                                  setFeedbackInput(e.target.value)
                                }
                                rows={2}
                                className="mb-2 w-full rounded-md border border-border-color bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                              />

                              {gradeError && (
                                <p className="mb-2 text-xs text-danger">
                                  {gradeError}
                                </p>
                              )}

                              <button
                                type="submit"
                                disabled={grading}
                                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
                              >
                                {grading ? "Saving..." : "Save grade"}
                              </button>
                            </form>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}