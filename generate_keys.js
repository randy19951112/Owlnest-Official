// generate_keys.js
const crypto = require("crypto");

// 1) 要跟 Netlify 的 KEY_SIGN_SECRET 一模一樣
const SECRET = "Owlnest_KeySign_2026!p9Rk7vQ3mZ2#Lx8sT4nH1wC6yJ0aB5dE9uG7K";

// 2) 你的網域
const DOMAIN = "https://owlnestofficial.com";

// 3) 批次代號與數量
const BATCH_ID = "2026A";
const START_NUM = 1;
const COUNT = 20; // 這次生成幾組

function sign(payload) {
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(payload);

  // 跟 verify/activate function 的算法一致：base64url + 截前16碼
  return hmac
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
    .substring(0, 16);
}

console.log("payload,token,qr_link");

for (let i = 0; i < COUNT; i++) {
  const serial = String(START_NUM + i).padStart(6, "0");
  const payload = `OWL-${BATCH_ID}-${serial}`;
  const sig = sign(payload);
  const token = `${payload}.${sig}`;
  const link = `${DOMAIN}/verify.html?code=${encodeURIComponent(token)}`;

  console.log(`${payload},${token},${link}`);
}
