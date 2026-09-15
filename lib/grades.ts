import { createClient } from "./supabase/client";

// Create or update the grade + feedback for a submission (teacher only —
// enforced by RLS). Uses upsert since a submission can only ever have one
// grade (the unique constraint on submission_id).
export async function gradeSubmission(
  submissionId: string,
  grade: string,
  feedback?: string
): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to grade a submission.");
  }

  const { error } = await supabase.from("assignment_grades").upsert(
    {
      submission_id: submissionId,
      grade,
      feedback: feedback ?? null,
      graded_by: user.id,
      graded_at: new Date().toISOString(),
    },
    { onConflict: "submission_id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}