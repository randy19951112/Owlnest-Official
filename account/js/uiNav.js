/* account/js/uiNav.js - 完整覆蓋版 */
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

  // 1. 渲染導覽內容
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

  // 2. 登出邏輯
  const btnSignOut = document.getElementById("navSignOut");
  if (btnSignOut) {
    btnSignOut.onclick = async () => {
      if(confirm("Are you sure you want to sign out?")) {
        await signOut();
      }
    };
  }

  // 3. 手機版 Drawer 控制
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('drawerBackdrop');
  const topbar = document.querySelector('.topbar');

  if (sidebar && backdrop && topbar) {
    // 建立漢堡按鈕
    if (!document.querySelector('.drawerBtn')) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'drawerBtn';
      toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
      topbar.prepend(toggleBtn);

      const toggleMenu = () => {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
      };

      toggleBtn.onclick = toggleMenu;
      backdrop.onclick = toggleMenu;
    }
  }
}
