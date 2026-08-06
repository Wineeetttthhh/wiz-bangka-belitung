/**
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Main Application Script
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initModalSystem();
    initStatsCounter();
    initProgramCatalog();
    initZakatCalculator();
    initDonationForm();
    initImageLightbox();
    initMutationTable();
    initBackgroundAnimation();
});

/**
 * Mobile Navigation Toggle & Smooth Scrolling
 */
function initNavigation() {
    const mobileToggle = document.getElementById('mobile-toggle');
    const mainNav = document.getElementById('main-nav');
    const navLinks = document.querySelectorAll('.nav-link');

    if (mobileToggle && mainNav) {
        mobileToggle.addEventListener('click', () => {
            mainNav.classList.toggle('show');
            const isExpanded = mainNav.classList.contains('show');
            mobileToggle.setAttribute('aria-expanded', isExpanded);
        });
    }

    // Close mobile nav when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mainNav && mainNav.classList.contains('show')) {
                mainNav.classList.remove('show');
            }
            
            // Set active state
            navLinks.forEach(n => n.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

/**
 * Modal Dialog Manager (Donation Modal & Fast Action)
 */
function initModalSystem() {
    const modalButtons = document.querySelectorAll('.btn-donate-modal');
    const modalBackdrop = document.getElementById('donation-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    function openModal(modalTargetId) {
        const targetModal = document.getElementById(modalTargetId);
        if (targetModal) {
            targetModal.classList.add('show');
            targetModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modalTargetId) {
        const targetModal = document.getElementById(modalTargetId);
        if (targetModal) {
            targetModal.classList.remove('show');
            targetModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }

    modalButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.getAttribute('data-modal') || 'donation-modal';
            openModal(targetId);
        });
    });

    if (modalCloseBtn && modalBackdrop) {
        modalCloseBtn.addEventListener('click', () => {
            closeModal('donation-modal');
        });

        // Close on clicking backdrop outside modal dialog
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) {
                closeModal('donation-modal');
            }
        });
    }

    // Expose globally for dynamic program card clicks later
    window.openDonationModal = function(programTitle) {
        openModal('donation-modal');
        const modalTitle = document.querySelector('#donation-modal .modal-header h3');
        if (modalTitle && programTitle) {
            modalTitle.textContent = `Donasi: ${programTitle}`;
        }
    };
}

/**
 * Animated Number Counter for Trust Statistics
 */
function initStatsCounter() {
    const statNumbers = document.querySelectorAll('.stat-number');
    if (!statNumbers.length) return;

    let hasAnimated = false;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                hasAnimated = true;
                statNumbers.forEach(stat => {
                    const target = parseInt(stat.getAttribute('data-target') || '0', 10);
                    animateNumber(stat, target);
                });
            }
        });
    }, { threshold: 0.3 });

    const statsWrapper = document.querySelector('.trust-stats-wrapper');
    if (statsWrapper) {
        observer.observe(statsWrapper);
    }
}

function animateNumber(element, targetValue) {
    const duration = 1500;
    const startValue = 0;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // EaseOutQuad formula
        const easeProgress = 1 - (1 - progress) * (1 - progress);
        const currentValue = Math.floor(easeProgress * (targetValue - startValue) + startValue);

        element.textContent = currentValue.toLocaleString('id-ID');

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = targetValue.toLocaleString('id-ID');
        }
    }

    requestAnimationFrame(updateCounter);
}

/**
 * 19 Program Data & Interactive Catalog Logic
 */
