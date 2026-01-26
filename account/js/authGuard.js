// account/js/authGuard.js
import { supabase } from "./supabaseClient.js";

function currentRelativeUrl() {
  return window.location.pathname + window.location.search + window.location.hash;
}

export function redirectToLogin(next = currentRelativeUrl()) {
  try {
    sessionStorage.setItem("redirect_after_login", next);
  } catch (_) {}

  const url = new URL("/member-login.html", window.location.origin);
  if (next) url.searchParams.set("next", next);
  window.location.href = url.toString();
}

export async function handleAuthRedirectInUrl() {
  // 支援 email magic link / code flow
  const url = new URL(window.location.href);

  try {
    if (url.searchParams.get("code")) {
      await supabase.auth.exchangeCodeForSession(url.searchParams.get("code"));
      url.searchParams.delete("code");
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    }

    if (url.searchParams.get("token_hash")) {
      const token_hash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type") || "signup";
      await supabase.auth.verifyOtp({ token_hash, type });
      url.searchParams.delete("token_hash");
      url.searchParams.delete("type");
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    }
  } catch (e) {
    console.warn("[authGuard] handleAuthRedirectInUrl failed:", e);
  }
}

export async function requireUser({ redirect = true } = {}) {
  await handleAuthRedirectInUrl();

  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user || null;

  if (!user && redirect) {
    redirectToLogin();
    return null;
  }
  return user;
}

export async function signOut() {
  try {
    // 先清 session（不管成功與否都導回去）
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("[authGuard] signOut failed:", e);
  }

  // 清掉我們自己用的 redirect 記錄
  try {
    sessionStorage.removeItem("redirect_after_login");
  } catch (_) {}

  // 強制導到登入頁，避免卡在保護頁面
  window.location.href = "/member-login.html";
}
