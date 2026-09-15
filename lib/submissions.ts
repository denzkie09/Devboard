import { createClient } from "./supabase/client";

export type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  submitted_at: string;
  updated_at: string;
};

export type AssignmentStatus = {
  student_id: string;
  display_name: string | null;
  email: string;
  status: "not_started" | "submitted";
  submitted_at: string | null;
};

// Fetch the current student's own submission for an assignment, if any.
export async function getMySubmission(
  assignmentId: string
): Promise<Submission | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("assignment_submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Create or update the current student's submission for an assignment.
// Uses upsert since a student can only ever have one submission per
// assignment (enforced by the unique constraint on the table).
export async function submitWork(
  assignmentId: string,
  content: string
): Promise<Submission> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to submit.");
  }

  const { data, error } = await supabase
    .from("assignment_submissions")
    .upsert(
      {
        assignment_id: assignmentId,
        student_id: user.id,
        content,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "assignment_id,student_id" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Fetch every student's submission status for an assignment (teacher only —
// enforced inside the get_assignment_status function).
export async function getAssignmentStatus(
  assignmentId: string
): Promise<AssignmentStatus[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_assignment_status", {
    target_assignment_id: assignmentId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}