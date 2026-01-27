document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/campaign/campaign.json');
        if (!response.ok) throw new Error('Failed to load campaign data');
        const data = await response.json();
        
        renderPage(data);
    } catch (error) {
        console.error('Error:', error);
        document.body.innerHTML = '<div class="flex h-screen items-center justify-center text-[#455169] px-4 text-center">Unable to load campaign data. Please try again later.</div>';
    }
});

function renderPage(data) {
    document.title = `${data.title} | Owlnest Campaign`;
    
    const liveSection = document.getElementById('live-content');
    const endedSection = document.getElementById('ended-content');
    
    if (data.status === 'ended' || (!data.active && data.status !== 'prelaunch')) {
        liveSection.classList.add('hidden');
        endedSection.classList.remove('hidden');
        return;
    }

    // Hero
    document.getElementById('hero-title').textContent = data.title;
    document.getElementById('hero-subtitle').textContent = data.subtitle;
    document.getElementById('hero-desc').textContent = data.description;
    
    const heroBadgeText = document.getElementById('hero-badge-text');
    const heroBadgeDot = document.getElementById('hero-badge-dot');
    
    if (data.status === 'prelaunch') {
        heroBadgeText.textContent = "Launching Soon";
        heroBadgeDot.classList.remove('bg-red-500');
        heroBadgeDot.classList.add('bg-yellow-500');
    } else {
        heroBadgeText.textContent = "Crowdfunding Live";
    }

    // CTA
    const mainCta = document.getElementById('hero-cta-main');
    mainCta.textContent = data.platformCta.label;
    
    if (data.status === 'prelaunch') {
        mainCta.href = "#";
        mainCta.classList.add('opacity-60', 'cursor-not-allowed');
        mainCta.style.pointerEvents = 'none'; 
    } else {
        mainCta.href = data.platformCta.href;
    }
    
    const secCta = document.getElementById('hero-cta-sec');
    secCta.textContent = data.secondaryCta.label;
    secCta.href = data.secondaryCta.href;

    if (data.status === 'prelaunch' && data.notice) {
        const noticeEl = document.createElement('p');
        noticeEl.className = "mt-6 text-xs text-[#D4AF37] italic border-l-2 border-[#D4AF37] pl-3 text-left w-full";
        noticeEl.textContent = data.notice;
        if (!secCta.parentNode.nextElementSibling || secCta.parentNode.nextElementSibling.textContent !== data.notice) {
             secCta.parentNode.after(noticeEl);
        }
    }

    // Stats
    const isPrelaunch = data.status === 'prelaunch';
    document.getElementById('stat-raised').textContent = isPrelaunch ? "TBA" : formatCurrency(data.stats.raised);
    document.getElementById('stat-goal').textContent = isPrelaunch ? "TBA" : formatCurrency(data.stats.goal);
    document.getElementById('stat-backers').textContent = isPrelaunch ? "-" : data.stats.backers.toLocaleString();
    document.getElementById('stat-days').textContent = isPrelaunch ? "Soon" : data.stats.daysLeft;
    
    if (isPrelaunch) {
        document.getElementById('progress-container').classList.add('opacity-20');
        document.getElementById('progress-bar').style.width = '0%';
    } else {
        const progress = Math.min((data.stats.raised / data.stats.goal) * 100, 100);
        document.getElementById('progress-bar').style.width = `${progress}%`;
    }

    // Tiers - Modified to remove bg-white and use border/transparent instead
    const tiersContainer = document.getElementById('tiers-container');
    const tiersTitle = document.getElementById('tiers-title');
    if(isPrelaunch) tiersTitle.textContent = "Reward Tiers (Preview)";

    tiersContainer.innerHTML = data.tiers.map(tier => {
        const priceDisplay = isPrelaunch ? "TBA" : `$${tier.price}`;
        const retailDisplay = isPrelaunch ? "Retail TBA" : `MSRP $${tier.retailPrice}`;
        const btnClass = isPrelaunch 
            ? "bg-gray-400 cursor-not-allowed" 
            : "bg-[#455169] hover:bg-[#D4AF37] hover:text-[#455169]";
        
        return `
        <div class="border border-[#455169]/10 rounded-xl p-6 md:p-8 flex flex-col hover:border-[#D4AF37]/50 transition duration-300 relative group h-full">
            <h3 class="text-xl md:text-2xl font-serif font-bold text-[#455169] mb-2">${tier.name}</h3>
            <div class="flex flex-wrap items-baseline gap-2 mb-6">
                <span class="text-2xl md:text-3xl font-bold text-[#D4AF37]">${priceDisplay}</span>
                <span class="text-xs md:text-sm text-gray-400 line-through">${retailDisplay}</span>
            </div>
            <ul class="flex-1 space-y-3 mb-8">
                ${tier.bullets.map(b => `<li class="flex items-start text-sm text-gray-600"><i class="fas fa-check text-[#D4AF37] mt-1 mr-3 flex-shrink-0 pt-0.5"></i><span>${b}</span></li>`).join('')}
            </ul>
            <a href="${isPrelaunch ? '#' : tier.ctaHref}" ${isPrelaunch ? 'onclick="return false;"' : 'target="_blank"'} class="mt-auto block w-full py-3 text-center text-[#faefcf] font-bold tracking-widest uppercase text-xs transition duration-300 rounded-sm ${btnClass}">
                ${tier.ctaLabel}
            </a>
        </div>
    `}).join('');

    // Timeline
    const timelineContainer = document.getElementById('timeline-container');
    timelineContainer.innerHTML = data.timeline.map(item => `
        <div class="relative pl-8 pb-10 border-l border-[#D4AF37] last:border-0 last:pb-0">
            <div class="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.4)]"></div>
            <div class="text-xs font-bold text-[#D4AF37] mb-1 tracking-widest uppercase">${item.date}</div>
            <h4 class="text-lg font-bold text-[#455169] mb-1">${item.title}</h4>
            <p class="text-sm text-gray-500 leading-relaxed">${item.text}</p>
        </div>
    `).join('');

    // FAQ
    const faqContainer = document.getElementById('faq-container');
    faqContainer.innerHTML = data.faq.map(item => `
        <div class="border-b border-[#455169]/10">
            <button class="w-full py-5 flex items-start justify-between text-left group gap-4" onclick="toggleFaq(this)">
                <span class="font-bold text-[#455169] group-hover:text-[#D4AF37] transition text-sm md:text-base leading-snug pr-2">${item.q}</span>
                <i class="fas fa-plus text-[#D4AF37]/60 text-sm transition-transform duration-300 mt-1 flex-shrink-0"></i>
            </button>
            <div class="hidden pb-5 text-gray-600 text-sm leading-relaxed pr-4 pl-1">
                ${item.a}
            </div>
        </div>
    `).join('');
}

function formatCurrency(num) {
    if (num === null) return "TBA";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

window.toggleFaq = function(btn) {
    const content = btn.nextElementSibling;
    const icon = btn.querySelector('i');
    content.classList.toggle('hidden');
    if (content.classList.contains('hidden')) {
        icon.classList.remove('rotate-45');
        icon.classList.add('fa-plus');
        icon.classList.remove('fa-minus');
    } else {
        icon.classList.add('rotate-45');
        icon.classList.remove('fa-plus');
        icon.classList.add('fa-minus');
    }
};
