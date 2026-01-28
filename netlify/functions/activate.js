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

function normalizeInput12(raw) {
  const s = String(raw || "").trim();
  if (!s) return { ok: false, reason: "missing" };

  // 只允許 12 碼英數（你目前 token 是 hex，也會通過）
  if (s.length !== 12) return { ok: false, reason: "length" };
  if (!/^[A-Za-z0-9]{12}$/.test(s)) return { ok: false, reason: "format" };

  return {
    ok: true,
    raw: s,
    tokenLower: s.toLowerCase(),
    tokenUpper: s.toUpperCase(),
  };
}

function mask12(s) {
  const t = String(s || "");
  if (t.length !== 12) return "";
  return "*".repeat(8) + t.slice(-4);
}

async function requireUserIdFromBearer(authHeader) {
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

// ✅ 依你資料表：優先用 token 欄位找（小寫），再用 payload suffix 找
async function findProductKeyByTokenLower(tokenLower) {
  // 1) token 欄位（你截圖顯示 token 存小寫）
  let q = await supabaseAdmin
    .from("product_keys")
    .select("payload,status,serial,token")
    .eq("token", tokenLower)
    .limit(2);

  if (q.error) return { ok: false, reason: "db_error", detail: q.error.message };
  if (q.data?.length === 1) return { ok: true, row: q.data[0], matched: "token_eq" };
  if (q.data?.length > 1) return { ok: false, reason: "ambiguous" };

  // 2) payload = SERIAL.tokenLower
  q = await supabaseAdmin
    .from("product_keys")
    .select("payload,status,serial,token")
    .like("payload", `%.${tokenLower}`)
    .limit(2);

  if (q.error) return { ok: false, reason: "db_error", detail: q.error.message };
  if (!q.data || q.data.length === 0) return { ok: false, reason: "not_found" };
  if (q.data.length > 1) return { ok: false, reason: "ambiguous" };

  return { ok: true, row: q.data[0], matched: "payload_suffix" };
}

exports.handler = async (event) => {
  const origin = event.headers.origin || "";
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return respond(headers, { success: false, error: "method_not_allowed" }, 405);

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return respond(headers, { success: false, error: "server_misconfig" });
    }

    const body = JSON.parse(event.body || "{}");
    const raw = body.token || body.key || "";
    const n = normalizeInput12(raw);

    if (!n.ok) {
      return respond(headers, { success: false, error: "invalid_code" });
    }

    // ✅ 關鍵：用小寫比對資料庫 token
    const tokenLower = n.tokenLower;

    const auth = await requireUserIdFromBearer(event.headers.authorization || event.headers.Authorization);
    if (!auth.ok) return respond(headers, { success: false, error: "unauthorized" });

    const userId = auth.user_id;

    const found = await findProductKeyByTokenLower(tokenLower);
    if (!found.ok) {
      return respond(headers, { success: false, error: "invalid_code" });
    }

    const row = found.row;

    if (row.status !== "active") {
      return respond(headers, { success: false, error: "revoked" });
    }

    // 防重複啟用：用 payload 當唯一鍵
    const { data: existing, error: existErr } = await supabaseAdmin
      .from("activations")
      .select("id")
      .eq("payload", row.payload)
      .maybeSingle();

    if (existErr) return respond(headers, { success: false, error: "db_error", message: existErr.message });
    if (existing?.id) return respond(headers, { success: false, error: "already_activated" });

    // 寫入 activation：先試 display_token（沒有欄位就 fallback）
    const baseRow = {
      user_id: userId,
      payload: row.payload,
      activated_at: new Date().toISOString(),
    };

    const tryRow = { ...baseRow, display_token: mask12(tokenLower.toUpperCase()) };

    const ins1 = await supabaseAdmin
      .from("activations")
      .insert(tryRow)
      .select("id,user_id,payload,activated_at,display_token")
      .single();

    if (!ins1.error) {
      return respond(headers, { success: true });
    }

    const ins2 = await supabaseAdmin
      .from("activations")
      .insert(baseRow)
      .select("id,user_id,payload,activated_at")
      .single();

    if (ins2.error) {
      return respond(headers, { success: false, error: "db_error", message: ins2.error.message });
    }

    return respond(headers, { success: true });

  } catch (e) {
    console.error("activate exception", e);
    return respond(headers, { success: false, error: "exception" });
  }
};
