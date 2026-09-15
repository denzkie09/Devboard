import { createClient } from "./supabase/client";

export type Assignment = {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

// Fetch assignments for a class. Works for both roles — RLS handles the
// split (teachers see their own classes' assignments, students see
// assignments for classes they've joined) without the client needing to know.
export async function getAssignments(classId: string): Promise<Assignment[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

// Create an assignment (teacher only — enforced by RLS insert policy)
export async function createAssignment(
  classId: string,
  title: string,
  description?: string,
  dueDate?: string
): Promise<Assignment> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to create an assignment.");
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      class_id: classId,
      teacher_id: user.id,
      title,
      description: description ?? null,
      due_date: dueDate ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Delete an assignment (teacher only)
export async function deleteAssignment(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("assignments").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}