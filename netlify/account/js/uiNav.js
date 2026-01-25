export function renderNav(activeKey) {
  const nav = document.getElementById("nav");
  if (!nav) return;

  const item = (key, href, text, extra = "") => {
    const active = key === activeKey ? "active" : "";
    const disabled = href ? "" : "disabled";
    const realHref = href || "javascript:void(0)";
    return `<a class="${active} ${disabled}" href="${realHref}">${text}${extra}</a>`;
  };

  nav.innerHTML = `
    <div class="brand">Owlnest Account</div>
    <div class="nav">
      ${item("dashboard", "/account/index.html", "Dashboard")}
      ${item("products", "/account/products.html", "My Products")}
      ${item("orders", null, "Orders", "<small>(Phase 2)</small>")}
      ${item("support", null, "Warranty & Support", "<small>(Phase 3)</small>")}
      ${item("profile", "/account/profile.html", "Profile & Security")}
      ${item("settings", null, "Settings", "<small>(Phase 3)</small>")}
    </div>
  `;
}
