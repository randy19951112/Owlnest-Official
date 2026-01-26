import { supabase } from "./supabaseClient.js";

export async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    // 這裡修正為 member-login.html
    // 使用 encodeURIComponent 確保 next 參數正確傳遞
    location.href = "/member-login.html?next=" + encodeURIComponent(window.location.pathname);
    return null;
  }
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
  // 登出後回首頁
  location.href = "/index.html"; 
}
