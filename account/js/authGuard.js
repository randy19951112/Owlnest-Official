// account/js/authGuard.js
// Shared auth helpers for the Member Center pages.
//
// This project is static HTML + ES modules.
// We protect /account/* by checking Supabase session.
// If the user isn't signed in, we redirect to /member-login.html.

import { supabase } from "./supabaseClient.js";

function currentRelativeUrl() {
  return window.location.pathname + window.location.search + window.location.hash;
}

export function redirectToLogin(next = currentRelativeUrl()) {
  // Store next in sessionStorage so even if the query is stripped, we still know.
  try {
    sessionStorage.setItem('redirect_after_login', next);
  } catch (_) {}

  const url = new URL('/member-login.html', window.location.origin);
  if (next) url.searchParams.set('next', next);
  window.location.href = url.toString();
}

export async function handleAuthRedirectInUrl() {
  // Supports Supabase email link flows (code / token_hash).
  const url = new URL(window.location.href);

  try {
    if (url.searchParams.get('code')) {
      await supabase.auth.exchangeCodeForSession(url.searchParams.get('code'));
      url.searchParams.delete('code');
      window.history.replaceState({}, document.title, url.pathname + (url.search || '') + url.hash);
    }

    if (url.searchParams.get('token_hash')) {
      const token_hash = url.searchParams.get('token_hash');
      const type = url.searchParams.get('type') || 'signup';
      await supabase.auth.verifyOtp({ token_hash, type });
      url.searchParams.delete('token_hash');
      url.searchParams.delete('type');
      window.history.replaceState({}, document.title, url.pathname + (url.search || '') + url.hash);
    }
  } catch (e) {
    // Not fatal: user might visit without an auth callback.
    console.warn('[authGuard] handleAuthRedirectInUrl failed:', e);
  }
}

export async function requireUser({ redirect = true } = {}) {
  // Make sure we handle any callback params first.
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
    console.warn('[authGuard] signOut failed:', e);
  }

  try {
    sessionStorage.removeItem('redirect_after_login');
  } catch (_) {}

  window.location.href = '/member-login.html';
}
