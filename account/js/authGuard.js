// /account/js/uiNav.js
import { signOut } from "/account/js/authGuard.js";

function ensureOverlay() {
  let overlay = document.querySelector(".nav-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "nav-overlay";
    document.body.appendChild(overlay);
  }
  overlay.addEventListener("click", () => document.body.classList.remove("nav-open"));
}

function ensureTopbarToggle() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  // 把 topbar 右側容器加上 class，讓 CSS 能做手機排版
  const right = topbar.querySelector(":scope > div:last-child");
  if (right && !right.classList.contains("topbarActions")) right.classList.add("topbarActions");

  // 在左側標題區塞一顆漢堡按鈕（只在手機顯示，CSS 控制）
  const left = topbar.querySelector(":scope > div:first-child") || topbar;
  if (!document.getElementById("navToggle")) {
    const btn = document.createElement("button");
    btn.id = "navToggle";
    btn.className = "iconbtn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Open menu");
    btn.innerHTML = `<i class="fa-solid fa-bars"></i>`;
    btn.addEventListener("click", () => document.body.classList.add("nav-open"));
    left.prepend(btn);
  }
}

export function renderNav(active = "dashboard") {
  ensureOverlay();
  ensureTopbarToggle();

  const navRoot = document.getElementById("nav");
  if (!navRoot) return;

  const items = [
    { key: "dashboard", label: "Dashboard", href: "/account/index.html", icon: "fa-chart-pie" },
    { key: "products",  label: "My Products", href: "/account/products.html", icon: "fa-box" },
    { key: "orders",    label: "Orders", href: "/account/orders.html", icon: "fa-receipt" },
    { key: "support",   label: "Warranty & Support", href: "/account/support.html", icon: "fa-headset" },
    { key: "profile",   label: "Profile & Security", href: "/account/profile.html", icon: "fa-user-shield" },
    { key: "settings",  label: "Settings", href: "/account/settings.html", icon: "fa-gear" },
  ];

  navRoot.innerHTML = `
    <div class="navBrand">
      <img src="/logo.png" alt="Owlnest" />
      <div class="brandText">Owlnest</div>
    </div>
    <div class="navSep"></div>

    <button class="navClose" id="navClose" type="button" aria-label="Close menu">
      <i class="fa-solid fa-xmark"></i>
    </button>

    <div class="navList">
      ${items.map(it => `
        <a class="navlink ${it.key === active ? "active" : ""}" href="${it.href}">
          <i class="fa-solid ${it.icon}"></i>
          <span>${it.label}</span>
        </a>
      `).join("")}
    </div>

    <div class="navBottom">
      <a href="/" class="">
        <i class="fa-solid fa-arrow-left"></i>
        <span>Back to Home</span>
      </a>

      <button id="navSignOut" class="danger" type="button">
        <i class="fa-solid fa-right-from-bracket"></i>
        <span>Sign Out</span>
      </button>
    </div>
  `;

  // Mobile close button
  navRoot.querySelector("#navClose")?.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
  });

  // Close drawer after clicking any nav item (mobile UX)
  navRoot.querySelectorAll("a.navlink").forEach(a => {
    a.addEventListener("click", () => document.body.classList.remove("nav-open"));
  });

  // Sign out
  navRoot.querySelector("#navSignOut")?.addEventListener("click", async () => {
    await signOut();
  });
}
