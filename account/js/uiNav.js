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

  // 1. 渲染側邊欄內容
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

  // 2. 登出功能
  const btnSignOut = document.getElementById("navSignOut");
  if (btnSignOut) {
    btnSignOut.onclick = async () => {
      if(confirm("Sign out now?")) await signOut();
    };
  }

  // 3. 手機版 Drawer 控制邏輯
  const toggleMenu = () => document.body.classList.toggle('nav-open');
  
  // 綁定背景遮罩點擊
  const backdrop = document.getElementById('drawerBackdrop');
  if (backdrop) backdrop.onclick = toggleMenu;

  // 檢查並插入漢堡按鈕 (僅插入一次)
  const topbar = document.querySelector('.topbar');
  if (topbar && !document.querySelector('.drawerBtn')) {
    const menuBtn = document.createElement('button');
    menuBtn.className = 'drawerBtn';
    menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    menuBtn.onclick = toggleMenu;

    // 單純插入到 topbar 最前面，不改變任何現有結構
    topbar.prepend(menuBtn);
    
    // 點擊側邊欄連結後自動關閉選單 (優化手機體驗)
    mount.querySelectorAll('.navItem').forEach(link => {
      link.addEventListener('click', () => {
        if(window.innerWidth <= 860) document.body.classList.remove('nav-open');
      });
    });
  }
}
