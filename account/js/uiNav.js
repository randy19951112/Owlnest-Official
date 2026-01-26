// account/js/uiNav.js
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

      <!-- 用 button 避免 a 的預設跳頁干擾 -->
      <button class="navItem" id="navSignOut" type="button"
        style="width:100%; background:transparent; border:0; text-align:left; cursor:pointer;">
        <i class="fa-solid fa-right-from-bracket"></i>
        <span>Sign Out</span>
      </button>
    </div>
  `;

  // 確保一定綁得到（就算點到 icon / span）
  mount.addEventListener("click", async (e) => {
    const btn = e.target.closest("#navSignOut");
    if (!btn) return;
    e.preventDefault();
    await signOut();
  });
}
