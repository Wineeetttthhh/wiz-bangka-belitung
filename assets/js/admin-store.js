/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Admin Store — Dual-layer Data Manager (Firebase + localStorage)
 * ============================================================
 * 
 * Provides full CRUD operations with dual persistence:
 *  - Primary: Supabase Cloud Database (if configured in supabase-client.js)
 *  - Fallback/Cache: localStorage (always active for offline & quick rendering)
 * 
 * Features:
 *  - Donations: Add, Edit, Verify, Reject, Delete, List, Filter
 *  - Wilayah: Pangkalpinang | Sungailiat (pencatatan terpisah, lembaga tetap satu)
 *  - Jenis Donasi: Zakat | Infak Umum | Infak Terikat | Sedekah
 *  - Infak Terikat: alokasi operasional 12,5% (bukan "potongan") dicatat internal
 *  - Infak Umum: allocation rule per wilayah (tidak menambah 12,5%)
 *  - Allocation Rules: validasi total = 100% (VALID/INVALID)
 *  - News & Kegiatan: Add, Edit, Delete, Published/Draft
 *  - Disbursements: Add, Edit, Delete per Specific Program
 *  - Baselines: Edit baseline values
 *  - Activity Log: Timeline event recording
 *  - Finance: Real-time calculation per wilayah
 * ============================================================
 */

