export function renderNav(activeKey) {
  const navContainer = document.getElementById("nav");
  if (!navContainer) return;

  const item = (key, href, text, iconClass, extra = "") => {
    const isActive = key === activeKey ? "active" : "";
    const isDisabled = href ? "" : "disabled";
    const link = href || "javascript:void(0)";
    return `
      <a class="${isActive} ${isDisabled}" href="${link}">
        <i class="${iconClass}"></i>
        <span>${text}</span>
        ${extra}
      </a>
    `;
  };

  // 生成側邊欄 HTML
  navContainer.innerHTML = `
    <div class="brand">
      <img src="/logo2.png" alt="Logo">
      <span>Owlnest</span>
    </div>
    
    <div class="nav">
      ${item("dashboard", "/account/index.html", "Dashboard", "fas fa-chart-pie")}
      ${item("products", "/account/products.html", "My Products", "fas fa-box-open")}
      ${item("profile", "/account/profile.html", "Profile", "fas fa-user-circle")}
      
      <div style="height:1px; background:rgba(255,255,255,0.1); margin:10px 0;"></div>
      
      ${item("orders", null, "Orders", "fas fa-receipt", "<small>Phase 2</small>")}
      ${item("support", null, "Support", "fas fa-headset", "<small>Phase 3</small>")}
      ${item("settings", null, "Settings", "fas fa-cog", "<small>Phase 3</small>")}
    </div>
    
    <div style="margin-top: auto; padding-top: 20px;">
        <a href="/index.html" class="" style="opacity: 0.6; font-size: 0.9em;">
            <i class="fas fa-arrow-left"></i> Back to Home
        </a>
    </div>
  `;

  // 手機版漢堡選單 (簡單生成)
  if (window.innerWidth <= 920 && !document.getElementById('mobile-header')) {
    const mobileHeader = document.createElement('div');
    mobileHeader.id = 'mobile-header';
    mobileHeader.className = 'mobile-header';
    mobileHeader.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
            <img src="/logo2.png" style="height:24px;">
            <span style="font-family:'Playfair Display';font-weight:700;">Owlnest</span>
        </div>
        <a href="/index.html" style="font-size:0.8rem; opacity:0.8;">Home</a>
    `;
    document.body.prepend(mobileHeader);
  }
}
