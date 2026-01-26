import { supabase } from "./supabaseClient.js";

export async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data?.user) {
    // [修正] 導向到正確的 member-login.html
    // 使用 encodeURIComponent 確保參數傳遞正確
    // 確保路徑是根目錄下的 member-login.html
    window.location.href = "/member-login.html?next=" + encodeURIComponent(window.location.pathname);
    return null;
  }
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
  // [修正] 登出後導向首頁
  window.location.href = "/index.html";
}
