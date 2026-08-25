/**
 * WIZ Bangka Belitung - Active Navigation, ScrollSpy & Mobile Menu Handler
 */

(function() {
    // Enforce official custom domain (Redirect any *.vercel.app access to www.wizbangkabelitung.or.id)
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
        const host = window.location.hostname.toLowerCase();
        if (host.endsWith('.vercel.app') || host === 'wizbangkabelitung.or.id') {
            window.location.replace('https://www.wizbangkabelitung.or.id' + window.location.pathname + window.location.search + window.location.hash);
            return;
        }
    }

    let _lastMenuToggle = 0;

    function toggleMobileMenu(forceState) {
        const now = Date.now();
        // Prevent rapid double-triggering from multiple event listeners (e.g. onclick + addEventListener)
        if (typeof forceState !== 'boolean' && (now - _lastMenuToggle < 200)) {
            return;
        }
        _lastMenuToggle = now;

        const mobileMenu = document.getElementById('mobile-menu');
        const menuIcon = document.getElementById('menu-icon');
        const menuBtn = document.getElementById('mobile-menu-btn');
        if (!mobileMenu) return;

        const isCurrentlyHidden = mobileMenu.classList.contains('hidden');
        const shouldOpen = (typeof forceState === 'boolean') ? forceState : isCurrentlyHidden;

        if (shouldOpen) {
            mobileMenu.classList.remove('hidden');
            if (menuIcon) menuIcon.textContent = 'close';
            if (menuBtn) {
                menuBtn.setAttribute('aria-expanded', 'true');
                menuBtn.classList.add('text-primary');
            }
        } else {
            mobileMenu.classList.add('hidden');
            if (menuIcon) menuIcon.textContent = 'menu';
            if (menuBtn) {
                menuBtn.setAttribute('aria-expanded', 'false');
                menuBtn.classList.remove('text-primary');
            }
        }
    }

    // Expose toggle function globally for inline onclick & interoperability
    window.toggleMobileMenu = toggleMobileMenu;

    function initActiveNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const path = window.location.pathname.split('/').pop() || 'index.html';
        const isIndexPage = (path === '' || path === 'index.html' || path === 'index.php');

        function setActive(targetLink) {
            navLinks.forEach(link => {
                const isThisTarget = (link === targetLink);
                if (isThisTarget) {
                    link.classList.add('text-primary', 'dark:text-primary-fixed', 'font-bold', 'border-primary', 'dark:border-primary-fixed');
                    link.classList.remove('text-on-surface-variant', 'border-transparent');
                } else {
                    link.classList.remove('text-primary', 'dark:text-primary-fixed', 'font-bold', 'border-primary', 'dark:border-primary-fixed');
                    link.classList.add('text-on-surface-variant', 'border-transparent');
                }
            });
        }

        function activateByHref(targetHref) {
            let matchedLink = null;

            // Search desktop and mobile links
            navLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href === targetHref || href === `index.html${targetHref}`) {
                    matchedLink = link;
                }
            });

            // Fallback for home page
            if (!matchedLink && (targetHref === 'index.html' || targetHref === '')) {
                navLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href === 'index.html' || href === '#' || href === 'index.html#') {
                        matchedLink = link;
                    }
                });
            }

            if (matchedLink) {
                const matchedText = matchedLink.textContent.trim();
                navLinks.forEach(link => {
                    if (link.textContent.trim() === matchedText) {
                        link.classList.add('text-primary', 'dark:text-primary-fixed', 'font-bold', 'border-primary', 'dark:border-primary-fixed');
                        link.classList.remove('text-on-surface-variant', 'border-transparent');
                    } else {
                        link.classList.remove('text-primary', 'dark:text-primary-fixed', 'font-bold', 'border-primary', 'dark:border-primary-fixed');
                        link.classList.add('text-on-surface-variant', 'border-transparent');
                    }
                });
            }
        }

        function updateActiveOnPageLoad() {
            const currentHash = window.location.hash;

            if (isIndexPage) {
                if (currentHash === '#tentang-kami') {
                    activateByHref('#tentang-kami');
                } else if (currentHash === '#berita') {
                    activateByHref('#berita');
                } else if (currentHash === '#kontak') {
                    activateByHref('#kontak');
                } else {
                    activateByHref('index.html');
                }
            } else if (path === 'program.html') {
                activateByHref('program.html');
            } else if (path === 'laporan.html') {
                activateByHref('laporan.html');
            } else if (path === 'berita.html') {
                activateByHref('berita.html');
            }
        }

        // ScrollSpy for index.html sections
        if (isIndexPage) {
            const sections = [
                { id: 'tentang-kami', selector: '#tentang-kami' },
                { id: 'berita', selector: '#berita' },
                { id: 'kontak', selector: '#kontak' }
            ];

            const onScroll = () => {
                const scrollPos = window.scrollY || window.pageYOffset;
                let currentSection = null;

                sections.forEach(sec => {
                    const el = document.getElementById(sec.id);
                    if (el) {
                        const top = el.offsetTop - 150;
                        const height = el.offsetHeight;
                        if (scrollPos >= top && scrollPos < top + height) {
                            currentSection = sec.selector;
                        }
                    }
                });

                if (currentSection) {
                    activateByHref(currentSection);
                } else if (scrollPos < 300) {
                    activateByHref('index.html');
                }
            };

            window.addEventListener('scroll', onScroll, { passive: true });
        }

        // Click event listener for nav links
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');

                if (isIndexPage && href && (href.startsWith('#') || href.startsWith('index.html#'))) {
                    const hashVal = href.replace('index.html', '');
                    if (hashVal && hashVal !== '#') {
                        activateByHref(hashVal);
                    } else {
                        activateByHref('index.html');
                    }
                } else {
                    const matchedText = this.textContent.trim();
                    navLinks.forEach(l => {
                        if (l.textContent.trim() === matchedText) {
                            l.classList.add('text-primary', 'dark:text-primary-fixed', 'font-bold', 'border-primary', 'dark:border-primary-fixed');
                            l.classList.remove('text-on-surface-variant', 'border-transparent');
                        } else {
                            l.classList.remove('text-primary', 'dark:text-primary-fixed', 'font-bold', 'border-primary', 'dark:border-primary-fixed');
                            l.classList.add('text-on-surface-variant', 'border-transparent');
                        }
                    });
                }

                // Close mobile menu if open when a navigation link is clicked
                toggleMobileMenu(false);
            });
        });

        // Initialize active link on page load
        updateActiveOnPageLoad();
    }

    // Global document-level click handler (Event Delegation)
    if (!window._wizNavDelegationInitialized) {
        window._wizNavDelegationInitialized = true;

        document.addEventListener('click', function(e) {
            const btn = e.target.closest('#mobile-menu-btn');
            if (btn) {
                // If clicked button, toggle
                e.stopPropagation();
                toggleMobileMenu();
                return;
            }

            // Close mobile menu when clicking outside navbar
            const mobileMenu = document.getElementById('mobile-menu');
            const nav = e.target.closest('nav');
            if (mobileMenu && !mobileMenu.classList.contains('hidden') && !nav) {
                toggleMobileMenu(false);
            }
        });

        // Escape key to close mobile menu
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' || e.key === 'Esc') {
                const mobileMenu = document.getElementById('mobile-menu');
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    toggleMobileMenu(false);
                }
            }
        });
    }

    // Lifecycle handlers: Support standard DOMContentLoaded, immediate execution, and Astro/SPA page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initActiveNavigation);
    } else {
        initActiveNavigation();
    }

    document.addEventListener('astro:page-load', initActiveNavigation);
    window.addEventListener('popstate', initActiveNavigation);
})();
