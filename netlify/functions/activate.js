const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function makeSignature(payload) {
  const hmac = crypto.createHmac("sha256", process.env.KEY_SIGN_SECRET);
  hmac.update(payload);
  return hmac
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
    .slice(0, 16);
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return { ok: false };
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return { ok: false };

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = makeSignature(payload);

  if (sig.length !== expected.length) return { ok: false };

  const same = crypto.timingSafeEqual(
    Buffer.from(sig, "utf8"),
    Buffer.from(expected, "utf8")
  );

  return same ? { ok: true, payload } : { ok: false };
}

exports.handler = async (event) => {
  const origin = event.headers.origin || "";
  const allowed = process.env.ALLOWED_ORIGIN || "https://owlnestofficial.com";

  const headers = {
    "Access-Control-Allow-Origin": origin === allowed ? allowed : allowed,
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

  // 0) 必須登入：抓 JWT
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "unauthorized" }) };
  }
  const jwt = authHeader.slice("Bearer ".length);

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
  if (userErr || !userData || !userData.user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "invalid_token" }) };
  }
  const user = userData.user;

  try {
    const { token } = JSON.parse(event.body || "{}");
    const v = verifyToken(token);
    if (!v.ok) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "invalid_code" }) };
    }

    // 1) 檢查 key 狀態
    const { data: keyData } = await supabaseAdmin
      .from("product_keys")
      .select("status")
      .eq("payload", v.payload)
      .maybeSingle();

    if (!keyData) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "invalid_code" }) };
    }
    if (keyData.status !== "active") {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "revoked" }) };
    }

    // 2) 寫入綁定（payload 必須 unique，已綁定會報錯）
    const { error: insertError } = await supabaseAdmin
      .from("activations")
      .insert({ user_id: user.id, payload: v.payload });

    if (insertError) {
      if (insertError.code === "23505") {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "already_activated" }) };
      }
      console.error("insertError", insertError);
      return { statusCode: 400, headers, body: JSON.stringify({ error: "operation_failed" }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    console.error("activate error", e);
    return { statusCode: 400, headers, body: JSON.stringify({ error: "operation_failed" }) };
  }
};
