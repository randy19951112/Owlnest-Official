(async function() {
    if (window.location.pathname.includes('/campaign/')) return;

    try {
        const response = await fetch('/campaign/campaign.json');
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.active !== true) return;

        injectBanner(data.status);
    } catch (e) {
        console.log('Campaign banner skipped');
    }

    function injectBanner(status) {
        let bannerText = "Crowdfunding Live: View Campaign →";
        if (status === 'prelaunch') {
            bannerText = "Crowdfunding Launching Soon: View Details →";
        }

        const banner = document.createElement('div');
        banner.id = "campaign-announcement-bar";
        
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 99999;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #455169;
            color: #faefcf;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.05em;
            border-bottom: 1px solid rgba(250, 239, 207, 0.1);
            transform: translateY(-100%);
            transition: transform 0.5s ease-out;
        `;
        
        banner.innerHTML = `
            <a href="/campaign/" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:8px; width:100%; justify-content:center; height:100%;">
                <i class="fas fa-fire" style="color:#D4AF37;"></i>
                <span>${bannerText}</span>
            </a>
        `;

        document.body.prepend(banner);
        
        requestAnimationFrame(() => {
            banner.style.transform = 'translateY(0)';
            updateLayoutOffsets();
        });

        function updateLayoutOffsets() {
            const bannerHeight = banner.offsetHeight;
            
            document.body.style.transition = 'padding-top 0.3s ease-out';
            document.body.style.paddingTop = bannerHeight + 'px';

            const header = document.querySelector('header');
            if (header) {
                const style = window.getComputedStyle(header);
                if (style.position === 'fixed' || style.position === 'sticky') {
                    header.style.transition = 'top 0.3s ease-out';
                    header.style.top = bannerHeight + 'px';
                }
            }
        }

        window.addEventListener('resize', updateLayoutOffsets);
    }
})();
