// netlify/functions/activate.js
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function corsHeaders(origin) {
  const allowed = process.env.ALLOWED_ORIGIN || "https://owlnestofficial.com";
  // 你也可以在環境變數塞多網域，用逗號分隔
  const list = allowed.split(",").map(s => s.trim()).filter(Boolean);

  const allowOrigin = list.includes(origin) ? origin : list[0] || allowed;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// ✅ token 規格：12 碼、英數、無 OWL、無破折號
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
  // ********83E8 （總長仍 12）
  return "*".repeat(8) + token.slice(-4);
}

// 用 token 找 product_keys（同時支援 payload=TOKEN 或 payload=SERIAL.TOKEN）
async function findProductKeyByToken(token) {
  // 1) payload == TOKEN
  const eqRes = await supabaseAdmin
    .from("product_keys")
    .select("payload,status")
    .eq("payload", token)
    .limit(2);

  if (eqRes.error) {
    return { ok: false, reason: "db_error", detail: eqRes.error.message };
  }
  if (eqRes.data && eqRes.data.length === 1) {
    return { ok: true, payload: eqRes.data[0].payload, status: eqRes.data[0].status };
  }
  if (eqRes.data && eqRes.data.length > 1) {
    return { ok: false, reason: "ambiguous_token" };
  }

  // 2) payload LIKE %.TOKEN（serial.token）
  const likeRes = await supabaseAdmin
    .from("product_keys")
    .select("payload,status")
    .like("payload", `%.${token}`)
    .limit(2);

  if (likeRes.error) {
    return { ok: false, reason: "db_error", detail: likeRes.error.message };
  }
  if (!likeRes.data || likeRes.data.length === 0) {
    return { ok: false, reason: "not_found" };
  }
  if (likeRes.data.length > 1) {
    return { ok: false, reason: "ambiguous_token" };
  }

  return { ok: true, payload: likeRes.data[0].payload, status: likeRes.data[0].status };
}

async function getUserIdFromAuthHeader(authHeader) {
  if (!authHeader) return { ok: false, reason: "unauthorized" };
  const m = String(authHeader).match(/^Bearer\s+(.+)$/i);
  const accessToken = m ? m[1].trim() : "";
  if (!accessToken) return { ok: false, reason: "unauthorized" };

  // 用「使用者的 access_token」去查 user 身分
  const userClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user?.id) return { ok: false, reason: "unauthorized" };

  return { ok: true, user_id: data.user.id };
}

exports.handler = async (event) => {
  const origin = event.headers.origin || "";
  const cors = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { success: false, error: "method_not_allowed" }, cors);
  }

  try {
    const body = JSON.parse(event.body || "{}");
    // 兼容：前端可能送 { token } 或 { key }
    const raw = body.token || body.key || "";

    // 0) token 基本驗證
    const t = normalizeToken(raw);
    if (!t.ok) {
      const msg =
        t.reason === "missing_token" ? "Missing token." :
        t.reason === "invalid_length" ? "Token must be exactly 12 characters." :
        t.reason === "invalid_format" ? "Token must be 12 letters/numbers (A–Z, 0–9)." :
        "Invalid token.";

      return json(200, { success: false, error: "invalid_code", reason: t.reason, message: msg }, cors);
    }
    const token = t.token;

    // 1) 需要登入（用 Authorization: Bearer）
    const auth = await getUserIdFromAuthHeader(event.headers.authorization || event.headers.Authorization);
    if (!auth.ok) {
      return json(200, { success: false, error: "unauthorized", message: "Please sign in again." }, cors);
    }
    const userId = auth.user_id;

    // 2) 查 product_keys 這顆 token 是否存在、是否 active
    const found = await findProductKeyByToken(token);
    if (!found.ok) {
      const msg =
        found.reason === "not_found" ? "Invalid token." :
        found.reason === "ambiguous_token" ? "Token matches multiple records." :
        found.reason === "db_error" ? `DB error: ${found.detail}` :
        "Invalid token.";

      return json(200, { success: false, error: "invalid_code", reason: found.reason, message: msg }, cors);
    }

    const payload = found.payload;

    if (found.status !== "active") {
      return json(200, {
        success: false,
        error: "revoked",
        message: "This token is not active or has been revoked.",
      }, cors);
    }

    // 3) 是否已啟用（用 payload 防重）
    const { data: existing, error: existErr } = await supabaseAdmin
      .from("activations")
      .select("id,user_id,activated_at")
      .eq("payload", payload)
      .maybeSingle();

    if (existErr) {
      return json(200, { success: false, error: "db_error", message: existErr.message }, cors);
    }

    if (existing?.id) {
      return json(200, {
        success: false,
        error: "already_activated",
        message: "This token is already activated.",
      }, cors);
    }

    // 4) 寫入 activations
    const insertBase = {
      user_id: userId,
      payload,
      activated_at: new Date().toISOString(),
    };

    // 你 products.html 會 select display_token，所以我們優先寫遮罩
    const insertWithDisplay = {
      ...insertBase,
      display_token: maskToken(token),
    };

    let inserted = null;

    // 4a) 先嘗試帶 display_token
    const ins1 = await supabaseAdmin
      .from("activations")
      .insert(insertWithDisplay)
      .select("id,user_id,payload,activated_at,display_token")
      .single();

    if (!ins1.error) {
      inserted = ins1.data;
    } else {
      // 4b) 如果你的 activations 沒有 display_token 欄，fallback 只寫基本欄位
      const ins2 = await supabaseAdmin
        .from("activations")
        .insert(insertBase)
        .select("id,user_id,payload,activated_at")
        .single();

      if (ins2.error) {
        return json(200, { success: false, error: "db_error", message: ins2.error.message }, cors);
      }
      inserted = ins2.data;
    }

    return json(200, {
      success: true,
      token,           // 12-char token (echo for frontend)
      payload,         // internal/legacy reference
      activation: inserted,
    }, cors);

  } catch (e) {
    console.error("activate error", e);
    return json(200, { success: false, error: "exception", message: "Server error" }, cors);
  }
};
