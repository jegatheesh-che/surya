document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            // Keep aria-expanded in sync so screen readers announce state changes
            const isOpen = !mobileMenu.classList.contains('hidden');
            mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
        });
    }

    // Close mobile menu on Escape key (WCAG 2.1 — 2.1.2 No Keyboard Trap)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu && !mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.add('hidden');
            if (mobileMenuBtn) {
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                mobileMenuBtn.focus();
            }
        }
    });

    // Scroll Coin Logic
    const scrollCoin = document.getElementById('scroll-coin');
    if (scrollCoin) {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            scrollCoin.style.transform = `rotateY(${scrolled * 0.5}deg)`;
        });
    }

    // Footer year — safe replacement for document.write()
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});
