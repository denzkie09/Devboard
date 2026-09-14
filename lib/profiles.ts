import { createClient } from "./supabase/client";

export type Profile = {
  id: string;
  role: "teacher" | "student";
  display_name: string | null;
  created_at: string;
};

// Fetch the currently logged-in user's profile (role + display name)
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}