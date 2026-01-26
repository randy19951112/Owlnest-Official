import { supabase } from "./supabaseClient.js";

export async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    location.href = "/login.html?next=" + encodeURIComponent(location.pathname);
    return null;
  }
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
  location.href = "/login.html";
}
