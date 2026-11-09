import { supabase, supabaseAdmin } from "./lib/supabase.js";

export async function myNotes() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("notes").select("*").eq("user_id", user.id);
  if (error) throw error;
  return data;
}

export async function addNote(body) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("notes").insert({ user_id: user.id, body });
  if (error) throw error;
}

export async function allNotesForAdmin() {
  const { data, error } = await supabaseAdmin.from("notes").select("*");
  if (error) throw error;
  return data;
}

export async function uploadAvatar(file) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.storage.from("avatars").upload(`${user.id}.png`, file, { upsert: true });
  if (error) throw error;
}
