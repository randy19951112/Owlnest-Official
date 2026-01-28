// netlify/functions/activate.js
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function corsHeaders(origin) {
  const allowed = (process.env.ALLOWED_ORIGIN || "https://owlnestofficial.com")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const allowOrigin = allowed.includes(origin) ? origin : (allowed[0] || "https://owlnestofficial.com");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };
}

function respond(headers, body, statusCode = 200) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

// ✅ token 規格：12 碼英數（無 OWL、無破折號）
function normalizeToken(raw) {
  const s = String(raw || "").trim();
  if (!s) return { ok: false, reason: "missing_token" };

  // 相容：如果有人貼 serial.token，取最後一段
  const dot = s.lastIndexOf(".");
  const token = (dot >= 0 ? s.slice(dot + 1) : s).trim().toUpperCase();

  if (token.length !== 12) return { ok: false, reason: "invalid_length" };
  if (!/^[A-Z0-9]{12}$/.test(token)) return { ok: false, reason: "invalid_format" };

  return { ok: true, token };
}

function maskToken(token) {
  return "*".repeat(8) + token.slice(-4);
}

// ✅ 同時支援：payload === TOKEN 或 payload === SERIAL.TOKEN
async function findProductKeyPayloadByToken(token) {
  // 1) payload == token
  const eqRes = await supabaseAdmin
    .from("product_keys")
    .select("payload,status")
    .eq("payload", token)
    .limit(2);

  if (eqRes.error) return { ok: false, reason: "db_error", detail: eqRes.error.message };
  if (eqRes.data && eqRes.data.length === 1) return { ok: true, payload: eqRes.data[0].payload, status: eqRes.data[0].status };
  if (eqRes.data && eqRes.data.length > 1) return { ok: false, reason: "ambiguous_token" };

  // 2) payload LIKE %.token
  const likeRes = await supabaseAdmin
    .from("product_keys")
    .select("payload,status")
    .like("payload", `%.${token}`)
    .limit(2);

  if (likeRes.error) return { ok: false, reason: "db_error", detail: likeRes.error.message };
  if (!likeRes.data || likeRes.data.length === 0) return { ok: false, reason: "not_found" };
  if (likeRes.data.length > 1) return { ok: false, reason: "ambiguous_token" };

  return { ok: true, payload: likeRes.data[0].payload, status: likeRes.data[0].status };
}

// ✅ 真正驗證使用者：用 anon client + access token 呼叫 auth.getUser()
async function requireUserIdFromBearer(authHeader) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, reason: "server_misconfig", message: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" };
  }

  const m = String(authHeader || "").match(/^Bearer\s+(.+)$/i);
  const accessToken = m ? m[1].trim() : "";
  if (!accessToken) return { ok: false, reason: "unauthorized" };

  const userClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user?.id) return { ok: false, reason: "unauthorized" };

  return { ok: true, user_id: data.user.id };
}

exports.handler = async (event) => {
  const origin = event.headers.origin || "";
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return respond(headers, { success: false, error: "method_not_allowed" }, 405);
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return respond(headers, {
        success: false,
        error: "server_misconfig",
        message: "Missing SUPABASE env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY)."
      });
    }

    const body = JSON.parse(event.body || "{}");
    const raw = body.token || body.key || "";
    const t = normalizeToken(raw);

    if (!t.ok) {
      const msg =
        t.reason === "missing_token" ? "Missing token." :
        t.reason === "invalid_length" ? "Token must be exactly 12 characters." :
        t.reason === "invalid_format" ? "Token must be 12 letters/numbers (A–Z, 0–9)." :
        "Invalid token.";
      return respond(headers, { success: false, error: "invalid_code", reason: t.reason, message: msg });
    }

    const token = t.token;

    // 1) 驗證登入使用者
    const auth = await requireUserIdFromBearer(event.headers.authorization || event.headers.Authorization);
    if (!auth.ok) {
      const msg = auth.reason === "server_misconfig" ? auth.message : "Please sign in again.";
      return respond(headers, { success: false, error: auth.reason, message: msg });
    }
    const userId = auth.user_id;

    // 2) 查 product_keys
    const found = await findProductKeyPayloadByToken(token);
    if (!found.ok) {
      const msg =
        found.reason === "not_found" ? "Invalid token." :
        found.reason === "ambiguous_token" ? "Token matches multiple records." :
        found.reason === "db_error" ? `DB error: ${found.detail}` :
        "Invalid token.";
      return respond(headers, { success: false, error: "invalid_code", reason: found.reason, message: msg });
    }

    if (found.status !== "active") {
      return respond(headers, { success: false, error: "revoked", message: "This token is not active or has been revoked." });
    }

    const payload = found.payload;

    // 3) 防重複啟用
    const { data: existing, error: existErr } = await supabaseAdmin
      .from("activations")
      .select("id")
      .eq("payload", payload)
      .maybeSingle();

    if (existErr) {
      return respond(headers, { success: false, error: "db_error", message: existErr.message });
    }

    if (existing?.id) {
      return respond(headers, { success: false, error: "already_activated", message: "This token is already activated." });
    }

    // 4) 寫入 activations：先嘗試寫 display_token，沒有欄位就 fallback
    const baseRow = {
      user_id: userId,
      payload,
      activated_at: new Date().toISOString(),
    };

    const tryRow = { ...baseRow, display_token: maskToken(token) };

    const ins1 = await supabaseAdmin
      .from("activations")
      .insert(tryRow)
      .select("id,user_id,payload,activated_at,display_token")
      .single();

    if (!ins1.error) {
      return respond(headers, { success: true, token, payload, activation: ins1.data });
    }

    const ins2 = await supabaseAdmin
      .from("activations")
      .insert(baseRow)
      .select("id,user_id,payload,activated_at")
      .single();

    if (ins2.error) {
      return respond(headers, { success: false, error: "db_error", message: ins2.error.message });
    }

    return respond(headers, { success: true, token, payload, activation: ins2.data });

  } catch (e) {
    console.error("activate exception", e);
    return respond(headers, { success: false, error: "exception", message: "Server error" });
  }
};