const programsData = [
    {
        id: 'p1',
        title: 'Pembangunan Markaz DPW WI & WIZ',
        category: 'fasilitas-operasional',
        categoryLabel: 'Fasilitas & Operasional',
        icon: '🏛️',
        desc: 'Pembangunan pusat dakwah, pembinaan ummat, dan kantor pelayanan donatur WIZ Bangka Belitung.',
        targetAmount: 500000000,
        currentAmount: 325000000,
        donorsCount: 420
    },
    {
        id: 'p2',
        title: 'Pengadaan & Perbaikan Kendaraan Operasional',
        category: 'fasilitas-operasional',
        categoryLabel: 'Fasilitas & Operasional',
        icon: '🚐',
        desc: 'Dukungan armada transportasi operasional penyaluran bantuan ke pelosok daerah Bangka & Belitung.',
        targetAmount: 150000000,
        currentAmount: 98000000,
        donorsCount: 185
    },
    {
        id: 'p3',
        title: 'Santunan & Pembinaan Mualaf',
        category: 'sosial-kemanusiaan',
        categoryLabel: 'Sosial & Kemanusiaan',
        icon: '🤝',
        desc: 'Pendampingan spiritual, bantuan ekonomi, dan pembinaan akidah bagi saudara mualaf di Bangka Belitung.',
        targetAmount: 75000000,
        currentAmount: 52000000,
        donorsCount: 310
    },
    {
        id: 'p4',
        title: 'Pengadaan Celengan Besar WIZ',
        category: 'fasilitas-operasional',
        categoryLabel: 'Fasilitas & Operasional',
        icon: '🪙',
        desc: 'Penyediaan sarana tempat infak dan sedekah masyarakat di pusat perbelanjaan & fasilitas publik.',
        targetAmount: 30000000,
        currentAmount: 21500000,
        donorsCount: 140
    },
    {
        id: 'p5',
        title: 'Beasiswa Santri & Program Tahfidz Qur\'an',
        category: 'pendidikan-dakwah',
        categoryLabel: 'Pendidikan & Dakwah',
        icon: '📖',
        imageUrl: 'assets/images/beasiswa-tahfidz.jpg',
        desc: 'Beasiswa penuh penghafal Al-Qur\'an dan bantuan biaya pendidikan santri yatim dhuafa.',
        targetAmount: 200000000,
        currentAmount: 168000000,
        donorsCount: 650
    },
    {
        id: 'p6',
        title: 'Pelatihan Public Speaking Da\'i Muda',
        category: 'pendidikan-dakwah',
        categoryLabel: 'Pendidikan & Dakwah',
        icon: '🎙️',
        desc: 'Peningkatan kapasitas komunikasi dakwah bagi para dai muda dan aktivis dakwah di Bangka Belitung.',
        targetAmount: 25000000,
        currentAmount: 19500000,
        donorsCount: 95
    },
    {
        id: 'p7',
        title: 'Tabligh Akbar Dzulhijjah',
        category: 'pendidikan-dakwah',
        categoryLabel: 'Pendidikan & Dakwah',
        icon: '🕌',
        desc: 'Syi\'ar dakwah massal memperingati bulan Dzulhijjah dan penguatan ukhuwah Islamiyah masyarakat Babel.',
        targetAmount: 40000000,
        currentAmount: 34000000,
        donorsCount: 230
    },
    {
        id: 'p8',
        title: 'Pelatihan Guru Al-Qur\'an Metode Dirosa',
        category: 'pendidikan-dakwah',
        categoryLabel: 'Pendidikan & Dakwah',
        icon: '✏️',
        desc: 'Pelatihan pengajar Al-Qur\'an dewasa untuk memberantas buta aksara Qur\'an di Bangka Belitung.',
        targetAmount: 35000000,
        currentAmount: 28000000,
        donorsCount: 175
    },
    {
        id: 'p9',
        title: 'Pelatihan Penyelenggaraan Jenazah',
        category: 'pendidikan-dakwah',
        categoryLabel: 'Pendidikan & Dakwah',
        icon: '📜',
        desc: 'Edukasi dan praktik fardhu kifayah tata cara pengurusan jenazah sesuai tuntunan sunnah.',
        targetAmount: 20000000,
        currentAmount: 16500000,
        donorsCount: 110
    },
    {
        id: 'p10',
        title: 'Pelatihan Volunter Media Dakwah',
        category: 'pendidikan-dakwah',
        categoryLabel: 'Pendidikan & Dakwah',
        icon: '💻',
        desc: 'Pembinaan generasi muda dalam membuat konten multimedia Islami dan literasi digital dakwah.',
        targetAmount: 30000000,
        currentAmount: 22000000,
        donorsCount: 155
    },
    {
        id: 'p11',
        title: 'Lomba Desain Poster Dakwah Kreatif',
        category: 'pendidikan-dakwah',
        categoryLabel: 'Pendidikan & Dakwah',
        icon: '🎨',
        desc: 'Wadah kompetisi dan kreativitas pemuda Islam menyampaikan pesan kebaikan secara visual.',
        targetAmount: 15000000,
        currentAmount: 12500000,
        donorsCount: 88
    },
    {
        id: 'p12',
        title: 'Pengembangan Kantor DPW WI Babel & WIZ',
        category: 'fasilitas-operasional',
        categoryLabel: 'Fasilitas & Operasional',
        icon: '🏢',
        desc: 'Renovasi dan kelengkapan fasilitas pusat administrasi & pelayanan donatur di Pangkalpinang.',
        targetAmount: 100000000,
        currentAmount: 74000000,
        donorsCount: 290
    },
    {
        id: 'p13',
        title: 'Beasiswa Pendidikan Anak Dhuafa',
        category: 'pendidikan-dakwah',
        categoryLabel: 'Pendidikan & Dakwah',
        icon: '🎒',
        desc: 'Bantuan biaya sekolah dan kelengkapan perlengkapan belajar anak-anak dari keluarga pra-sejahtera.',
        targetAmount: 120000000,
        currentAmount: 95000000,
        donorsCount: 480
    },
    {
        id: 'p14',
        title: 'Tebar Paket Sembako Dhuafa',
        category: 'sosial-kemanusiaan',
        categoryLabel: 'Sosial & Kemanusiaan',
        icon: '📦',
        desc: 'Penyaluran paket bahan pangan pokok untuk lansia, janda dhuafa, dan keluarga kurang mampu.',
        targetAmount: 90000000,
        currentAmount: 78000000,
        donorsCount: 520
    },
    {
        id: 'p15',
        title: 'Sedekah Beras Dhuafa',
        category: 'sosial-kemanusiaan',
        categoryLabel: 'Sosial & Kemanusiaan',
        icon: '🌾',
        imageUrl: 'assets/images/sedekah-beras-dhuafa.jpg',
        desc: 'Penyaluran dan penyediaan pasokan beras berkualitas secara rutin untuk masyarakat dhuafa dan keluarga pra-sejahtera di Bangka Belitung.',
        targetAmount: 80000000,
        currentAmount: 64000000,
        donorsCount: 410
    },
    {
        id: 'p16',
        title: 'Sedekah Beras Da\'i',
        category: 'pendidikan-dakwah',
        categoryLabel: 'Pendidikan & Dakwah',
        icon: '🌾',
        imageUrl: 'assets/images/sedekah-beras-dai.jpg',
        desc: 'Program pemenuhan pangan dan beras rutin untuk mendukung tugas dakwah para ustadz & da\'i di Bangka Belitung.',
        targetAmount: 50000000,
        currentAmount: 38000000,
        donorsCount: 270
    },
    {
        id: 'p17',
        title: 'Sedekah Jumat (Sedulang Berkah)',
        category: 'sosial-kemanusiaan',
        categoryLabel: 'Sosial & Kemanusiaan',
        icon: '🍲',
        desc: 'Berbagi paket makanan siap saji setiap hari Jumat mengambil inspirasi kearifan lokal Sedulang Berkah.',
        targetAmount: 60000000,
        currentAmount: 51000000,
        donorsCount: 390
    },
    {
        id: 'p18',
        title: 'Santunan & Kebahagiaan Anak Yatim',
        category: 'sosial-kemanusiaan',
        categoryLabel: 'Sosial & Kemanusiaan',
        icon: '👶',
        desc: 'Pemberian santunan tunai, belanja pakaian, dan pendampingan kasih sayang untuk anak yatim.',
        targetAmount: 110000000,
        currentAmount: 89000000,
        donorsCount: 560
    },
    {
        id: 'p19',
        title: 'Tebar Iftar Nusantara (Buka Puasa)',
        category: 'sosial-kemanusiaan',
        categoryLabel: 'Sosial & Kemanusiaan',
        icon: '🌙',
        desc: 'Penyediaan ribuan paket buka puasa dan sahur di bulan Ramadan untuk jamaah masjid & dhuafa.',
        targetAmount: 85000000,
        currentAmount: 73000000,
        donorsCount: 440
    },
    {
        id: 'p20',
        title: 'Tebar Mushaf Al-Qur\'an Nusantara',
        category: 'pendidikan-dakwah',
        categoryLabel: 'Pendidikan & Dakwah',
        icon: '📚',
        desc: 'Penyaluran Al-Qur\'an standar hafalan ke pelosok musala, masjid, dan TPQ di Bangka Belitung.',
        targetAmount: 70000000,
        currentAmount: 58000000,
        donorsCount: 380
    }
];

