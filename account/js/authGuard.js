import { supabase } from "./supabaseClient.js";

/**
 * 讓 /account 任何頁都能吃 Supabase 的 magic link / OAuth 回跳參數
 */
async function handleAuthRedirectParams() {
  try {
    const url = new URL(window.location.href);

    // OAuth / PKCE code flow
    if (url.searchParams.get("code")) {
      await supabase.auth.exchangeCodeForSession(url.searchParams.get("code"));
      url.searchParams.delete("code");
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ""));
      return;
    }

    // Email OTP / recovery flow
    const token_hash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    if (token_hash && type) {
      await supabase.auth.verifyOtp({ token_hash, type });
      url.searchParams.delete("token_hash");
      url.searchParams.delete("type");
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ""));
    }
  } catch (e) {
    console.warn("Auth redirect handling failed:", e);
  }
}

function loginRedirect(nextUrl) {
  const next = encodeURIComponent(nextUrl || (window.location.pathname + window.location.search));
  window.location.href = `/member-login.html?next=${next}`;
}

export async function requireUser() {
  await handleAuthRedirectParams();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    loginRedirect(window.location.pathname + window.location.search);
    return null;
  }
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/index.html";
}
