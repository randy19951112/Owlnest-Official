// netlify/functions/snipcart_webhook.js
const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 取得 header（大小寫不敏感）
function getHeader(headers, name) {
  const key = Object.keys(headers || {}).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  return key ? headers[key] : null;
}

// 用 Snipcart 的 requestvalidation endpoint 驗證 webhook
async function validateSnipcartRequest(eventHeaders, apiKey) {
  const token = getHeader(eventHeaders, "X-Snipcart-RequestToken");
  if (!token || !apiKey) return false;

  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  const url = `https://app.snipcart.com/api/requestvalidation/${token}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  return res.ok;
}

exports.handler = async (event) => {
  // 只接受 POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // 先 parse JSON（我們只是拿 mode 來決定「先試哪把 key」，真正安全還是靠 requestvalidation）
  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: "Bad JSON" };
  }

  const KEY_TEST = process.env.SNIPCART_SECRET_API_KEY_TEST;
  const KEY_LIVE = process.env.SNIPCART_SECRET_API_KEY_LIVE;

  // Snipcart webhook 會帶 mode: "Test" | "Live"
  const modeRaw = body.mode ?? body.content?.mode ?? "";
  const mode = String(modeRaw).toLowerCase(); // "test" | "live" | ""

  // 先依 mode 決定優先嘗試哪把 key（但會兩把都試，避免 mode 被偽造）
  let keyTryOrder;
  if (mode === "live") keyTryOrder = [KEY_LIVE, KEY_TEST];
  else if (mode === "test") keyTryOrder = [KEY_TEST, KEY_LIVE];
  else keyTryOrder = [KEY_LIVE, KEY_TEST]; // mode 缺失：先試 LIVE 再試 TEST

  // 去掉空值與重複
  const keys = [...new Set(keyTryOrder.filter(Boolean))];

  let isValid = false;
  for (const k of keys) {
    if (await validateSnipcartRequest(event.headers, k)) {
      isValid = true;
      break;
    }
  }

  if (!isValid) {
    return { statusCode: 401, body: "Invalid webhook request" };
  }

  // 只處理 order.completed
  if (body.eventName !== "order.completed") {
    return { statusCode: 200, body: "Ignored" };
  }

  const content = body.content || {};

  // 容錯抽取訂單資訊
  const orderId =
    content.token ||
    content.orderToken ||
    content.invoiceNumber ||
    content.id;

  const email = String(
    content.email ||
      content.userEmail ||
      content.customerEmail ||
      (content.billingAddress && content.billingAddress.email) ||
      (content.customer && content.customer.email) ||
      ""
  ).trim();

  const total =
    content.grandTotal ??
    content.total ??
    content.amount ??
    null;

  const items = content.items ?? content.cart?.items ?? [];

  if (!orderId || !email) {
    // 沒有 orderId / email 就無法在 account 頁面正確對應
    return { statusCode: 200, body: "Missing order id or email" };
  }

  // 寫入 Supabase（Service Role 可繞過 RLS）
  const { error } = await supabaseAdmin.from("orders").upsert({
    id: String(orderId),
    user_email: email.toLowerCase(),
    total: total,
    items: items,
  });

  if (error) {
    console.error("Supabase upsert error:", error);
    return { statusCode: 500, body: "DB error" };
  }

  return { statusCode: 200, body: "OK" };
};
