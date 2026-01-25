const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function makeSignature(payload) {
  const hmac = crypto.createHmac("sha256", process.env.KEY_SIGN_SECRET);
  hmac.update(payload);

  // base64url
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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { token } = JSON.parse(event.body || "{}");
    const v = verifyToken(token);
    if (!v.ok) {
      return { statusCode: 200, headers, body: JSON.stringify({ valid: false }) };
    }

    // 1) 是否存在且未撤銷
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from("product_keys")
      .select("status")
      .eq("payload", v.payload)
      .single();

    if (keyError || !keyData || keyData.status !== "active") {
      return { statusCode: 200, headers, body: JSON.stringify({ valid: false }) };
    }

    // 2) 是否已啟用
    const { data: actData } = await supabaseAdmin
      .from("activations")
      .select("id")
      .eq("payload", v.payload)
      .maybeSingle();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        activated: !!actData,
      }),
    };
  } catch (e) {
    console.error("verify error", e);
    return { statusCode: 200, headers, body: JSON.stringify({ valid: false }) };
  }
};
