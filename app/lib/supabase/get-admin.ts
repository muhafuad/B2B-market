import { supabase } from "./client";

export async function getSuperAdminId() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "super_admin")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (error) {
    console.error("Failed to get admin:", error);
    return null;
  }

  return data.id;
}