function initProgramCatalog() {
    const gridContainer = document.getElementById('program-grid');
    const searchInput = document.getElementById('program-search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const emptyState = document.getElementById('empty-state');
    const resetFilterBtn = document.getElementById('reset-filter-btn');

    if (!gridContainer) return;

    let currentCategory = 'all';
    let currentSearchQuery = '';

    function renderCards() {
        const filtered = programsData.filter(program => {
            const matchesCategory = (currentCategory === 'all') || (program.category === currentCategory);
            const searchLower = currentSearchQuery.toLowerCase().trim();
            const matchesSearch = !searchLower || 
                program.title.toLowerCase().includes(searchLower) || 
                program.desc.toLowerCase().includes(searchLower) ||
                program.categoryLabel.toLowerCase().includes(searchLower);

            return matchesCategory && matchesSearch;
        });

        if (filtered.length === 0) {
            gridContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
        } else {
            gridContainer.style.display = 'grid';
            if (emptyState) emptyState.style.display = 'none';

            gridContainer.innerHTML = filtered.map(program => {
                const percent = Math.min(Math.round((program.currentAmount / program.targetAmount) * 100), 100);
                const formattedCurrent = program.currentAmount.toLocaleString('id-ID');
                const formattedTarget = program.targetAmount.toLocaleString('id-ID');

                const imageContent = program.imageUrl 
                    ? `<img src="${program.imageUrl}" alt="${program.title}" class="card-img">`
                    : `<div class="card-image-icon">${program.icon}</div>`;

                return `
                    <div class="program-card" data-category="${program.category}">
                        <div class="card-image-box" onclick="window.openImageLightbox('${program.id}')">
                            <span class="card-category-tag">${program.categoryLabel}</span>
                            ${imageContent}
                        </div>
                        <div class="card-body">
                            <h3 class="card-title">${program.title}</h3>
                            <p class="card-desc">${program.desc}</p>
                            
                            <div class="card-progress-box">
                                <div class="progress-bar-bg">
                                    <div class="progress-bar-fill" style="width: ${percent}%;"></div>
                                </div>
                                <div class="progress-info">
                                    <span>Terkumpul: <strong>Rp ${formattedCurrent}</strong></span>
                                    <span>${percent}%</span>
                                </div>
                            </div>

                            <div class="card-footer-action">
                                <button class="btn btn-primary btn-donate-card" onclick="window.openDonationModal('${program.title}')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                    <span>Salurkan Donasi</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Load stored additions to programsData from local donations
    try {
        const storedAdditions = JSON.parse(localStorage.getItem('wiz_program_additions') || '{}');
        programsData.forEach(p => {
            if (storedAdditions[p.id]) {
                p.currentAmount += storedAdditions[p.id];
            }
        });
    } catch(e) {}

    // Expose render function globally
    window.renderProgramCards = renderCards;

    // Initial render
    renderCards();

    // Filter tab listeners
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.getAttribute('data-category') || 'all';
            renderCards();
        });
    });

    // Search input listener
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value;
            if (clearSearchBtn) {
                clearSearchBtn.style.display = currentSearchQuery ? 'block' : 'none';
            }
            renderCards();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            currentSearchQuery = '';
            clearSearchBtn.style.display = 'none';
            renderCards();
        });
    }

    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            currentSearchQuery = '';
            currentCategory = 'all';
            if (clearSearchBtn) clearSearchBtn.style.display = 'none';

            filterTabs.forEach(t => t.classList.remove('active'));
            const allTab = document.querySelector('.filter-tab[data-category="all"]');
            if (allTab) allTab.classList.add('active');

            renderCards();
        });
    }

    // Populate Modal Select Options with 19 programs
    const selectEl = document.getElementById('donation-program-select');
    if (selectEl) {
        programsData.forEach(prog => {
            const opt = document.createElement('option');
            opt.value = prog.title;
            opt.textContent = prog.title;
            selectEl.appendChild(opt);
        });
    }
}

/**
 * Zakat Calculator Logic (Maal & Profesi)
 */
function initZakatCalculator() {
    const tabMaal = document.getElementById('tab-zakat-maal');
    const tabProfesi = document.getElementById('tab-zakat-profesi');
    const panelMaal = document.getElementById('panel-zakat-maal');
    const panelProfesi = document.getElementById('panel-zakat-profesi');

    const inputHartaMaal = document.getElementById('input-harta-maal');
    const inputGajiProfesi = document.getElementById('input-gaji-bulanan');
    const inputBonusProfesi = document.getElementById('input-bonus-bulanan');

    const statusBadge = document.getElementById('zakat-status-badge');
    const resultAmount = document.getElementById('zakat-result-amount');
    const btnPayZakat = document.getElementById('btn-pay-zakat');

    if (!tabMaal || !tabProfesi) return;

    let activeType = 'maal'; // 'maal' or 'profesi'
    const nisabMaalTahunan = 93500000; // Nisab 85 gram emas per tahun (~Rp 93.5 juta)
    const nisabProfesiBulanan = 7791600; // Nisab 85 gram emas / 12 bulan (~Rp 7.79 juta)

    function switchTab(type) {
        activeType = type;
        if (type === 'maal') {
            tabMaal.classList.add('active');
            tabProfesi.classList.remove('active');
            panelMaal.style.display = 'block';
            panelProfesi.style.display = 'none';
        } else {
            tabProfesi.classList.add('active');
            tabMaal.classList.remove('active');
            panelProfesi.style.display = 'block';
            panelMaal.style.display = 'none';
        }
        calculateZakat();
    }

    tabMaal.addEventListener('click', () => switchTab('maal'));
    tabProfesi.addEventListener('click', () => switchTab('profesi'));

    function calculateZakat() {
        let totalInput = 0;
        let nisabLimit = 0;

        if (activeType === 'maal') {
            totalInput = parseFloat(inputHartaMaal.value) || 0;
            nisabLimit = nisabMaalTahunan;
        } else {
            const gaji = parseFloat(inputGajiProfesi.value) || 0;
            const bonus = parseFloat(inputBonusProfesi.value) || 0;
            totalInput = gaji + bonus;
            nisabLimit = nisabProfesiBulanan;
        }

        if (totalInput <= 0) {
            statusBadge.textContent = 'Masukkan Nominal';
            statusBadge.className = 'badge-status status-info';
            resultAmount.textContent = 'Rp 0';
            btnPayZakat.disabled = true;
            return;
        }

        if (totalInput >= nisabLimit) {
            const zakatWajib = Math.round(totalInput * 0.025);
            statusBadge.textContent = 'Wajib Zakat (2.5%)';
            statusBadge.className = 'badge-status status-success';
            resultAmount.textContent = `Rp ${zakatWajib.toLocaleString('id-ID')}`;
            btnPayZakat.disabled = false;
            btnPayZakat.setAttribute('data-zakat-amount', zakatWajib);
            btnPayZakat.setAttribute('data-zakat-title', activeType === 'maal' ? 'Zakat Maal (Tabungan)' : 'Zakat Penghasilan (Profesi)');
        } else {
            statusBadge.textContent = 'Belum Wajib Zakat (Dibawah Nisab)';
            statusBadge.className = 'badge-status status-warning';
            resultAmount.textContent = 'Rp 0 (Disarankan Infak/Sedekah)';
            btnPayZakat.disabled = true;
        }
    }

    if (inputHartaMaal) inputHartaMaal.addEventListener('input', calculateZakat);
    if (inputGajiProfesi) inputGajiProfesi.addEventListener('input', calculateZakat);
    if (inputBonusProfesi) inputBonusProfesi.addEventListener('input', calculateZakat);

    if (btnPayZakat) {
        btnPayZakat.addEventListener('click', () => {
            const amount = btnPayZakat.getAttribute('data-zakat-amount');
            const title = btnPayZakat.getAttribute('data-zakat-title') || 'Zakat';
            if (amount && window.openDonationModal) {
                window.openDonationModal(title);
                const customInput = document.getElementById('custom-amount-input');
                if (customInput) customInput.value = amount;
                
                // Select custom chip
                const chips = document.querySelectorAll('.chip-btn');
                chips.forEach(c => c.classList.remove('active'));
                const customChip = document.querySelector('.chip-btn[data-value="custom"]');
                if (customChip) customChip.classList.add('active');
            }
        });
    }
}

/**
 * Donation Modal Form & WhatsApp Generator
 */
/**
 * Donation Modal Form, Payment Method Switcher & WhatsApp Generator
 */
function initDonationForm() {
    const chips = document.querySelectorAll('.chip-btn');
    const customWrapper = document.getElementById('custom-amount-wrapper');
    const customInput = document.getElementById('custom-amount-input');
    const submitBtn = document.getElementById('btn-submit-donation');
    const methodBtns = document.querySelectorAll('.method-btn');
    const methodPanels = document.querySelectorAll('.payment-panel');
    const dtypePills = document.querySelectorAll('.dtype-pill');

    let selectedNominal = 100000;
    let selectedMethod = 'qris';
    let selectedDtype = 'Infak Umum';

    // Donation Type Pill Switcher
    dtypePills.forEach(pill => {
        pill.addEventListener('click', () => {
            dtypePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            selectedDtype = pill.getAttribute('data-dtype') || 'Infak Umum';
        });
    });

    // Payment Method Switcher
    methodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            methodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            selectedMethod = btn.getAttribute('data-method') || 'qris';
            
            methodPanels.forEach(panel => {
                if (panel.getAttribute('id') === `panel-${selectedMethod}`) {
                    panel.style.display = 'block';
                } else {
                    panel.style.display = 'none';
                }
            });
        });
    });

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const val = chip.getAttribute('data-value');
            if (val === 'custom') {
                customWrapper.style.display = 'block';
                selectedNominal = parseInt(customInput.value, 10) || 0;
            } else {
                selectedNominal = parseInt(val, 10);
                if (customInput) customInput.value = selectedNominal;
            }
        });
    });

    if (customInput) {
        customInput.addEventListener('input', (e) => {
            selectedNominal = parseInt(e.target.value, 10) || 0;
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const programSelect = document.getElementById('donation-program-select');
            const nameInput = document.getElementById('donor-name-input');
            const phoneInput = document.getElementById('donor-phone-input');
            const notesInput = document.getElementById('donor-notes-input');

            const programName = programSelect && programSelect.value ? programSelect.value : 'Infak Umum WIZ Babel';
            const donorName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'Hamba Allah';
            const donorPhone = phoneInput ? phoneInput.value.trim() : '-';
            const donorNotes = notesInput ? notesInput.value.trim() : '-';
            const finalAmount = customInput ? parseInt(customInput.value, 10) || selectedNominal : selectedNominal;

            const formattedAmount = finalAmount.toLocaleString('id-ID');

            let methodText = 'QRIS Standar Pembayaran Nasional';
            if (selectedMethod === 'bank') methodText = 'Transfer Bank (BSI / Muamalat)';
            if (selectedMethod === 'wa') methodText = 'Konfirmasi / Jemput Donasi WA';

            // Format WhatsApp Message
            const message = `Assalamu'alaikum WIZ Bangka Belitung,

Saya telah menyalurkan / ingin konfirmasi donasi melalui website WIZ Babel:

🏷️ *Tipe Donasi:* ${selectedDtype}
📌 *Program:* ${programName}
💰 *Nominal:* Rp ${formattedAmount}
💳 *Metode Pembayaran:* ${methodText}
👤 *Nama Donatur:* ${donorName}
📞 *No. WA/HP:* ${donorPhone}
📝 *Doa/Catatan:* ${donorNotes}

Mohon dapat diverifikasi dan dikirimkan konfirmasi/bukti resi donasinya. Terima kasih. Jazakumullah khairan.`;

            const encodedMessage = encodeURIComponent(message);
            const waUrl = `https://wa.me/6282380830808?text=${encodedMessage}`;

            // Save transaction to Supabase cloud if enabled
            if (window.wizSupabase) {
                window.wizSupabase.saveDonation({
                    donor_name: donorName,
                    donor_phone: donorPhone,
                    program_title: programName,
                    donation_type: selectedDtype,
                    amount: finalAmount,
                    payment_method: methodText,
                    notes: donorNotes
                });
            }

            // Save transaction to local mutation history for real-time transparency table
            if (window.addNewDonationMutation) {
                window.addNewDonationMutation({
                    name: donorName,
                    program: programName,
                    amount: finalAmount,
                    method: selectedMethod === 'qris' ? 'QRIS Instant' : (selectedMethod === 'bank' ? 'Transfer Bank' : 'Direct WA'),
                    phone: donorPhone
                });
            }

            // Live Update the specific target program's progress bar & collected amount
            if (window.updateProgramFund) {
                window.updateProgramFund(programName, finalAmount);
            }

            // Close donation modal
            const modalBackdrop = document.getElementById('donation-modal');
            if (modalBackdrop) {
                modalBackdrop.classList.remove('show');
                modalBackdrop.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
            }

            // Open WhatsApp with popup blocker fallback
            const waWindow = window.open(waUrl, '_blank');
            if (!waWindow || waWindow.closed || typeof waWindow.closed === 'undefined') {
                window.location.href = waUrl;
            }
        });
    }
}

/**
 * Global QRIS Lightbox / Viewer Helper
 */
window.openQRISModal = function() {
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxIcon = document.getElementById('lightbox-icon');
    const lightboxCaption = document.getElementById('lightbox-caption');

    if (!lightbox) return;

    if (lightboxImg) {
        lightboxImg.src = 'assets/images/qris-wiz-babel.jpg';
        lightboxImg.style.display = 'block';
    }
    if (lightboxIcon) lightboxIcon.style.display = 'none';
    if (lightboxCaption) {
        lightboxCaption.innerHTML = '<strong>QRIS WAHDAH INSPIRASI ZAKAT BANGKA BELITUNG</strong><br><span style="font-size:12px;font-weight:normal;">NMID: ID1026469355949 | All Mobile Banking & e-Wallet</span>';
    }

    lightbox.classList.add('show');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
};

/**
 * Copy NMID Helper
 */
window.copyNMID = function(btnElement) {
    window.copyAccount('ID1026469355949', btnElement);
};

/**
 * Copy to Clipboard Helper for Bank Accounts
 */
window.copyAccount = function(textToCopy, btnElement) {
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
        if (btnElement) {
            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = `<span>Tersalin! ✓</span>`;
            btnElement.style.backgroundColor = '#059669';

            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
                btnElement.style.backgroundColor = '';
            }, 2000);
        }
    }).catch(err => {
        // Fallback for older browsers
        const tempInput = document.createElement('input');
        tempInput.value = textToCopy;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);

        if (btnElement) {
            btnElement.innerText = 'Tersalin! ✓';
            setTimeout(() => {
                btnElement.innerText = 'Salin No. Rek';
            }, 2000);
        }
    });
};

