import { signOut } from "/account/js/authGuard.js";

const NAV = [
  { key: "dashboard", href: "/account/index.html", icon: "fa-solid fa-chart-pie", label: "Dashboard" },
  { key: "products",  href: "/account/products.html", icon: "fa-solid fa-box", label: "My Products" },
  { key: "orders",    href: "/account/orders.html", icon: "fa-solid fa-receipt", label: "Orders" },
  { key: "support",   href: "/account/support.html", icon: "fa-solid fa-headset", label: "Warranty & Support" },
  { key: "profile",   href: "/account/profile.html", icon: "fa-solid fa-user", label: "Profile & Security" },
  { key: "settings",  href: "/account/settings.html", icon: "fa-solid fa-gear", label: "Settings" },
];

function ensureMobileDrawerWiring() {
  // backdrop
  if (!document.querySelector(".navBackdrop")) {
    const bd = document.createElement("div");
    bd.className = "navBackdrop";
    bd.addEventListener("click", () => document.body.classList.remove("nav-open"));
    document.body.appendChild(bd);
  }

  // close on ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.body.classList.remove("nav-open");
  });

  // close drawer after click a link (mobile)
  document.addEventListener("click", (e) => {
    const a = e.target?.closest?.("a");
    if (a && a.classList.contains("navItem")) {
      document.body.classList.remove("nav-open");
    }
  });
}

function ensureTopbarToggle() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  // left area (title container)
  const left = topbar.children?.[0];
  if (left && !left.classList.contains("topbarLeft")) {
    left.classList.add("topbarLeft");
  }
  if (left && !left.classList.contains("topbarTitle")) {
    left.classList.add("topbarTitle");
  }

  // inject toggle button (mobile only via CSS)
  if (!document.getElementById("navToggle") && left) {
    const btn = document.createElement("button");
    btn.id = "navToggle";
    btn.className = "iconbtn navToggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "Open menu");
    btn.innerHTML = `<i class="fa-solid fa-bars"></i>`;
    btn.addEventListener("click", () => {
      document.body.classList.toggle("nav-open");
    });
    left.prepend(btn);
  }
}

export function renderNav(activeKey = "dashboard") {
  const mount = document.getElementById("nav");
  if (!mount) return;

  mount.innerHTML = `
    <div class="brand">
      <img src="/logo.png" alt="Owlnest" />
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
      <a class="navItem" href="/index.html">
        <i class="fa-solid fa-arrow-left"></i>
        <span>Back to Home</span>
      </a>
      <button class="navItem" id="navSignOut" type="button" style="width:100%; background:transparent; border:0; text-align:left;">
        <i class="fa-solid fa-right-from-bracket"></i>
        <span>Sign Out</span>
      </button>
    </div>
  `;

  document.getElementById("navSignOut")?.addEventListener("click", async () => {
    await signOut();
  });

  ensureMobileDrawerWiring();
  ensureTopbarToggle();
}
