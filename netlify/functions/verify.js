// netlify/functions/verify.js
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ 你的 token 規格：12 碼、無 OWL、無破折號（英數）
function normalizeToken(raw) {
  const s = String(raw || "").trim();
  if (!s) return { ok: false, reason: "missing_token" };

  // 相容：如果有人貼的是 "serial.token"（含點號），取最後一段當 token
  const dot = s.lastIndexOf(".");
  const token = (dot >= 0 ? s.slice(dot + 1) : s).trim().toUpperCase();

  if (token.length !== 12) return { ok: false, reason: "invalid_length" };
  if (!/^[A-Z0-9]{12}$/.test(token)) return { ok: false, reason: "invalid_format" };

  return { ok: true, token };
}

// 用 token 找出對應的完整 payload（如果你的 product_keys.payload 是 "serial.token"）
async function findFullPayloadByToken(token) {
  // token = ABCD1234EFGH -> payload LIKE '%.ABCD1234EFGH'
  const { data, error } = await supabaseAdmin
    .from("product_keys")
    .select("payload,status")
    .like("payload", `%.${token}`)
    .limit(2);

  if (error) return { ok: false, reason: "db_error", detail: error.message };
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };
  if (data.length > 1) return { ok: false, reason: "ambiguous_token" };

  return { ok: true, payload: data[0].payload, status: data[0].status };
}

exports.handler = async (event) => {
  const origin = event.headers.origin || "";
  const allowed = process.env.ALLOWED_ORIGIN || "https://owlnestofficial.com";

  const headers = {
    "Access-Control-Allow-Origin": origin === allowed ? allowed : allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ valid: false, reason: "method_not_allowed", message: "Method Not Allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    // 兼容：前端可能送 { token } 或 { key } 或兩個都有
    const raw = body.token || body.key || "";

    // 0) 解析並驗證 token
    const t = normalizeToken(raw);
    if (!t.ok) {
      const message =
        t.reason === "missing_token" ? "Missing token" :
        t.reason === "invalid_length" ? "Token must be 12 characters" :
        t.reason === "invalid_format" ? "Token format invalid" :
        "Invalid token";

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false, reason: t.reason, message }),
      };
    }

    const token = t.token;

    // 1) 由 token 找完整 payload
    const found = await findFullPayloadByToken(token);
    if (!found.ok) {
      const message =
        found.reason === "not_found" ? "Token not found" :
        found.reason === "ambiguous_token" ? "Token matches multiple records" :
        found.reason === "db_error" ? `DB error: ${found.detail}` :
        "Invalid";

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false, reason: found.reason, message }),
      };
    }

    const fullKey = found.payload;

    // 2) 是否 active（未撤銷）
    if (found.status !== "active") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: false,
          reason: "inactive",
          message: "Token is not active or has been revoked",
        }),
      };
    }

    // 3) 是否已啟用
    const { data: actData } = await supabaseAdmin
      .from("activations")
      .select("id, activated_at")
      .eq("payload", fullKey)
      .maybeSingle();

    // 4) 回傳（serial 可選；token 一定回傳）
    const dot = fullKey.lastIndexOf(".");
    const serial = dot > 0 ? fullKey.slice(0, dot) : "";
    const tokenOut = dot > 0 ? fullKey.slice(dot + 1) : token;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        activated: !!actData,
        key: fullKey,     // legacy/for internal reference
        serial,           // may be empty
        token: tokenOut,  // 12-char token
      }),
    };
  } catch (e) {
    console.error("verify error", e);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ valid: false, reason: "exception", message: "Server error" }),
    };
  }
};