/**
 * Image Lightbox Zoom Manager
 */
function initImageLightbox() {
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxIcon = document.getElementById('lightbox-icon');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const closeBtn = document.getElementById('lightbox-close-btn');

    if (!lightbox) return;

    window.openImageLightbox = function(programId) {
        const program = programsData.find(p => p.id === programId);
        if (!program) return;

        if (program.imageUrl) {
            lightboxImg.src = program.imageUrl;
            lightboxImg.style.display = 'block';
            if (lightboxIcon) lightboxIcon.style.display = 'none';
        } else {
            lightboxImg.style.display = 'none';
            if (lightboxIcon) {
                lightboxIcon.textContent = program.icon;
                lightboxIcon.style.display = 'block';
            }
        }

        if (lightboxCaption) {
            lightboxCaption.textContent = program.title;
        }

        lightbox.classList.add('show');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    };

    function closeLightbox() {
        lightbox.classList.remove('show');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeLightbox);
    }

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('lightbox-container')) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('show')) {
            closeLightbox();
        }
    });
}

/**
 * Real-Time Donation Mutation & Audit Transparency System
 */
function initMutationTable() {
    const tableBody = document.getElementById('mutation-table-body');
    const searchInput = document.getElementById('search-mutation-input');
    const statusSelect = document.getElementById('filter-mutation-status');
    const countLabel = document.getElementById('mutation-count-label');

    if (!tableBody) return;

    const initialMutations = [
        { date: '31 Jul 2026 22:45', name: 'Hamba Allah', program: 'Sedekah Beras Da\'i', amount: 250000, method: 'QRIS Instant', status: 'verified', phone: '0812****8891' },
        { date: '31 Jul 2026 21:10', name: 'Ahmad Subandi', program: 'Sedekah Beras Dhuafa', amount: 150000, method: 'BSI Transfer', status: 'verified', phone: '0852****1143' },
        { date: '31 Jul 2026 19:30', name: 'Hj. Rosdiana', program: 'Beasiswa Santri & Tahfidz', amount: 500000, method: 'BSI Transfer', status: 'verified', phone: '0813****9012' },
        { date: '31 Jul 2026 18:05', name: 'Fikri Pratama', program: 'Pembangunan Markaz WIZ', amount: 1000000, method: 'Bank Muamalat', status: 'verified', phone: '0821****4455' },
        { date: '31 Jul 2026 15:40', name: 'Hamba Allah', program: 'Tebar Sembako Dhuafa', amount: 100000, method: 'QRIS Instant', status: 'verified', phone: '0896****2211' },
        { date: '31 Jul 2026 14:15', name: 'Rina Kurniawati', program: 'Santunan Yatim', amount: 300000, method: 'BSI Transfer', status: 'verified', phone: '0819****3389' },
        { date: '31 Jul 2026 11:50', name: 'M. Rizky Pratama', program: 'Sedekah Beras Da\'i', amount: 200000, method: 'QRIS Instant', status: 'verified', phone: '0823****6789' },
        { date: '31 Jul 2026 09:25', name: 'Hamba Allah', program: 'Sedekah Jumat (Sedulang Berkah)', amount: 100000, method: 'QRIS Instant', status: 'verified', phone: '0857****9900' },
    ];

    function getStoredMutations() {
        try {
            const stored = localStorage.getItem('wiz_mutations');
            if (stored) {
                const parsed = JSON.parse(stored);
                return [...parsed, ...initialMutations];
            }
        } catch(e) {}
        return initialMutations;
    }

    function renderTable() {
        const mutations = getStoredMutations();
        const searchQuery = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const selectedStatus = statusSelect ? statusSelect.value : 'all';

        const filtered = mutations.filter(item => {
            const matchesSearch = !searchQuery || 
                item.name.toLowerCase().includes(searchQuery) || 
                item.program.toLowerCase().includes(searchQuery) ||
                (item.phone && item.phone.toLowerCase().includes(searchQuery));
            
            const matchesStatus = (selectedStatus === 'all') || (item.status === selectedStatus);

            return matchesSearch && matchesStatus;
        });

        if (countLabel) {
            countLabel.textContent = `Menampilkan ${filtered.length} transaksi donasi`;
        }

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-8 text-center text-slate-400 font-semibold">
                        🔍 Tidak ada transaksi donasi yang cocok dengan pencarian Anda.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtered.map(item => {
            const formattedAmount = item.amount.toLocaleString('id-ID');
            const statusBadge = item.status === 'verified' 
                ? `<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full"><span class="material-symbols-outlined text-xs">check_circle</span> Verified ✅</span>`
                : `<span class="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-full"><span class="material-symbols-outlined text-xs">pending</span> Terdaftar (Proses Audit) ⏳</span>`;

            return `
                <tr class="hover:bg-emerald-50/40 transition-colors">
                    <td class="py-3.5 px-4 font-mono text-slate-500 text-xs">${item.date}</td>
                    <td class="py-3.5 px-4 font-bold text-slate-900">${item.name}</td>
                    <td class="py-3.5 px-4 font-semibold text-primary">${item.program}</td>
                    <td class="py-3.5 px-4 font-bold text-slate-800">Rp ${formattedAmount}</td>
                    <td class="py-3.5 px-4 text-slate-600">${item.method}</td>
                    <td class="py-3.5 px-4 text-center">${statusBadge}</td>
                </tr>
            `;
        }).join('');
    }

    if (searchInput) searchInput.addEventListener('input', renderTable);
    if (statusSelect) statusSelect.addEventListener('change', renderTable);

    // Expose render function for real-time addition
    window.renderMutationTable = renderTable;
    window.addNewDonationMutation = function(donationData) {
        try {
            const now = new Date();
            const dateStr = `${now.getDate()} ${now.toLocaleString('id-ID', { month: 'short' })} ${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            
            const newItem = {
                date: dateStr,
                name: donationData.name || 'Hamba Allah',
                program: donationData.program || 'Infak Umum',
                amount: donationData.amount || 0,
                method: donationData.method || 'Transfer Bank',
                status: 'pending',
                phone: donationData.phone || ''
            };

            const existing = JSON.parse(localStorage.getItem('wiz_mutations') || '[]');
            existing.unshift(newItem);
            localStorage.setItem('wiz_mutations', JSON.stringify(existing));
            
            renderTable();
        } catch(e) {}
    };

    // Initial table render
    renderTable();
}

window.switchReportTab = function(targetTab) {
    const tabs = ['sheet', 'embed', 'summary'];
    tabs.forEach(tab => {
        const btn = document.getElementById(`tab-report-${tab}`);
        const panel = document.getElementById(`panel-report-${tab}`);
        if (btn && panel) {
            if (tab === targetTab) {
                btn.className = 'py-2.5 px-4 text-primary border-b-2 border-primary rounded-t-lg bg-white';
                panel.style.display = 'block';
            } else {
                btn.className = 'py-2.5 px-4 text-slate-600 border-b-2 border-transparent hover:text-primary rounded-t-lg';
                panel.style.display = 'none';
            }
        }
    });
};

window.openAuditReportModal = function(defaultTab = 'sheet') {
    const modal = document.getElementById('audit-report-modal');
    if (modal) {
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        window.switchReportTab(defaultTab);
    }
};

window.closeAuditReportModal = function() {
    const modal = document.getElementById('audit-report-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
};

/**
 * Helper to live update target program's currentAmount & donorsCount
 */
window.updateProgramFund = function(programName, amount) {
    if (!amount || amount <= 0) return;

    // Normalize name matching
    const searchName = (programName || '').toLowerCase();
    const targetProg = programsData.find(p => 
        p.title.toLowerCase().includes(searchName) || 
        searchName.includes(p.title.toLowerCase()) ||
        (searchName.includes('pendidikan') && p.category === 'pendidikan-dakwah') ||
        (searchName.includes('beasiswa') && p.title.toLowerCase().includes('beasiswa')) ||
        (searchName.includes('beras') && p.title.toLowerCase().includes('beras')) ||
        (searchName.includes('sembako') && p.title.toLowerCase().includes('sembako'))
    );

    if (targetProg) {
        targetProg.currentAmount += amount;
        targetProg.donorsCount += 1;

        // Persist additions locally
        try {
            const additions = JSON.parse(localStorage.getItem('wiz_program_additions') || '{}');
            additions[targetProg.id] = (additions[targetProg.id] || 0) + amount;
            localStorage.setItem('wiz_program_additions', JSON.stringify(additions));
        } catch(e) {}

        // Re-render program cards live
        if (window.renderProgramCards) {
            window.renderProgramCards();
        }
    }
};

/**
 * High-Performance Elegant Background Animation Layer for WIZ Bangka Belitung
 * Features floating light nodes, delicate connection lines, and ambient glowing waves.
 */
function initBackgroundAnimation() {
    const canvas = document.getElementById('bg-animation-canvas');
    if (!canvas) return;

    const heroSection = document.getElementById('hero');
    if (!heroSection) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;
    let particles = [];
    let animationFrameId = null;
    let isVisible = true;

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mouse interactive tracking
    const mouse = {
        x: null,
        y: null,
        radius: 160
    };

    heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    heroSection.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Resize handler with High-DPI screen support
    function handleResize() {
        width = heroSection.offsetWidth;
        height = heroSection.offsetHeight;
        dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.scale(dpr, dpr);
        initParticles();
    }

    // Official WIZ Bangka Belitung color palette in RGBA
    const colorPalette = [
        { r: 19,  g: 115, b: 97  }, // Primary Emerald (#137361)
        { r: 16,  g: 185, b: 129 }, // Mint Green (#10b981)
        { r: 243, g: 156, b: 18  }, // Accent Gold (#f39c12)
        { r: 176, g: 240, b: 214 }  // Light Emerald (#b0f0d6)
    ];

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.radius = Math.random() * 2.5 + 1.2;
            this.baseRadius = this.radius;

            // Soft velocity
            const speedMultiplier = prefersReducedMotion ? 0.1 : 0.4;
            this.vx = (Math.random() - 0.5) * speedMultiplier;
            this.vy = (Math.random() - 0.5) * speedMultiplier;

            // Color choice
            const colorObj = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            this.r = colorObj.r;
            this.g = colorObj.g;
            this.b = colorObj.b;

            this.baseAlpha = Math.random() * 0.35 + 0.15;
            this.alpha = this.baseAlpha;
            this.pulseSpeed = Math.random() * 0.02 + 0.005;
            this.pulseAngle = Math.random() * Math.PI * 2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Bounce off boundaries with smooth turn
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;

            // Alpha pulsing
            this.pulseAngle += this.pulseSpeed;
            this.alpha = this.baseAlpha + Math.sin(this.pulseAngle) * 0.1;

            // Mouse proximity interaction
            if (mouse.x !== null && mouse.y !== null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < mouse.radius) {
                    const force = (mouse.radius - dist) / mouse.radius;
                    this.radius = this.baseRadius + force * 2.5;
                    this.alpha = Math.min(0.7, this.baseAlpha + force * 0.3);
                } else {
                    this.radius = this.baseRadius;
                }
            } else {
                this.radius = this.baseRadius;
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.r}, ${this.g}, ${this.b}, ${this.alpha})`;
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        // Calculate dynamic density: ~1 particle per 15,000 sq px (min 30, max 70)
        const count = Math.min(70, Math.max(30, Math.floor((width * height) / 15000)));
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function connectParticles() {
        const maxDist = 130;
        const maxDistSq = maxDist * maxDist;

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distSq = dx * dx + dy * dy;

                if (distSq < maxDistSq) {
                    const dist = Math.sqrt(distSq);
                    const opacity = (1 - dist / maxDist) * 0.18;

                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(19, 115, 97, ${opacity})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }

            // Also draw faint line to mouse cursor
            if (mouse.x !== null && mouse.y !== null) {
                const dx = particles[i].x - mouse.x;
                const dy = particles[i].y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < mouse.radius) {
                    const opacity = (1 - dist / mouse.radius) * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(16, 185, 129, ${opacity})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        if (!isVisible) return;

        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
        }

        connectParticles();
        animationFrameId = requestAnimationFrame(animate);
    }

    // Pause rendering when off-screen to save performance & battery
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    isVisible = true;
                    if (!animationFrameId) {
                        animationFrameId = requestAnimationFrame(animate);
                    }
                } else {
                    isVisible = false;
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                        animationFrameId = null;
                    }
                }
            });
        }, { threshold: 0.05 });
        observer.observe(heroSection);
    }

    // Debounced window resize
    let resizeTimeout = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 150);
    });

    // Initialize and start animation loop
    handleResize();
    if (isVisible) {
        animationFrameId = requestAnimationFrame(animate);
    }
}






