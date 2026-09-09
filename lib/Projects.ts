import { createClient } from "./supabase/client";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

// Fetch all projects belonging to the current user, newest first
export async function getProjects(): Promise<Project[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

// Create a new project for the current user
export async function createProject(
  name: string,
  description?: string
): Promise<Project> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to create a project.");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name,
      description: description ?? null,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Update an existing project's name and/or description
export async function updateProject(
  id: string,
  updates: Partial<Pick<Project, "name" | "description">>
): Promise<Project> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Delete a project (cascades to its tasks via the DB schema)
export async function deleteProject(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}