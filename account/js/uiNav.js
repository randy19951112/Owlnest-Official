import { signOut } from "./authGuard.js";

const NAV = [
  { key: "dashboard", href: "./index.html", icon: "fa-solid fa-chart-pie", label: "Dashboard" },
  { key: "products",  href: "./products.html", icon: "fa-solid fa-box", label: "My Products" },
  { key: "orders",    href: "./orders.html", icon: "fa-solid fa-receipt", label: "Orders" },
  { key: "support",   href: "./support.html", icon: "fa-solid fa-headset", label: "Warranty & Support" },
  { key: "profile",   href: "./profile.html", icon: "fa-solid fa-user", label: "Profile & Security" },
  { key: "settings",  href: "./settings.html", icon: "fa-solid fa-gear", label: "Settings" },
];

export function renderNav(activeKey = "dashboard") {
  const mount = document.getElementById("nav");
  if (!mount) return;

  // 1. 渲染內容
  mount.innerHTML = `
    <div class="brand">
      <img src="../logo.png" alt="Owlnest" />
      <div class="name">Owlnest</div>
    </div>
    <div class="nav">
      ${NAV.map(it => `
        <a class="navItem ${it.key === activeKey ? "active" : ""}" href="${it.href}">
          <i class="${it.icon}"></i>
          <span>${it.label}</span>
        </a>
      `).join("")}
    </div>
    <div class="navBottom">
      <a class="navItem" href="../index.html">
        <i class="fa-solid fa-arrow-left"></i>
        <span>Back to Home</span>
      </a>
      <button class="navItem" id="navSignOut" type="button"
        style="width:100%; background:transparent; border:0; text-align:left; cursor:pointer; font-family:inherit;">
        <i class="fa-solid fa-right-from-bracket"></i>
        <span>Sign Out</span>
      </button>
    </div>
  `;

  // 2. 綁定登出邏輯
  const btnSignOut = document.getElementById("navSignOut");
  if (btnSignOut) {
    btnSignOut.onclick = async () => {
      if(confirm("Sign out now?")) await signOut();
    };
  }

  // 3. 核心修正：自動處理手機版 Drawer 切換
  // [Fix] 不再包裹標題區塊，避免破壞電腦版 Flex 結構
  const backdrop = document.getElementById('drawerBackdrop');
  const toggleMenu = () => document.body.classList.toggle('nav-open');

  const topbar = document.querySelector('.topbar');
  // 確保 topbar 存在且尚未插入過按鈕
  if (topbar && !document.querySelector('.drawerBtn')) {
    const menuBtn = document.createElement('button');
    menuBtn.className = 'drawerBtn';
    menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    menuBtn.onclick = toggleMenu;

    // 直接插入到最前面，不更動原本的標題 Div 結構
    topbar.prepend(menuBtn);
  }

  if (backdrop) backdrop.onclick = toggleMenu;
}
