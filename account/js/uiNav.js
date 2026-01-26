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

  // 1. 渲染導覽選單內容
  mount.innerHTML = `
    <div class="brand">
      <img src="../logo.png" alt="Owlnest" style="height:32px;" />
      <div class="name" style="font-weight:900; font-size:20px; color:#1f2a39;">Owlnest</div>
    </div>

    <div class="nav" style="display:flex; flex-direction:column; gap:6px; flex-grow:1;">
      ${NAV.map(it => `
        <a class="navItem ${it.key === activeKey ? "active" : ""}" href="${it.href}">
          <i class="${it.icon}" style="width:20px;"></i>
          <span>${it.label}</span>
        </a>
      `).join("")}
    </div>

    <div class="navBottom" style="margin-top:40px; border-top:1px solid rgba(0,0,0,0.05); padding-top:20px;">
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

  // 2. 登出事件綁定
  const btnSignOut = document.getElementById("navSignOut");
  if (btnSignOut) {
    btnSignOut.onclick = async () => {
      if(confirm("Are you sure you want to sign out?")) {
        await signOut();
      }
    };
  }

  // 3. 手機版 Drawer 控制邏輯
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('drawerBackdrop');
  const topbar = document.querySelector('.topbar');

  if (sidebar && backdrop && topbar) {
    // 如果尚未存在漢堡按鈕，則創建一個
    if (!document.querySelector('.drawerBtn')) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'drawerBtn';
      toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
      
      // 將按鈕插入到 topbar 的最前面
      topbar.prepend(toggleBtn);

      const toggleMenu = () => {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
      };

      toggleBtn.onclick = toggleMenu;
      backdrop.onclick = toggleMenu;

      // 點擊導覽項目後自動關閉選單 (手機版體驗更好)
      mount.querySelectorAll('.navItem').forEach(item => {
        item.addEventListener('click', () => {
          if (window.innerWidth <= 860) toggleMenu();
        });
      });
    }
  }
}
