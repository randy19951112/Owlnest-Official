import { supabase } from "./supabaseClient.js";

export async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    // 修正路徑為 member-login.html
    location.href = "/member-login.html?next=" + encodeURIComponent(location.pathname);
    return null;
  }
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
  location.href = "/index.html"; // 登出回首頁
}
