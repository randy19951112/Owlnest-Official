import { signOut } from "/account/js/authGuard.js";

function qs(sel, root = document){ return root.querySelector(sel); }

function openDrawer(sidebar, overlay){
  sidebar.classList.add("open");
  overlay.classList.add("show");
}

function closeDrawer(sidebar, overlay){
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}

export function renderNav(activeKey){
  const navMount = document.getElementById("nav");
  if (!navMount) return;

  // 找到 sidebar 容器
  const sidebar = navMount.closest(".sidebar") || qs(".sidebar");
  sidebar?.setAttribute("id", "sidebar");

  // overlay（沒有就注入）
  let overlay = document.getElementById("sidebarOverlay");
  if (!overlay){
    overlay = document.createElement("div");
    overlay.id = "sidebarOverlay";
    overlay.className = "sidebarOverlay";
    document.body.appendChild(overlay);
  }

  // nav HTML
  navMount.innerHTML = `
    <div class="brand">
      <img src="/logo.png" alt="Owlnest">
      <div>
        <div class="t">Owlnest</div>
        <div class="sub">Member Center</div>
      </div>
    </div>

    <div class="nav">
      <a class="${activeKey==="dashboard"?"active":""}" href="/account/index.html"><i class="fas fa-chart-pie"></i> Dashboard</a>
      <a class="${activeKey==="products"?"active":""}" href="/account/products.html"><i class="fas fa-box"></i> My Products</a>
      <a class="${activeKey==="orders"?"active":""}" href="/account/orders.html"><i class="fas fa-receipt"></i> Orders</a>
      <a class="${activeKey==="support"?"active":""}" href="/account/support.html"><i class="fas fa-headset"></i> Warranty & Support</a>
      <a class="${activeKey==="profile"?"active":""}" href="/account/profile.html"><i class="fas fa-user-shield"></i> Profile & Security</a>
      <a class="${activeKey==="settings"?"active":""}" href="/account/settings.html"><i class="fas fa-gear"></i> Settings</a>
    </div>

    <div class="navDivider"></div>

    <div class="navFooter">
      <a href="/index.html"><i class="fas fa-arrow-left"></i> Back to Home</a>
      <button id="btnSignOut"><i class="fas fa-right-from-bracket"></i> Sign Out</button>
    </div>
  `;

  // Sign out
  navMount.querySelector("#btnSignOut")?.addEventListener("click", signOut);

  // Mobile: 在 topbar 左側塞一顆漢堡（沒有才塞）
  const topbar = qs(".topbar");
  if (topbar && !qs("#navToggleBtn", topbar)){
    const btn = document.createElement("button");
    btn.id = "navToggleBtn";
    btn.className = "navToggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "Open menu");
    btn.innerHTML = `<i class="fas fa-bars"></i>`;
    topbar.prepend(btn);

    btn.addEventListener("click", () => openDrawer(sidebar, overlay));
  }

  // overlay click to close
  overlay.addEventListener("click", () => closeDrawer(sidebar, overlay));

  // 點 sidebar 裡任一連結就關起來（手機抽屜）
  navMount.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => closeDrawer(sidebar, overlay));
  });

  // 視窗放大時強制關閉 drawer 狀態
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) closeDrawer(sidebar, overlay);
  });
}
