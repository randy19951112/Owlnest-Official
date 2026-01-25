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

// Snipcart webhook 安全驗證：用 X-Snipcart-RequestToken 去 requestvalidation endpoint 驗證
async function validateSnipcartRequest(eventHeaders) {
  const token = getHeader(eventHeaders, "X-Snipcart-RequestToken");
  if (!token) return false;

  const apiKey = process.env.SNIPCART_SECRET_API_KEY; // Snipcart Secret API Key
  if (!apiKey) return false;

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

  // 1) 先做 Snipcart webhook 驗證（官方建議）
  const isValid = await validateSnipcartRequest(event.headers);
  if (!isValid) {
    return { statusCode: 401, body: "Invalid webhook request" };
  }

  // 2) 解析 payload
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: "Bad JSON" };
  }

  // Snipcart webhook 會帶 eventName，像 order.completed
  if (!body.eventName) {
    return { statusCode: 400, body: "Missing eventName" };
  }

  // 只處理訂單完成
  if (body.eventName !== "order.completed") {
    return { statusCode: 200, body: "Ignored" };
  }

  const content = body.content || {};

  // 3) 抽取你要的欄位（不同設定可能會有些差異，所以我做容錯）
  const orderId =
    content.token ||
    content.orderToken ||
    content.invoiceNumber ||
    content.id;

  const email =
    (content.email ||
      (content.billingAddress && content.billingAddress.email) ||
      (content.customer && content.customer.email) ||
      ""
    ).toLowerCase();

  const total =
    content.grandTotal ??
    content.total ??
    content.amount ??
    null;

  const items = content.items ?? content.cart?.items ?? [];

  if (!orderId || !email) {
    // 沒有 orderId 或 email 的話，你 account 頁也無法對應顯示
    return { statusCode: 200, body: "Missing order id or email" };
  }

  // 4) 寫入 Supabase（Service Role 可繞過 RLS）
  const { error } = await supabaseAdmin.from("orders").upsert({
    id: String(orderId),
    user_email: email,
    total: total,
    items: items,
  });

  if (error) {
    console.error("Supabase upsert error:", error);
    return { statusCode: 500, body: "DB error" };
  }

  return { statusCode: 200, body: "OK" };
};
