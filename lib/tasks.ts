import { createClient } from "./supabase/client";

export type TaskStatus = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  created_at: string;
  updated_at: string;
};

// Fetch all tasks for a given project, ordered by their column position
export async function getTasks(projectId: string): Promise<Task[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

// Create a new task in a project. Defaults to the "todo" column.
export async function createTask(
  projectId: string,
  title: string,
  description?: string,
  status: TaskStatus = "todo"
): Promise<Task> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to create a task.");
  }

  // New tasks go to the end of their column
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", status);

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: projectId,
      user_id: user.id,
      title,
      description: description ?? null,
      status,
      position: count ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Update a task's title, description, status, and/or position
export async function updateTask(
  id: string,
  updates: Partial<
    Pick<Task, "title" | "description" | "status" | "position">
  >
): Promise<Task> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Delete a task
export async function deleteTask(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}