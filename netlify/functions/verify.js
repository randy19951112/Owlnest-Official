// netlify/functions/verify.js
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 把輸入統一成「完整 key」：OWL-xxxx.yyyyy
async function resolveFullKey(raw) {
  const s = String(raw || "").trim();
  if (!s) return { ok: false, reason: "missing_key" };

  // 1) 已經是完整 key（含 . ）
  if (s.includes(".")) return { ok: true, fullKey: s };

  // 2) 只有 token（沒有 . ）：嘗試用 LIKE 找出對應 payload
  // 例如 token = dd39eac4c6fc -> payload LIKE '%.dd39eac4c6fc'
  const tokenOnly = s;

  const { data, error } = await supabaseAdmin
    .from("product_keys")
    .select("payload,status")
    .like("payload", `%.${tokenOnly}`)
    .limit(2);

  if (error) return { ok: false, reason: "db_error", detail: error.message };
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };
  if (data.length > 1) return { ok: false, reason: "ambiguous_token" };

  return { ok: true, fullKey: data[0].payload };
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
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    // 兼容你前端可能送 {token} 或 {key} 或兩個都有
    const raw = body.key || body.token || "";

    // 0) 轉成完整 key
    const r = await resolveFullKey(raw);
    if (!r.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: false,
          reason: r.reason,
          message:
            r.reason === "missing_key" ? "Missing key/token" :
            r.reason === "not_found" ? "Key not found" :
            r.reason === "ambiguous_token" ? "Token matches multiple keys" :
            r.reason === "db_error" ? `DB error: ${r.detail}` :
            "Invalid",
        }),
      };
    }

    const fullKey = r.fullKey;

    // 1) 是否存在且未撤銷
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from("product_keys")
      .select("status")
      .eq("payload", fullKey)
      .maybeSingle();

    if (keyError || !keyData || keyData.status !== "active") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: false,
          reason: "inactive_or_missing",
          message: "Key not active or not found",
        }),
      };
    }

    // 2) 是否已啟用
    const { data: actData } = await supabaseAdmin
      .from("activations")
      .select("id, activated_at")
      .eq("payload", fullKey)
      .maybeSingle();

    // 3) 回傳（順便把 serial/token 拆給前端用）
    const dot = fullKey.lastIndexOf(".");
    const serial = dot > 0 ? fullKey.slice(0, dot) : "";
    const token = dot > 0 ? fullKey.slice(dot + 1) : fullKey;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        activated: !!actData,
        key: fullKey,
        serial,
        token,
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
