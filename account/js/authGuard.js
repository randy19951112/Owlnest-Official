// account/js/authGuard.js
import { supabase } from "./supabaseClient.js";

function currentRelativeUrl() {
  return window.location.pathname + window.location.search + window.location.hash;
}

function loginUrl() {
  // account/* -> ../member-login.html
  return new URL("../member-login.html", window.location.href).toString();
}

export function redirectToLogin(next = currentRelativeUrl()) {
  try {
    sessionStorage.setItem("redirect_after_login", next);
  } catch (_) {}

  const url = new URL(loginUrl());
  if (next) url.searchParams.set("next", next);
  window.location.href = url.toString();
}

export async function handleAuthRedirectInUrl() {
  const url = new URL(window.location.href);

  try {
    if (url.searchParams.get("code")) {
      await supabase.auth.exchangeCodeForSession(url.searchParams.get("code"));
      url.searchParams.delete("code");
      window.history.replaceState({}, document.title, url.pathname + (url.search || "") + url.hash);
    }

    if (url.searchParams.get("token_hash")) {
      const token_hash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type") || "signup";
      await supabase.auth.verifyOtp({ token_hash, type });
      url.searchParams.delete("token_hash");
      url.searchParams.delete("type");
      window.history.replaceState({}, document.title, url.pathname + (url.search || "") + url.hash);
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
    redirectToLogin(currentRelativeUrl());
    return null;
  }
  return user;
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("[authGuard] signOut failed:", e);
  }

  try {
    sessionStorage.removeItem("redirect_after_login");
  } catch (_) {}

  window.location.href = loginUrl();
}
