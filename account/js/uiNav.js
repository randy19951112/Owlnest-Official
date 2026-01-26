import { signOut } from "./authGuard.js";

const NAV = [
  { key: "dashboard", href: "./index.html", icon: "fa-solid fa-chart-pie", label: "Dashboard" },
  { key: "products",  href: "./products.html", icon: "fa-solid fa-box", label: "My Products" },
  { key: "orders",    href: "./orders.html", icon: "fa-solid fa-receipt", label: "Orders" },
  { key: "support",   href: "./support.html", icon: "fa-solid fa-headset", label: "Warranty & Support" },
  { key: "profile",   href: "./profile.html", icon: "fa-solid fa-user", label: "Profile & Security" },
  { key: "settings",  href: "./settings.html", icon: "fa-solid fa-gear", label: "Settings" },
];

let isInitialized = false;

export function renderNav(activeKey = "dashboard") {
  const mount = document.getElementById("nav");
  if (!mount) return;

  // 1. Render Structure (No inline styles)
  mount.innerHTML = `
    <div class="nav-brand">
      <img src="../logo.png" alt="Owlnest" />
      <span>Owlnest</span>
    </div>

    <div class="nav-list" id="navList">
      ${NAV.map(it => `
        <a class="nav-item ${it.key === activeKey ? "active" : ""}" href="${it.href}">
          <i class="${it.icon} nav-ico"></i>
          <span>${it.label}</span>
        </a>
      `).join("")}
    </div>

    <div class="nav-bottom">
      <a class="nav-item" href="../index.html">
        <i class="fa-solid fa-arrow-left nav-ico"></i>
        <span>Back to Home</span>
      </a>
      <button class="nav-item" id="navSignOut" type="button">
        <i class="fa-solid fa-right-from-bracket nav-ico"></i>
        <span>Sign Out</span>
      </button>
    </div>
  `;

  // 2. Auth Actions (Re-binding is safe here as elements are recreated)
  const btnSignOut = document.getElementById("navSignOut");
  if (btnSignOut) {
    btnSignOut.onclick = async () => {
      if(confirm("Are you sure you want to sign out?")) await signOut();
    };
  }

  // 3. Init Global Events (Once)
  if (!isInitialized) {
    initGlobalEvents();
    isInitialized = true;
  }

  // 4. Inject Hamburger if needed (Idempotent logic inside)
  injectHamburger();
}

function toggleMenu(forceState) {
  if (typeof forceState === 'boolean') {
    document.body.classList.toggle('nav-open', forceState);
  } else {
    document.body.classList.toggle('nav-open');
  }
}

function initGlobalEvents() {
  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';
  document.body.appendChild(backdrop);
  
  // Global Listeners
  backdrop.onclick = () => toggleMenu(false);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleMenu(false);
  });

  // Event Delegation for Nav Links (Mobile Auto-close)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.nav-item');
    if (link && window.innerWidth <= 1024) {
      // Don't close if it's the signout button (it has its own confirm logic)
      if (link.id !== 'navSignOut') {
        toggleMenu(false);
      }
    }
  });
}

function injectHamburger() {
  const topbar = document.querySelector('.topbar');
  // Check if button already exists to avoid duplication
  if (topbar && !document.querySelector('.drawer-btn')) {
    const menuBtn = document.createElement('button');
    menuBtn.className = 'drawer-btn';
    menuBtn.type = 'button';
    menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    // Direct binding, no delegation for this specific button
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });
    topbar.prepend(menuBtn);
  }
}
