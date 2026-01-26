import { supabase } from "./supabaseClient.js";

export async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    // 這裡修正為 member-login.html
    window.location.href = "/member-login.html?next=" + encodeURIComponent(window.location.pathname);
    return null;
  }
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/index.html"; 
}
