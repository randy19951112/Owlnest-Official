export function renderNav(activeKey) {
  const nav = document.getElementById('sidebar-nav');
  const mobileNav = document.getElementById('mobile-nav-items');
  
  if (!nav) return;

  // 定義選單項目 (使用絕對路徑 /account/...)
  const menuItems = [
      { key: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie', link: '/account/index.html' },
      { key: 'products', label: 'My Products', icon: 'fas fa-box-open', link: '/account/products.html' },
      { key: 'orders', label: 'Orders', icon: 'fas fa-receipt', link: '/account/orders.html' },
      { key: 'profile', label: 'Profile', icon: 'fas fa-user-circle', link: '/account/profile.html' },
      { key: 'support', label: 'Support', icon: 'fas fa-headset', link: '/account/support.html' },
  ];

  let html = '';
  menuItems.forEach(item => {
      const activeClass = (item.key === activeKey) 
          ? 'bg-brand-cream text-brand-dark font-bold shadow-sm' 
          : 'text-gray-400 hover:text-brand-gold hover:bg-white/5';
      
      html += `
          <a href="${item.link}" class="flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeClass}">
              <i class="${item.icon} w-5 text-center"></i>
              <span class="text-sm uppercase tracking-widest">${item.label}</span>
          </a>
      `;
  });

  nav.innerHTML = html;
  
  // Render Mobile Nav (手機版選單)
  if (mobileNav) {
      let mHtml = '';
      menuItems.forEach(item => {
          const mActive = (item.key === activeKey) ? 'text-brand-gold' : 'text-white hover:text-brand-gold';
          mHtml += `<a href="${item.link}" class="${mActive}">${item.label}</a>`;
      });
      mobileNav.innerHTML = mHtml;
  }
}
