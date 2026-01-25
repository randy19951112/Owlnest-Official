<script>
  // ✅ 1) 填你自己的 Supabase 專案資訊（用 Publishable key，不要用 secret）
  const SUPABASE_URL = "https://khoiplqugajmybmultzs.supabase.co";
  const SUPABASE_KEY = "sb_publishable_ic3b9TeYt7SuXxLIhLuyvA_FWHYVb0Z";

  // ✅ 2) 建立 Supabase client（不要命名成 supabase，避免覆蓋 window.supabase）
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  // ✅ 3) 你的 Netlify function endpoint（看你檔名是 active.js 還是 activate.js）
  // - 如果檔案是 netlify/functions/active.js → 用 "/.netlify/functions/active"
  // - 如果檔案是 netlify/functions/activate.js → 用 "/.netlify/functions/activate"
  const ACTIVATE_ENDPOINT = "/.netlify/functions/activate";

  let sessionToken = null;

  function $(id) { return document.getElementById(id); }

  async function init() {
    try {
      // 顯示載入提示
      const loading = $("loading-auth");
      const main = $("main-content");
      const msg = $("status-msg");
      const btn = $("activate-btn");

      // 讀取 URL 的 code
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      // 沒 code 直接顯示錯誤
      if (!code) {
        if (loading) loading.classList.add("hidden");
        if (main) main.classList.remove("hidden");
        if ($("activate-code")) $("activate-code").value = "";
        if (msg) {
          msg.textContent = "Invalid Link (Missing Code)";
          msg.className = "text-red-400 font-bold";
        }
        if (btn) btn.disabled = true;
        return;
      }

      // 先把 code 放到框裡
      if ($("activate-code")) $("activate-code").value = code;

      // 檢查 session
      const { data: { session }, error } = await sb.auth.getSession();
      if (error) console.error(error);

      if (!session) {
        // 沒登入：記住要回來的網址，再導去 member-login.html
        sessionStorage.setItem("redirect_after_login", window.location.href);
        window.location.href = "member-login.html";
        return;
      }

      sessionToken = session.access_token;

      // 顯示登入者 email
      if ($("user-email")) $("user-email").textContent = session.user.email || "";

      // 顯示主內容
      if (loading) loading.classList.add("hidden");
      if (main) main.classList.remove("hidden");

    } catch (e) {
      console.error("init error:", e);
      const loading = $("loading-auth");
      if (loading) loading.textContent = "Script error. Please check console.";
    }
  }

  async function activateProduct() {
    const code = $("activate-code")?.value;
    const btn = $("activate-btn");
    const msg = $("status-msg");

    if (!code) return;

    btn.disabled = true;
    btn.textContent = "Activating...";
    msg.textContent = "";

    try {
      const response = await fetch(ACTIVATE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ token: code })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        msg.textContent = "🎉 Success! Product registered to your account.";
        msg.className = "text-green-400 font-bold";
        btn.classList.add("hidden");
      } else {
        if (data.error === "already_activated") msg.textContent = "⚠️ Product already activated.";
        else if (data.error === "revoked") msg.textContent = "❌ Product key revoked.";
        else if (data.error === "invalid_code") msg.textContent = "❌ Invalid code.";
        else msg.textContent = "❌ Activation Failed.";
        msg.className = "text-red-400 font-bold";
      }

    } catch (err) {
      msg.textContent = "Connection Error.";
      msg.className = "text-red-400 font-bold";
    } finally {
      if (!msg.textContent.includes("Success")) {
        btn.disabled = false;
        btn.textContent = "Confirm & Activate";
      }
    }
  }

  // ✅ 讓 HTML 的 onclick="activateProduct()" 找得到這個 function
  window.activateProduct = activateProduct;

  init();
</script>
