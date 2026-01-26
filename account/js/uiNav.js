/**
 * Side navigation for /account pages
 * - 全部用絕對路徑避免 404
 * - 與 account.css 的白卡+奶油底一致
 */
export function renderNav(activeKey) {
  const navContainer = document.getElementById("nav");
  if (!navContainer) return;

  const item = (key, href, text, iconClass, extra = "") => {
    const isActive = key === activeKey ? "active" : "";
    const isDisabled = href ? "" : "disabled";
    const link = href ? (href.startsWith("/") ? href : `/account/${href}`) : "javascript:void(0)";
    return `
      <a class="${isActive} ${isDisabled}" href="${link}">
        <i class="${iconClass}"></i>
        <span>${text}</span>
        ${extra}
      </a>
    `;
  };

  navContainer.innerHTML = `
    <div class="brand">
      <a href="/index.html" style="display:flex; align-items:center; gap:12px;">
        <img src="/logo.png" alt="Owlnest Logo">
        <span>Owlnest</span>
      </a>
    </div>

    <div class="nav">
      ${item("dashboard", "index.html", "Dashboard", "fas fa-chart-pie")}
      ${item("products", "products.html", "My Products", "fas fa-box-open")}
      ${item("orders", "orders.html", "Orders", "fas fa-receipt")}
      ${item("support", "support.html", "Warranty & Support", "fas fa-headset")}
      ${item("profile", "profile.html", "Profile & Security", "fas fa-user-circle")}
      ${item("settings", "settings.html", "Settings", "fas fa-cog")}

      <div style="height:1px; background: var(--ink-08); margin:12px 0;"></div>

      <a href="/index.html" style="opacity:.75; font-size:.95rem; padding:12px 12px; border-radius:12px;">
        <i class="fas fa-arrow-left" style="width:20px; text-align:center; margin-right:12px; color:rgba(69,81,105,.55);"></i>
        Back to Home
      </a>
    </div>
  `;

  // 小螢幕補一個簡單 header（sidebar 會被 CSS hide）
  if (window.innerWidth <= 920 && !document.getElementById("mobile-header")) {
    const mobileHeader = document.createElement("div");
    mobileHeader.id = "mobile-header";
    mobileHeader.className = "mobile-header";
    mobileHeader.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="/logo.png" style="height:24px; opacity:.9;">
        <span class="title">Owlnest</span>
      </div>
      <a href="/account/index.html" style="font-size:0.85rem; opacity:0.85;">Dashboard</a>
    `;
    document.body.prepend(mobileHeader);
  }
}
