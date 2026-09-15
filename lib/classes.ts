import { createClient } from "./supabase/client";

export type ClassRow = {
  id: string;
  teacher_id: string;
  name: string;
  join_code: string;
  created_at: string;
};

export type ClassMember = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

// Fetch classes for the current user. RLS handles the split automatically:
// a teacher gets classes they created, a student gets classes they've joined.
// The same query works for both because the RLS select policies on `classes`
// cover both cases — the client doesn't need to know the role to call this.
export async function getMyClasses(): Promise<ClassRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

// Create a new class (teacher only — enforced by the insert RLS policy,
// which checks auth.uid() = teacher_id).
export async function createClass(name: string): Promise<ClassRow> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to create a class.");
  }

  // Ask the database for a fresh, readable join code (e.g. "K3F9-QP2X")
  const { data: codeData, error: codeError } = await supabase.rpc(
    "generate_join_code"
  );

  if (codeError) {
    throw new Error(codeError.message);
  }

  const { data, error } = await supabase
    .from("classes")
    .insert({
      name,
      teacher_id: user.id,
      join_code: codeData as string,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Join a class by its code (student only — the join_class() Postgres
// function does the actual lookup + insert with elevated privileges,
// since a student can't query `classes` directly before joining).
export async function joinClass(code: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("join_class", {
    code: code.trim().toUpperCase(),
  });

  if (error) {
    throw new Error(
      error.message === "Invalid join code"
        ? "That join code doesn't match any class."
        : error.message
    );
  }

  return data as string; // the joined class's id
}

// Fetch a single class by id (used on the class detail page)
export async function getClass(id: string): Promise<ClassRow | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no matching row / no access
    throw new Error(error.message);
  }

  return data;
}

export type RosterMember = {
  student_id: string;
  display_name: string | null;
  email: string;
  joined_at: string;
};

// Fetch the roster for a class, including student names/emails
// (teacher only — enforced inside the get_class_roster_with_names function).
export async function getClassRoster(classId: string): Promise<RosterMember[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_class_roster_with_names", {
    target_class_id: classId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}