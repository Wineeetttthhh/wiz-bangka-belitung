/**
 * WIZ Bangka Belitung - Active Navigation, ScrollSpy & Mobile Menu Handler
 */

(function() {
    function toggleMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        const menuIcon = document.getElementById('menu-icon');
        if (!mobileMenu) return;

        const isCurrentlyHidden = mobileMenu.classList.contains('hidden');
        if (isCurrentlyHidden) {
            mobileMenu.classList.remove('hidden');
            if (menuIcon) menuIcon.textContent = 'close';
        } else {
            mobileMenu.classList.add('hidden');
            if (menuIcon) menuIcon.textContent = 'menu';
        }
    }

    // Expose toggle function globally for inline onclick fallbacks & framework interoperability
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
                // If there are multiple matching links (desktop & mobile), activate both or match text
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

                // Close mobile menu if open
                const mobileMenu = document.getElementById('mobile-menu');
                const menuIcon = document.getElementById('menu-icon');
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                    if (menuIcon) menuIcon.textContent = 'menu';
                }
            });
        });

        // Initialize active link on page load
        updateActiveOnPageLoad();
    }

    // Global document-level click handler (Event Delegation) for resilient mobile menu toggle
    if (!window._wizNavDelegationInitialized) {
        window._wizNavDelegationInitialized = true;
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('#mobile-menu-btn');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                toggleMobileMenu();
                return;
            }

            // Close mobile menu when clicking outside navbar
            const mobileMenu = document.getElementById('mobile-menu');
            const nav = e.target.closest('nav');
            if (mobileMenu && !mobileMenu.classList.contains('hidden') && !nav) {
                mobileMenu.classList.add('hidden');
                const menuIcon = document.getElementById('menu-icon');
                if (menuIcon) menuIcon.textContent = 'menu';
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
