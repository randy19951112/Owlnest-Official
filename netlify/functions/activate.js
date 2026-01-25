// netlify/functions/activate.js
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    // 1) 取出使用者 JWT
    const authHeader = event.headers.authorization || event.headers.Authorization || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!jwt) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: "unauthorized" }) };
    }

    // 2) 用 service role 驗證這個 JWT 是誰
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    const user = userData?.user;

    if (userErr || !user) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: "unauthorized" }) };
    }

    // 3) 讀取 key（相容 token）
    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch {}
    const key = String(body.key || body.token || "").trim();

    if (!key) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: "invalid_code" }) };
    }

    // 4) 檢查 product_keys 是否存在且 active（payload 就是完整 key）
    const { data: pk, error: pkErr } = await supabaseAdmin
      .from("product_keys")
      .select("status")
      .eq("payload", key)
      .maybeSingle();

    if (pkErr || !pk) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: "invalid_code" }) };
    }
    if (pk.status !== "active") {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: "revoked" }) };
    }

    // 5) 是否已被啟用
    const { data: act } = await supabaseAdmin
      .from("activations")
      .select("id")
      .eq("payload", key)
      .maybeSingle();

    if (act) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: "already_activated" }) };
    }

    // 6) 寫入 activations
    const { error: insErr } = await supabaseAdmin
      .from("activations")
      .insert({
        user_id: user.id,     // profiles.id 同 uuid
        payload: key
      });

    if (insErr) {
      // 若同時被重複啟用，可能會撞 unique constraint
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: "db_error", detail: insErr.message }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (e) {
    console.error("activate error", e);
    return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: "exception" }) };
  }
};