(function () {
    'use strict';

    const STORAGE_KEYS = {
        DONATIONS: 'wiz_donations',
        NEWS: 'wiz_news',
        DISBURSEMENTS: 'wiz_disbursements',
        ACTIVITY: 'wiz_activity',
        BASELINES: 'wiz_baselines',
        SITE_IMAGES: 'wiz_site_images',
        SITE_SETTINGS: 'wiz_site_settings',
        ADMIN_USERS: 'wiz_admin_users',
        ALLOCATION_RULES: 'wiz_allocation_rules',
        REFERRALS: 'wiz_referrals',
        REFERRAL_PAYOUTS: 'wiz_referral_payouts',
        QUOTES: 'wiz_quotes',
        DELETED_IDS: 'wiz_deleted_donation_ids',
        DELETED_NEWS_IDS: 'wiz_deleted_news_ids',
        DELETED_DISB_IDS: 'wiz_deleted_disb_ids',
        DELETED_REF_IDS: 'wiz_deleted_ref_ids',
        INITIALIZED: 'wiz_store_initialized'
    };

    const DEFAULT_SITE_SETTINGS = {
        banks: [
            { id: 'bsi', bank: 'Bank BSI', number: '7112223334', holder: 'Wahdah Inspirasi Zakat' },
            { id: 'muamalat', bank: 'Bank Muamalat', number: '1230099887', holder: 'Wahdah Inspirasi Zakat' },
            { id: 'mandiri', bank: 'Bank Mandiri', number: '1090012345678', holder: 'Wahdah Inspirasi Zakat' },
            { id: 'bca', bank: 'Bank BCA', number: '8830123456', holder: 'Wahdah Inspirasi Zakat' }
        ],
        offices: [
            { id: 'pangkalpinang', name: 'Kantor Pangkalpinang', address: 'Jl. Mentok No. 45, Pangkalpinang, Bangka Belitung', phone: '0812-7171-8000', mapsUrl: 'https://maps.google.com' },
            { id: 'sungailiat', name: 'Kantor Sungailiat', address: 'Jl. Jenderal Sudirman No. 12, Sungailiat, Bangka', phone: '0821-8000-7171', mapsUrl: 'https://maps.google.com' }
        ]
    };

    const DEFAULT_SITE_IMAGES = {
        hero_card: 'assets/images/foto-utama-wiz.jpg',
        about_img: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=800&auto=format&fit=crop',
        berkah_hidayah: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=600&auto=format&fit=crop',
        berkah_juara: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop',
        berkah_sehat: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=600&auto=format&fit=crop',
        berkah_peduli: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=600&auto=format&fit=crop',
        berkah_mandiri: 'https://images.unsplash.com/photo-1556742049-0a670fc80782?q=80&w=600&auto=format&fit=crop',
        banner_donasi: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb9?q=80&w=1200&auto=format&fit=crop'
    };

    const DEFAULT_SPECIFIC_PROGRAM_IMAGES = {
        'Pembangunan Markaz': 'https://images.unsplash.com/photo-1542665952-14513db15293?q=80&w=800&auto=format&fit=crop',
        'Pengadaan & Perbaikan Kendaraan': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop',
        'Pengadaan dan Perbaikan Kendaraan': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop',
        'Santunan Mualaf': 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop',
        'Tahfidz': 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=800&auto=format&fit=crop',
        'Pelatihan Public Speaking': 'https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=800&auto=format&fit=crop',
        'Tabligh Akbar Dzulhijjah': 'https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=800&auto=format&fit=crop',
        'Pelatihan Guru Dirosa': 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=800&auto=format&fit=crop',
        'Pelatihan Penyelenggaraan Jenazah': 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800&auto=format&fit=crop',
        'Pelatihan Volunteer Media Dakwah': 'https://images.unsplash.com/photo-1542665952-14513db15293?q=80&w=800&auto=format&fit=crop',
        'Lomba Desain Poster Dakwah': 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop',
        'Kantor DPW WI Babel & WIZ': 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop',
        'Mukerwil Mukernas Muktamar': 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&auto=format&fit=crop',
        'Keberangkatan Kepulangan Dai': 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=800&auto=format&fit=crop',

        'Tebar Sembako': 'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=800&auto=format&fit=crop',
        'Sedekah Jumat': 'assets/images/foto-utama-wiz.jpg',
        'Santunan Yatim': 'assets/images/foto-utama-wiz.jpg',
        'Tebar Iftar Nusantara': 'assets/images/tebar-iftar.jpg',
        'Tebar Ifthar Nusantara': 'assets/images/tebar-iftar.jpg',
        'Tebar Iftar': 'assets/images/tebar-iftar.jpg',
        "Tebar Qur'an Nusantara": 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=800&auto=format&fit=crop',
        'Bahagiakan Guru Ngaji': 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=800&auto=format&fit=crop',
        'Sedekah Air': 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?q=80&w=800&auto=format&fit=crop',

        'Beasiswa Pendidikan Juara': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop',
        'Beasiswa Tahfidz & Dhuafa': 'https://images.unsplash.com/photo-1585036156171-384164a8c675?q=80&w=800&auto=format&fit=crop',
        'Perlengkapan Belajar Yatim': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop',

        'Khitanan Massal Dhuafa': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=800&auto=format&fit=crop',
        'Layanan Pengobatan Gratis': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop',
        'Ambulance Gratis Ummat': 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?q=80&w=800&auto=format&fit=crop',

        'Modal Usaha Dhuafa': 'https://images.unsplash.com/photo-1556742049-0a67daf4004a?q=80&w=800&auto=format&fit=crop',
        'Pelatihan Keterampilan Wirausaha': 'https://images.unsplash.com/photo-1556742049-0a67daf4004a?q=80&w=800&auto=format&fit=crop'
    };

    const DEFAULT_ADMIN_USERS = [
        {
            id: 'admin-1',
            username: 'admin',
            password: 'wizbabel2026',
            fullName: 'Super Admin 1 (WIZ Babel)',
            phone: '08123456789',
            role: 'super_admin',
            status: 'approved',
            createdAt: new Date().toISOString()
        }
    ];

    const DEFAULT_REFERRALS = [];

    const DEFAULT_QUOTES = [
        {
            id: 'quote-1',
            text: 'Sedekah itu tidak akan mengurangi harta. Tidak ada orang yang memberi maaf kepada orang lain melainkan Allah akan menambah kemuliaannya.',
            source: 'HR. Muslim no. 2588',
            category: 'Sedekah & Keberkahan',
            imageUrl: 'assets/images/foto-utama-wiz.jpg',
            date: '2026-08-20',
            status: 'active',
            author: 'Admin WIZ Babel',
            createdAt: '2026-08-20T00:00:00.000Z'
        },
        {
            id: 'quote-2',
            text: 'Tidak ada suatu hari pun ketika seorang hamba memasuki waktu pagi melainkan turun dua malaikat. Salah satunya berdoa: Ya Allah, berikanlah ganti bagi orang yang berinfak.',
            source: 'HR. Bukhari no. 1442 & Muslim no. 1010',
            category: 'Infak Subuh',
            imageUrl: 'assets/images/sedekah-beras-dhuafa.jpg',
            date: '2026-08-19',
            status: 'active',
            author: 'Admin WIZ Babel',
            createdAt: '2026-08-19T00:00:00.000Z'
        },
        {
            id: 'quote-3',
            text: 'Bentengilah hartamu dengan zakat, obatilah orang-orang sakit di antaramu dengan sedekah, dan hadapilah berbagai cobaan dengan doa.',
            source: 'HR. Abu Dawud & At-Thabrani',
            category: 'Zakat & Penyucian Jiwa',
            imageUrl: 'assets/images/sedekah-beras-dai.jpg',
            date: '2026-08-18',
            status: 'active',
            author: 'Admin WIZ Babel',
            createdAt: '2026-08-18T00:00:00.000Z'
        }
    ];

    // ─── Helpers ───────────────────────────────────────────
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }

    function getDeletedIds() {
        try {
            return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_IDS) || '[]'));
        } catch { return new Set(); }
    }

    function addDeletedId(id) {
        if (!id) return;
        const set = getDeletedIds();
        set.add(String(id));
        localStorage.setItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify(Array.from(set)));
    }

    function getDeletedNewsIds() {
        try {
            return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_NEWS_IDS) || '[]'));
        } catch { return new Set(); }
    }

    function addDeletedNewsId(id) {
        if (!id) return;
        const set = getDeletedNewsIds();
        set.add(String(id));
        localStorage.setItem(STORAGE_KEYS.DELETED_NEWS_IDS, JSON.stringify(Array.from(set)));
    }

    function getDeletedDisbIds() {
        try {
            return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_DISB_IDS) || '[]'));
        } catch { return new Set(); }
    }

    function addDeletedDisbId(id) {
        if (!id) return;
        const set = getDeletedDisbIds();
        set.add(String(id));
        localStorage.setItem(STORAGE_KEYS.DELETED_DISB_IDS, JSON.stringify(Array.from(set)));
    }

    function getDeletedRefIds() {
        try {
            return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_REF_IDS) || '[]'));
        } catch { return new Set(); }
    }

    function addDeletedRefId(id) {
        if (!id) return;
        const set = getDeletedRefIds();
        set.add(String(id));
        localStorage.setItem(STORAGE_KEYS.DELETED_REF_IDS, JSON.stringify(Array.from(set)));
    }

    function getStore(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || null;
        } catch { return null; }
    }

    function setStore(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
                console.error('[WIZ Store] localStorage penuh! Tidak bisa simpan:', key, e);
                if (typeof alert !== 'undefined') {
                    alert('⚠️ Penyimpanan lokal browser hampir penuh!\n\nFoto yang diupload terlalu besar atau terlalu banyak data tersimpan.\n\nSolusi: Hapus beberapa data lama atau kompres foto lebih kecil sebelum upload.');
                }
            } else {
                console.error('[WIZ Store] Gagal simpan data:', key, e);
            }
        }
    }

    function formatRupiahCompact(num) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
    }

    function formatDate(isoString) {
        if (!isoString) return '-';
        const d = new Date(isoString);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function formatDateTime(isoString) {
        if (!isoString) return '-';
        const d = new Date(isoString);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' +
            d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    }

    function timeAgo(isoString) {
        if (!isoString) return 'Baru saja';
        const diff = Date.now() - new Date(isoString).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Baru saja';
        if (mins < 60) return `${mins} menit yang lalu`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} jam yang lalu`;
        const days = Math.floor(hours / 24);
        return `${days} hari yang lalu`;
    }

    // ─── Default Baseline Settings (Pure 0 base for real data integration) ──
    const DEFAULT_BASELINES = {
        baseMasuk: 0,
        baseTersalurkan: 0,
        baseDonatur: 0
    };

    // ═══════════════════════════════════════════════════════
    // ALLOCATION RULES — INFAK UMUM PER WILAYAH
    // Total harus = 100%. Jika tidak, status = INVALID.
    // JANGAN normalisasi otomatis. Tampilkan apa adanya.
    // ═══════════════════════════════════════════════════════
    const ALLOCATION_RULES = {
        'Pangkalpinang': {
            label: 'Infak Umum — Pangkalpinang',
            // Pembagian pilar utama
            mainAllocation: [
                { key: 'Berkah Hidayah', percent: 35 },
                { key: 'Berkah Sehat', percent: 5 },
                { key: 'Berkah Peduli', percent: 18 },
                { key: 'Berkah Juara', percent: 27 },
                { key: 'Dana Saving', percent: 2 },
                { key: 'Operasional', percent: 13 }
            ],
            // Sub-alokasi per program utama
            subAllocation: {
                'Berkah Hidayah': {
                    // PERINGATAN: Total = 105% — INVALID
                    items: [
                        { key: 'Pembangunan Markaz', percent: 5 },
                        { key: 'Pengadaan dan Perbaikan Kendaraan', percent: 10 },
                        { key: 'Santunan Mualaf', percent: 5 },
                        { key: 'Pengadaan Celengan Besar', percent: 10 },
                        { key: 'Tahfidz', percent: 5 },
                        { key: 'Pelatihan Public Speaking', percent: 5 },
                        { key: 'Tabligh Akbar Dzulhijjah', percent: 5 },
                        { key: 'Pelatihan Guru Dirosa', percent: 5 },
                        { key: 'Pelatihan Penyelenggaraan Jenazah', percent: 5 },
                        { key: 'Pelatihan Volunteer Media Dakwah', percent: 5 },
                        { key: 'Lomba Desain Poster Dakwah', percent: 5 },
                        { key: 'Kantor DPW WI Babel dan WIZ', percent: 15 },
                        { key: 'Mukerwil/Mukernas/Muktamar', percent: 10 },
                        { key: 'Keberangkatan dan Kepulangan Dai', percent: 10 }
                    ]
                    // Total = 105% → INVALID (jangan normalisasi, tampilkan apa adanya)
                },
                'Berkah Juara': {
                    items: [
                        { key: 'Beasiswa Pendidikan Juara', percent: 80 },
                        { key: 'Perlengkapan Belajar Yatim', percent: 20 }
                    ]
                    // Total = 100% → VALID
                },
                'Berkah Peduli': {
                    items: [
                        { key: 'Tebar Sembako', percent: 20 },
                        { key: 'Sedekah Beras Dhuafa', percent: 20 },
                        { key: 'Sedekah Jumat', percent: 20 },
                        { key: 'Santunan Yatim', percent: 20 },
                        { key: 'Tebar Qur\'an Nusantara', percent: 20 }
                    ]
                    // Total = 100% → VALID
                },
                'Berkah Sehat': {
                    items: [
                        { key: 'Khitanan Massal', percent: 40 },
                        { key: 'Layanan Pengobatan Gratis', percent: 40 },
                        { key: 'Layanan Ambulance Ummat', percent: 20 }
                    ]
                    // Total = 100% → VALID
                },
                'Berkah Mandiri': {
                    items: null  // Belum dikonfigurasi — jangan mengarang
                }
            }
        },
        'Sungailiat': {
            label: 'Infak Umum — Sungailiat',
            mainAllocation: [
                { key: 'Berkah Hidayah', percent: 18 },
                { key: 'Berkah Peduli', percent: 18 },
                { key: 'Berkah Juara', percent: 40 },
                { key: 'Dana Saving', percent: 10 },
                { key: 'Operasional', percent: 14 }
            ],
            subAllocation: {
                'Berkah Hidayah': {
                    items: [
                        { key: 'Pembangunan Markaz', percent: 10 },
                        { key: 'Pengadaan dan Perbaikan Kendaraan', percent: 25 },
                        { key: 'Pengadaan Celengan Besar', percent: 30 },
                        { key: 'Kantor', percent: 20 },
                        { key: 'Mukerwil/Mukernas/Muktamar', percent: 15 }
                    ]
                    // Total = 100% → VALID
                },
                'Berkah Juara': {
                    items: [
                        { key: 'Beasiswa Pendidikan Juara', percent: 80 },
                        { key: 'Perlengkapan Belajar Yatim', percent: 20 }
                    ]
                },
                'Berkah Peduli': {
                    items: [
                        { key: 'Tebar Sembako', percent: 20 },
                        { key: 'Sedekah Beras Dhuafa', percent: 20 },
                        { key: 'Sedekah Jumat', percent: 20 },
                        { key: 'Santunan Yatim', percent: 20 },
                        { key: 'Tebar Qur\'an Nusantara', percent: 20 }
                    ]
                },
                'Berkah Sehat': {
                    items: null  // Belum dikonfigurasi
                },
                'Berkah Mandiri': {
                    items: null  // Belum dikonfigurasi
                }
            }
        }
    };

    /**
     * Validasi allocation rule: total harus = 100%.
     * Kembalikan { valid, total, message }
     */
    function validateAllocationRule(items) {
        if (!items) return { valid: false, total: 0, unconfigured: true, message: 'Belum dikonfigurasi' };
        const total = items.reduce((sum, i) => sum + (i.percent || 0), 0);
        const valid = Math.abs(total - 100) < 0.001;
        return {
            valid,
            total,
            unconfigured: false,
            message: valid
                ? 'VALID — Total alokasi 100%'
                : `ALLOCATION INVALID — Total alokasi ${total}%. Silakan koreksi sebelum digunakan.`
        };
    }

    /**
     * Hitung alokasi Infak Umum dari suatu nominal untuk wilayah tertentu.
     * Kembalikan array item { key, percent, amount }
     */
    function calcInfakUmumAllocation(amount, wilayah) {
        const rule = ALLOCATION_RULES[wilayah];
        if (!rule) return [];
        const validation = validateAllocationRule(rule.mainAllocation);
        if (!validation.valid) return null; // rule invalid, jangan gunakan
        return rule.mainAllocation.map(item => ({
            key: item.key,
            percent: item.percent,
            amount: Math.round(amount * item.percent / 100)
        }));
    }

    /**
     * Hitung alokasi Infak Terikat: 12,5% operasional, 87,5% program.
     * BUKAN "potongan" — total donasi tetap nominal penuh.
     */
    function calcInfakTerikatAllocation(amount) {
        const operasional = Math.round(amount * 0.125);
        const program = amount - operasional;
        return { alokasiOperasional: operasional, alokasiProgram: program };
    }

    // ─── Dynamic Site Images Manager ──────────────────────
    const siteImages = {
        getAll() {
            return { ...DEFAULT_SITE_IMAGES, ...(getStore(STORAGE_KEYS.SITE_IMAGES) || {}) };
        },
        get(key) {
            const all = this.getAll();
            return all[key] || DEFAULT_SITE_IMAGES[key] || '';
        },
        update(key, url, label) {
            const current = this.getAll();
            current[key] = url;
            setStore(STORAGE_KEYS.SITE_IMAGES, current);
            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('settings', `Foto '${label || key}' diperbarui oleh Admin`, sessionStorage.getItem('wiz_admin_user') || 'Admin');
            }

            window.dispatchEvent(new CustomEvent('wiz-program-images-changed', { detail: { key, url } }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));

            // Background non-blocking cloud push
            (async () => {
                try {
                    if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                        await window.wizFirebase.set('site_images', key, { key, url, label: label || key, updatedAt: new Date().toISOString() });
                    }
                    if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                        await window.wizSupabase.upsert('site_images', { id: key, key: key, image_url: url, label: label || key, updated_at: new Date().toISOString() });
                    }
                } catch(e) {}
            })();

            return current;
        },
        updateAll(imagesObj) {
            const current = { ...this.getAll(), ...imagesObj };
            setStore(STORAGE_KEYS.SITE_IMAGES, current);
            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('settings', 'Beberapa foto website diperbarui oleh Admin', sessionStorage.getItem('wiz_admin_user') || 'Admin');
            }

            window.dispatchEvent(new CustomEvent('wiz-program-images-changed'));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));

            // Background non-blocking cloud push
            (async () => {
                try {
                    if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                        for (const [key, url] of Object.entries(imagesObj)) {
                            await window.wizFirebase.set('site_images', key, { key, url, label: key, updatedAt: new Date().toISOString() });
                        }
                    }
                    if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                        for (const [key, url] of Object.entries(imagesObj)) {
                            await window.wizSupabase.upsert('site_images', { id: key, key: key, image_url: url, label: key, updated_at: new Date().toISOString() });
                        }
                    }
                } catch(e) {}
            })();

            return current;
        }
    };

    // ─── Site Settings Manager ────────────────────────────────
    const siteSettingsManager = {
        get() {
            const saved = getStore(STORAGE_KEYS.SITE_SETTINGS);
            if (!saved) {
                setStore(STORAGE_KEYS.SITE_SETTINGS, DEFAULT_SITE_SETTINGS);
                return DEFAULT_SITE_SETTINGS;
            }
            return {
                banks: saved.banks || DEFAULT_SITE_SETTINGS.banks,
                offices: saved.offices || DEFAULT_SITE_SETTINGS.offices
            };
        },
        async update(newSettings) {
            const current = this.get();
            const updated = {
                banks: newSettings.banks || current.banks,
                offices: newSettings.offices || current.offices
            };
            setStore(STORAGE_KEYS.SITE_SETTINGS, updated);

            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('settings', 'Pengaturan Rekening Bank & Lokasi Kantor diperbarui oleh Admin Utama', sessionStorage.getItem('wiz_admin_user') || 'Admin 1');
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                try {
                    await window.wizFirebase.upsert('site_settings', {
                        key: 'global_settings',
                        value: updated,
                        updatedAt: new Date().toISOString()
                    });
                } catch(e) {}
            }

            // Immediately push the updated master bundle to cloud
            try {
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {
                console.warn('[Site Settings] pushToCloud error:', e);
            }

            window.dispatchEvent(new CustomEvent('wiz-site-settings-changed', { detail: updated }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return updated;
        }
    };

    // ─── Admin Authentication & Accounts Manager ──────────
    const adminUsers = {
        getAll() {
            const users = getStore(STORAGE_KEYS.ADMIN_USERS) || DEFAULT_ADMIN_USERS;
            if (!users.some(u => u.username === 'admin')) {
                users.unshift(DEFAULT_ADMIN_USERS[0]);
                setStore(STORAGE_KEYS.ADMIN_USERS, users);
            }
            return users;
        },
        getPending() {
            return this.getAll().filter(u => u.status === 'pending');
        },
        async register({ username, password, fullName, phone, role }) {
            const list = this.getAll();
            const cleanUser = (username || '').trim().toLowerCase();
            if (!cleanUser || !password) {
                return { success: false, message: 'Username dan kata sandi wajib diisi.' };
            }
            if (cleanUser === 'admin') {
                return { success: false, message: 'Username "admin" adalah akun Admin 1 Utama dan tidak dapat didaftarkan ulang.' };
            }
            if (list.some(u => u.username.toLowerCase() === cleanUser)) {
                return { success: false, message: 'Username sudah digunakan, silakan pilih username lain.' };
            }

            const newUser = {
                id: generateId(),
                username: cleanUser,
                password: password.trim(),
                fullName: (fullName || cleanUser).trim(),
                phone: (phone || '').trim(),
                role: role === 'super_admin' ? 'super_admin' : 'amil',
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            list.push(newUser);
            setStore(STORAGE_KEYS.ADMIN_USERS, list);
            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('auth', `Pendaftaran akun admin baru: '${cleanUser}' (Menunggu verifikasi Admin 1)`, cleanUser);
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.insert('admin_users', newUser);
            }

            return { success: true, user: newUser, message: 'Pendaftaran berhasil! Akun Anda sedang menunggu verifikasi dari Admin 1.' };
        },
        login(username, password) {
            const cleanUser = (username || '').trim().toLowerCase();
            const cleanPass = (password || '').trim();
            const list = this.getAll();

            const found = list.find(u => u.username.toLowerCase() === cleanUser);
            if (!found) {
                return { success: false, message: 'Username tidak ditemukan!' };
            }

            if (found.password !== cleanPass) {
                return { success: false, message: 'Kata sandi salah!' };
            }

            if (found.status === 'pending') {
                return { success: false, message: 'Akun Anda belum diverifikasi oleh Admin 1. Silakan hubungi Super Admin.' };
            }

            if (found.status === 'rejected') {
                return { success: false, message: 'Pendaftaran akun Anda ditolak oleh Admin 1.' };
            }

            return { success: true, user: found };
        },
        async approve(id, adminActor) {
            const list = this.getAll();
            const idx = list.findIndex(u => String(u.id) === String(id));
            if (idx === -1) return { success: false, message: 'Pengguna tidak ditemukan' };

            list[idx].status = 'approved';
            list[idx].verifiedAt = new Date().toISOString();
            list[idx].verifiedBy = adminActor || 'Admin 1';
            setStore(STORAGE_KEYS.ADMIN_USERS, list);

            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('auth', `Akun admin '${list[idx].username}' telah diverifikasi & disetujui`, adminActor || 'Admin 1');
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.update('admin_users', id, { status: 'approved', verifiedAt: new Date().toISOString(), verifiedBy: adminActor || 'Admin 1' });
            }
            return { success: true, user: list[idx] };
        },
        async reject(id, adminActor) {
            const list = this.getAll();
            const idx = list.findIndex(u => String(u.id) === String(id));
            if (idx === -1) return { success: false, message: 'Pengguna tidak ditemukan' };

            list[idx].status = 'rejected';
            setStore(STORAGE_KEYS.ADMIN_USERS, list);

            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('auth', `Pendaftaran akun admin '${list[idx].username}' ditolak`, adminActor || 'Admin 1');
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.update('admin_users', id, { status: 'rejected' });
            }
            return { success: true };
        },
        async delete(id) {
            let list = this.getAll();
            const target = list.find(u => String(u.id) === String(id));
            if (target && target.username === 'admin') {
                return { success: false, message: 'Akun Super Admin 1 utama tidak dapat dihapus.' };
            }
            list = list.filter(u => String(u.id) !== String(id));
            setStore(STORAGE_KEYS.ADMIN_USERS, list);

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.remove('admin_users', id);
            }
            return { success: true };
        }
    };

    // ─── Allocation Rules Manager ─────────────────────────
    const allocationRulesManager = {
        getAll() {
            const saved = getStore(STORAGE_KEYS.ALLOCATION_RULES);
            return saved || ALLOCATION_RULES;
        },
        get(wilayah) {
            const all = this.getAll();
            return all[wilayah] || ALLOCATION_RULES[wilayah] || null;
        },
        async update(wilayah, data) {
            const all = this.getAll();
            all[wilayah] = data;
            setStore(STORAGE_KEYS.ALLOCATION_RULES, all);
            ALLOCATION_RULES[wilayah] = data;

            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('settings', `Aturan alokasi dana wilayah '${wilayah}' diperbarui oleh Admin`, sessionStorage.getItem('wiz_admin_user') || 'Admin');
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.upsert('allocation_rules', { key: wilayah, wilayah, data, updatedAt: new Date().toISOString() });
            }
            return all;
        },
        async addSpecificProgram(wilayah, pillarKey, { key, percent, image }) {
            const all = this.getAll();
            const wData = all[wilayah] || ALLOCATION_RULES[wilayah];
            if (!wData.subAllocation) wData.subAllocation = {};
            if (!wData.subAllocation[pillarKey]) wData.subAllocation[pillarKey] = { items: [] };
            if (!wData.subAllocation[pillarKey].items) wData.subAllocation[pillarKey].items = [];

            wData.subAllocation[pillarKey].items.push({
                key: key.trim(),
                percent: Number(percent) || 0,
                image: (image || '').trim()
            });
            return await this.update(wilayah, wData);
        },
        async updateSpecificProgram(wilayah, pillarKey, itemIndex, { key, percent, image }) {
            const all = this.getAll();
            const wData = all[wilayah];
            if (wData && wData.subAllocation && wData.subAllocation[pillarKey] && wData.subAllocation[pillarKey].items && wData.subAllocation[pillarKey].items[itemIndex]) {
                wData.subAllocation[pillarKey].items[itemIndex] = {
                    key: key.trim(),
                    percent: Number(percent) || 0,
                    image: (image || '').trim()
                };
                return await this.update(wilayah, wData);
            }
            return all;
        },
        async deleteSpecificProgram(wilayah, pillarKey, itemIndex) {
            const all = this.getAll();
            const wData = all[wilayah];
            if (wData && wData.subAllocation && wData.subAllocation[pillarKey] && wData.subAllocation[pillarKey].items) {
                wData.subAllocation[pillarKey].items.splice(itemIndex, 1);
                return await this.update(wilayah, wData);
            }
            return all;
        },
        async updateSpecificProgramImageByName(programName, imageDataUrl) {
            if (!programName) return false;
            const cleanQuery = String(programName).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            let updated = false;

            // 1. Update localStorage flat store
            try {
                const flatMap = JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}');
                flatMap[programName] = imageDataUrl;
                localStorage.setItem('wiz_specific_prog_imgs', JSON.stringify(flatMap));
            } catch(e) {}

            // 2. Update all allocation rules structures
            const all = this.getAll();
            for (const [w, wData] of Object.entries(all)) {
                if (wData && wData.subAllocation) {
                    let wModified = false;
                    for (const [pillarKey, subObj] of Object.entries(wData.subAllocation)) {
                        if (subObj && subObj.items) {
                            subObj.items.forEach(item => {
                                const kNorm = String(item.key || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                                const fullNorm = String(`${pillarKey} - ${item.key}`).toLowerCase().replace(/[^a-z0-9]/g, '');
                                if (kNorm === cleanQuery || fullNorm === cleanQuery || cleanQuery.includes(kNorm) || kNorm.includes(cleanQuery)) {
                                    item.image = imageDataUrl;
                                    wModified = true;
                                    updated = true;
                                }
                            });
                        }
                    }
                    if (wModified) {
                        await this.update(w, wData);
                    }
                }
            }

            // 3. Save to siteImages in store to guarantee it gets pushed in bundle
            const imgKey = 'prog_img_' + programName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            siteImages.update(imgKey, imageDataUrl, `Foto Program: ${programName}`);

            // 4. Save to Firebase Cloud in background
            const imgRecord = {
                id: imgKey,
                key: programName,
                image_url: imageDataUrl,
                updated_at: new Date().toISOString()
            };

            window.dispatchEvent(new CustomEvent('wiz-program-images-changed', { detail: { name: programName, image: imageDataUrl } }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));

            (async () => {
                try {
                    if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                        await window.wizFirebase.set('site_images', imgRecord.id, imgRecord);
                    }
                    if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                        await window.wizSupabase.upsert('site_images', imgRecord);
                    }
                } catch(e) {}
            })();

            return updated;
        },
        getSpecificProgramImage(programName, pillar = '') {
            if (!programName) return DEFAULT_SITE_IMAGES.berkah_hidayah;
            const cleanQuery = String(programName).trim().toLowerCase().replace(/[^a-z0-9]/g, '');

            // 1. Check custom uploaded images in localStorage with fuzzy match
            try {
                const flatMap = JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}');
                if (flatMap[programName]) return flatMap[programName];

                for (const [k, v] of Object.entries(flatMap)) {
                    const cleanK = String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cleanK === cleanQuery || cleanQuery.includes(cleanK) || cleanK.includes(cleanQuery)) {
                        return v;
                    }
                }
            } catch(e) {}

            // 2. Check allocation rules subAllocation items
            const all = this.getAll();
            for (const wData of Object.values(all)) {
                if (wData && wData.subAllocation) {
                    for (const [pillarKey, subObj] of Object.entries(wData.subAllocation)) {
                        if (subObj && subObj.items) {
                            for (const item of subObj.items) {
                                const kNorm = String(item.key || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                                const fullNorm = String(`${pillarKey} - ${item.key}`).toLowerCase().replace(/[^a-z0-9]/g, '');
                                if ((kNorm === cleanQuery || fullNorm === cleanQuery || cleanQuery.includes(kNorm) || kNorm.includes(cleanQuery)) && item.image) {
                                    return item.image;
                                }
                            }
                        }
                    }
                }
            }

            // 3. Check DEFAULT_PROGRAM_IMAGES mapping
            if (typeof DEFAULT_PROGRAM_IMAGES !== 'undefined') {
                if (DEFAULT_PROGRAM_IMAGES[programName]) return DEFAULT_PROGRAM_IMAGES[programName];
                for (const [k, v] of Object.entries(DEFAULT_PROGRAM_IMAGES)) {
                    const cleanK = String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cleanK === cleanQuery || cleanQuery.includes(cleanK) || cleanK.includes(cleanQuery)) {
                        return v;
                    }
                }
            }

            // 4. Fallback to pillar image
            const cleanPillarKey = (pillar || '').toLowerCase().replace(/\s+/g, '_');
            if (DEFAULT_SITE_IMAGES[cleanPillarKey]) {
                return DEFAULT_SITE_IMAGES[cleanPillarKey];
            }
            return DEFAULT_SITE_IMAGES.berkah_hidayah;
        },
        getSpecificProgramList(wilayah) {
            const result = [];
            const allRules = this.getAll();
            const targetWilayahs = (wilayah && wilayah !== 'Semua') ? [wilayah] : Object.keys(allRules);

            targetWilayahs.forEach(w => {
                const wData = allRules[w];
                if (wData && wData.subAllocation) {
                    Object.entries(wData.subAllocation).forEach(([pillarKey, subObj]) => {
                        if (subObj && subObj.items) {
                            subObj.items.forEach(item => {
                                const fullName = `${pillarKey} - ${item.key}`;
                                if (!result.includes(fullName)) {
                                    result.push(fullName);
                                }
                            });
                        }
                    });
                }
            });
            return result;
        },
        validate(items) {
            return validateAllocationRule(items);
        }
    };

    // ─── Seed Default Data (localStorage fallback) ────────
    function seedDefaultData() {
        if (localStorage.getItem(STORAGE_KEYS.INITIALIZED)) return;

        const now = new Date();
        const donations = [];
        const news = [
            {
                id: generateId(),
                title: 'TEBAR SEMBAKO NUSANTARA MENYAMBUT RAMADAN INSPIRASI WIZ BABEL',
                category: 'Kegiatan & Event',
                content: 'Wahdah Inspirasi Zakat (WIZ) Bangka Belitung sukses melaksanakan kegiatan sosial berupa penyaluran 150 paket sembako kepada masyarakat kurang mampu dan lansia dhuafa di Kabupaten Bangka.\n\nKegiatan ini berlangsung dengan penuh kehangatan dan dihadiri oleh para tokoh masyarakat serta perangkat desa setempat. Setiap paket berisi beras super, minyak goreng, gula pasir, dan bahan kebutuhan pokok lainnya.\n\nDalam sambutannya, perwakilan WIZ Bangka Belitung menyampaikan ucapan terima kasih yang sebesar-besarnya kepada seluruh donatur yang telah menyisihkan hartanya. Semoga setiap paket sembako yang tersalurkan membawa kebahagiaan dan keberkahan bagi penerima manfaat.',
                imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=800&auto=format&fit=crop',
                gallery: [
                    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1509099836639-18ba1795216d?q=80&w=800&auto=format&fit=crop'
                ],
                eventDate: new Date(now - 24 * 3600000).toISOString(),
                status: 'published',
                createdAt: new Date(now - 1 * 3600000).toISOString(),
                author: 'Admin Konten'
            },
            {
                id: generateId(),
                title: 'Pembukaan Pendaftaran Beasiswa Tahfidz Qur\'an 2024',
                category: 'Pengumuman',
                content: 'WIZ Bangka Belitung membuka pendaftaran Beasiswa Tahfidz Qur\'an untuk santri yatim dhuafa berprestasi di Kabupaten Bangka dan Pangkalpinang.\n\nProgram beasiswa ini mencakup biaya pendidikan penuh, pembinaan karakter, tempat tinggal di pondok tahfidz, dan penyediaan mushaf Al-Qur\'an.\n\nPendaftaran dibuka mulai bulan ini hingga kuota terpenuhi. Para calon penerima manfaat akan melalui proses seleksi hafalan dasar dan administrasi.',
                imageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=800&auto=format&fit=crop',
                gallery: [
                    'https://images.unsplash.com/photo-1585036156171-384164a8c675?q=80&w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop'
                ],
                eventDate: new Date(now - 48 * 3600000).toISOString(),
                status: 'published',
                createdAt: new Date(now - 48 * 3600000).toISOString(),
                author: 'Admin Konten'
            },
            {
                id: generateId(),
                title: 'Pelatihan Guru Al-Qur\'an Metode Dirosa di Pangkalpinang',
                category: 'Kegiatan & Event',
                content: 'Sebanyak 50 guru ngaji mengikuti Pelatihan Guru Dirosa yang diselenggarakan oleh WIZ Bangka Belitung untuk meningkatkan kualitas pengajaran Al-Qur\'an.\n\nMetode Dirosa merupakan sistem belajar membaca Al-Qur\'an yang efektif untuk orang dewasa dan anak-anak. Diharapkan pelatihan ini melahirkan pengajar Al-Qur\'an yang kompeten di Bangka Belitung.',
                imageUrl: 'https://images.unsplash.com/photo-1585036156171-384164a8c675?q=80&w=800&auto=format&fit=crop',
                gallery: [
                    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1509099836639-18ba1795216d?q=80&w=800&auto=format&fit=crop'
                ],
                eventDate: new Date(now - 72 * 3600000).toISOString(),
                status: 'published',
                createdAt: new Date(now - 96 * 3600000).toISOString(),
                author: 'Ahmad S.'
            }
        ];

        const disbursements = [];
        const activity = [
            { id: generateId(), type: 'system', message: 'Sistem WIZ Babel berhasil diinisialisasi. Silakan mulai masukkan data nyata.', actor: 'Sistem', createdAt: new Date().toISOString() },
        ];

        setStore(STORAGE_KEYS.DONATIONS, donations);
        setStore(STORAGE_KEYS.NEWS, news);
        setStore(STORAGE_KEYS.DISBURSEMENTS, disbursements);
        setStore(STORAGE_KEYS.ACTIVITY, activity);
        setStore(STORAGE_KEYS.BASELINES, DEFAULT_BASELINES);
        setStore(STORAGE_KEYS.SITE_IMAGES, DEFAULT_SITE_IMAGES);
        setStore(STORAGE_KEYS.ADMIN_USERS, DEFAULT_ADMIN_USERS);
        setStore(STORAGE_KEYS.ALLOCATION_RULES, ALLOCATION_RULES);
        setStore(STORAGE_KEYS.REFERRALS, getStore(STORAGE_KEYS.REFERRALS) || []);
        setStore(STORAGE_KEYS.REFERRAL_PAYOUTS, getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || []);
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }

    if (!getStore(STORAGE_KEYS.REFERRALS)) {
        setStore(STORAGE_KEYS.REFERRALS, []);
    }
    if (!getStore(STORAGE_KEYS.REFERRAL_PAYOUTS)) {
        setStore(STORAGE_KEYS.REFERRAL_PAYOUTS, []);
    }

    // ─── High-Speed Unified Cloud Sync Engine (/api/sync) ────────
    let lastSyncTimestamp = 0;
    let isSyncInProgress = false;

    async function pushToCloud() {
        const report = { success: true, timestamp: new Date().toISOString() };
        try {
            const bundle = {
                donations: getStore(STORAGE_KEYS.DONATIONS) || [],
                news: getStore(STORAGE_KEYS.NEWS) || [],
                disbursements: getStore(STORAGE_KEYS.DISBURSEMENTS) || [],
                referrals: getStore(STORAGE_KEYS.REFERRALS) || [],
                referral_payouts: getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || [],
                activity: getStore(STORAGE_KEYS.ACTIVITY) || [],
                site_settings: getStore(STORAGE_KEYS.SITE_SETTINGS) || DEFAULT_SITE_SETTINGS,
                site_images: getStore(STORAGE_KEYS.SITE_IMAGES) || DEFAULT_SITE_IMAGES,
                allocation_rules: getStore(STORAGE_KEYS.ALLOCATION_RULES) || ALLOCATION_RULES,
                baselines: getStore(STORAGE_KEYS.BASELINES) || DEFAULT_BASELINES,
                admin_users: getStore(STORAGE_KEYS.ADMIN_USERS) || DEFAULT_ADMIN_USERS,
                custom_specific_programs: JSON.parse(localStorage.getItem('wiz_custom_specific_programs') || '{}'),
                specific_prog_imgs: JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}'),
                deleted_ids: Array.from(getDeletedIds()),
                deleted_news_ids: Array.from(getDeletedNewsIds()),
                deleted_disb_ids: Array.from(getDeletedDisbIds()),
                deleted_ref_ids: Array.from(getDeletedRefIds())
            };

            const payload = {
                action: 'sync_bundle',
                bundle,
                deletedIds: bundle.deleted_ids,
                deletedNewsIds: bundle.deleted_news_ids,
                deletedDisbIds: bundle.deleted_disb_ids,
                deletedRefIds: bundle.deleted_ref_ids
            };

            // 1. Primary: Push to Vercel Serverless Sync API (/api/sync)
            try {
                const apiRes = await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (apiRes.ok) {
                    console.log('[WIZ Sync] Master state successfully pushed to /api/sync');
                }
            } catch (e) {
                // Fallback to production domain endpoint if running in isolated view
                if (window.location.hostname !== 'www.wizbangkabelitung.or.id' && window.location.hostname !== 'wizbangkabelitung.or.id') {
                    try {
                        await fetch('https://www.wizbangkabelitung.or.id/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                    } catch(err) {}
                }
            }

            // 2. Secondary: Firestore Master Bundle (Single Document, Zero Quota Waste)
            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                try {
                    await window.wizFirebase.set('system_state', 'master_bundle', {
                        ...bundle,
                        updatedAt: new Date().toISOString()
                    });
                } catch(e) {}
            }

            broadcastSync();
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return { status: 'success', report };
        } catch (e) {
            console.error('[WIZ Sync] Push error:', e);
            return { status: 'error', message: e.message };
        }
    }

    async function syncFromCloud(force = false) {
        const now = Date.now();
        if (!force && (now - lastSyncTimestamp < 2500 || isSyncInProgress)) {
            return;
        }
        isSyncInProgress = true;
        lastSyncTimestamp = now;

        try {
            let masterData = null;

            // 1. Primary: Fetch from local / production Vercel Serverless API (/api/sync)
            try {
                const res = await fetch('/api/sync', {
                    headers: { 'Accept': 'application/json' },
                    cache: 'no-cache'
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json && json.data) {
                        masterData = json.data;
                    }
                }
            } catch (err) {
                // Try production remote API if local is unreachable
                if (!masterData && window.location.hostname !== 'www.wizbangkabelitung.or.id' && window.location.hostname !== 'wizbangkabelitung.or.id') {
                    try {
                        const res = await fetch('https://www.wizbangkabelitung.or.id/api/sync', {
                            headers: { 'Accept': 'application/json' },
                            cache: 'no-cache'
                        });
                        if (res.ok) {
                            const json = await res.json();
                            if (json && json.data) masterData = json.data;
                        }
                    } catch(e) {}
                }
            }

            // 2. Secondary Fallback: Try static canonical snapshot if serverless is cold
            if (!masterData) {
                try {
                    const res = await fetch('assets/data/canonical-store.json', { cache: 'no-cache' });
                    if (res.ok) {
                        masterData = await res.json();
                    }
                } catch (e) {}
            }

            // 3. Third Fallback: Firestore Master Bundle
            if (!masterData && window.wizFirebase && window.wizFirebase.isConfigured()) {
                try {
                    const { data } = await window.wizFirebase.select('system_state');
                    const masterDoc = (data || []).find(d => d.id === 'master_bundle' || d.key === 'master_bundle');
                    if (masterDoc) masterData = masterDoc;
                } catch(e) {}
            }

            if (!masterData) {
                isSyncInProgress = false;
                return;
            }

            // Delete IDs sync
            if (Array.isArray(masterData.deleted_ids)) {
                masterData.deleted_ids.forEach(id => addDeletedId(id));
            }
            if (Array.isArray(masterData.deleted_news_ids)) {
                masterData.deleted_news_ids.forEach(id => addDeletedNewsId(id));
            }
            if (Array.isArray(masterData.deleted_disb_ids)) {
                masterData.deleted_disb_ids.forEach(id => addDeletedDisbId(id));
            }
            if (Array.isArray(masterData.deleted_ref_ids)) {
                masterData.deleted_ref_ids.forEach(id => addDeletedRefId(id));
            }

            const deletedSet = getDeletedIds();
            const deletedNewsSet = getDeletedNewsIds();
            const deletedDisbSet = getDeletedDisbIds();
            const deletedRefSet = getDeletedRefIds();

            function smartMerge(storeKey, cloudData, sortFn, activeDeletedSet = deletedSet) {
                if (!cloudData || !Array.isArray(cloudData)) return;
                const local = getStore(storeKey) || [];
                const map = new Map();

                // Load local first, skipping deleted
                local.forEach(item => {
                    if (!item) return;
                    const itemId = String(item.id || item.code || (item.name ? `${item.name}-${item.phone || ''}` : ''));
                    if (itemId && !activeDeletedSet.has(itemId) && item.status !== 'deleted' && !item.isDeleted) {
                        item.id = item.id || itemId;
                        map.set(itemId, item);
                    }
                });

                // Merge cloud data, checking timestamps
                cloudData.forEach(cloudItem => {
                    if (!cloudItem) return;
                    const strId = String(cloudItem.id || cloudItem.code || (cloudItem.name ? `${cloudItem.name}-${cloudItem.phone || ''}` : ''));
                    if (!strId || activeDeletedSet.has(strId) || cloudItem.status === 'deleted' || cloudItem.isDeleted) return;
                    cloudItem.id = cloudItem.id || strId;

                    const localItem = map.get(strId);
                    if (localItem) {
                        const cloudTime = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
                        const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
                        const mergedItem = cloudTime >= localTime ? { ...localItem, ...cloudItem } : { ...cloudItem, ...localItem };
                        if (localItem.imageUrl && localItem.imageUrl.startsWith('data:image')) {
                            mergedItem.imageUrl = localItem.imageUrl;
                        }
                        map.set(strId, mergedItem);
                    } else {
                        map.set(strId, cloudItem);
                    }
                });

                const merged = Array.from(map.values());
                if (sortFn) merged.sort(sortFn);
                setStore(storeKey, merged);
            }

            // Sync all collections
            if (masterData.donations) {
                smartMerge(STORAGE_KEYS.DONATIONS, masterData.donations, (a, b) => new Date(b.createdAt) - new Date(a.createdAt), deletedSet);
            }
            if (masterData.news) {
                smartMerge(STORAGE_KEYS.NEWS, masterData.news, (a, b) => new Date(b.eventDate || b.createdAt || 0) - new Date(a.eventDate || a.createdAt || 0), deletedNewsSet);
            }
            if (masterData.disbursements) {
                smartMerge(STORAGE_KEYS.DISBURSEMENTS, masterData.disbursements, (a, b) => new Date(b.disbursedAt || b.createdAt) - new Date(a.disbursedAt || a.createdAt), deletedDisbSet);
            }
            if (masterData.referrals) {
                smartMerge(STORAGE_KEYS.REFERRALS, masterData.referrals, (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0), deletedRefSet);
            }
            if (masterData.referral_payouts) {
                smartMerge(STORAGE_KEYS.REFERRAL_PAYOUTS, masterData.referral_payouts, (a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0));
            }
            if (masterData.site_settings && typeof masterData.site_settings === 'object') {
                const rawSettings = masterData.site_settings.value || masterData.site_settings;
                if (rawSettings && typeof rawSettings === 'object') {
                    const mergedSettings = { ...DEFAULT_SITE_SETTINGS, ...rawSettings };
                    setStore(STORAGE_KEYS.SITE_SETTINGS, mergedSettings);
                    window.dispatchEvent(new CustomEvent('wiz-site-settings-changed', { detail: mergedSettings }));
                }
            }
            if (masterData.site_images && typeof masterData.site_images === 'object') {
                setStore(STORAGE_KEYS.SITE_IMAGES, { ...DEFAULT_SITE_IMAGES, ...masterData.site_images });
                window.dispatchEvent(new CustomEvent('wiz-program-images-changed'));
            }
            if (masterData.custom_specific_programs && typeof masterData.custom_specific_programs === 'object' && Object.keys(masterData.custom_specific_programs).length > 0) {
                const existingMap = JSON.parse(localStorage.getItem('wiz_custom_specific_programs') || '{}');
                const mergedMap = { ...existingMap, ...masterData.custom_specific_programs };
                localStorage.setItem('wiz_custom_specific_programs', JSON.stringify(mergedMap));
            }
            if (masterData.specific_prog_imgs && typeof masterData.specific_prog_imgs === 'object') {
                const existingImgs = JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}');
                const mergedImgs = { ...masterData.specific_prog_imgs, ...existingImgs };
                localStorage.setItem('wiz_specific_prog_imgs', JSON.stringify(mergedImgs));
                window.dispatchEvent(new CustomEvent('wiz-program-images-changed'));
            }
            if (masterData.baselines && typeof masterData.baselines === 'object') {
                setStore(STORAGE_KEYS.BASELINES, masterData.baselines);
            }
            if (masterData.admin_users && Array.isArray(masterData.admin_users) && masterData.admin_users.length > 0) {
                smartMerge(STORAGE_KEYS.ADMIN_USERS, masterData.admin_users, null);
            }

            console.log('[WIZ Sync] Cross-device parity sync complete. News:', (getStore(STORAGE_KEYS.NEWS) || []).length, 'Donations:', (getStore(STORAGE_KEYS.DONATIONS) || []).length);
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        } catch (e) {
            console.warn('[WIZ Sync] Sync error, staying on local storage:', e);
        } finally {
            isSyncInProgress = false;
        }
    }

    async function fullBidirectionalSync() {
        try {
            await pushToCloud();
            await syncFromCloud(true);
            return {
                success: true,
                message: 'Sinkronisasi dua arah selesai! Seluruh data (HP & Laptop) sudah 100% konsisten dan identik.'
            };
        } catch (e) {
            return { success: false, message: `Gagal sinkronisasi: ${e.message}` };
        }
    }

    // ─── Baselines (Saldo Awal / Angka Historis) ──────────
    const baselines = {
        get() {
            const saved = getStore(STORAGE_KEYS.BASELINES);
            if (saved && saved.baseMasuk === 4207550000) {
                // Clear old mock baselines
                setStore(STORAGE_KEYS.BASELINES, DEFAULT_BASELINES);
                return DEFAULT_BASELINES;
            }
            return saved ? { ...DEFAULT_BASELINES, ...saved } : DEFAULT_BASELINES;
        },

        update(updates) {
            const current = this.get();
            const updated = {
                ...current,
                baseMasuk: Number(updates.baseMasuk) || current.baseMasuk,
                baseTersalurkan: Number(updates.baseTersalurkan) || current.baseTersalurkan,
                baseDonatur: Number(updates.baseDonatur) || current.baseDonatur
            };
            setStore(STORAGE_KEYS.BASELINES, updated);
            activityLog.add('baseline', `Angka Saldo Awal / Baseline Keuangan diperbarui.`, 'Admin');
            return updated;
        }
    };

    // Helper: Map program name to its 5 Berkah Pillar
    function mapProgramToPillar(progName, catName) {
        if (catName && catName !== '-' && catName.includes('Berkah')) return catName;
        const p = (progName || '').toLowerCase();
        if (p.includes('markaz') || p.includes('tahfidz') || p.includes('dirosa') || p.includes('dakwah') || p.includes('dai') || p.includes('celengan') || p.includes('jenazah') || p.includes('poster') || p.includes('kantor') || p.includes('muker') || p.includes('kendaraan') || p.includes('mualaf') || p.includes('tabligh') || p.includes('public speaking')) return 'Berkah Hidayah';
        if (p.includes('beasiswa') || p.includes('pendidikan') || p.includes('belajar') || p.includes('juara') || p.includes('perlengkapan')) return 'Berkah Juara';
        if (p.includes('sembako') || p.includes('yatim') || p.includes('beras') || p.includes('jumat') || p.includes('iftar') || p.includes('qur\'an') || p.includes('guru ngaji') || p.includes('air') || p.includes('peduli')) return 'Berkah Peduli';
        if (p.includes('sehat') || p.includes('khitan') || p.includes('ambulance') || p.includes('pengobatan')) return 'Berkah Sehat';
        if (p.includes('mandiri') || p.includes('modal') || p.includes('usaha') || p.includes('wirausaha') || p.includes('umkm')) return 'Berkah Mandiri';
        return 'Berkah Hidayah';
    }

    // ─── Donations Module ─────────────────────────────────
    const donations = {
        getAll() {
            const deletedSet = getDeletedIds();
            const raw = getStore(STORAGE_KEYS.DONATIONS) || [];
            return raw
                .filter(d => d && d.id && !deletedSet.has(String(d.id)) && d.status !== 'deleted' && !d.isDeleted)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        },

        getPending() {
            return this.getAll().filter(d => d.status === 'pending');
        },

        getVerified() {
            return this.getAll().filter(d => d.status === 'verified');
        },

        getById(id) {
            return this.getAll().find(d => String(d.id) === String(id)) || null;
        },

        /**
         * Filter donasi berdasarkan wilayah, jenis, dan/atau programUtama.
         * Gunakan 'Semua' atau null/undefined untuk semua data.
         */
        getFiltered({ wilayah, type, programUtama, status } = {}) {
            let list = this.getAll();
            if (wilayah && wilayah !== 'Semua') list = list.filter(d => d.wilayah === wilayah);
            if (type && type !== 'Semua') list = list.filter(d => d.type === type);
            if (programUtama && programUtama !== 'Semua') list = list.filter(d => d.programUtama === programUtama || d.category === programUtama);
            if (status && status !== 'Semua') list = list.filter(d => d.status === status);
            return list;
        },

        async add(donation) {
            const list = this.getAll();

            // Hitung alokasi internal
            let alokasiOperasional = 0;
            let alokasiProgram = 0;
            if (donation.type === 'Infak Terikat') {
                const alloc = calcInfakTerikatAllocation(Number(donation.amount) || 0);
                alokasiOperasional = alloc.alokasiOperasional;
                alokasiProgram = alloc.alokasiProgram;
            }

            const programSpesifik = donation.programSpesifik || donation.program || '-';
            const programUtama = donation.programUtama || mapProgramToPillar(programSpesifik, donation.category) || '-';

            const donationAmount = Number(donation.amount) || 0;
            const refRate = donation.referralRate !== undefined ? Number(donation.referralRate) : 6;
            const refFee = donation.referralId ? (donation.referralFee !== undefined ? Number(donation.referralFee) : Math.round(donationAmount * (refRate / 100))) : 0;
            const addBonus = Number(donation.additionalBonus) || 0;

            const newDonation = {
                id: donation.id || generateId(),
                donorName: donation.donorName || 'Hamba Allah',
                donorPhone: donation.donorPhone || '-',
                donorEmail: donation.donorEmail || '',
                // Fields baru
                wilayah: donation.wilayah || '-',
                programUtama,
                programSpesifik,
                alokasiOperasional,
                alokasiProgram,
                // Referal / Perantara
                referralId: donation.referralId || null,
                referralRate: refRate,
                referralFee: refFee,
                additionalBonus: addBonus,
                // Legacy (agar kompatibel dengan render yang sudah ada)
                program: programSpesifik,
                category: programUtama,
                type: donation.type || 'Infak Terikat',
                amount: donationAmount,
                method: donation.method || 'Transfer Bank / WA',
                notes: donation.notes || '-',
                status: donation.status || 'pending',
                createdAt: new Date().toISOString(),
                verifiedAt: donation.status === 'verified' ? new Date().toISOString() : null,
                verifiedBy: donation.status === 'verified' ? (donation.verifiedBy || 'Admin') : null
            };

            list.unshift(newDonation);
            setStore(STORAGE_KEYS.DONATIONS, list);

            const wilayahLabel = newDonation.wilayah !== '-' ? ` [${newDonation.wilayah}]` : '';
            const msgStatus = newDonation.status === 'verified' ? 'langsung diverifikasi' : 'menunggu verifikasi';
            activityLog.add('donation_in', `Donasi ${formatRupiahCompact(newDonation.amount)} dari ${newDonation.donorName}${wilayahLabel} (${msgStatus}).`, donation.verifiedBy || 'Admin');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.insert('donations', newDonation);
            }

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return newDonation;
        },

        async update(id, updates) {
            const list = this.getAll();
            const idx = list.findIndex(d => String(d.id) === String(id));
            if (idx === -1) return null;

            const programSpesifik = updates.programSpesifik || updates.program || list[idx].programSpesifik || '-';
            const programUtama = updates.programUtama || mapProgramToPillar(programSpesifik, updates.category) || list[idx].programUtama || '-';

            // Recalculate allocations if type or amount changes
            let alokasiOperasional = list[idx].alokasiOperasional || 0;
            let alokasiProgram = list[idx].alokasiProgram || 0;
            const newType = updates.type || list[idx].type;
            const newAmount = Number(updates.amount) || list[idx].amount;
            if (newType === 'Infak Terikat') {
                const alloc = calcInfakTerikatAllocation(newAmount);
                alokasiOperasional = alloc.alokasiOperasional;
                alokasiProgram = alloc.alokasiProgram;
            } else {
                alokasiOperasional = 0;
                alokasiProgram = 0;
            }

            const refId = updates.referralId !== undefined ? updates.referralId : (list[idx].referralId || null);
            const refRate = updates.referralRate !== undefined ? Number(updates.referralRate) : (list[idx].referralRate || 6);
            const refFee = refId ? (updates.referralFee !== undefined ? Number(updates.referralFee) : Math.round(newAmount * (refRate / 100))) : 0;
            const addBonus = updates.additionalBonus !== undefined ? Number(updates.additionalBonus) : (list[idx].additionalBonus || 0);

            list[idx] = {
                ...list[idx],
                ...updates,
                wilayah: updates.wilayah || list[idx].wilayah,
                programUtama,
                programSpesifik,
                alokasiOperasional,
                alokasiProgram,
                referralId: refId,
                referralRate: refRate,
                referralFee: refFee,
                additionalBonus: addBonus,
                program: programSpesifik,
                category: programUtama,
                amount: newAmount
            };
            setStore(STORAGE_KEYS.DONATIONS, list);

            activityLog.add('donation_edit', `Data donasi ${list[idx].donorName} (${formatRupiahCompact(list[idx].amount)}) diperbarui.`, 'Admin');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.update('donations', id, list[idx]);
            }

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return list[idx];
        },

        async verify(donationId, adminName) {
            const list = this.getAll();
            const idx = list.findIndex(d => String(d.id) === String(donationId));
            if (idx === -1) return null;

            list[idx].status = 'verified';
            list[idx].verifiedAt = new Date().toISOString();
            list[idx].verifiedBy = adminName || 'Admin';
            setStore(STORAGE_KEYS.DONATIONS, list);

            activityLog.add('verification', `Donasi ${formatRupiahCompact(list[idx].amount)} dari ${list[idx].donorName} berhasil diverifikasi.`, adminName || 'Admin');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.update('donations', donationId, {
                    status: 'verified',
                    verifiedAt: list[idx].verifiedAt,
                    verifiedBy: list[idx].verifiedBy
                });
            }

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return list[idx];
        },

        async reject(donationId, adminName) {
            const list = this.getAll();
            const idx = list.findIndex(d => String(d.id) === String(donationId));
            if (idx === -1) return null;

            list[idx].status = 'rejected';
            list[idx].rejectedAt = new Date().toISOString();
            list[idx].rejectedBy = adminName || 'Admin';
            setStore(STORAGE_KEYS.DONATIONS, list);

            activityLog.add('rejection', `Donasi ${formatRupiahCompact(list[idx].amount)} dari ${list[idx].donorName} ditolak.`, adminName || 'Admin');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.update('donations', donationId, {
                    status: 'rejected',
                    rejectedAt: list[idx].rejectedAt,
                    rejectedBy: list[idx].rejectedBy
                });
            }

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return list[idx];
        },

        async delete(donationId) {
            if (!donationId) return;
            const strId = String(donationId);
            addDeletedId(strId);

            const rawList = getStore(STORAGE_KEYS.DONATIONS) || [];
            const item = rawList.find(d => String(d.id) === strId);
            const filtered = rawList.filter(d => String(d.id) !== strId);
            setStore(STORAGE_KEYS.DONATIONS, filtered);

            if (item) {
                activityLog.add('donation_delete', `Data donasi ${item.donorName} (${formatRupiahCompact(item.amount)}) dihapus.`, 'Admin');
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.remove('donations', strId);
                await window.wizFirebase.upsert('deleted_ids', { key: strId, deletedAt: new Date().toISOString() });
            }

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        },

        count() { return this.getVerified().length; },
        countPending() { return this.getPending().length; }
    };

    // ─── News Module ──────────────────────────────────────
    const news = {
        getAll() {
            const deletedSet = getDeletedNewsIds();
            const raw = getStore(STORAGE_KEYS.NEWS) || [];
            return raw
                .filter(n => n && n.id && !deletedSet.has(String(n.id)) && n.status !== 'deleted' && !n.isDeleted)
                .sort((a, b) => {
                    const timeA = new Date(a.eventDate || a.event_date || a.createdAt || 0).getTime();
                    const timeB = new Date(b.eventDate || b.event_date || b.createdAt || 0).getTime();
                    return timeB - timeA;
                });
        },

        getPublished() {
            return this.getAll().filter(n => n.status === 'published');
        },

        getDrafts() {
            return this.getAll().filter(n => n.status === 'draft');
        },

        getById(articleId) {
            return this.getAll().find(n => String(n.id) === String(articleId)) || null;
        },

        async add(article) {
            const list = getStore(STORAGE_KEYS.NEWS) || [];
            const defaultImg = 'assets/images/sedekah-beras-dhuafa.jpg';
            const authorName = (article.author || sessionStorage.getItem('wiz_admin_name') || sessionStorage.getItem('wiz_admin_user') || 'Admin WIZ Babel').trim();
            const newArticle = {
                id: article.id || generateId(),
                title: (article.title || '').trim(),
                category: article.category || 'Kegiatan & Event',
                content: (article.content || '').trim(),
                imageUrl: (article.imageUrl || '').trim() || defaultImg,
                gallery: Array.isArray(article.gallery) ? article.gallery.filter(Boolean) : [],
                eventDate: article.eventDate || new Date().toISOString(),
                status: article.status || 'published',
                author: authorName,
                createdAt: new Date().toISOString()
            };
            list.unshift(newArticle);
            list.sort((a, b) => new Date(b.eventDate || b.event_date || b.createdAt || 0) - new Date(a.eventDate || a.event_date || a.createdAt || 0));
            setStore(STORAGE_KEYS.NEWS, list);

            const statusLabel = newArticle.status === 'published' ? 'dipublikasikan' : 'disimpan sebagai draft';
            activityLog.add('news', `Berita "${newArticle.title}" ${statusLabel}.`, authorName);

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.insert('news', newArticle);
            }

            broadcastSync('NEWS_ADDED', newArticle);
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return newArticle;
        },

        async update(articleId, updates) {
            const list = getStore(STORAGE_KEYS.NEWS) || [];
            const idx = list.findIndex(n => String(n.id) === String(articleId));
            if (idx === -1) return null;

            const authorName = (updates.author || list[idx].author || sessionStorage.getItem('wiz_admin_name') || 'Admin WIZ Babel').trim();
            const cleanGallery = Array.isArray(updates.gallery) ? updates.gallery.filter(Boolean) : (list[idx].gallery || []);

            list[idx] = { 
                ...list[idx], 
                ...updates, 
                author: authorName,
                gallery: cleanGallery,
                updatedAt: new Date().toISOString() 
            };
            list.sort((a, b) => new Date(b.eventDate || b.event_date || b.createdAt || 0) - new Date(a.eventDate || a.event_date || a.createdAt || 0));
            setStore(STORAGE_KEYS.NEWS, list);

            activityLog.add('news', `Berita "${list[idx].title}" diperbarui.`, authorName);

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.set('news', articleId, list[idx]);
            }

            broadcastSync('NEWS_UPDATED', list[idx]);
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return list[idx];
        },

        async toggleStatus(articleId) {
            const article = this.getById(articleId);
            if (!article) return null;
            const newStatus = article.status === 'published' ? 'draft' : 'published';
            return await this.update(articleId, { status: newStatus });
        },

        async delete(articleId) {
            if (!articleId) return;
            const strId = String(articleId);
            addDeletedNewsId(strId);

            const rawList = getStore(STORAGE_KEYS.NEWS) || [];
            const article = rawList.find(n => String(n.id) === strId);
            const filtered = rawList.filter(n => String(n.id) !== strId);
            setStore(STORAGE_KEYS.NEWS, filtered);

            if (article) {
                activityLog.add('news', `Berita "${article.title}" dihapus.`, sessionStorage.getItem('wiz_admin_name') || 'Admin');
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.remove('news', strId);
                await window.wizFirebase.upsert('deleted_news_ids', { key: strId, deletedAt: new Date().toISOString() });
            }

            broadcastSync('NEWS_DELETED', { id: strId });
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        }
    };

    // ─── Disbursements (Penyaluran Dana) Module ──────────
    const disbursements = {
        getAll() {
            const deletedSet = getDeletedDisbIds();
            const raw = getStore(STORAGE_KEYS.DISBURSEMENTS) || [];
            return raw
                .filter(d => d && d.id && !deletedSet.has(String(d.id)) && d.status !== 'deleted' && !d.isDeleted)
                .sort((a, b) => new Date(b.disbursedAt) - new Date(a.disbursedAt));
        },

        getById(id) {
            return this.getAll().find(d => String(d.id) === String(id)) || null;
        },

        async add(data) {
            const list = this.getAll();
            const newDisb = {
                id: data.id || generateId(),
                wilayah: data.wilayah || 'Pangkalpinang',
                program: data.program,
                amount: Number(data.amount) || 0,
                description: data.description || '',
                disbursedAt: data.disbursedAt || new Date().toISOString(),
                recordedBy: data.recordedBy || 'Admin',
                createdAt: new Date().toISOString()
            };
            list.unshift(newDisb);
            setStore(STORAGE_KEYS.DISBURSEMENTS, list);

            activityLog.add('disbursement', `Penyaluran dana ${formatRupiahCompact(newDisb.amount)} (${newDisb.wilayah}) untuk "${newDisb.program}" dicatat.`, newDisb.recordedBy);

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.insert('disbursements', newDisb);
            }

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return newDisb;
        },

        async update(id, updates) {
            const list = this.getAll();
            const idx = list.findIndex(d => String(d.id) === String(id));
            if (idx === -1) return null;

            list[idx] = { ...list[idx], ...updates, amount: Number(updates.amount) || list[idx].amount, updatedAt: new Date().toISOString() };
            setStore(STORAGE_KEYS.DISBURSEMENTS, list);

            activityLog.add('disbursement', `Penyaluran dana untuk "${list[idx].program}" diperbarui.`, updates.recordedBy || 'Admin');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.set('disbursements', id, list[idx]);
            }

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return list[idx];
        },

        async delete(id) {
            if (!id) return;
            const strId = String(id);
            addDeletedDisbId(strId);

            const rawList = getStore(STORAGE_KEYS.DISBURSEMENTS) || [];
            const item = rawList.find(d => String(d.id) === strId);
            const filtered = rawList.filter(d => String(d.id) !== strId);
            setStore(STORAGE_KEYS.DISBURSEMENTS, filtered);

            if (item) {
                activityLog.add('disbursement', `Catatan penyaluran dana "${item.program}" (${formatRupiahCompact(item.amount)}) dihapus.`, 'Admin');
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.remove('disbursements', strId);
                await window.wizFirebase.upsert('deleted_disb_ids', { key: strId, deletedAt: new Date().toISOString() });
            }

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        }
    };

    // ─── Finance Module (Real calculations) ──────────────
    const finance = {
        getTotalDanaMasuk(wilayah) {
            let verified = donations.getVerified();
            if (wilayah && wilayah !== 'Semua') verified = verified.filter(d => d.wilayah === wilayah);
            const base = wilayah && wilayah !== 'Semua' ? 0 : baselines.get().baseMasuk;
            return base + verified.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        },

        getTotalTersalurkan(wilayah) {
            let list = disbursements.getAll();
            if (wilayah && wilayah !== 'Semua') {
                list = list.filter(d => (d.wilayah || 'Pangkalpinang') === wilayah);
            }
            const base = wilayah && wilayah !== 'Semua' ? 0 : baselines.get().baseTersalurkan;
            return base + list.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        },

        getSaldo(wilayah) {
            return this.getTotalDanaMasuk(wilayah) - this.getTotalTersalurkan(wilayah);
        },

        getTotalDonatur(wilayah) {
            let verified = donations.getVerified();
            if (wilayah && wilayah !== 'Semua') verified = verified.filter(d => d.wilayah === wilayah);
            const uniqueDonors = new Set(verified.map(d => (d.donorName + (d.donorPhone || '')).toLowerCase()));
            const base = wilayah && wilayah !== 'Semua' ? 0 : baselines.get().baseDonatur;
            return base + uniqueDonors.size;
        },

        getSpecificProgramStats(programName, defaultBase, defaultTarget) {
            const verified = donations.getVerified();
            const disbList = disbursements.getAll();
            const pLower = (programName || '').toLowerCase().trim();

            const addedMasuk = verified.reduce((sum, d) => {
                if (d.type === 'Infak Umum') {
                    const wRules = ALLOCATION_RULES[d.wilayah || 'Pangkalpinang'];
                    if (wRules && wRules.mainAllocation) {
                        const pillar = mapProgramToPillar(programName);
                        const mainItem = wRules.mainAllocation.find(i => i.key === pillar);
                        if (mainItem) {
                            const pillarAmount = (Number(d.amount) || 0) * (mainItem.percent / 100);
                            const subRule = wRules.subAllocation && wRules.subAllocation[pillar];
                            if (subRule && subRule.items && subRule.items.length > 0) {
                                const subItem = subRule.items.find(si => {
                                    const siLower = si.key.toLowerCase();
                                    return pLower.includes(siLower) || siLower.includes(pLower);
                                });
                                if (subItem) {
                                    return sum + (pillarAmount * (subItem.percent / 100));
                                }
                            }
                            if (pLower.includes(pillar.toLowerCase()) || pillar.toLowerCase().includes(pLower)) {
                                return sum + pillarAmount;
                            }
                        }
                    }
                } else {
                    const dProg = (d.programSpesifik || d.program || '').toLowerCase();
                    const dCat = (d.programUtama || d.category || '').toLowerCase();
                    if (dProg && (dProg.includes(pLower) || pLower.includes(dProg))) {
                        return sum + (Number(d.amount) || 0);
                    }
                    if (dCat && (dCat.includes(pLower) || pLower.includes(dCat))) {
                        return sum + (Number(d.amount) || 0);
                    }
                }
                return sum;
            }, 0);

            const addedSalur = disbList.reduce((sum, db) => {
                const dbProg = (db.program || '').toLowerCase();
                if (dbProg && (dbProg.includes(pLower) || pLower.includes(dbProg))) {
                    return sum + (Number(db.amount) || 0);
                }
                return sum;
            }, 0);

            const base = Number(defaultBase) || 0;
            const target = Number(defaultTarget) || 1000000;
            const totalTerkumpul = base + addedMasuk;
            const sisaSaldo = totalTerkumpul - addedSalur;
            const percent = target > 0 ? Math.min(100, Math.round((totalTerkumpul / target) * 100)) : 0;

            return {
                terkumpul: totalTerkumpul,
                tersalurkan: addedSalur,
                saldo: Math.max(0, sisaSaldo),
                target: target,
                percent: percent
            };
        },

        getPerProgram(wilayah) {
            let verified = donations.getVerified();
            const disbList = disbursements.getAll();

            if (wilayah && wilayah !== 'Semua') {
                verified = verified.filter(d => d.wilayah === wilayah);
            }

            const programConfigs = {
                // Berkah Hidayah (Dakwah): Pembangunan Markaz ×2 (Rp1.002.000.000 ×2) + program dakwah lainnya
                // Markaz: 2.004.000.000 | Tabligh Akbar: 16.400.000 | Dirosa: 6.700.000 | Jenazah: 4.200.000
                // Daurah: 11.700.000 | Tahfidz: 2.880.000 | Rumah Qur'an: 119.620.000
                // Public Speaking: 4.200.000 | Motor Dai: 5.000.000 | Beras Dai: 30.000.000
                'Berkah Hidayah': { label: 'WIZ Berkah Hidayah (Dakwah & Pembinaan)', target: 2204700000, baseMasuk: 0, baseSalur: 0 },
                // Berkah Peduli (Sosial): Sembako+Beras+Jumat+Yatim+Iftar Nusantara
                // 28.800.000 + 15.000.000 + 54.000.000 + 17.500.000 + 112.500.000
                'Berkah Peduli': { label: 'WIZ Berkah Peduli (Sosial & Kemanusiaan)', target: 227800000, baseMasuk: 0, baseSalur: 0 },
                // Berkah Juara (Pendidikan): Beasiswa + Tebar Alat Sekolah
                // 300.000.000 + 54.390.000
                'Berkah Juara': { label: 'WIZ Berkah Juara (Pendidikan & Beasiswa)', target: 354390000, baseMasuk: 0, baseSalur: 0 },
                // Berkah Sehat (Kesehatan): Khitanan + Pengobatan Dhuafa
                // 15.450.000 + 50.000.000
                'Berkah Sehat': { label: 'WIZ Berkah Sehat (Kesehatan & Ambulance)', target: 65450000, baseMasuk: 0, baseSalur: 0 },
                // Berkah Mandiri (Ekonomi): Modal Usaha Mikro + estimasi pelatihan wirausaha
                // 60.500.000 + realistis program lainnya
                'Berkah Mandiri': { label: 'WIZ Berkah Mandiri (Ekonomi & Pemberdayaan)', target: 100500000, baseMasuk: 0, baseSalur: 0 },
            };

            const dynamicMasuk = {};
            const dynamicSalur = {};

            Object.keys(programConfigs).forEach(key => {
                dynamicMasuk[key] = 0;
                dynamicSalur[key] = 0;
            });

            verified.forEach(d => {
                if (d.type === 'Infak Umum') {
                    const wRules = ALLOCATION_RULES[d.wilayah || 'Pangkalpinang'];
                    if (wRules && wRules.mainAllocation) {
                        wRules.mainAllocation.forEach(item => {
                            if (dynamicMasuk[item.key] !== undefined) {
                                dynamicMasuk[item.key] += (Number(d.amount) || 0) * (item.percent / 100);
                            }
                        });
                    }
                } else {
                    const pillar = mapProgramToPillar(d.programSpesifik || d.program, d.programUtama || d.category);
                    if (dynamicMasuk[pillar] !== undefined) {
                        dynamicMasuk[pillar] += Number(d.amount) || 0;
                    }
                }
            });

            disbList.forEach(db => {
                if (wilayah && wilayah !== 'Semua' && (db.wilayah || 'Pangkalpinang') !== wilayah) return;
                const pillar = mapProgramToPillar(db.program);
                if (dynamicSalur[pillar] !== undefined) {
                    dynamicSalur[pillar] += Number(db.amount) || 0;
                }
            });

            return Object.entries(programConfigs).map(([key, cfg]) => {
                const totalMasuk = cfg.baseMasuk + dynamicMasuk[key];
                const totalSalur = cfg.baseSalur + dynamicSalur[key];
                const saldo = totalMasuk - totalSalur;
                const percent = cfg.target > 0 ? Math.min(100, Math.round((totalMasuk / cfg.target) * 100)) : 0;

                let status = 'Aktif Disalurkan';
                let statusClass = 'bg-emerald-100 text-emerald-800';
                if (saldo <= 0) {
                    status = '100% Disalurkan';
                    statusClass = 'bg-blue-100 text-blue-800';
                }

                return {
                    key,
                    label: cfg.label,
                    masuk: totalMasuk,
                    tersalurkan: totalSalur,
                    saldo: Math.max(0, saldo),
                    target: cfg.target,
                    percent,
                    status,
                    statusClass
                };
            });
        },

        getPerSpecificProgram(wilayah) {
            let verified = donations.getVerified();
            const disbList = disbursements.getAll();

            if (wilayah && wilayah !== 'Semua') {
                verified = verified.filter(d => d.wilayah === wilayah);
            }

            const ruleData = allocationRulesManager.getAll();
            const targetWilayahs = (wilayah && wilayah !== 'Semua') ? [wilayah] : Object.keys(ruleData);

            const specificItemsMap = new Map();

            // Gather all specific programs configured per wilayah
            targetWilayahs.forEach(wKey => {
                const wObj = ruleData[wKey];
                if (!wObj || !wObj.subAllocation) return;

                const mainAllocMap = new Map();
                (wObj.mainAllocation || []).forEach(m => mainAllocMap.set(m.key, m.percent || 0));

                Object.entries(wObj.subAllocation).forEach(([pillarKey, subObj]) => {
                    const mainPct = mainAllocMap.get(pillarKey) || 0;
                    const items = subObj && subObj.items ? subObj.items : [];

                    items.forEach(item => {
                        const itemKey = item.key;
                        const fullName = `${pillarKey} - ${itemKey}`;
                        const displayLabel = `WIZ ${pillarKey} (${itemKey})`;
                        
                        if (!specificItemsMap.has(fullName)) {
                            const dynamicImg = item.image || (allocationRulesManager ? allocationRulesManager.getSpecificProgramImage(item.key, pillarKey) : '') || '';
                            specificItemsMap.set(fullName, {
                                fullName,
                                displayLabel,
                                pillarKey,
                                itemKey,
                                subPercent: item.percent || 0,
                                mainPercent: mainPct,
                                image: dynamicImg,
                                masuk: 0,
                                tersalurkan: 0
                            });
                        }
                    });
                });
            });

            // 1. Calculate Dana Masuk per Specific Program
            verified.forEach(d => {
                const dWilayah = d.wilayah || 'Pangkalpinang';
                if (wilayah && wilayah !== 'Semua' && dWilayah !== wilayah) return;

                if (d.type === 'Infak Umum') {
                    const wObj = ruleData[dWilayah];
                    if (wObj && wObj.mainAllocation && wObj.subAllocation) {
                        const mainAllocMap = new Map();
                        wObj.mainAllocation.forEach(m => mainAllocMap.set(m.key, m.percent || 0));

                        Object.entries(wObj.subAllocation).forEach(([pillarKey, subObj]) => {
                            const mainPct = mainAllocMap.get(pillarKey) || 0;
                            const pillarMasuk = (Number(d.amount) || 0) * (mainPct / 100);

                            const items = subObj && subObj.items ? subObj.items : [];
                            items.forEach(item => {
                                const fullName = `${pillarKey} - ${item.key}`;
                                const allocated = pillarMasuk * ((item.percent || 0) / 100);
                                if (specificItemsMap.has(fullName)) {
                                    specificItemsMap.get(fullName).masuk += allocated;
                                }
                            });
                        });
                    }
                } else {
                    const dProg = (d.programSpesifik || d.program || '').trim();
                    const dLower = dProg.toLowerCase();

                    for (const [fullName, spObj] of specificItemsMap.entries()) {
                        const keyLower = spObj.itemKey.toLowerCase();
                        const fullLower = fullName.toLowerCase();

                        if (dLower && (dLower === keyLower || dLower.includes(keyLower) || keyLower.includes(dLower) || fullLower.includes(dLower))) {
                            spObj.masuk += Number(d.amount) || 0;
                            break;
                        }
                    }
                }
            });

            // 2. Calculate Dana Tersalurkan per Specific Program (Disbursements)
            disbList.forEach(db => {
                if (wilayah && wilayah !== 'Semua' && (db.wilayah || 'Pangkalpinang') !== wilayah) return;
                const dbProg = (db.program || '').trim();
                const dbLower = dbProg.toLowerCase();

                let matched = false;
                for (const [fullName, spObj] of specificItemsMap.entries()) {
                    const keyLower = spObj.itemKey.toLowerCase();
                    const fullLower = fullName.toLowerCase();

                    if (dbLower === keyLower || dbLower === fullLower || dbLower.includes(keyLower) || keyLower.includes(dbLower)) {
                        spObj.tersalurkan += Number(db.amount) || 0;
                        matched = true;
                        break;
                    }
                }

                if (!matched) {
                    const pillar = mapProgramToPillar(dbProg);
                    for (const [fullName, spObj] of specificItemsMap.entries()) {
                        if (spObj.pillarKey === pillar) {
                            spObj.tersalurkan += Number(db.amount) || 0;
                            break;
                        }
                    }
                }
            });

            // Format results
            return Array.from(specificItemsMap.values()).map(sp => {
                const totalMasuk = Math.round(sp.masuk);
                const totalSalur = Math.round(sp.tersalurkan);
                const saldo = Math.max(0, totalMasuk - totalSalur);
                let status = 'Aktif Disalurkan';
                let statusClass = 'bg-emerald-100 text-emerald-800';
                if (saldo <= 0 && totalSalur > 0) {
                    status = '100% Disalurkan';
                    statusClass = 'bg-blue-100 text-blue-800';
                }

                return {
                    fullName: sp.fullName,
                    displayLabel: sp.displayLabel,
                    pillarKey: sp.pillarKey,
                    itemKey: sp.itemKey,
                    subPercent: sp.subPercent,
                    mainPercent: sp.mainPercent,
                    image: sp.image,
                    masuk: totalMasuk,
                    tersalurkan: totalSalur,
                    saldo: saldo,
                    status: status,
                    statusClass: statusClass
                };
            });
        },

        getOverviewStats(wilayah) {
            return {
                totalMasuk: this.getTotalDanaMasuk(wilayah),
                totalTersalurkan: this.getTotalTersalurkan(wilayah),
                saldo: this.getSaldo(wilayah),
                totalDonatur: this.getTotalDonatur(wilayah),
                lastUpdate: new Date().toISOString()
            };
        }
    };

    // ─── Referrals (Hak 6% Perantara) Module ────────────────
    const referrals = {
        getAll() {
            const deletedSet = getDeletedRefIds();
            const rawList = (getStore(STORAGE_KEYS.REFERRALS) || []).filter(r => r && (r.id || r.code || r.name) && !deletedSet.has(String(r.id || r.code)) && r.status !== 'deleted' && !r.isDeleted);
            const allDonations = getStore(STORAGE_KEYS.DONATIONS) || [];
            const allPayouts = getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || [];

            return rawList.map(ref => {
                const refId = String(ref.id || ref.code || '');
                const refCode = String(ref.code || ref.id || '');
                const refDonations = allDonations.filter(d => {
                    const dRefId = String(d.referralId || '');
                    return dRefId && (dRefId === refId || dRefId.toLowerCase() === refCode.toLowerCase());
                });
                const refPayouts = allPayouts.filter(p => {
                    const pRefId = String(p.referralId || '');
                    return pRefId && (pRefId === refId || pRefId.toLowerCase() === refCode.toLowerCase());
                });

                const donationsCount = refDonations.length;
                const totalDonationAmount = refDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
                const totalFee6Percent = refDonations.reduce((sum, d) => {
                    const rate = d.referralRate !== undefined ? Number(d.referralRate) : Number(ref.defaultRate || 6);
                    const fee = d.referralFee !== undefined ? Number(d.referralFee) : Math.round((Number(d.amount) || 0) * (rate / 100));
                    return sum + fee;
                }, 0);
                const totalAdditionalBonus = refDonations.reduce((sum, d) => sum + (Number(d.additionalBonus) || 0), 0);
                const totalEarned = totalFee6Percent + totalAdditionalBonus;
                const totalPaid = refPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const pendingBalance = Math.max(0, totalEarned - totalPaid);

                return {
                    ...ref,
                    id: refId,
                    code: refCode,
                    donationsCount,
                    totalDonationAmount,
                    totalFee6Percent,
                    totalAdditionalBonus,
                    totalEarned,
                    totalPaid,
                    pendingBalance
                };
            }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        },

        getById(id) {
            const all = this.getAll();
            const ref = all.find(r => String(r.id) === String(id) || (r.code && String(r.code).toLowerCase() === String(id).toLowerCase()));
            if (!ref) return null;

            const allDonations = (getStore(STORAGE_KEYS.DONATIONS) || []).filter(d => String(d.referralId) === String(ref.id));
            const allPayouts = (getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || []).filter(p => String(p.referralId) === String(ref.id)).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));

            return {
                ...ref,
                donations: allDonations,
                payouts: allPayouts
            };
        },

        getByCodeOrId(identifier) {
            if (!identifier) return null;
            const clean = String(identifier).trim().toLowerCase();
            const all = this.getAll();
            return all.find(r => 
                String(r.id).toLowerCase() === clean || 
                (r.code && String(r.code).toLowerCase() === clean) ||
                (r.phone && r.phone.replace(/\D/g,'') === clean.replace(/\D/g,'') && clean.length > 5)
            ) || null;
        },

        async registerPublic({ name, phone, bankName, accountNumber, accountHolder, pin }) {
            const cleanName = (name || '').trim();
            const cleanPhone = (phone || '').trim();
            const cleanPin = (pin || '').trim() || cleanPhone.slice(-4) || '1234';

            if (!cleanName || !cleanPhone) {
                return { success: false, message: 'Nama Lengkap & No. WhatsApp wajib diisi.' };
            }

            // Check if phone or name already exists
            const existing = this.getAll().find(r => 
                (r.phone && r.phone.replace(/\D/g,'') === cleanPhone.replace(/\D/g,'') && cleanPhone.length > 5) ||
                (r.name && r.name.toLowerCase() === cleanName.toLowerCase())
            );

            if (existing) {
                // If existing, update bank account, pin, and profile details
                const updates = {
                    bankName: (bankName || existing.bankName || '-').trim(),
                    accountNumber: (accountNumber || existing.accountNumber || '-').trim(),
                    accountHolder: (accountHolder || existing.accountHolder || cleanName).trim()
                };
                if (pin && pin.trim()) updates.pin = cleanPin;

                const updatedRef = await this.update(existing.id, updates);
                const resultRef = updatedRef || { ...existing, ...updates };
                broadcastSync('UPDATE_REFERRAL', resultRef);
                return { success: true, isExisting: true, referral: resultRef, message: 'Akun Affiliate Anda telah aktif & data terhubung ke Web Admin!' };
            }

            const autoId = this.generateAffiliateId(new Date());
            const newRef = await this.add({
                id: autoId,
                code: autoId,
                name: cleanName,
                phone: cleanPhone,
                bankName: (bankName || '-').trim(),
                accountNumber: (accountNumber || '-').trim(),
                accountHolder: (accountHolder || cleanName).trim(),
                defaultRate: 6,
                pin: cleanPin,
                status: 'active',
                notes: 'Pendaftaran Affiliate Publik via website',
                createdBy: 'Publik (Pendaftaran Online)'
            });

            return { success: true, isExisting: false, referral: newRef, message: 'Pendaftaran Affiliate/Perantara Kebaikan berhasil!' };
        },

        login({ identifier, pin }) {
            if (!identifier) return { success: false, message: 'Masukkan No. WhatsApp atau Kode Referral.' };
            const ref = this.getByCodeOrId(identifier);
            if (!ref) {
                return { success: false, message: 'Akun Affiliate tidak ditemukan. Silakan mendaftar terlebih dahulu.' };
            }

            const inputPin = (pin || '').trim();
            const actualPin = (ref.pin || '').trim() || ref.phone.slice(-4) || '1234';

            if (inputPin && actualPin && inputPin !== actualPin) {
                return { success: false, message: 'PIN/Password yang Anda masukkan salah.' };
            }

            return { success: true, referral: ref, message: 'Login berhasil!' };
        },

        recoverPin(identifier) {
            if (!identifier) return { success: false, message: 'Masukkan No. WhatsApp atau Kode Referral Anda.' };
            const ref = this.getByCodeOrId(identifier);
            if (!ref) {
                return { success: false, message: 'Akun Affiliate tidak ditemukan. Silakan periksa kembali No. WhatsApp atau Kode Anda.' };
            }

            const pinVal = ref.pin || (ref.phone ? ref.phone.slice(-4) : '1234');
            let phoneClean = (ref.phone || '').replace(/\D/g, '');
            if (phoneClean.startsWith('0')) phoneClean = '62' + phoneClean.substring(1);
            if (!phoneClean.startsWith('62')) phoneClean = '6282380830808';

            const textMsg = `Bismillah. Berikut adalah data pemulihan akses akun Affiliate WIZ Bangka Belitung Anda:%0A%0A• *Nama*: ${ref.name}%0A• *Kode Referral*: ${ref.code || ref.id}%0A• *PIN Login*: *${pinVal}*%0A%0A_Simpan PIN ini dengan baik untuk login ke Portal Member Affiliate WIZ Babel._`;
            const waUrl = `https://wa.me/${phoneClean}?text=${textMsg}`;

            return {
                success: true,
                referral: ref,
                pin: pinVal,
                waUrl: waUrl,
                message: `PIN Anda ditemukan: ${pinVal}. Klik tombol untuk mengirim PIN langsung via WhatsApp.`
            };
        },

        getMonthlyKPI(referralId, targetMonthStr) {
            const ref = this.getById(referralId);
            if (!ref) return null;

            let filterMonth = targetMonthStr; // e.g. "2026-08" or "Semua"
            if (!filterMonth) {
                const now = new Date();
                filterMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }

            const refDonations = (ref.donations || []).filter(d => {
                if (filterMonth === 'Semua') return true;
                const dDate = d.createdAt || d.verifiedAt || d.date || '';
                return dDate.startsWith(filterMonth);
            });

            const monthDonationCount = refDonations.length;
            const monthTotalAmount = refDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
            const monthEarnedFee = refDonations.reduce((sum, d) => {
                const rate = d.referralRate !== undefined ? Number(d.referralRate) : Number(ref.defaultRate || 6);
                const fee = d.referralFee !== undefined ? Number(d.referralFee) : Math.round((Number(d.amount) || 0) * (rate / 100));
                return sum + fee;
            }, 0);

            let performanceTier = '🚀 Perlu Dorongan';
            let tierClass = 'bg-amber-100 text-amber-800 border-amber-200';

            if (monthDonationCount >= 5 || monthTotalAmount >= 5000000) {
                performanceTier = '⭐ Top Performer';
                tierClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
            } else if (monthDonationCount >= 1) {
                performanceTier = '✅ Stabil';
                tierClass = 'bg-blue-100 text-blue-800 border-blue-200';
            }

            return {
                referralId: ref.id,
                name: ref.name,
                code: ref.code || ref.id,
                phone: ref.phone,
                month: filterMonth,
                monthDonationCount,
                monthTotalAmount,
                monthEarnedFee,
                performanceTier,
                tierClass
            };
        },

        generateAffiliateId(createdAtDate = new Date()) {
            const d = createdAtDate instanceof Date ? createdAtDate : new Date(createdAtDate || Date.now());
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const datePrefix = `WIZ-${yyyy}${mm}${dd}`;
            
            const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            return `${datePrefix}-${randomCode}`; // e.g. WIZ-20260820-7K9P
        },

        async add(data) {
            const list = getStore(STORAGE_KEYS.REFERRALS) || [];
            const regDate = data.createdAt ? new Date(data.createdAt) : new Date();
            const autoCode = data.code || data.id || this.generateAffiliateId(regDate);
            const newRef = {
                id: data.id || autoCode,
                code: autoCode,
                name: data.name,
                phone: data.phone || '-',
                bankName: data.bankName || '-',
                accountNumber: data.accountNumber || '-',
                accountHolder: data.accountHolder || data.name,
                defaultRate: Number(data.defaultRate) || 6,
                pin: data.pin || (data.phone ? data.phone.slice(-4) : '1234'),
                status: data.status || 'active',
                notes: data.notes || '',
                createdAt: regDate.toISOString()
            };
            list.unshift(newRef);
            setStore(STORAGE_KEYS.REFERRALS, list);

            activityLog.add('referral', `Perantara/Affiliate baru "${newRef.name}" (ID: ${newRef.code}) ditambahkan (Hak ${newRef.defaultRate}%).`, data.createdBy || 'Admin');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.insert('referrals', newRef);
            }

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.saveReferral(newRef);
                } catch(e) {}
            }

            try {
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {
                console.warn('[Referrals] pushToCloud error:', e);
            }

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            broadcastSync('NEW_REFERRAL', newRef);
            return newRef;
        },

        async update(id, updates) {
            const list = getStore(STORAGE_KEYS.REFERRALS) || [];
            if (!id) return null;

            const cleanRaw = String(id).trim().toLowerCase();
            const cleanNoRef = cleanRaw.replace(/^ref[-_]/, '');
            const cleanDigits = cleanRaw.replace(/\D/g, '');

            const idx = list.findIndex(r => {
                if (!r) return false;
                const rId = String(r.id || '').trim().toLowerCase();
                const rIdNoRef = rId.replace(/^ref[-_]/, '');

                const rCode = String(r.code || '').trim().toLowerCase();
                const rCodeNoRef = rCode.replace(/^ref[-_]/, '');

                const rPhone = String(r.phone || '').replace(/\D/g, '');
                const rName = String(r.name || '').trim().toLowerCase();

                return rId === cleanRaw || rIdNoRef === cleanNoRef ||
                       rCode === cleanRaw || rCodeNoRef === cleanNoRef ||
                       (rPhone && cleanDigits && rPhone === cleanDigits && cleanDigits.length >= 5) ||
                       (rName && rName === cleanRaw);
            });

            if (idx === -1) {
                console.warn('[WIZ Store] Referrals update could not find match for identifier:', id);
                return null;
            }

            list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
            setStore(STORAGE_KEYS.REFERRALS, list);

            activityLog.add('referral', `Data Perantara "${list[idx].name}" (Rekening: ${list[idx].bankName} ${list[idx].accountNumber}) diperbarui.`, updates.updatedBy || 'Affiliate/System');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.set('referrals', String(list[idx].id), list[idx]);
            }

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.saveReferral(list[idx]);
                } catch(e) {}
            }

            try {
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {
                console.warn('[Referrals] pushToCloud error:', e);
            }

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return list[idx];
        },

        async delete(id) {
            if (!id) return;
            const strId = String(id);
            addDeletedRefId(strId);

            const rawList = getStore(STORAGE_KEYS.REFERRALS) || [];
            const ref = rawList.find(r => String(r.id) === strId);
            const filtered = rawList.filter(r => String(r.id) !== strId);
            setStore(STORAGE_KEYS.REFERRALS, filtered);

            if (ref) {
                activityLog.add('referral', `Perantara "${ref.name}" dihapus.`, 'Admin');
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.remove('referrals', strId);
                await window.wizFirebase.upsert('deleted_ref_ids', { key: strId, deletedAt: new Date().toISOString() });
            }

            try {
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {
                console.warn('[Referrals] pushToCloud error:', e);
            }

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        },

        // Payout / Pencairan Hak Perantara
        getPayouts(referralId) {
            const allPayouts = getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || [];
            if (referralId) return allPayouts.filter(p => p.referralId === referralId).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
            return allPayouts.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
        },

        async recordPayout(data) {
            const payouts = getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || [];
            const newPayout = {
                id: data.id || generateId(),
                referralId: data.referralId,
                referralName: data.referralName || 'Perantara',
                amount: Number(data.amount) || 0,
                paymentMethod: data.paymentMethod || 'Transfer Bank',
                referenceNo: data.referenceNo || '-',
                notes: data.notes || '',
                paidAt: data.paidAt || new Date().toISOString(),
                paidBy: data.paidBy || 'Admin',
                createdAt: new Date().toISOString()
            };
            payouts.unshift(newPayout);
            setStore(STORAGE_KEYS.REFERRAL_PAYOUTS, payouts);

            activityLog.add('payout', `Pencairan Hak Perantara ${formatRupiahCompact(newPayout.amount)} untuk "${newPayout.referralName}" dicatat.`, newPayout.paidBy);

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.insert('referral_payouts', newPayout);
            }

            try {
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {}

            return newPayout;
        },

        async updatePayout(payoutId, updates) {
            const payouts = getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || [];
            const idx = payouts.findIndex(p => p.id === payoutId);
            if (idx === -1) return null;

            payouts[idx] = { ...payouts[idx], ...updates, updatedAt: new Date().toISOString() };
            setStore(STORAGE_KEYS.REFERRAL_PAYOUTS, payouts);

            activityLog.add('payout', `Pencairan hak perantara diperbarui.`, updates.updatedBy || 'Admin');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.set('referral_payouts', payoutId, payouts[idx]);
            }

            try {
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {}

            return payouts[idx];
        },

        async deletePayout(payoutId) {
            const payouts = getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || [];
            const payout = payouts.find(p => p.id === payoutId);
            const filtered = payouts.filter(p => p.id !== payoutId);
            setStore(STORAGE_KEYS.REFERRAL_PAYOUTS, filtered);

            if (payout) {
                activityLog.add('payout', `Riwayat pencairan ${formatRupiahCompact(payout.amount)} dihapus.`, 'Admin');
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.remove('referral_payouts', payoutId);
            }

            try {
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {}
        }
    };

    // ─── Daily Quotes & Inspirasi Module ──────────────────
    const quotes = {
        getAll() {
            const list = getStore(STORAGE_KEYS.QUOTES) || DEFAULT_QUOTES;
            return list.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
        },

        getToday() {
            const all = this.getAll().filter(q => q && q.status === 'active');
            if (all.length === 0) return null;
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const exactToday = all.find(q => q.date === todayStr);
            return exactToday || all[0];
        },

        getById(id) {
            return this.getAll().find(q => String(q.id) === String(id));
        },

        async add(data) {
            const list = this.getAll();
            const newQuote = {
                id: data.id || ('quote-' + Date.now()),
                text: (data.text || '').trim(),
                source: (data.source || 'Inspirasi WIZ').trim(),
                category: data.category || 'Sedekah & Keberkahan',
                imageUrl: data.imageUrl || 'assets/images/foto-utama-wiz.jpg',
                date: data.date || new Date().toISOString().split('T')[0],
                status: data.status || 'active',
                author: data.author || 'Admin WIZ Babel',
                createdAt: new Date().toISOString()
            };
            list.unshift(newQuote);
            setStore(STORAGE_KEYS.QUOTES, list);

            activityLog.add('quote', `Quote harian baru "${newQuote.source}" ditambahkan.`, newQuote.author);

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.insert('quotes', newQuote);
            }

            window.dispatchEvent(new CustomEvent('wiz-quotes-changed', { detail: newQuote }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            broadcastSync('NEW_QUOTE', newQuote);
            return newQuote;
        },

        async update(id, updates) {
            const list = this.getAll();
            const idx = list.findIndex(q => String(q.id) === String(id));
            if (idx === -1) return null;

            list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
            setStore(STORAGE_KEYS.QUOTES, list);

            activityLog.add('quote', `Quote harian "${list[idx].source}" diperbarui.`, updates.author || 'Admin');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.set('quotes', String(id), list[idx]);
            }

            window.dispatchEvent(new CustomEvent('wiz-quotes-changed', { detail: list[idx] }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return list[idx];
        },

        async delete(id) {
            const list = this.getAll();
            const quote = list.find(q => String(q.id) === String(id));
            const filtered = list.filter(q => String(q.id) !== String(id));
            setStore(STORAGE_KEYS.QUOTES, filtered);

            if (quote) {
                activityLog.add('quote', `Quote "${quote.source}" dihapus.`, 'Admin');
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.remove('quotes', String(id));
            }

            window.dispatchEvent(new CustomEvent('wiz-quotes-changed'));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        },

        async toggleStatus(id) {
            const q = this.getById(id);
            if (!q) return;
            const newStatus = q.status === 'active' ? 'draft' : 'active';
            await this.update(id, { status: newStatus });
        }
    };

    // ─── Activity Log Module ──────────────────────────────
    const activityLog = {
        getAll() {
            return (getStore(STORAGE_KEYS.ACTIVITY) || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        },

        getRecent(count) {
            return this.getAll().slice(0, count || 10);
        },

        async add(type, message, actor) {
            const list = this.getAll();
            const newItem = {
                id: generateId(),
                type,
                message,
                actor: actor || 'Sistem',
                createdAt: new Date().toISOString()
            };
            list.unshift(newItem);
            if (list.length > 100) list.splice(100);
            setStore(STORAGE_KEYS.ACTIVITY, list);

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.insert('activity_log', newItem);
            }
        }
    };

    // BroadcastChannel helper for instant cross-tab real-time sync
    function broadcastSync(type, payload = {}) {
        try {
            const bc = new BroadcastChannel('wiz_sync_channel');
            bc.postMessage({ type, payload, timestamp: Date.now() });
            bc.close();
        } catch(e) {}
    }

    // Listen to cross-tab storage events & BroadcastChannel
    try {
        const bc = new BroadcastChannel('wiz_sync_channel');
        bc.onmessage = (event) => {
            window.dispatchEvent(new CustomEvent('wiz-sync-complete', { detail: event.data }));
        };
    } catch(e) {}

    window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('wiz_')) {
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        }
    });

    // ─── Initialize Data & Sync ───────────────────────────
    seedDefaultData();

    // Full bidirectional sync on startup:
    async function initSync() {
        try {
            await syncFromCloud();   // Step 1: pull from Firebase first
            await pushToCloud();     // Step 2: push local-only data to Firebase
            await syncFromCloud();   // Step 3: pull again to catch anything missed
            console.log('[WIZ Firebase] Init sync complete.');
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        } catch(e) {
            console.warn('[WIZ Firebase] Init sync failed, using local data:', e.message);
        }
    }

    // Slight delay so Firebase client script finishes loading
    setTimeout(initSync, 800);

    // Automatic recurring background cloud sync every 25 seconds (when tab is active)
    setInterval(async () => {
        if (document.visibilityState === 'visible') {
            try {
                await syncFromCloud();
                window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            } catch(e) {}
        }
    }, 25000);

    // ─── Public API ───────────────────────────────────────
    window.wizStore = {
        donations,
        finance,
        news,
        disbursements,
        baselines,
        siteImages,
        siteSettings: siteSettingsManager,
        adminUsers,
        referrals,
        quotes,
        allocationRulesManager,
        activity: activityLog,
        allocationRules: ALLOCATION_RULES,
        validateAllocationRule,
        calcInfakUmumAllocation,
        calcInfakTerikatAllocation,
        syncFromCloud,
        pushToCloud,
        fullBidirectionalSync,
        broadcastSync,
        utils: { formatRupiahCompact, formatDate, formatDateTime, timeAgo, generateId, mapProgramToPillar }
    };

    console.log('[WIZ Store] Initialized with real-time cloud sync & 10s auto-polling. Collections ready.');
})();
