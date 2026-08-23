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
        DONOR_ATTRIBUTIONS: 'wiz_donor_attributions',
        QUOTES: 'wiz_quotes',
        PROGRAMS: 'wiz_programs',
        DELETED_IDS: 'wiz_deleted_donation_ids',
        DELETED_NEWS_IDS: 'wiz_deleted_news_ids',
        DELETED_DISB_IDS: 'wiz_deleted_disb_ids',
        DELETED_REF_IDS: 'wiz_deleted_ref_ids',
        DELETED_QUOTE_IDS: 'wiz_deleted_quote_ids',
        DELETED_PROGRAM_IDS: 'wiz_deleted_program_ids',
        DELETED_ADMIN_IDS: 'wiz_deleted_admin_ids',
        INITIALIZED: 'wiz_store_initialized'
    };

    const DEFAULT_SITE_SETTINGS = {
        banks: [
            { id: 'bsi', bank: 'Bank Syariah Indonesia (BSI)', number: '7168008001', holder: 'WIZ Bangka Belitung', isActive: true, logo: 'assets/images/logo-bsi.jpg' }
        ],
        offices: [
            { id: 'pangkalpinang', name: 'Kantor Pangkalpinang', address: 'Jl. Mentok No. 45, Pangkalpinang, Bangka Belitung', phone: '0812-7171-8000', hotline: '081271718000', mapsUrl: 'https://maps.google.com' },
            { id: 'sungailiat', name: 'Kantor Sungailiat', address: 'Jl. Jenderal Sudirman No. 12, Sungailiat, Bangka', phone: '0821-8000-7171', hotline: '082180007171', mapsUrl: 'https://maps.google.com' }
        ],
        hotline: '081271718000'
    };

    const DEFAULT_SITE_IMAGES = {
        hero_card: 'assets/images/default-program-wiz.jpg',
        about_img: 'assets/images/default-program-wiz.jpg',
        berkah_hidayah: 'assets/images/default-program-wiz.jpg',
        berkah_juara: 'assets/images/beasiswa-pendidikan-juara.jpg',
        berkah_sehat: 'assets/images/bantuan-pengobatan.jpg',
        berkah_peduli: 'assets/images/sedekah-beras-dhuafa.jpg',
        berkah_mandiri: 'assets/images/modal-usaha-dhuafa.jpg',
        banner_donasi: 'assets/images/default-program-wiz.jpg'
    };

    const DEFAULT_SPECIFIC_PROGRAM_IMAGES = {
        'Pray For NTT': 'assets/images/pray-for-ntt.jpg',
        'Sedekah Beras Dhuafa': 'assets/images/sedekah-beras-dhuafa.jpg',
        'Sedekah Jumat': 'assets/images/sedekah-beras-dhuafa.jpg',
        'Sedekah Jumat Berkah': 'assets/images/sedekah-beras-dhuafa.jpg',
        'Tebar Sembako': 'assets/images/tebar-sembako.jpg',
        'Tebar Sembako Dhuafa': 'assets/images/tebar-sembako.jpg',
        'Tebar Sembako Nusantara': 'assets/images/tebar-sembako.jpg',
        'Santunan Yatim': 'assets/images/santunan-yatim.jpg',
        'Santunan Anak Yatim': 'assets/images/santunan-yatim.jpg',
        'Tebar Iftar': 'assets/images/tebar-iftar.jpg',
        'Tebar Iftar Nusantara': 'assets/images/tebar-iftar.jpg',
        'Tebar Ifthar Nusantara': 'assets/images/tebar-iftar.jpg',
        'Beasiswa Pendidikan Juara': 'assets/images/beasiswa-pendidikan-juara.jpg',
        'Beasiswa Juara': 'assets/images/beasiswa-pendidikan-juara.jpg',
        'Beasiswa Tahfidz & Dhuafa': 'assets/images/beasiswa-tahfidz.jpg',
        'Beasiswa Tahfidz': 'assets/images/beasiswa-tahfidz.jpg',
        'Perlengkapan Belajar Yatim': 'assets/images/perlengkapan-belajar-yatim.jpg',
        'Modal Usaha Dhuafa': 'assets/images/modal-usaha-dhuafa.jpg',
        'Modal Usaha Mandiri': 'assets/images/modal-usaha-dhuafa.jpg',
        'Modal Usaha': 'assets/images/modal-usaha-dhuafa.jpg',
        'Gerobak Berkah UMKM': 'assets/images/modal-usaha-dhuafa.jpg',
        'Pelatihan Keterampilan Wirausaha': 'assets/images/pelatihan-keterampilan-wirausaha.jpg',
        'Bantuan Pengobatan': 'assets/images/bantuan-pengobatan.jpg',
        'Bantuan Kesehatan Dhuafa': 'assets/images/bantuan-pengobatan.jpg',
        'Bantuan Pasien Kritis Dhuafa': 'assets/images/bantuan-pengobatan.jpg',
        'Layanan Pengobatan Gratis': 'assets/images/bantuan-pengobatan.jpg',
        'Ambulance Gratis Ummat': 'assets/images/ambulance-gratis-ummat.jpg',
        'Ambulans Gratis Peduli': 'assets/images/ambulance-gratis-ummat.jpg',
        'Khitanan Massal Dhuafa': 'assets/images/khitanan-massal-dhuafa.jpg',
        'Khitanan Massal': 'assets/images/khitanan-massal-dhuafa.jpg',
        'Keberangkatan Kepulangan Dai': 'assets/images/keberangkatan-kepulangan-dai.jpg',
        'Keberangkatan & Kepulangan Dai': 'assets/images/keberangkatan-kepulangan-dai.jpg',
        'Pembangunan Markaz': 'assets/images/default-program-wiz.jpg',
        'Pengadaan & Perbaikan Kendaraan': 'assets/images/default-program-wiz.jpg',
        'Pengadaan dan Perbaikan Kendaraan': 'assets/images/default-program-wiz.jpg',
        'Santunan Mualaf': 'assets/images/default-program-wiz.jpg',
        'Tahfidz': 'assets/images/default-program-wiz.jpg',
        'Pelatihan Public Speaking': 'assets/images/default-program-wiz.jpg',
        'Tabligh Akbar Dzulhijjah': 'assets/images/default-program-wiz.jpg',
        'Pelatihan Guru Dirosa': 'assets/images/default-program-wiz.jpg',
        'Pelatihan Penyelenggaraan Jenazah': 'assets/images/default-program-wiz.jpg',
        'Pelatihan Volunteer Media Dakwah': 'assets/images/default-program-wiz.jpg',
        'Lomba Desain Poster Dakwah': 'assets/images/default-program-wiz.jpg',
        'Kantor DPW WI Babel & WIZ': 'assets/images/default-program-wiz.jpg',
        'Mukerwil Mukernas Muktamar': 'assets/images/default-program-wiz.jpg',
        "Tebar Qur'an Nusantara": 'assets/images/default-program-wiz.jpg',
        'Bahagiakan Guru Ngaji': 'assets/images/default-program-wiz.jpg',
        'Sedekah Air': 'assets/images/default-program-wiz.jpg',
        'Sedekah Air Bersih': 'assets/images/default-program-wiz.jpg'
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

    function getDeletedQuoteIds() {
        try {
            return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_QUOTE_IDS) || '[]'));
        } catch { return new Set(); }
    }

    function addDeletedQuoteId(id) {
        if (!id) return;
        const set = getDeletedQuoteIds();
        set.add(String(id));
        localStorage.setItem(STORAGE_KEYS.DELETED_QUOTE_IDS, JSON.stringify(Array.from(set)));
    }

    function getDeletedProgramIds() {
        try {
            return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_PROGRAM_IDS) || '[]'));
        } catch { return new Set(); }
    }

    function addDeletedProgramId(id) {
        if (!id) return;
        const set = getDeletedProgramIds();
        set.add(String(id));
        localStorage.setItem(STORAGE_KEYS.DELETED_PROGRAM_IDS, JSON.stringify(Array.from(set)));
    }

    function getDeletedAdminIds() {
        try {
            return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_ADMIN_IDS) || '[]'));
        } catch { return new Set(); }
    }

    function addDeletedAdminId(id) {
        if (!id) return;
        const set = getDeletedAdminIds();
        set.add(String(id));
        localStorage.setItem(STORAGE_KEYS.DELETED_ADMIN_IDS, JSON.stringify(Array.from(set)));
    }

    function generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function generateId() {
        return generateUUID();
    }

    const memoryStoreFallback = new Map();

    function cleanStorageQuota() {
        try {
            // 1. Trim activity logs to top 20
            const acts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY) || '[]');
            if (acts.length > 20) {
                localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(acts.slice(-20)));
            }

            // 2. Clear old deleted tracking sets if oversized
            ['wiz_deleted_ids', 'wiz_deleted_news_ids', 'wiz_deleted_disb_ids', 'wiz_deleted_ref_ids', 'wiz_deleted_quote_ids'].forEach(k => {
                try {
                    const arr = JSON.parse(localStorage.getItem(k) || '[]');
                    if (arr.length > 40) {
                        localStorage.setItem(k, JSON.stringify(arr.slice(-40)));
                    }
                } catch(e) {}
            });
        } catch(e) {}
    }

    function getStore(key) {
        try {
            const item = localStorage.getItem(key);
            if (item) return JSON.parse(item);
        } catch (e) {
            console.warn("[WIZ Store] Gagal baca localStorage, fallback memory:", key);
        }
        return memoryStoreFallback.get(key) || null;
    }

    function setStore(key, data) {
        memoryStoreFallback.set(key, data);
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
                console.warn('[WIZ Store] localStorage quota exceeded. Menjalankan auto-cleanup non-esensial...');
                cleanStorageQuota();
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                } catch (retryErr) {
                    console.warn('[WIZ Store] Data disimpan di memory & langsung disinkronkan ke Cloud Supabase.');
                    if (typeof pushToCloud === 'function') {
                        setTimeout(() => pushToCloud().catch(() => {}), 150);
                    }
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
     * Kembalikan array item { key, percent, amount, subAllocation }
     */
    function calcInfakUmumAllocation(amount, wilayah) {
        const targetWilayah = wilayah || 'Pangkalpinang';
        const rule = (typeof allocationRulesManager !== 'undefined' && allocationRulesManager.get)
            ? (allocationRulesManager.get(targetWilayah) || ALLOCATION_RULES[targetWilayah] || ALLOCATION_RULES['Pangkalpinang'])
            : (ALLOCATION_RULES[targetWilayah] || ALLOCATION_RULES['Pangkalpinang']);
        if (!rule || !rule.mainAllocation) return [];
        const validation = validateAllocationRule(rule.mainAllocation);
        if (!validation.valid) return [];
        const numAmount = Number(amount) || 0;
        return rule.mainAllocation.map(item => {
            const pillarAmount = Math.round(numAmount * (Number(item.percent) || 0) / 100);
            const subRule = rule.subAllocation && rule.subAllocation[item.key] ? rule.subAllocation[item.key] : null;
            return {
                key: item.key,
                percent: Number(item.percent) || 0,
                amount: pillarAmount,
                subAllocation: subRule
            };
        });
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
                banks: Array.isArray(saved.banks) ? saved.banks : DEFAULT_SITE_SETTINGS.banks,
                offices: Array.isArray(saved.offices) ? saved.offices : DEFAULT_SITE_SETTINGS.offices,
                hotline: saved.hotline || DEFAULT_SITE_SETTINGS.hotline
            };
        },
        getActiveBanks() {
            return this.get().banks.filter(b => b && b.isActive !== false && b.number);
        },
        async addBank(bankData) {
            const current = this.get();
            const newBank = {
                id: bankData.id || ('bank-' + Date.now()),
                bank: (bankData.bank || 'Bank Baru').trim(),
                number: (bankData.number || '').trim(),
                holder: (bankData.holder || 'Wahdah Inspirasi Zakat').trim(),
                isActive: bankData.isActive !== false
            };
            current.banks.push(newBank);
            return await this.update(current);
        },
        async updateBank(id, bankData) {
            const current = this.get();
            const idx = current.banks.findIndex(b => b.id === id);
            if (idx === -1) return null;
            current.banks[idx] = {
                ...current.banks[idx],
                ...bankData,
                bank: bankData.bank !== undefined ? bankData.bank.trim() : current.banks[idx].bank,
                number: bankData.number !== undefined ? bankData.number.trim() : current.banks[idx].number,
                holder: bankData.holder !== undefined ? bankData.holder.trim() : current.banks[idx].holder
            };
            return await this.update(current);
        },
        async deleteBank(id) {
            const current = this.get();
            current.banks = current.banks.filter(b => b.id !== id);
            return await this.update(current);
        },
        async toggleBank(id, isActive) {
            const current = this.get();
            const bank = current.banks.find(b => b.id === id);
            if (bank) {
                bank.isActive = (isActive !== undefined) ? isActive : !bank.isActive;
                return await this.update(current);
            }
            return current;
        },
        async updateOffice(officeId, officeData) {
            const current = this.get();
            const idx = current.offices.findIndex(o => o.id === officeId);
            if (idx !== -1) {
                current.offices[idx] = { ...current.offices[idx], ...officeData };
            } else {
                current.offices.push({ id: officeId, ...officeData });
            }
            return await this.update(current);
        },
        async update(newSettings) {
            const current = this.get();
            const updated = {
                banks: Array.isArray(newSettings.banks) ? newSettings.banks : current.banks,
                offices: Array.isArray(newSettings.offices) ? newSettings.offices : current.offices,
                hotline: newSettings.hotline || current.hotline
            };
            setStore(STORAGE_KEYS.SITE_SETTINGS, updated);

            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('settings', 'Pengaturan Rekening Bank & Lokasi Kantor diperbarui oleh Admin Utama', sessionStorage.getItem('wiz_admin_user') || 'Admin 1');
            }

            // Immediately save to direct Supabase site_settings table
            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.saveSiteSettings(updated);
                } catch(e) {
                    console.warn('[Site Settings] Supabase save error:', e);
                }
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
    // ─── Admin Authentication & Accounts Manager (Optimized Supabase Engine) ───
    async function microSyncAdmin(action, payload = {}) {
        try {
            fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...payload })
            }).catch(() => {});
        } catch(e) {}

        if (window.wizSupabase && window.wizSupabase.isConfigured()) {
            try {
                window.wizSupabase.select('site_settings', { filter: 'key=eq.master_bundle' }).then(res => {
                    if (res && res.data && res.data[0] && res.data[0].value) {
                        const mb = res.data[0].value;
                        if (!mb.admin_users) mb.admin_users = [];
                        if (!mb.deleted_admin_ids) mb.deleted_admin_ids = [];

                        if (action === 'register_admin_user' || action === 'update_admin_user') {
                            const u = payload.user;
                            if (u) {
                                const idx = mb.admin_users.findIndex(x => String(x.id) === String(u.id) || (x.username && u.username && x.username.toLowerCase() === u.username.toLowerCase()));
                                if (idx !== -1) mb.admin_users[idx] = { ...mb.admin_users[idx], ...u };
                                else mb.admin_users.push(u);
                            }
                        } else if (action === 'approve_admin_user') {
                            const targetId = String(payload.id);
                            const idx = mb.admin_users.findIndex(x => String(x.id) === targetId);
                            if (idx !== -1) {
                                mb.admin_users[idx].status = 'approved';
                                mb.admin_users[idx].verifiedAt = new Date().toISOString();
                                mb.admin_users[idx].verifiedBy = payload.verifiedBy || 'Admin 1';
                                mb.admin_users[idx].updatedAt = new Date().toISOString();
                            }
                        } else if (action === 'delete_admin_user') {
                            const targetId = String(payload.id);
                            mb.admin_users = mb.admin_users.filter(x => String(x.id) !== targetId && x.username !== 'admin');
                            if (!mb.deleted_admin_ids.includes(targetId)) mb.deleted_admin_ids.push(targetId);
                        }

                        mb.updatedAt = new Date().toISOString();
                        window.wizSupabase.upsert('site_settings', {
                            key: 'master_bundle',
                            value: mb,
                            updated_at: new Date().toISOString()
                        }).catch(() => {});
                    }
                }).catch(() => {});
            } catch(e) {}
        }
    }

    const adminUsers = {
        getAll() {
            const deletedSet = getDeletedAdminIds();
            let users = (getStore(STORAGE_KEYS.ADMIN_USERS) || DEFAULT_ADMIN_USERS)
                .filter(u => u && (u.id || u.username) && !deletedSet.has(String(u.id)) && u.status !== 'deleted' && !u.isDeleted);
            if (!users.some(u => u.username === 'admin')) {
                users.unshift(DEFAULT_ADMIN_USERS[0]);
                setStore(STORAGE_KEYS.ADMIN_USERS, users);
            }
            return users;
        },
        getPending() {
            return this.getAll().filter(u => u.status === 'pending');
        },
        getById(id) {
            if (!id) return null;
            const clean = String(id).trim().toLowerCase();
            return this.getAll().find(u => String(u.id).toLowerCase() === clean || (u.username && u.username.toLowerCase() === clean)) || null;
        },
        async add({ username, password, fullName, phone, role, wilayah, status = 'approved' }) {
            const cleanUser = (username || '').trim().toLowerCase();
            if (!cleanUser || !password) {
                return { success: false, message: 'Username dan kata sandi wajib diisi.' };
            }
            if (cleanUser === 'admin') {
                return { success: false, message: 'Username "admin" adalah akun Admin 1 Utama dan tidak dapat didaftarkan ulang.' };
            }

            let list = this.getAll();
            const existingIdx = list.findIndex(u => u.username.toLowerCase() === cleanUser);
            let targetUser;

            if (existingIdx !== -1) {
                targetUser = list[existingIdx];
                targetUser.fullName = (fullName || targetUser.fullName || cleanUser).trim();
                targetUser.phone = (phone || targetUser.phone || '').trim();
                targetUser.role = role === 'super_admin' ? 'super_admin' : 'amil';
                targetUser.wilayah = wilayah || targetUser.wilayah || 'Semua Wilayah';
                targetUser.status = status || 'approved';
                if (password && password.trim()) targetUser.password = password.trim();
                targetUser.updatedAt = new Date().toISOString();
                if (status === 'approved') {
                    targetUser.verifiedAt = new Date().toISOString();
                    targetUser.verifiedBy = sessionStorage.getItem('wiz_admin_user') || 'Admin 1';
                }
            } else {
                targetUser = {
                    id: generateId(),
                    username: cleanUser,
                    password: password.trim(),
                    fullName: (fullName || cleanUser).trim(),
                    phone: (phone || '').trim(),
                    role: role === 'super_admin' ? 'super_admin' : 'amil',
                    wilayah: wilayah || 'Semua Wilayah',
                    status: status || 'approved',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    verifiedAt: status === 'approved' ? new Date().toISOString() : null,
                    verifiedBy: status === 'approved' ? (sessionStorage.getItem('wiz_admin_user') || 'Admin 1') : null
                };
                list.push(targetUser);
            }

            setStore(STORAGE_KEYS.ADMIN_USERS, list);
            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('auth', `Akun admin '${cleanUser}' disimpan (Status: ${targetUser.status}, Peran: ${targetUser.role})`, sessionStorage.getItem('wiz_admin_user') || 'Admin 1');
            }

            window.dispatchEvent(new CustomEvent('wiz-admin-users-changed'));
            broadcastSync('UPDATE_ADMIN_USERS', list);

            microSyncAdmin('register_admin_user', { user: targetUser });
            if (typeof pushToCloud === 'function') {
                setTimeout(() => pushToCloud().catch(() => {}), 100);
            }
            return { success: true, user: targetUser, message: 'Akun admin berhasil disimpan & terhubung ke Cloud!' };
        },
        async update(id, data) {
            let list = this.getAll();
            const idx = list.findIndex(u => String(u.id) === String(id));
            if (idx === -1) return { success: false, message: 'Admin tidak ditemukan' };

            const user = list[idx];
            if (data.fullName !== undefined) user.fullName = data.fullName.trim();
            if (data.phone !== undefined) user.phone = data.phone.trim();
            if (data.role !== undefined && user.username !== 'admin') user.role = data.role;
            if (data.wilayah !== undefined) user.wilayah = data.wilayah;
            if (data.status !== undefined && user.username !== 'admin') {
                user.status = data.status;
                if (data.status === 'approved' && !user.verifiedAt) {
                    user.verifiedAt = new Date().toISOString();
                    user.verifiedBy = sessionStorage.getItem('wiz_admin_user') || 'Admin 1';
                }
            }
            if (data.password && data.password.trim()) user.password = data.password.trim();
            user.updatedAt = new Date().toISOString();

            setStore(STORAGE_KEYS.ADMIN_USERS, list);
            window.dispatchEvent(new CustomEvent('wiz-admin-users-changed'));
            broadcastSync('UPDATE_ADMIN_USERS', list);

            microSyncAdmin('update_admin_user', { user });
            if (typeof pushToCloud === 'function') {
                setTimeout(() => pushToCloud().catch(() => {}), 100);
            }
            return { success: true, user, message: 'Data admin berhasil diperbarui!' };
        },
        async register({ username, password, fullName, phone, role, wilayah }) {
            const cleanUser = (username || '').trim().toLowerCase();
            const cleanPass = (password || '').trim();
            const cleanName = (fullName || cleanUser).trim();
            const cleanPhone = (phone || '').trim();
            const cleanRole = role === 'super_admin' ? 'super_admin' : 'amil';
            const cleanWil = wilayah || 'Semua Wilayah';

            if (!cleanUser || !cleanPass) {
                return { success: false, message: 'Username dan kata sandi wajib diisi.' };
            }
            if (cleanUser === 'admin') {
                return { success: false, message: 'Username "admin" adalah akun Admin 1 Utama dan tidak dapat didaftarkan ulang.' };
            }

            let list = this.getAll();
            const existing = list.find(u => u.username.toLowerCase() === cleanUser);

            if (existing) {
                if (existing.status === 'approved') {
                    return { success: false, message: 'Username ini sudah terdaftar dan aktif. Silakan masuk melalui tab Masuk ke Dashboard.' };
                }
                // Update pending application with latest submitted data
                existing.fullName = cleanName;
                existing.phone = cleanPhone;
                existing.password = cleanPass;
                existing.role = cleanRole;
                existing.wilayah = cleanWil;
                existing.status = 'pending';
                existing.updatedAt = new Date().toISOString();

                setStore(STORAGE_KEYS.ADMIN_USERS, list);
                if (typeof activityLog !== 'undefined' && activityLog.add) {
                    activityLog.add('auth', `Pembaruan pendaftaran akun admin: '${cleanUser}' (Menunggu verifikasi Admin 1)`, cleanUser);
                }

                window.dispatchEvent(new CustomEvent('wiz-admin-users-changed'));
                broadcastSync('UPDATE_ADMIN_USERS', list);

                microSyncAdmin('register_admin_user', { user: existing });
                if (typeof pushToCloud === 'function') {
                    setTimeout(() => pushToCloud().catch(() => {}), 100);
                }
                return { success: true, user: existing, message: 'Pendaftaran Anda berhasil diperbarui! Akun Anda sedang menunggu persetujuan dari Admin 1 Utama.' };
            }

            const newUser = {
                id: generateId(),
                username: cleanUser,
                password: cleanPass,
                fullName: cleanName,
                phone: cleanPhone,
                role: cleanRole,
                wilayah: cleanWil,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            list.push(newUser);
            setStore(STORAGE_KEYS.ADMIN_USERS, list);
            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('auth', `Pendaftaran akun admin baru: '${cleanUser}' (Menunggu verifikasi Admin 1)`, cleanUser);
            }

            window.dispatchEvent(new CustomEvent('wiz-admin-users-changed'));
            broadcastSync('NEW_ADMIN_USER', newUser);

            microSyncAdmin('register_admin_user', { user: newUser });
            if (typeof pushToCloud === 'function') {
                setTimeout(() => pushToCloud().catch(() => {}), 100);
            }

            return { success: true, user: newUser, message: 'Pendaftaran berhasil! Akun Anda otomatis masuk antrean dan menunggu persetujuan dari Admin 1 Utama.' };
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
                return { success: false, message: 'Akun Anda belum disetujui oleh Admin 1 Utama. Silakan hubungi Super Admin untuk verifikasi.' };
            }

            if (found.status === 'rejected') {
                return { success: false, message: 'Pendaftaran akun Anda ditolak oleh Admin 1 Utama.' };
            }

            return { success: true, user: found };
        },
        async approve(id, adminActor) {
            let list = this.getAll();
            const idx = list.findIndex(u => String(u.id) === String(id));
            if (idx === -1) return { success: false, message: 'Pengguna tidak ditemukan' };

            list[idx].status = 'approved';
            list[idx].verifiedAt = new Date().toISOString();
            list[idx].verifiedBy = adminActor || 'Admin 1';
            list[idx].updatedAt = new Date().toISOString();
            setStore(STORAGE_KEYS.ADMIN_USERS, list);

            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('auth', `Akun admin '${list[idx].username}' telah diverifikasi & disetujui`, adminActor || 'Admin 1');
            }

            window.dispatchEvent(new CustomEvent('wiz-admin-users-changed'));
            broadcastSync('UPDATE_ADMIN_USERS', list);

            microSyncAdmin('approve_admin_user', { id, verifiedBy: adminActor || 'Admin 1' });
            if (typeof pushToCloud === 'function') {
                setTimeout(() => pushToCloud().catch(() => {}), 100);
            }
            return { success: true, user: list[idx] };
        },
        async reject(id, adminActor) {
            let list = this.getAll();
            const idx = list.findIndex(u => String(u.id) === String(id));
            if (idx === -1) return { success: false, message: 'Pengguna tidak ditemukan' };

            list[idx].status = 'rejected';
            list[idx].updatedAt = new Date().toISOString();
            setStore(STORAGE_KEYS.ADMIN_USERS, list);

            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('auth', `Pendaftaran akun admin '${list[idx].username}' ditolak`, adminActor || 'Admin 1');
            }

            window.dispatchEvent(new CustomEvent('wiz-admin-users-changed'));
            broadcastSync('UPDATE_ADMIN_USERS', list);

            microSyncAdmin('update_admin_user', { user: list[idx] });
            if (typeof pushToCloud === 'function') {
                setTimeout(() => pushToCloud().catch(() => {}), 100);
            }
            return { success: true };
        },
        async delete(id) {
            let list = this.getAll();
            const target = list.find(u => String(u.id) === String(id));
            if (target && target.username === 'admin') {
                return { success: false, message: 'Akun Super Admin 1 utama tidak dapat dihapus.' };
            }

            addDeletedAdminId(id);
            list = list.filter(u => String(u.id) !== String(id));
            setStore(STORAGE_KEYS.ADMIN_USERS, list);

            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('auth', `Akses admin '${target ? target.username : id}' dicabut/dihapus`, sessionStorage.getItem('wiz_admin_user') || 'Admin 1');
            }

            window.dispatchEvent(new CustomEvent('wiz-admin-users-changed'));
            broadcastSync('UPDATE_ADMIN_USERS', list);

            microSyncAdmin('delete_admin_user', { id });
            if (typeof pushToCloud === 'function') {
                setTimeout(() => pushToCloud().catch(() => {}), 100);
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
                    if (typeof pushToCloud === 'function') {
                        await pushToCloud();
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

            // 3. Check DEFAULT_SPECIFIC_PROGRAM_IMAGES mapping
            if (typeof DEFAULT_SPECIFIC_PROGRAM_IMAGES !== 'undefined') {
                if (DEFAULT_SPECIFIC_PROGRAM_IMAGES[programName]) return DEFAULT_SPECIFIC_PROGRAM_IMAGES[programName];
                for (const [k, v] of Object.entries(DEFAULT_SPECIFIC_PROGRAM_IMAGES)) {
                    const cleanK = String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cleanK === cleanQuery || cleanQuery.includes(cleanK) || cleanK.includes(cleanQuery)) {
                        return v;
                    }
                }
            }

            // 4. Fallback to pillar image
            const cleanPillarKey = (pillar || '').toLowerCase().replace(/\s+/g, '_');
            return DEFAULT_SITE_IMAGES.berkah_hidayah;
        },

        async addOrUpdateSpecificProgram(pillar, title, imageUrl = '') {
            if (!pillar || !title) return false;
            const cleanTitle = String(title).trim();
            const cleanPillar = String(pillar).trim();

            // 1. Update localStorage wiz_custom_specific_programs map
            let customMap = {};
            try {
                customMap = JSON.parse(localStorage.getItem('wiz_custom_specific_programs') || '{}');
            } catch(e) {}
            if (!customMap[cleanPillar]) customMap[cleanPillar] = [];
            if (!customMap[cleanPillar].includes(cleanTitle)) {
                customMap[cleanPillar].push(cleanTitle);
            }
            localStorage.setItem('wiz_custom_specific_programs', JSON.stringify(customMap));

            // 2. If imageUrl is provided, save to flat images store & siteImages
            if (imageUrl) {
                try {
                    const flatImgs = JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}');
                    flatImgs[cleanTitle] = imageUrl;
                    localStorage.setItem('wiz_specific_prog_imgs', JSON.stringify(flatImgs));
                    const imgKey = 'prog_img_' + cleanTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                    siteImages.update(imgKey, imageUrl, `Foto Program: ${cleanTitle}`);
                } catch(e) {}
            }

            // 3. Update subAllocation across all branches in allocationRules
            const allRules = this.getAll();
            for (const [wKey, wData] of Object.entries(allRules)) {
                if (!wData.subAllocation) wData.subAllocation = {};
                if (!wData.subAllocation[cleanPillar]) {
                    wData.subAllocation[cleanPillar] = { items: [] };
                }
                const items = wData.subAllocation[cleanPillar].items || [];
                const existing = items.find(i => (i.key || '').toLowerCase() === cleanTitle.toLowerCase());
                if (!existing) {
                    items.push({
                        key: cleanTitle,
                        percent: 0,
                        image: imageUrl || this.getSpecificProgramImage(cleanTitle, cleanPillar) || ''
                    });
                } else if (imageUrl) {
                    existing.image = imageUrl;
                }
                wData.subAllocation[cleanPillar].items = items;
                await this.update(wKey, wData);
            }

            // 4. Cloud sync (Supabase & Firebase)
            try {
                if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                    await window.wizSupabase.upsert('site_settings', {
                        id: 'custom_specific_programs',
                        key: 'custom_specific_programs',
                        value: customMap,
                        updated_at: new Date().toISOString()
                    });
                }
                if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                    await window.wizFirebase.upsert('site_settings', {
                        key: 'custom_specific_programs',
                        data: customMap,
                        updatedAt: new Date().toISOString()
                    });
                }
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {}

            // 5. Broadcast to all open tabs and components
            window.dispatchEvent(new CustomEvent('wiz-programs-changed', { detail: { pillar: cleanPillar, title: cleanTitle } }));
            window.dispatchEvent(new CustomEvent('wiz-program-images-changed'));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            if (typeof broadcastSync === 'function') {
                broadcastSync('PROGRAMS_UPDATED', customMap);
            }

            return true;
        },

        async deleteSpecificProgram(pillar, title) {
            if (!pillar || !title) return false;
            const cleanTitle = String(title).trim();
            const cleanPillar = String(pillar).trim();

            // 1. Remove from wiz_custom_specific_programs
            let customMap = {};
            try {
                customMap = JSON.parse(localStorage.getItem('wiz_custom_specific_programs') || '{}');
                if (customMap[cleanPillar]) {
                    customMap[cleanPillar] = customMap[cleanPillar].filter(t => t.toLowerCase() !== cleanTitle.toLowerCase());
                    localStorage.setItem('wiz_custom_specific_programs', JSON.stringify(customMap));
                }
            } catch(e) {}

            // 2. Remove from allocationRules subAllocation across all branches
            const allRules = this.getAll();
            for (const [wKey, wData] of Object.entries(allRules)) {
                if (wData.subAllocation && wData.subAllocation[cleanPillar] && wData.subAllocation[cleanPillar].items) {
                    wData.subAllocation[cleanPillar].items = wData.subAllocation[cleanPillar].items.filter(i => (i.key || '').toLowerCase() !== cleanTitle.toLowerCase());
                    await this.update(wKey, wData);
                }
            }

            // 3. Cloud sync
            try {
                if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                    await window.wizSupabase.upsert('site_settings', {
                        id: 'custom_specific_programs',
                        key: 'custom_specific_programs',
                        value: customMap,
                        updated_at: new Date().toISOString()
                    });
                }
                if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                    await window.wizFirebase.upsert('site_settings', {
                        key: 'custom_specific_programs',
                        data: customMap,
                        updatedAt: new Date().toISOString()
                    });
                }
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {}

            window.dispatchEvent(new CustomEvent('wiz-programs-changed', { detail: { deleted: cleanTitle } }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            if (typeof broadcastSync === 'function') {
                broadcastSync('PROGRAMS_UPDATED', customMap);
            }

            return true;
        },
        getSpecificProgramImage(title, pillar = '') {
            if (!title) return 'assets/images/foto-utama-wiz.jpg';
            const cleanTitle = String(title).trim();
            const cleanQuery = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

            // 1. Check custom uploaded images store (prioritize admin uploads from Supabase / localStorage)
            try {
                const imgMap = JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}');
                if (imgMap[cleanTitle]) return imgMap[cleanTitle];
                for (const [k, v] of Object.entries(imgMap)) {
                    const cleanK = String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cleanK === cleanQuery || cleanQuery.includes(cleanK) || cleanK.includes(cleanQuery)) {
                        if (v) return v;
                    }
                }
            } catch(e) {}

            // 2. Check programs store (from admin program database)
            try {
                if (typeof programs !== 'undefined' && programs.getAll) {
                    const allProgs = programs.getAll();
                    const found = allProgs.find(p => p && p.title && (
                        p.title.toLowerCase() === cleanTitle.toLowerCase() ||
                        p.title.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanQuery
                    ));
                    if (found && found.imageUrl) return found.imageUrl;
                }
            } catch(e) {}

            // 3. Check allocation rules subAllocation
            try {
                const rules = this.getAll();
                for (const wData of Object.values(rules)) {
                    if (wData && wData.subAllocation) {
                        for (const [pillarKey, subObj] of Object.entries(wData.subAllocation)) {
                            if (subObj && subObj.items) {
                                for (const item of subObj.items) {
                                    const kNorm = String(item.key || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                                    if ((kNorm === cleanQuery || cleanQuery.includes(kNorm) || kNorm.includes(cleanQuery)) && item.image) {
                                        return item.image;
                                    }
                                }
                            }
                        }
                    }
                }
            } catch(e) {}

            // 4. Check known specific program poster paths
            if (cleanQuery.includes('prayforntt') || cleanQuery.includes('ntt')) {
                return 'assets/images/pray-for-ntt.jpg';
            }

            // 5. Default pillar fallback
            const pillarPhotos = {
                'Berkah Hidayah': 'assets/images/default-program-wiz.jpg',
                'Berkah Peduli': 'assets/images/sedekah-beras-dhuafa.jpg',
                'Berkah Juara': 'assets/images/beasiswa-pendidikan-juara.jpg',
                'Berkah Sehat': 'assets/images/bantuan-pengobatan.jpg',
                'Berkah Mandiri': 'assets/images/modal-usaha-dhuafa.jpg'
            };
            return pillarPhotos[pillar] || 'assets/images/default-program-wiz.jpg';
        },
        async updateSpecificProgramImageByName(title, imgDataUrl) {
            if (!title || !imgDataUrl) return false;
            const cleanTitle = String(title).trim();

            let imgMap = {};
            try {
                imgMap = JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}');
            } catch(e) {}
            imgMap[cleanTitle] = imgDataUrl;
            localStorage.setItem('wiz_specific_prog_imgs', JSON.stringify(imgMap));

            try {
                if (typeof programs !== 'undefined' && programs.getAll) {
                    const allP = programs.getAll();
                    const target = allP.find(p => p && p.title && p.title.toLowerCase() === cleanTitle.toLowerCase());
                    if (target) {
                        await programs.update(target.id, { imageUrl: imgDataUrl });
                    }
                }
            } catch(e) {}

            try {
                const rules = this.getAll();
                let modified = false;
                for (const [wKey, wData] of Object.entries(rules)) {
                    if (wData && wData.subAllocation) {
                        for (const sub of Object.values(wData.subAllocation)) {
                            if (sub && sub.items) {
                                sub.items.forEach(i => {
                                    if ((i.key || '').toLowerCase() === cleanTitle.toLowerCase()) {
                                        i.image = imgDataUrl;
                                        modified = true;
                                    }
                                });
                            }
                        }
                    }
                    if (modified) {
                        await this.update(wKey, wData);
                    }
                }
            } catch(e) {}

            try {
                if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                    await window.wizSupabase.upsert('site_settings', {
                        id: 'specific_prog_imgs',
                        key: 'specific_prog_imgs',
                        value: imgMap,
                        updated_at: new Date().toISOString()
                    });
                }
                if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                    await window.wizFirebase.upsert('site_settings', {
                        key: 'specific_prog_imgs',
                        data: imgMap,
                        updatedAt: new Date().toISOString()
                    });
                }
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {}

            window.dispatchEvent(new CustomEvent('wiz-program-images-changed', { detail: { title: cleanTitle, image: imgDataUrl } }));
            window.dispatchEvent(new CustomEvent('wiz-programs-changed'));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            if (typeof broadcastSync === 'function') {
                broadcastSync('PROGRAM_IMAGES_UPDATED', { title: cleanTitle, image: imgDataUrl });
            }
            return true;
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

        const donations = [];
        const news = [
            {
                id: 'news-beasiswa-anak-sekolah',
                title: 'WIZ Babel Salurkan Beasiswa Pendidikan untuk Anak Masuk Sekolah',
                category: 'Kegiatan & Penyaluran',
                content: 'PANGKALPINANG — Wahdah Inspirasi Zakat (WIZ) Bangka Belitung kembali menyalurkan bantuan pendidikan melalui pilar program Berkah Juara untuk anak-anak yatim dan dhuafa yang memasuki tahun ajaran baru.\n\nBantuan berupa seragam, perlengkapan sekolah, dan beasiswa tunai ini diserahkan langsung guna memastikan keberlanjutan pendidikan generasi muda penerus bangsa.\n\nSemoga bantuan ini meringankan beban keluarga dan menjadi amal jariyah bagi para donatur.',
                imageUrl: 'assets/images/foto-utama-wiz.jpg',
                gallery: [
                    'assets/images/beasiswa-tahfidz.jpg'
                ],
                eventDate: '2026-07-08T00:00:00.000Z',
                status: 'published',
                createdAt: '2026-07-08T08:00:00.000Z',
                author: 'Super Admin 1 (WIZ Babel)'
            },
            {
                id: 'news-bantuan-kesehatan-jantung',
                title: 'Ringankan Beban Pengobatan Jantung, WIZ Babel Salurkan Bantuan Kesehatan',
                category: 'Kegiatan & Penyaluran',
                content: 'PANGKALPINANG — Wahdah Inspirasi Zakat (WIZ) Bangka Belitung kembali menyalurkan bantuan program kesehatan bagi warga dhuafa penderita penyakit jantung di Kota Pangkalpinang.\n\nBantuan operasional pengobatan dan santunan ini diserahkan langsung oleh relawan WIZ di kediaman pasien guna mendukung proses pemulihan dan rawat jalan.\n\nKeluarga penerima manfaat menyampaikan rasa haru dan terima kasih mendalam atas kepedulian para muhsinin.',
                imageUrl: 'assets/images/tebar-iftar-3.jpg',
                gallery: [
                    'assets/images/sedekah-beras-dhuafa.jpg',
                    'assets/images/foto-utama-wiz.jpg'
                ],
                eventDate: '2026-06-10T00:00:00.000Z',
                status: 'published',
                createdAt: '2026-06-10T08:00:00.000Z',
                author: 'Super Admin 1 (WIZ Babel)'
            },
            {
                id: 'news-pangan-beras-masyarakat',
                title: 'Penuhi Kebutuhan Pangan Masyarakat, WIZ Babel Salurkan Beras Premium',
                category: 'Kegiatan & Penyaluran',
                content: 'PANGKALPINANG (wizbangkabelitung.or.id) — Laznas Wahdah Inspirasi Zakat (WIZ) Bangka Belitung kembali menunjukkan kepedulian nyata dengan menyalurkan beras premium dan sembako untuk keluarga pra-sejahtera dan dhuafa di pelosok Bangka Belitung guna menjaga ketahanan pangan keluarga.',
                imageUrl: 'assets/images/sedekah-beras-dai.jpg',
                gallery: [
                    'assets/images/sedekah-beras-dhuafa.jpg',
                    'assets/images/tebar-iftar-1.jpg'
                ],
                eventDate: '2026-05-18T00:00:00.000Z',
                status: 'published',
                createdAt: '2026-05-18T08:00:00.000Z',
                author: 'Super Admin 1 (WIZ Babel)'
            },
            {
                id: 'news-beasiswa-stiba-unmuh',
                title: 'WIZ Bangka Belitung Salurkan Beasiswa Pendidikan Rutin Bulanan untuk Mahasiswa STIBA Makassar dan Unmuh Babel',
                category: 'Kegiatan & Penyaluran',
                content: 'PANGKALPINANG — Wahdah Inspirasi Zakat (WIZ) Bangka Belitung kembali menunjukkan komitmennya dalam mendukung keberlanjutan pendidikan generasi muda berprestasi melalui program Beasiswa Pendidikan Rutin Bulanan untuk mahasiswa STIBA Makassar dan Unmuh Babel.\n\nBantuan beasiswa ini diserahkan langsung guna meringankan biaya operasional perkuliahan, pembelian kitab/buku referensi, serta kebutuhan penunjang studi para mahasiswa penghafal Al-Qur\'an.\n\nSemoga bantuan ini memotivasi para penerima manfaat untuk terus berprestasi dan menjadi berkah jariyah bagi seluruh donatur WIZ Babel.',
                imageUrl: 'assets/images/beasiswa-tahfidz.jpg',
                gallery: [
                    'assets/images/foto-utama-wiz.jpg'
                ],
                eventDate: '2026-08-17T00:00:00.000Z',
                status: 'published',
                createdAt: '2026-08-17T08:00:00.000Z',
                author: 'Super Admin 1 (WIZ Babel)'
            },
            {
                id: 'news-zakat-fitrah-babel',
                title: 'Zakat Fitrah WIZ Babel Hadirkan Kebahagiaan',
                category: 'Kegiatan & Penyaluran',
                content: 'Lembaga Amil Zakat Wahdah Inspirasi Zakat Bangka Belitung menyalurkan zakat fitrah kepada para mustahik di Wilayah Kota Pangkal Pinang dan sekitarnya.\n\nPenyaluran ini disambut dengan penuh rasa syukur dan sukacita oleh warga penerima manfaat. Paket beras zakat fitrah berkualitas premium disalurkan langsung ke rumah-rumah warga dhuafa jelang Hari Raya Idul Fitri guna memastikan tidak ada keluarga yang kelaparan di hari kemenangan.',
                imageUrl: 'assets/images/sedekah-beras-dhuafa.jpg',
                gallery: [
                    'assets/images/sedekah-beras-dai.jpg',
                    'assets/images/foto-utama-wiz.jpg'
                ],
                eventDate: '2026-03-19T00:00:00.000Z',
                status: 'published',
                createdAt: '2026-03-19T08:00:00.000Z',
                author: 'Super Admin 1 (WIZ Babel)'
            },
            {
                id: 'news-santunan-yatim-quran',
                title: 'Santunan Anak Yatim dan Tebar Al-Qur\'an Nusantara Ramadan Makin Bahagia 1447 H',
                category: 'Kegiatan & Penyaluran',
                content: 'WIZ Bangka Belitung melaksanakan kegiatan santunan anak yatim dan tebar al-Qur\'an Nusantara. Kegiatan ini dibuka dengan pembacaan ayat suci Al-Qur\'an dan dilanjutkan dengan penyerahan santunan uang tunai, perlengkapan ibadah, bingkisan perlengkapan sekolah, serta mushaf Al-Qur\'an untuk anak-anak yatim binaan di Bangka Belitung.\n\nKegiatan berlangsung khidmat dan diakhiri dengan doa bersama untuk para muhsinin dan donatur.',
                imageUrl: 'assets/images/tebar-iftar-1.jpg',
                gallery: [
                    'assets/images/tebar-iftar.jpg',
                    'assets/images/sedekah-beras-dhuafa.jpg',
                    'assets/images/beasiswa-tahfidz.jpg'
                ],
                eventDate: '2026-03-14T00:00:00.000Z',
                status: 'published',
                createdAt: '2026-03-14T08:00:00.000Z',
                author: 'Super Admin 1 (WIZ Babel)'
            },
            {
                id: 'news-tebar-iftar-ramadan',
                title: 'Tebar Iftar Ramadan Makin Bahagia Bersama WIZ Bangka Belitung',
                category: 'Kegiatan & Penyaluran',
                content: 'Alhamdulillah, Wahdah Inspirasi Zakat (WIZ) Bangka Belitung menyalurkan ratusan paket buka puasa (Tebar Iftar) penuh gizi dan kebahagiaan untuk santri tahfidz, dhuafa, dan masyarakat kurang mampu di berbagai pelosok Bangka Belitung.\n\nKegiatan ini merupakan komitmen berkelanjutan WIZ Babel untuk menghadirkan senyum dan kebahagiaan di bulan suci Ramadan.\n\nTerima kasih kepada seluruh donatur dan sahabat inspirasi atas kepercayaannya.',
                imageUrl: 'assets/images/tebar-iftar.jpg',
                gallery: [
                    'assets/images/tebar-iftar-1.jpg',
                    'assets/images/tebar-iftar-2.jpg',
                    'assets/images/tebar-iftar-3.jpg'
                ],
                eventDate: '2026-08-20T00:00:00.000Z',
                status: 'published',
                createdAt: '2026-08-20T05:00:00.000Z',
                author: 'Admin WIZ Babel'
            },
            {
                id: 'news-tebar-sembako-nusantara',
                title: 'Tebar Sembako Nusantara Sambut Keberkahan',
                category: 'Kegiatan & Penyaluran',
                content: 'WIZ Bangka Belitung melaksanakan kegiatan sosial berupa penyaluran paket sembako untuk keluarga pra-sejahtera dan lansia dhuafa di Bangka Belitung.',
                imageUrl: 'assets/images/sedekah-beras-dhuafa.jpg',
                gallery: [
                    'assets/images/foto-utama-wiz.jpg'
                ],
                eventDate: '2026-02-12T00:00:00.000Z',
                status: 'published',
                createdAt: '2026-02-12T08:00:00.000Z',
                author: 'Admin WIZ Babel'
            },
            {
                id: 'news-sedekah-beras-dai',
                title: 'Sedekah Beras Dai di Koba Bangka Tengah',
                category: 'Kegiatan & Penyaluran',
                content: 'KOBA, BANGKA TENGAH — Wahdah Inspirasi Zakat (WIZ) Kepulauan Bangka Belitung kembali merealisasikan pilar program Dakwah melalui penyaluran Program Sedekah Beras Dai yang berlangsung di wilayah Koba, Kabupaten Bangka Tengah, pada Selasa (27/01/2026).\n\nProgram ini diselenggarakan sebagai langkah nyata WIZ Babel dalam memberikan apresiasi serta dukungan logistik kepada para dai yang berdedikasi membina umat dan mensyiarkan dakwah di pelosok daerah. Melalui bantuan pangan pokok berupa beras berkualitas, diharapkan kebutuhan harian para dai dan keluarganya dapat terpenuhi dengan baik.\n\nPenyaluran bantuan beras ini menjadi wujud kepedulian berkelanjutan untuk memastikan kelancaran aktivitas syiar Islam di lapangan. Kebutuhan dasar yang terpenuhi memberikan ketenangan bagi para dai dalam menjalankan peran strategis pembinaan spiritual dan sosial masyarakat di Bangka Tengah.\n\nPihak WIZ Bangka Belitung menyampaikan apresiasi dan terima kasih kepada seluruh donatur serta muhsinin yang telah menitipkan amanah infak dan sedekahnya. Semoga keberkahan senantiasa melimpah bagi para dermawan, serta menjadi pendorong semangat bagi para dai dalam memperkuat pembinaan umat.\n\nSalurkan Donasi Melalui Website Resmi WIZ Bangka Belitung:\nWebsite: wizbangkabelitung.or.id',
                imageUrl: 'assets/images/sedekah-beras-dai.jpg',
                gallery: [],
                eventDate: '2026-01-27T00:00:00.000Z',
                status: 'published',
                createdAt: '2026-01-27T08:00:00.000Z',
                author: 'Super Admin 1 (WIZ Babel)'
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
        const isAdmin = window.location.pathname.includes('admin') || 
                        window.location.href.includes('admin.html') ||
                        sessionStorage.getItem('wiz_admin_authenticated') === 'true' ||
                        localStorage.getItem('wiz_admin_logged_in') === 'true';

        // Never push from unauthenticated public visitor mobile phones/browsers
        if (!isAdmin && !window.__wiz_allow_public_push) {
            return { success: true, skipped: true };
        }

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
                quotes: getStore(STORAGE_KEYS.QUOTES) || DEFAULT_QUOTES,
                programs: getStore(STORAGE_KEYS.PROGRAMS) || DEFAULT_PROGRAMS,
                deleted_ids: Array.from(getDeletedIds()),
                deleted_news_ids: Array.from(getDeletedNewsIds()),
                deleted_disb_ids: Array.from(getDeletedDisbIds()),
                deleted_ref_ids: Array.from(getDeletedRefIds()),
                deleted_quote_ids: Array.from(getDeletedQuoteIds()),
                deleted_program_ids: Array.from(getDeletedProgramIds()),
                deleted_admin_ids: Array.from(getDeletedAdminIds())
            };

            const payload = {
                action: 'sync_bundle',
                bundle,
                deletedIds: bundle.deleted_ids,
                deletedNewsIds: bundle.deleted_news_ids,
                deletedDisbIds: bundle.deleted_disb_ids,
                deletedRefIds: bundle.deleted_ref_ids,
                deletedQuoteIds: bundle.deleted_quote_ids,
                deletedProgramIds: bundle.deleted_program_ids,
                deletedAdminIds: bundle.deleted_admin_ids
            };

            // 1. Primary: Push to Vercel Serverless Sync API (/api/sync)
            let pushedApi = false;
            try {
                const apiRes = await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (apiRes.ok) {
                    pushedApi = true;
                    console.log('[WIZ Sync] Master state successfully pushed to local /api/sync');
                }
            } catch (e) {}

            // 2. Direct Supabase Master Bundle Push
            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.upsert('site_settings', {
                        key: 'master_bundle',
                        value: bundle,
                        updated_at: new Date().toISOString()
                    });
                } catch(e) {}
            }

            // Always push to remote production endpoint so Vercel & mobile phones get it immediately
            if (window.location.hostname !== 'www.wizbangkabelitung.or.id' && window.location.hostname !== 'wizbangkabelitung.or.id') {
                try {
                    await fetch('https://www.wizbangkabelitung.or.id/api/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    console.log('[WIZ Sync] Master state successfully pushed to remote production /api/sync');
                } catch(err) {
                    console.warn('[WIZ Sync] Remote production push error:', err);
                }
            }

            // 3. Secondary: Firestore Master Bundle & Individual News Documents
            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                try {
                    // Sync each news article to its own document in Firestore so size never exceeds 1MB
                    const allNews = getStore(STORAGE_KEYS.NEWS) || [];
                    for (const n of allNews.slice(0, 20)) {
                        if (n && n.id) {
                            try {
                                await window.wizFirebase.set('news', String(n.id), n);
                            } catch(e) {}
                        }
                    }

                    // Save bundle
                    await window.wizFirebase.set('system_state', 'master_bundle', {
                        ...bundle,
                        updatedAt: new Date().toISOString()
                    });
                } catch(e) {
                    console.warn('[WIZ Sync] Firestore set error:', e);
                }
            }

            broadcastSync();
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return { status: 'success', report };
        } catch (e) {
            console.error('[WIZ Sync] Push error:', e);
            return { status: 'error', message: e.message };
        }
    }

    // ─── Sync From Cloud (Supabase Primary & Vercel API) ─────────────
    async function syncFromCloud(force = false) {
        const now = Date.now();
        if (!force && (now - lastSyncTimestamp < 2000 || isSyncInProgress)) {
            return;
        }
        isSyncInProgress = true;
        lastSyncTimestamp = now;

        try {
            let masterData = null;

            // 1. Primary: Direct Supabase Fetch
            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    const sbRes = await window.wizSupabase.select('site_settings', { filter: 'key=eq.master_bundle' });
                    if (sbRes && sbRes.data && sbRes.data.length > 0 && sbRes.data[0].value) {
                        masterData = sbRes.data[0].value;
                    }
                } catch(e) {}
            }

            // 2. Secondary: /api/sync endpoint
            if (!masterData) {
                try {
                    const res = await fetch('/api/sync', {
                        headers: { 'Accept': 'application/json' },
                        cache: 'no-cache'
                    });
                    if (res.ok) {
                        const json = await res.json();
                        if (json && json.data) masterData = json.data;
                    }
                } catch (err) {}
            }

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

            // 3. Third Fallback: Firestore Master Bundle
            if (!masterData && window.wizFirebase && window.wizFirebase.isConfigured()) {
                try {
                    const { data } = await window.wizFirebase.select('system_state');
                    const masterDoc = (data || []).find(d => d.id === 'master_bundle' || d.key === 'master_bundle');
                    if (masterDoc) masterData = masterDoc;
                } catch(e) {}
            }

            // 4. Fourth Fallback: Static canonical snapshot
            if (!masterData) {
                try {
                    const res = await fetch('assets/data/canonical-store.json', { cache: 'no-cache' });
                    if (res.ok) masterData = await res.json();
                } catch (e) {}
            }

            // Query Supabase tables directly to ensure 100% freshness
            let directSbNews = null;
            let directSbDonations = null;
            let directSbDisbursements = null;
            let directSbReferrals = null;
            let directSbSettings = null;

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    const sbNewsRes = await window.wizSupabase.select('news');
                    if (sbNewsRes && Array.isArray(sbNewsRes.data) && sbNewsRes.data.length > 0) {
                        directSbNews = sbNewsRes.data.map(n => ({
                            id: n.id,
                            title: n.title,
                            category: n.category,
                            content: n.content,
                            imageUrl: n.image_url,
                            gallery: Array.isArray(n.gallery) ? n.gallery : [],
                            eventDate: n.event_date,
                            status: n.status,
                            author: n.author,
                            createdAt: n.created_at,
                            updatedAt: n.updated_at
                        }));
                    }
                } catch(e) {}

                try {
                    const sbDonRes = await window.wizSupabase.select('donations');
                    if (sbDonRes && Array.isArray(sbDonRes.data)) {
                        directSbDonations = sbDonRes.data.map(d => {
                            let extractedWilayah = d.wilayah || 'Pangkalpinang';
                            let extractedProg = String(d.program_spesifik || d.program_title || d.program || '-');
                            let extractedCat = d.program_utama || d.category || '-';
                            let extractedRef = d.referral_id || d.referral_code || null;
                            let extractedFee = Number(d.referral_fee) || 0;
                            let isRecurring = d.is_recurring_donor || false;

                            const progTitleStr = String(d.program_title || '');
                            if (progTitleStr.includes('[')) {
                                const mWil = progTitleStr.match(/\[([^\]]+)\]/);
                                if (mWil) extractedWilayah = mWil[1].trim();
                            }

                            const notesStr = String(d.notes || '');
                            if (notesStr.includes('[Meta:')) {
                                const m = notesStr.match(/\[Meta:([^\]]+)\]/);
                                if (m) {
                                    const parts = m[1].split('|').map(s => s.trim());
                                    parts.forEach(p => {
                                        if (p.startsWith('Wilayah:')) extractedWilayah = p.replace('Wilayah:', '').trim();
                                        if (p.startsWith('Kategori:')) extractedCat = p.replace('Kategori:', '').trim();
                                        if (p.startsWith('Program:')) extractedProg = p.replace('Program:', '').trim();
                                        if (p.startsWith('Mitra:')) {
                                            const refMatch = p.match(/Mitra:\s*([^\s(]+)/);
                                            if (refMatch) extractedRef = refMatch[1];
                                            const feeMatch = p.match(/Rp\s*([0-9.]+)/);
                                            if (feeMatch) extractedFee = Number(feeMatch[1].replace(/[^0-9]/g, ''));
                                        }
                                        if (p.includes('Donatur Tetap')) isRecurring = true;
                                    });
                                }
                            }

                            if (extractedProg.includes('[')) {
                                extractedProg = extractedProg.replace(/\[[^\]]+\]/g, '').trim();
                            }

                            if (!extractedCat || extractedCat === '-') {
                                extractedCat = mapProgramToPillar(extractedProg, d.donation_type);
                            }

                            return {
                                id: d.id,
                                donorName: d.donor_name || 'Hamba Allah',
                                donorPhone: d.donor_phone || '-',
                                donorEmail: d.donor_email || '',
                                wilayah: extractedWilayah,
                                type: d.donation_type || 'Infak Terikat',
                                programUtama: extractedCat,
                                programSpesifik: extractedProg,
                                program: extractedProg,
                                category: extractedCat,
                                amount: Number(d.amount) || 0,
                                alokasiOperasional: Number(d.alokasi_operasional) || (d.donation_type === 'Infak Terikat' ? Math.round(Number(d.amount) * 0.125) : 0),
                                alokasiProgram: Number(d.alokasi_program) || (d.donation_type === 'Infak Terikat' ? Math.round(Number(d.amount) * 0.875) : 0),
                                method: d.payment_method || 'Transfer Bank',
                                referralId: extractedRef,
                                referralCode: extractedRef,
                                referralRate: 6,
                                referralFee: extractedFee,
                                isRecurringDonor: isRecurring,
                                notes: (d.notes || '-').replace(/\[Meta:[^\]]*\]/g, '').trim() || '-',
                                status: d.status || 'pending',
                                verifiedAt: d.verified_at || (d.status === 'verified' ? (d.updated_at || d.created_at) : null),
                                verifiedBy: d.verified_by || (d.status === 'verified' ? 'Admin' : null),
                                createdAt: d.created_at || new Date().toISOString()
                            };
                        });
                    }
                } catch(e) {}

                try {
                    const sbDisbRes = await window.wizSupabase.select('disbursements');
                    if (sbDisbRes && Array.isArray(sbDisbRes.data)) {
                        directSbDisbursements = sbDisbRes.data.map(d => ({
                            id: d.id,
                            wilayah: d.wilayah,
                            program: d.program,
                            amount: Number(d.amount) || 0,
                            description: d.description,
                            disbursedAt: d.disbursed_at,
                            recordedBy: d.recorded_by,
                            createdAt: d.created_at
                        }));
                    }
                } catch(e) {}

                try {
                    const sbRefRes = await window.wizSupabase.getReferrals();
                    if (sbRefRes && Array.isArray(sbRefRes.data) && sbRefRes.data.length > 0) {
                        directSbReferrals = sbRefRes.data;
                    }
                } catch(e) {}

                try {
                    const sbSetRes = await window.wizSupabase.getSiteSettings();
                    if (sbSetRes && sbSetRes.data && typeof sbSetRes.data === 'object') {
                        directSbSettings = sbSetRes.data;
                    }
                } catch(e) {}
            }

            if (!masterData && !directSbDonations && !directSbDisbursements && !directSbNews && !directSbReferrals && !directSbSettings) {
                isSyncInProgress = false;
                return;
            }
            masterData = masterData || {};

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
            if (Array.isArray(masterData.deleted_quote_ids)) {
                masterData.deleted_quote_ids.forEach(id => addDeletedQuoteId(id));
            }

            const deletedSet = getDeletedIds();
            const deletedNewsSet = getDeletedNewsIds();
            const deletedDisbSet = getDeletedDisbIds();
            const deletedRefSet = getDeletedRefIds();
            const deletedQuoteSet = getDeletedQuoteIds();

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
                        const tLocal = new Date(localItem.updatedAt || localItem.verifiedAt || localItem.createdAt || 0).getTime();
                        const tCloud = new Date(cloudItem.updatedAt || cloudItem.verifiedAt || cloudItem.createdAt || 0).getTime();
                        let mergedItem;
                        if (tLocal >= tCloud) {
                            mergedItem = { ...cloudItem, ...localItem };
                        } else {
                            mergedItem = { ...localItem, ...cloudItem };
                        }
                        if (localItem.imageUrl && (!cloudItem.imageUrl || localItem.imageUrl.startsWith('data:image') || tLocal >= tCloud)) {
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

            // Sync Donations: Use direct Supabase table as primary source
            const authoritativeDonations = (directSbDonations !== null)
                ? directSbDonations
                : (masterData && Array.isArray(masterData.donations) ? masterData.donations : []);
            smartMerge(STORAGE_KEYS.DONATIONS, authoritativeDonations, (a, b) => new Date(b.createdAt) - new Date(a.createdAt), deletedSet);

            // News Sync: Use direct Supabase news table as authoritative source
            const authoritativeNews = (directSbNews && Array.isArray(directSbNews) && directSbNews.length > 0)
                ? directSbNews
                : (masterData && Array.isArray(masterData.news) ? masterData.news : []);

            if (authoritativeNews.length > 0) {
                const cloudNewsMap = new Map();
                // 1. Load authoritative cloud news
                authoritativeNews.forEach(n => {
                    if (n && n.id && !deletedNewsSet.has(String(n.id)) && n.status !== 'deleted' && !n.isDeleted) {
                        cloudNewsMap.set(String(n.id), { ...n });
                    }
                });

                // 2. Only retain local items if they are new local drafts not yet present in cloud
                const local = getStore(STORAGE_KEYS.NEWS) || [];
                local.forEach(loc => {
                    if (loc && loc.id && !deletedNewsSet.has(String(loc.id)) && loc.status !== 'deleted') {
                        const strId = String(loc.id);
                        if (!cloudNewsMap.has(strId)) {
                            cloudNewsMap.set(strId, loc);
                        }
                    }
                });

                const mergedNews = Array.from(cloudNewsMap.values());
                mergedNews.sort((a, b) => new Date(b.eventDate || b.event_date || b.createdAt || 0) - new Date(a.eventDate || a.event_date || a.createdAt || 0));
                setStore(STORAGE_KEYS.NEWS, mergedNews);
            }

            // Sync Disbursements: Use direct Supabase table as primary source
            const authoritativeDisbursements = (directSbDisbursements !== null)
                ? directSbDisbursements
                : (masterData && Array.isArray(masterData.disbursements) ? masterData.disbursements : []);
            smartMerge(STORAGE_KEYS.DISBURSEMENTS, authoritativeDisbursements, (a, b) => new Date(b.disbursedAt || b.createdAt) - new Date(a.disbursedAt || a.createdAt), deletedDisbSet);

            // Sync Referrals / Affiliators: Use direct Supabase table as primary source
            const authoritativeReferrals = (directSbReferrals !== null)
                ? directSbReferrals
                : (masterData && Array.isArray(masterData.referrals) ? masterData.referrals : []);
            if (authoritativeReferrals && authoritativeReferrals.length > 0) {
                smartMerge(STORAGE_KEYS.REFERRALS, authoritativeReferrals, (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0), deletedRefSet);
            }

            if (masterData.referral_payouts) {
                smartMerge(STORAGE_KEYS.REFERRAL_PAYOUTS, masterData.referral_payouts, (a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0));
            }
            if (masterData.quotes && Array.isArray(masterData.quotes)) {
                // Authoritative cloud quotes: Single Source of Truth
                const cloudQuotesMap = new Map();
                masterData.quotes.forEach(q => {
                    if (q && q.id && !deletedQuoteSet.has(String(q.id)) && q.status !== 'deleted' && !q.isDeleted) {
                        cloudQuotesMap.set(String(q.id), { ...q });
                    }
                });

                const isAdmin = typeof window !== 'undefined' && (
                    window.location.pathname.includes('admin') || 
                    window.location.href.includes('admin.html')
                );

                if (isAdmin) {
                    const localQuotes = getStore(STORAGE_KEYS.QUOTES) || [];
                    localQuotes.forEach(loc => {
                        if (loc && loc.id && !deletedQuoteSet.has(String(loc.id)) && loc.status !== 'deleted' && !loc.isDeleted) {
                            const strId = String(loc.id);
                            if (!cloudQuotesMap.has(strId)) {
                                cloudQuotesMap.set(strId, loc);
                            }
                        }
                    });
                }

                const mergedQuotes = Array.from(cloudQuotesMap.values());
                mergedQuotes.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
                setStore(STORAGE_KEYS.QUOTES, mergedQuotes);
                window.dispatchEvent(new CustomEvent('wiz-quotes-changed'));
            }

            // Sync Site Settings: Direct Supabase or masterData
            const authoritativeSettings = directSbSettings || (masterData.site_settings ? (masterData.site_settings.value || masterData.site_settings) : null);
            if (authoritativeSettings && typeof authoritativeSettings === 'object') {
                const mergedSettings = { ...DEFAULT_SITE_SETTINGS, ...authoritativeSettings };
                setStore(STORAGE_KEYS.SITE_SETTINGS, mergedSettings);
                window.dispatchEvent(new CustomEvent('wiz-site-settings-changed', { detail: mergedSettings }));
                if (typeof window.applySiteSettings === 'function') {
                    try { window.applySiteSettings(); } catch(e) {}
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
                
                // Synchronize into allocationRulesManager subAllocation
                try {
                    const allRules = allocationRulesManager.getAll();
                    let rulesModified = false;
                    for (const [wKey, wData] of Object.entries(allRules)) {
                        if (!wData.subAllocation) wData.subAllocation = {};
                        for (const [pillarKey, titles] of Object.entries(mergedMap)) {
                            if (!wData.subAllocation[pillarKey]) wData.subAllocation[pillarKey] = { items: [] };
                            const items = wData.subAllocation[pillarKey].items || [];
                            if (Array.isArray(titles)) {
                                titles.forEach(t => {
                                    if (!items.find(i => (i.key || '').toLowerCase() === t.toLowerCase())) {
                                        items.push({ key: t, percent: 0, image: allocationRulesManager.getSpecificProgramImage(t, pillarKey) || '' });
                                        rulesModified = true;
                                    }
                                });
                            }
                            wData.subAllocation[pillarKey].items = items;
                        }
                    }
                    if (rulesModified) {
                        setStore(STORAGE_KEYS.ALLOCATION_RULES, allRules);
                    }
                } catch(e) {}
                window.dispatchEvent(new CustomEvent('wiz-programs-changed', { detail: mergedMap }));
            }
            if (masterData.specific_prog_imgs && typeof masterData.specific_prog_imgs === 'object') {
                const existingImgs = JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}');
                const mergedImgs = { ...existingImgs, ...masterData.specific_prog_imgs };
                localStorage.setItem('wiz_specific_prog_imgs', JSON.stringify(mergedImgs));
                window.dispatchEvent(new CustomEvent('wiz-program-images-changed'));
            }
            if (masterData.baselines && typeof masterData.baselines === 'object') {
                setStore(STORAGE_KEYS.BASELINES, masterData.baselines);
            }
            if (masterData.admin_users && Array.isArray(masterData.admin_users) && masterData.admin_users.length > 0) {
                const deletedAdminSet = getDeletedAdminIds();
                const cloudAdmins = masterData.admin_users.filter(u => u && (u.id || u.username) && u.status !== 'deleted' && !u.isDeleted);
                cloudAdmins.forEach(u => {
                    if (deletedAdminSet.has(String(u.id))) deletedAdminSet.delete(String(u.id));
                    if (u.username && deletedAdminSet.has(u.username.toLowerCase())) deletedAdminSet.delete(u.username.toLowerCase());
                });
                localStorage.setItem(STORAGE_KEYS.DELETED_ADMIN_IDS, JSON.stringify(Array.from(deletedAdminSet)));
                smartMerge(STORAGE_KEYS.ADMIN_USERS, cloudAdmins, (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0), deletedAdminSet);
                window.dispatchEvent(new CustomEvent('wiz-admin-users-changed'));
            }
            if (masterData.programs && Array.isArray(masterData.programs) && masterData.programs.length > 0) {
                smartMerge(STORAGE_KEYS.PROGRAMS, masterData.programs, (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0), getDeletedProgramIds());
                window.dispatchEvent(new CustomEvent('wiz-programs-changed'));
            }

            console.log('[WIZ Sync] Cross-device parity sync complete. News:', (getStore(STORAGE_KEYS.NEWS) || []).length, 'Programs:', (getStore(STORAGE_KEYS.PROGRAMS) || []).length, 'Donations:', (getStore(STORAGE_KEYS.DONATIONS) || []).length, 'Admins:', (getStore(STORAGE_KEYS.ADMIN_USERS) || []).length);
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        } catch (e) {
            console.warn('[WIZ Sync] Sync error, staying on local storage:', e);
        } finally {
            isSyncInProgress = false;
        }
    }

    async function fullBidirectionalSync() {
        try {
            await syncFromCloud(true);
            await pushToCloud();
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

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    window.escapeHtml = escapeHtml;

    // ─── Donations Module ─────────────────────────────────
    // ─── Donor Attributions Manager (Lifetime Recurring Donor Locking) ──
    const donorAttributionsManager = {
        getAll() {
            return getStore(STORAGE_KEYS.DONOR_ATTRIBUTIONS) || {};
        },
        normalizePhone(phone = '') {
            let clean = String(phone).replace(/[^0-9]/g, '');
            if (clean.startsWith('0')) clean = '62' + clean.slice(1);
            if (clean.startsWith('08')) clean = '628' + clean.slice(2);
            return clean;
        },
        getAttribution(phone, email = '') {
            const all = this.getAll();
            const cleanPhone = this.normalizePhone(phone);
            if (cleanPhone && all[cleanPhone]) return all[cleanPhone];
            if (email) {
                const cleanEmail = String(email).trim().toLowerCase();
                if (all[cleanEmail]) return all[cleanEmail];
                for (const item of Object.values(all)) {
                    if (item && item.email && item.email.toLowerCase() === cleanEmail) {
                        return item;
                    }
                }
            }
            return null;
        },
        getMitraForDonor(phone, email = '') {
            const attr = this.getAttribution(phone, email);
            return attr ? (attr.mitraId || attr.referralId || null) : null;
        },
        lockDonor(phone, email, mitraId, donorName = '') {
            if (!mitraId) return null;
            const cleanPhone = this.normalizePhone(phone);
            const cleanEmail = email ? String(email).trim().toLowerCase() : '';
            if (!cleanPhone && !cleanEmail) return null;

            const all = this.getAll();
            const existing = this.getAttribution(cleanPhone, cleanEmail);
            if (existing && (existing.mitraId || existing.referralId)) {
                // Permanently locked to initial mitra, preserving lifetime recurring attribution
                return existing;
            }

            const record = {
                phone: cleanPhone || '',
                email: cleanEmail || '',
                donorName: donorName || (existing ? existing.donorName : '') || 'Hamba Allah',
                mitraId: mitraId,
                lockedAt: new Date().toISOString(),
                isRecurringLocked: true
            };

            if (cleanPhone) all[cleanPhone] = record;
            if (cleanEmail) all[cleanEmail] = record;
            setStore(STORAGE_KEYS.DONOR_ATTRIBUTIONS, all);

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    window.wizSupabase.upsert('donor_attributions', {
                        phone: cleanPhone,
                        email: cleanEmail,
                        donor_name: donorName,
                        mitra_id: mitraId,
                        locked_at: record.lockedAt
                    });
                } catch(e) {}
            }

            console.log(`[WIZ Attribution Locking] Donor ${donorName} (${cleanPhone}) permanently attributed to Mitra: ${mitraId}`);
            return record;
        },
        getDonorsByMitra(mitraId) {
            if (!mitraId) return [];
            const all = this.getAll();
            const map = new Map();
            Object.values(all).forEach(item => {
                if (item && (item.mitraId === mitraId || item.referralId === mitraId)) {
                    const key = item.phone || item.email;
                    if (key && !map.has(key)) {
                        map.set(key, item);
                    }
                }
            });
            return Array.from(map.values());
        }
    };

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

            // ── Lifetime Recurring Donor Attribution Locking ──
            let refId = donation.referralId || null;
            let isRecurring = false;
            const donorPhone = donation.donorPhone || '';
            const donorEmail = donation.donorEmail || '';

            const lockedMitraId = donorAttributionsManager.getMitraForDonor(donorPhone, donorEmail);
            if (lockedMitraId) {
                // Donor was previously acquired by a Mitra -> Retain attribution forever for recurring donation
                refId = lockedMitraId;
                isRecurring = true;
            } else if (refId) {
                // First-time donor coming via referral link -> Lock to this initial Mitra
                donorAttributionsManager.lockDonor(donorPhone, donorEmail, refId, donation.donorName);
                isRecurring = false;
            }

            const refRate = donation.referralRate !== undefined ? Number(donation.referralRate) : 6;
            const refFee = refId ? (donation.referralFee !== undefined ? Number(donation.referralFee) : Math.round(donationAmount * (refRate / 100))) : 0;
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
                referralId: refId,
                referralCode: donation.referralCode || refId || null,
                referralName: donation.referralName || null,
                referralRate: refRate,
                referralFee: refFee,
                additionalBonus: addBonus,
                isRecurringDonor: isRecurring,
                // Legacy (agar kompatibel dengan render yang sudah ada)
                program: programSpesifik,
                category: programUtama,
                type: donation.type || 'Infak Terikat',
                amount: donationAmount,
                method: donation.method || 'Transfer Bank / WA',
                proofImage: donation.proofImage || donation.proof_image || '',
                notes: donation.notes || '-',
                status: donation.status || 'pending',
                createdAt: donation.createdAt || new Date().toISOString(),
                verifiedAt: donation.status === 'verified' ? new Date().toISOString() : null,
                verifiedBy: donation.status === 'verified' ? (donation.verifiedBy || 'Admin') : null
            };

            list.unshift(newDonation);
            setStore(STORAGE_KEYS.DONATIONS, list);

            const wilayahLabel = newDonation.wilayah !== '-' ? ` [${newDonation.wilayah}]` : '';
            const msgStatus = newDonation.status === 'verified' ? 'langsung diverifikasi' : 'menunggu verifikasi';
            const recurringLabel = isRecurring ? ' [Donatur Tetap Mitra]' : '';
            activityLog.add('donation_in', `Donasi ${formatRupiahCompact(newDonation.amount)} dari ${newDonation.donorName}${wilayahLabel}${recurringLabel} (${msgStatus}).`, donation.verifiedBy || 'Admin');

            // Dispatch local events immediately
            window.dispatchEvent(new CustomEvent('wiz-donations-changed', { detail: { action: 'add', donation: newDonation } }));
            window.dispatchEvent(new CustomEvent('wiz-referrals-changed'));

            // Background Async Cloud Persistence (Non-blocking: instant < 50ms response for donor)
            (async () => {
                const cloudTasks = [];
                if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                    cloudTasks.push(window.wizFirebase.insert('donations', newDonation).catch(() => {}));
                }
                if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                    cloudTasks.push(window.wizSupabase.saveDonation(newDonation).catch(() => {}));
                }
                cloudTasks.push(
                    fetch('/api/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ donations: [newDonation] })
                    }).catch(() => {})
                );
                if (typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname !== 'www.wizbangkabelitung.or.id' && window.location.hostname !== 'wizbangkabelitung.or.id') {
                    cloudTasks.push(
                        fetch('https://www.wizbangkabelitung.or.id/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ donations: [newDonation] })
                        }).catch(() => {})
                    );
                }
                await Promise.allSettled(cloudTasks);
                try { await pushToCloud(); } catch(e) {}
                window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            })();

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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.saveDonation({
                        id: String(id),
                        donor_name: list[idx].donorName,
                        donor_phone: list[idx].donorPhone,
                        donor_email: list[idx].donorEmail,
                        wilayah: list[idx].wilayah,
                        donation_type: list[idx].type,
                        program_utama: programUtama,
                        program_spesifik: programSpesifik,
                        program_title: list[idx].program || list[idx].programSpesifik || list[idx].programUtama || 'Umum',
                        amount: list[idx].amount,
                        alokasi_operasional: alokasiOperasional,
                        alokasi_program: alokasiProgram,
                        payment_method: list[idx].method,
                        referral_id: refId,
                        referral_code: refId,
                        referral_rate: refRate,
                        referral_fee: refFee,
                        notes: list[idx].notes,
                        status: list[idx].status
                    });
                } catch(e) {}
            }

            try { await pushToCloud(); } catch(e) {}
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            try {
                window.dispatchEvent(new CustomEvent('wiz-data-changed', {
                    detail: { action: 'update_donation', id: String(id), referralId: refId, fee: refFee }
                }));
            } catch(e) {}
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    const sbRes = await window.wizSupabase.update('donations', String(donationId), {
                        status: 'verified'
                    });
                    if (sbRes.error) {
                        console.warn('[Supabase Verify Error]:', sbRes.error);
                    } else {
                        console.log('✅ [Supabase Verify Success]:', donationId);
                    }
                } catch(e) {
                    console.warn('[Supabase Verify Exception]:', e);
                }
            }

            // Real-time broadcast updated donation to /api/sync
            try {
                await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ donations: [list[idx]] })
                });
            } catch(e) {}

            try { await pushToCloud(); } catch(e) {}

            broadcastSync('DONATION_VERIFIED', list[idx]);
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            window.dispatchEvent(new CustomEvent('wiz-donations-changed', { detail: { action: 'verify', id: donationId } }));
            window.dispatchEvent(new CustomEvent('wiz-referrals-changed'));
            try {
                window.dispatchEvent(new CustomEvent('wiz-data-changed', { detail: { action: 'verify_donation', id: donationId } }));
            } catch(e) {}
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    const sbRes = await window.wizSupabase.update('donations', String(donationId), {
                        status: 'rejected'
                    });
                    if (sbRes.error) console.warn('[Supabase Reject Error]:', sbRes.error);
                } catch(e) {
                    console.warn('[Supabase Reject Exception]:', e);
                }
            }

            // Real-time broadcast rejected donation to /api/sync
            try {
                await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ donations: [list[idx]] })
                });
            } catch(e) {}

            try { await pushToCloud(); } catch(e) {}

            broadcastSync('DONATION_REJECTED', list[idx]);
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            window.dispatchEvent(new CustomEvent('wiz-donations-changed', { detail: { action: 'reject', id: donationId } }));
            window.dispatchEvent(new CustomEvent('wiz-referrals-changed'));
            try {
                window.dispatchEvent(new CustomEvent('wiz-data-changed', { detail: { action: 'reject_donation', id: donationId } }));
            } catch(e) {}
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.remove('donations', strId);
                } catch(e) {}
            }

            // Real-time broadcast of deleted donation to /api/sync
            try {
                await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deleted_donation_ids: [strId], deleted_ids: [strId] })
                });
            } catch(e) {}

            try { await pushToCloud(); } catch(e) {}

            broadcastSync('DONATION_DELETED', { id: strId });
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            window.dispatchEvent(new CustomEvent('wiz-donations-changed', { detail: { action: 'delete', id: strId } }));
            window.dispatchEvent(new CustomEvent('wiz-referrals-changed'));
            try {
                window.dispatchEvent(new CustomEvent('wiz-data-changed', { detail: { action: 'delete_donation', id: strId } }));
            } catch(e) {}
        },

        count() { return this.getVerified().length; },
        countPending() { return this.getPending().length; },

        getRecentVerified(limit = 10) {
            const list = this.getVerified();
            return list.slice(0, limit).map(d => {
                const isInfakUmum = d.type === 'Infak Umum' || (!d.programSpesifik && d.program === 'Infak Umum');
                const progDisplay = isInfakUmum
                    ? 'Infak Umum (Kebaikan Semua Program)'
                    : (d.programSpesifik || d.program || d.programUtama || 'Donasi Kebaikan');
                
                const rawName = (d.donorName || 'Hamba Allah').trim();
                const isAnon = rawName.toLowerCase() === 'hamba allah' || rawName.toLowerCase() === 'anonim' || !rawName;
                const displayName = isAnon ? 'Hamba Allah' : rawName;

                return {
                    id: d.id,
                    donorName: displayName,
                    isAnonymous: isAnon,
                    program: progDisplay,
                    programRaw: d.programSpesifik || d.program || d.type,
                    isInfakUmum: isInfakUmum,
                    type: d.type,
                    wilayah: d.wilayah || 'Pangkalpinang',
                    amount: Number(d.amount) || 0,
                    method: d.method || 'Transfer Bank',
                    status: 'verified',
                    createdAt: d.createdAt || new Date().toISOString(),
                    timeAgo: timeAgo(d.createdAt)
                };
            });
        }
    };

    // ─── News Module ──────────────────────────────────────
    const news = {
        getAll() {
            let raw = getStore(STORAGE_KEYS.NEWS);
            if (!Array.isArray(raw) || raw.length === 0) {
                // If local storage is empty, initialize with default canonical seed
                raw = [
                    {
                        id: 'news-beasiswa-anak-sekolah',
                        title: 'WIZ Babel Salurkan Beasiswa Pendidikan untuk Anak Masuk Sekolah',
                        category: 'Kegiatan & Penyaluran',
                        content: 'PANGKALPINANG — Wahdah Inspirasi Zakat (WIZ) Bangka Belitung kembali menyalurkan bantuan pendidikan melalui pilar program Berkah Juara untuk anak-anak yatim dan dhuafa yang memasuki tahun ajaran baru.\n\nBantuan berupa seragam, perlengkapan sekolah, dan beasiswa tunai ini diserahkan langsung guna memastikan keberlanjutan pendidikan generasi muda penerus bangsa.\n\nSemoga bantuan ini meringankan beban keluarga dan menjadi amal jariyah bagi para donatur.',
                        imageUrl: 'assets/images/foto-utama-wiz.jpg',
                        gallery: ['assets/images/beasiswa-tahfidz.jpg'],
                        eventDate: '2026-07-08T00:00:00.000Z',
                        status: 'published',
                        createdAt: '2026-07-08T08:00:00.000Z',
                        author: 'Super Admin 1 (WIZ Babel)'
                    },
                    {
                        id: 'news-bantuan-kesehatan-jantung',
                        title: 'Ringankan Beban Pengobatan Jantung, WIZ Babel Salurkan Bantuan Kesehatan',
                        category: 'Kegiatan & Penyaluran',
                        content: 'PANGKALPINANG — Wahdah Inspirasi Zakat (WIZ) Bangka Belitung kembali menyalurkan bantuan program kesehatan bagi warga dhuafa penderita penyakit jantung di Kota Pangkalpinang.\n\nBantuan operasional pengobatan dan santunan ini diserahkan langsung oleh relawan WIZ di kediaman pasien guna mendukung proses pemulihan dan rawat jalan.\n\nKeluarga penerima manfaat menyampaikan rasa haru dan terima kasih mendalam atas kepedulian para muhsinin.',
                        imageUrl: 'assets/images/tebar-iftar-3.jpg',
                        gallery: ['assets/images/sedekah-beras-dhuafa.jpg', 'assets/images/foto-utama-wiz.jpg'],
                        eventDate: '2026-06-10T00:00:00.000Z',
                        status: 'published',
                        createdAt: '2026-06-10T08:00:00.000Z',
                        author: 'Super Admin 1 (WIZ Babel)'
                    },
                    {
                        id: 'news-pangan-beras-masyarakat',
                        title: 'Penuhi Kebutuhan Pangan Masyarakat, WIZ Babel Salurkan Beras Premium',
                        category: 'Kegiatan & Penyaluran',
                        content: 'PANGKALPINANG (wizbangkabelitung.or.id) — Laznas Wahdah Inspirasi Zakat (WIZ) Bangka Belitung kembali menunjukkan kepedulian nyata dengan menyalurkan beras premium dan sembako untuk keluarga pra-sejahtera dan dhuafa di pelosok Bangka Belitung guna menjaga ketahanan pangan keluarga.',
                        imageUrl: 'assets/images/sedekah-beras-dai.jpg',
                        gallery: ['assets/images/sedekah-beras-dhuafa.jpg', 'assets/images/tebar-iftar-1.jpg'],
                        eventDate: '2026-05-18T00:00:00.000Z',
                        status: 'published',
                        createdAt: '2026-05-18T08:00:00.000Z',
                        author: 'Super Admin 1 (WIZ Babel)'
                    },
                    {
                        id: 'news-beasiswa-stiba-unmuh',
                        title: 'WIZ Bangka Belitung Salurkan Beasiswa Pendidikan Rutin Bulanan untuk Mahasiswa STIBA Makassar dan Unmuh Babel',
                        category: 'Kegiatan & Penyaluran',
                        content: 'PANGKALPINANG — Wahdah Inspirasi Zakat (WIZ) Bangka Belitung kembali menunjukkan komitmennya dalam mendukung keberlanjutan pendidikan generasi muda berprestasi melalui program Beasiswa Pendidikan Rutin Bulanan untuk mahasiswa STIBA Makassar dan Unmuh Babel.\n\nBantuan beasiswa ini diserahkan langsung guna meringankan biaya operasional perkuliahan, pembelian kitab/buku referensi, serta kebutuhan penunjang studi para mahasiswa penghafal Al-Qur\'an.\n\nSemoga bantuan ini memotivasi para penerima manfaat untuk terus berprestasi dan menjadi berkah jariyah bagi seluruh donatur WIZ Babel.',
                        imageUrl: 'assets/images/beasiswa-tahfidz.jpg',
                        gallery: ['assets/images/foto-utama-wiz.jpg'],
                        eventDate: '2026-08-17T00:00:00.000Z',
                        status: 'published',
                        createdAt: '2026-08-17T08:00:00.000Z',
                        author: 'Super Admin 1 (WIZ Babel)'
                    },
                    {
                        id: 'news-zakat-fitrah-babel',
                        title: 'Zakat Fitrah WIZ Babel Hadirkan Kebahagiaan',
                        category: 'Kegiatan & Penyaluran',
                        content: 'Lembaga Amil Zakat Wahdah Inspirasi Zakat Bangka Belitung menyalurkan zakat fitrah kepada para mustahik di Wilayah Kota Pangkal Pinang dan sekitarnya.\n\nPenyaluran ini disambut dengan penuh rasa syukur dan sukacita oleh warga penerima manfaat. Paket beras zakat fitrah berkualitas premium disalurkan langsung ke rumah-rumah warga dhuafa jelang Hari Raya Idul Fitri guna memastikan tidak ada keluarga yang kelaparan di hari kemenangan.',
                        imageUrl: 'assets/images/sedekah-beras-dhuafa.jpg',
                        gallery: ['assets/images/sedekah-beras-dai.jpg', 'assets/images/foto-utama-wiz.jpg'],
                        eventDate: '2026-03-19T00:00:00.000Z',
                        status: 'published',
                        createdAt: '2026-03-19T08:00:00.000Z',
                        author: 'Super Admin 1 (WIZ Babel)'
                    },
                    {
                        id: 'news-santunan-yatim-quran',
                        title: 'Santunan Anak Yatim dan Tebar Al-Qur\'an Nusantara Ramadan Makin Bahagia 1447 H',
                        category: 'Kegiatan & Penyaluran',
                        content: 'WIZ Bangka Belitung melaksanakan kegiatan santunan anak yatim dan tebar al-Qur\'an Nusantara. Kegiatan ini dibuka dengan pembacaan ayat suci Al-Qur\'an dan dilanjutkan dengan penyerahan santunan uang tunai, perlengkapan ibadah, bingkisan perlengkapan sekolah, serta mushaf Al-Qur\'an untuk anak-anak yatim binaan di Bangka Belitung.\n\nKegiatan berlangsung khidmat dan diakhiri dengan doa bersama untuk para muhsinin dan donatur.',
                        imageUrl: 'assets/images/tebar-iftar-1.jpg',
                        gallery: ['assets/images/tebar-iftar.jpg', 'assets/images/sedekah-beras-dhuafa.jpg', 'assets/images/beasiswa-tahfidz.jpg'],
                        eventDate: '2026-03-14T00:00:00.000Z',
                        status: 'published',
                        createdAt: '2026-03-14T08:00:00.000Z',
                        author: 'Super Admin 1 (WIZ Babel)'
                    },
                    {
                        id: 'news-tebar-iftar-ramadan',
                        title: 'Tebar Iftar Ramadan Makin Bahagia Bersama WIZ Bangka Belitung',
                        category: 'Kegiatan & Penyaluran',
                        content: 'Alhamdulillah, Wahdah Inspirasi Zakat (WIZ) Bangka Belitung menyalurkan ratusan paket buka puasa (Tebar Iftar) penuh gizi dan kebahagiaan untuk santri tahfidz, dhuafa, dan masyarakat kurang mampu di berbagai pelosok Bangka Belitung.\n\nKegiatan ini merupakan komitmen berkelanjutan WIZ Babel untuk menghadirkan senyum dan kebahagiaan di bulan suci Ramadan.\n\nTerima kasih kepada seluruh donatur dan sahabat inspirasi atas kepercayaannya.',
                        imageUrl: 'assets/images/tebar-iftar.jpg',
                        gallery: ['assets/images/tebar-iftar-1.jpg', 'assets/images/tebar-iftar-2.jpg', 'assets/images/tebar-iftar-3.jpg'],
                        eventDate: '2026-08-20T00:00:00.000Z',
                        status: 'published',
                        createdAt: '2026-08-20T05:00:00.000Z',
                        author: 'Admin WIZ Babel'
                    },
                    {
                        id: 'news-tebar-sembako-nusantara',
                        title: 'Tebar Sembako Nusantara Sambut Keberkahan',
                        category: 'Kegiatan & Penyaluran',
                        content: 'WIZ Bangka Belitung melaksanakan kegiatan sosial berupa penyaluran paket sembako untuk keluarga pra-sejahtera dan lansia dhuafa di Bangka Belitung.',
                        imageUrl: 'assets/images/sedekah-beras-dhuafa.jpg',
                        gallery: ['assets/images/foto-utama-wiz.jpg'],
                        eventDate: '2026-02-12T00:00:00.000Z',
                        status: 'published',
                        createdAt: '2026-02-12T08:00:00.000Z',
                        author: 'Admin WIZ Babel'
                    },
                    {
                        id: 'news-sedekah-beras-dai',
                        title: 'Sedekah Beras Dai di Koba Bangka Tengah',
                        category: 'Kegiatan & Penyaluran',
                        content: 'KOBA, BANGKA TENGAH — Wahdah Inspirasi Zakat (WIZ) Kepulauan Bangka Belitung kembali merealisasikan pilar program Dakwah melalui penyaluran Program Sedekah Beras Dai yang berlangsung di wilayah Koba, Kabupaten Bangka Tengah, pada Selasa (27/01/2026).\n\nProgram ini diselenggarakan sebagai langkah nyata WIZ Babel dalam memberikan apresiasi serta dukungan logistik kepada para dai yang berdedikasi membina umat dan mensyiarkan dakwah di pelosok daerah. Melalui bantuan pangan pokok berupa beras berkualitas, diharapkan kebutuhan harian para dai dan keluarganya dapat terpenuhi dengan baik.\n\nPenyaluran bantuan beras ini menjadi wujud kepedulian berkelanjutan untuk memastikan kelancaran aktivitas syiar Islam di lapangan. Kebutuhan dasar yang terpenuhi memberikan ketenangan bagi para dai dalam menjalankan peran strategis pembinaan spiritual dan sosial masyarakat di Bangka Tengah.\n\nPihak WIZ Bangka Belitung menyampaikan apresiasi dan terima kasih kepada seluruh donatur serta muhsinin yang telah menitipkan amanah infak dan sedekahnya. Semoga keberkahan senantiasa melimpah bagi para dermawan, serta menjadi pendorong semangat bagi para dai dalam memperkuat pembinaan umat.\n\nSalurkan Donasi Melalui Website Resmi WIZ Bangka Belitung:\nWebsite: wizbangkabelitung.or.id',
                        imageUrl: 'assets/images/sedekah-beras-dai.jpg',
                        gallery: [],
                        eventDate: '2026-01-27T00:00:00.000Z',
                        status: 'published',
                        createdAt: '2026-01-27T08:00:00.000Z',
                        author: 'Super Admin 1 (WIZ Babel)'
                    }
                ];
                setStore(STORAGE_KEYS.NEWS, raw);
            }

            return raw
                .filter(n => n && n.id && n.status !== 'deleted' && !n.isDeleted)
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.upsert('news', {
                        id: String(newArticle.id),
                        title: newArticle.title,
                        category: newArticle.category,
                        content: newArticle.content,
                        image_url: newArticle.imageUrl,
                        gallery: newArticle.gallery,
                        event_date: newArticle.eventDate,
                        status: newArticle.status,
                        author: newArticle.author,
                        created_at: newArticle.createdAt
                    });
                } catch(e) {}
            }

            // Background non-blocking cloud push
            if (typeof pushToCloud === 'function') {
                pushToCloud().catch(() => {});
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    const item = list[idx];
                    await window.wizSupabase.upsert('news', {
                        id: String(item.id),
                        title: item.title,
                        category: item.category,
                        content: item.content,
                        image_url: item.imageUrl,
                        gallery: item.gallery,
                        event_date: item.eventDate,
                        status: item.status,
                        author: item.author,
                        created_at: item.createdAt,
                        updated_at: item.updatedAt
                    });
                } catch(e) {}
            }

            // Background non-blocking cloud push
            if (typeof pushToCloud === 'function') {
                pushToCloud().catch(() => {});
            }

            broadcastSync('NEWS_UPDATED', list[idx]);
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return list[idx];
        },

        async toggleStatus(articleId) {
            const list = getStore(STORAGE_KEYS.NEWS) || [];
            const idx = list.findIndex(n => String(n.id) === String(articleId));
            if (idx === -1) return null;

            const newStatus = list[idx].status === 'published' ? 'draft' : 'published';
            list[idx].status = newStatus;
            list[idx].updatedAt = new Date().toISOString();
            setStore(STORAGE_KEYS.NEWS, list);

            const statusLabel = newStatus === 'published' ? 'dipublikasikan ke web' : 'disimpan sebagai draft (disembunyikan dari web)';
            activityLog.add('news', `Status berita "${list[idx].title}" diubah: ${statusLabel}.`, sessionStorage.getItem('wiz_admin_name') || 'Admin');

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    const item = list[idx];
                    const sbRes = await window.wizSupabase.saveNews({
                        id: String(item.id),
                        title: item.title,
                        category: item.category,
                        content: item.content,
                        imageUrl: item.imageUrl,
                        gallery: item.gallery || [],
                        eventDate: item.eventDate,
                        status: item.status,
                        author: item.author,
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt
                    });
                    if (sbRes.error) {
                        console.warn('[News Toggle Supabase Error]:', sbRes.error);
                    } else {
                        console.log('✅ [News Toggle Supabase Success]:', item.id, item.status);
                    }
                } catch(e) {
                    console.warn('[News Toggle Supabase Exception]:', e);
                }
            }

            // Real-time broadcast to /api/sync
            try {
                await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ news: [list[idx]] })
                });
            } catch(e) {}

            if (typeof pushToCloud === 'function') {
                pushToCloud().catch(() => {});
            }

            broadcastSync('NEWS_STATUS_TOGGLED', list[idx]);
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return list[idx];
        },

        async delete(articleId) {
            const strId = String(articleId);
            addDeletedNewsId(strId);

            const rawList = getStore(STORAGE_KEYS.NEWS) || [];
            const article = rawList.find(n => String(n.id) === strId);
            const filtered = rawList.filter(n => String(n.id) !== strId);
            setStore(STORAGE_KEYS.NEWS, filtered);

            if (article) {
                activityLog.add('news', `Berita "${article.title}" dihapus.`, sessionStorage.getItem('wiz_admin_name') || 'Admin');
            }

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.remove('news', strId);
                } catch(e) {}
            }

            // Push to Vercel Serverless Sync & Firestore Master Bundle immediately
            try { await pushToCloud(); } catch(e) {}

            broadcastSync('NEWS_DELETED', { id: strId });
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        }
    };

    // ─── Programs (Program Kebaikan & Campaign) Module ──────────
    const DEFAULT_PROGRAMS = [
        // ── 1. Berkah Peduli (Sosial & Kemanusiaan) ──
        {
            id: 'prog-pray-for-ntt',
            title: 'Pray For NTT',
            slug: 'pray-for-ntt',
            pillar: 'Berkah Peduli',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 50.000.000',
            targetAmount: 50000000,
            location: 'Nusa Tenggara Timur (NTT)',
            beneficiaries: 'Warga & Penyintas Terdampak Bencana di NTT',
            description: 'Salurkan kepedulian dan bantuan darurat bencana untuk saudara-saudara kita terdampak bencana di Nusa Tenggara Timur (NTT).',
            imageUrl: 'assets/images/pray-for-ntt.jpg',
            status: 'published',
            createdAt: '2026-08-22T17:00:00.000Z',
            updatedAt: '2026-08-22T17:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-tebar-sembako',
            title: 'Tebar Sembako',
            slug: 'tebar-sembako',
            pillar: 'Berkah Peduli',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 25.000.000',
            targetAmount: 25000000,
            description: 'Penyaluran paket bahan pangan pokok untuk keluarga dhuafa, janda lansia, dan yatim di pelosok Bangka Belitung.',
            imageUrl: 'assets/images/tebar-sembako.jpg',
            status: 'published',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-sedekah-beras-dhuafa',
            title: 'Sedekah Beras Dhuafa',
            slug: 'sedekah-beras-dhuafa',
            pillar: 'Berkah Peduli',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 20.000.000',
            targetAmount: 20000000,
            description: 'Bantuan beras premium secara berkala untuk mencukupi kebutuhan pokok para mustahik dan santri pondok pesantren.',
            imageUrl: 'assets/images/sedekah-beras-dhuafa.jpg',
            status: 'published',
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-sedekah-jumat',
            title: 'Sedekah Jumat',
            slug: 'sedekah-jumat',
            pillar: 'Berkah Peduli',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 15.000.000',
            targetAmount: 15000000,
            description: 'Program Sedulang Berkah Sedekah Jumat untuk jamaah masjid, musafir, dan dhuafa di hari yang mulia.',
            imageUrl: 'assets/images/sedekah-beras-dhuafa.jpg',
            status: 'published',
            createdAt: '2026-01-03T00:00:00.000Z',
            updatedAt: '2026-01-03T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-santunan-yatim',
            title: 'Santunan Yatim',
            slug: 'santunan-yatim',
            pillar: 'Berkah Peduli',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 30.000.000',
            targetAmount: 30000000,
            description: 'Santunan bulanan dan pemenuhan kebutuhan primer anak-anak yatim dhuafa agar tumbuh bahagia.',
            imageUrl: 'assets/images/santunan-yatim.jpg',
            status: 'published',
            createdAt: '2026-01-04T00:00:00.000Z',
            updatedAt: '2026-01-04T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-tebar-quran',
            title: "Tebar Qur'an Nusantara",
            slug: 'tebar-quran-nusantara',
            pillar: 'Berkah Peduli',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 20.000.000',
            targetAmount: 20000000,
            description: 'Distribusi mushaf Al-Qur\'an standar ke rumah tahfidz, TPQ, dan masjid pelosok daerah.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-05T00:00:00.000Z',
            updatedAt: '2026-01-05T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-tebar-iftar',
            title: 'Tebar Iftar Nusantara',
            slug: 'tebar-iftar-nusantara',
            pillar: 'Berkah Peduli',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 30.000.000',
            targetAmount: 30000000,
            description: 'Penyaluran paket makanan buka puasa penuh berkah dan gizi untuk santri serta dhuafa di Bangka Belitung.',
            imageUrl: 'assets/images/tebar-iftar.jpg',
            status: 'published',
            createdAt: '2026-01-06T00:00:00.000Z',
            updatedAt: '2026-01-06T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-bahagiakan-guru-ngaji',
            title: 'Bahagiakan Guru Ngaji',
            slug: 'bahagiakan-guru-ngaji',
            pillar: 'Berkah Peduli',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 25.000.000',
            targetAmount: 25000000,
            description: 'Apresiasi tunjangan dan bingkisan sembako untuk guru ngaji tradisional yang ikhlas mengajar di pelosok.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-07T00:00:00.000Z',
            updatedAt: '2026-01-07T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-sedekah-air',
            title: 'Sedekah Air',
            slug: 'sedekah-air',
            pillar: 'Berkah Peduli',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 35.000.000',
            targetAmount: 35000000,
            description: 'Pembuatan sumur bor, instalasi pipa, dan penampungan air bersih untuk daerah rawan kekeringan.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-08T00:00:00.000Z',
            updatedAt: '2026-01-08T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },

        // ── 2. Berkah Hidayah (Dakwah & Pembinaan) ──
        {
            id: 'prog-pembangunan-markaz',
            title: 'Pembangunan Markaz',
            slug: 'pembangunan-markaz',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 2.004.000.000',
            targetAmount: 2004000000,
            description: 'Dukung pembangunan pusat dakwah terpadu, markaz kaderisasi da\'i, dan asrama santri tahfidz WIZ Bangka Belitung.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-09T00:00:00.000Z',
            updatedAt: '2026-01-09T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-kendaraan-dakwah',
            title: 'Pengadaan & Perbaikan Kendaraan',
            slug: 'pengadaan-perbaikan-kendaraan',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 35.000.000',
            targetAmount: 35000000,
            description: 'Pengadaan armada mobil dan sepeda motor operasional untuk mobilitas para da\'i ke pelosok pedalaman.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-10T00:00:00.000Z',
            updatedAt: '2026-01-10T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-santunan-mualaf',
            title: 'Santunan Mualaf',
            slug: 'santunan-mualaf',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 20.000.000',
            targetAmount: 20000000,
            description: 'Bimbingan aqidah, pelatihan ibadah, dan bantuan kemandirian hidup bagi saudara-saudara kita mualaf.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-11T00:00:00.000Z',
            updatedAt: '2026-01-11T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-tahfidz',
            title: 'Tahfidz',
            slug: 'tahfidz',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 30.000.000',
            targetAmount: 30000000,
            description: 'Program beasiswa pembinaan santri penghafal Al-Qur\'an 30 juz berkarakter qur\'ani.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-12T00:00:00.000Z',
            updatedAt: '2026-01-12T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-public-speaking',
            title: 'Pelatihan Public Speaking',
            slug: 'pelatihan-public-speaking',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 10.000.000',
            targetAmount: 10000000,
            description: 'Workshop retorika dakwah dan public speaking untuk membekali da\'i muda agar siap berkhutbah dan membina masyarakat.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-13T00:00:00.000Z',
            updatedAt: '2026-01-13T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-tabligh-akbar',
            title: 'Tabligh Akbar Dzulhijjah',
            slug: 'tabligh-akbar-dzulhijjah',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 15.000.000',
            targetAmount: 15000000,
            description: 'Penyelenggaraan Tabligh Akbar menyambut bulan haram Dzulhijjah dan syiar keutamaan ibadah qurban.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-14T00:00:00.000Z',
            updatedAt: '2026-01-14T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-guru-dirosa',
            title: 'Pelatihan Guru Dirosa',
            slug: 'pelatihan-guru-dirosa',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 12.000.000',
            targetAmount: 12000000,
            description: 'Pelatihan standarisasi pengajar metode DIROSA (Pendidikan Al-Qur\'an Orang Dewasa) se-Bangka Belitung.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-15T00:00:00.000Z',
            updatedAt: '2026-01-15T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-penyelenggaraan-jenazah',
            title: 'Pelatihan Penyelenggaraan Jenazah',
            slug: 'pelatihan-penyelenggaraan-jenazah',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 8.000.000',
            targetAmount: 8000000,
            description: 'Edukasi dan pelatihan praktik fardhu kifayah tata cara memandikan, mengafani, dan menshalatkan jenazah.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-16T00:00:00.000Z',
            updatedAt: '2026-01-16T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-volunteer-media',
            title: 'Pelatihan Volunteer Media Dakwah',
            slug: 'pelatihan-volunteer-media-dakwah',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 10.000.000',
            targetAmount: 10000000,
            description: 'Pelatihan videografi, fotografi jurnalistik, dan copywriting media sosial untuk generasi muda relawan dakwah.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-17T00:00:00.000Z',
            updatedAt: '2026-01-17T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-lomba-poster',
            title: 'Lomba Desain Poster Dakwah',
            slug: 'lomba-desain-poster-dakwah',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 5.000.000',
            targetAmount: 5000000,
            description: 'Kompetisi karya visual kreatif islami untuk mengampanyekan ajakan kebaikan dan nilai-nilai Al-Qur\'an.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-18T00:00:00.000Z',
            updatedAt: '2026-01-18T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-kantor-dpw',
            title: 'Kantor DPW WI Babel & WIZ',
            slug: 'kantor-dpw-wi-babel-dan-wiz',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 150.000.000',
            targetAmount: 150000000,
            description: 'Pusat pelayanan administrasi ummat, dakwah terpadu, dan kantor Laznas WIZ Bangka Belitung.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-19T00:00:00.000Z',
            updatedAt: '2026-01-19T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-mukerwil',
            title: 'Mukerwil Mukernas Muktamar',
            slug: 'mukerwil-mukernas-muktamar',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 25.000.000',
            targetAmount: 25000000,
            description: 'Musyawarah kerja tahunan evaluasi program dakwah dan penetapan target keummatan di Bangka Belitung.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-20T00:00:00.000Z',
            updatedAt: '2026-01-20T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-dai-pelosok',
            title: 'Keberangkatan Kepulangan Dai',
            slug: 'keberangkatan-kepulangan-dai',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 30.000.000',
            targetAmount: 30000000,
            description: 'Dukungan akomodasi, transportasi, dan kafalah bagi para da\'i yang bertugas di pulau-pulau terpencil Bangka Belitung.',
            imageUrl: 'assets/images/keberangkatan-kepulangan-dai.jpg',
            status: 'published',
            createdAt: '2026-01-21T00:00:00.000Z',
            updatedAt: '2026-01-21T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-celengan-subuh',
            title: 'Pengadaan Celengan Sedekah Subuh',
            slug: 'pengadaan-celengan-sedekah-subuh',
            pillar: 'Berkah Hidayah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 15.000.000',
            targetAmount: 15000000,
            description: 'Penyediaan sarana kaleng infak harian di rumah, pertokoan, dan perkantoran guna memfasilitasi sedekah subuh.',
            imageUrl: 'assets/images/default-program-wiz.jpg',
            status: 'published',
            createdAt: '2026-01-22T00:00:00.000Z',
            updatedAt: '2026-01-22T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },

        // ── 3. Berkah Juara (Pendidikan & Beasiswa) ──
        {
            id: 'prog-beasiswa-pendidikan-juara',
            title: 'Beasiswa Pendidikan Juara',
            slug: 'beasiswa-pendidikan-juara',
            pillar: 'Berkah Juara',
            category: 'Pendidikan & Beasiswa',
            target: 'Rp 25.000.000',
            targetAmount: 25000000,
            description: 'Bantuan biaya SPP, uang sekolah, dan buku untuk siswa yatim serta dhuafa berprestasi.',
            imageUrl: 'assets/images/beasiswa-pendidikan-juara.jpg',
            status: 'published',
            createdAt: '2026-01-23T00:00:00.000Z',
            updatedAt: '2026-01-23T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-beasiswa-tahfidz-dhuafa',
            title: 'Beasiswa Tahfidz & Dhuafa',
            slug: 'beasiswa-tahfidz-dan-dhuafa',
            pillar: 'Berkah Juara',
            category: 'Pendidikan & Beasiswa',
            target: 'Rp 35.000.000',
            targetAmount: 35000000,
            description: 'Beasiswa pendidikan penuh dan asrama bagi santri tahfidz yatim dhuafa di Bangka Belitung.',
            imageUrl: 'assets/images/beasiswa-tahfidz.jpg',
            status: 'published',
            createdAt: '2026-01-24T00:00:00.000Z',
            updatedAt: '2026-01-24T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-perlengkapan-belajar-yatim',
            title: 'Perlengkapan Belajar Yatim',
            slug: 'perlengkapan-belajar-yatim',
            pillar: 'Berkah Juara',
            category: 'Pendidikan & Beasiswa',
            target: 'Rp 15.000.000',
            targetAmount: 15000000,
            description: 'Paket perlengkapan sekolah lengkap (tas, seragam, sepatu, dan buku tulis) menjelang tahun ajaran baru.',
            imageUrl: 'assets/images/perlengkapan-belajar-yatim.jpg',
            status: 'published',
            createdAt: '2026-01-25T00:00:00.000Z',
            updatedAt: '2026-01-25T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },

        // ── 4. Berkah Sehat (Kesehatan Masyarakat) ──
        {
            id: 'prog-khitanan-massal',
            title: 'Khitanan Massal Dhuafa',
            slug: 'khitanan-massal-dhuafa',
            pillar: 'Berkah Sehat',
            category: 'Kesehatan Masyarakat',
            target: 'Rp 20.000.000',
            targetAmount: 20000000,
            description: 'Layanan khitanan massal gratis dengan metode modern, pemberian bingkisan pakaian muslim, dan uang santunan.',
            imageUrl: 'assets/images/khitanan-massal-dhuafa.jpg',
            status: 'published',
            createdAt: '2026-01-26T00:00:00.000Z',
            updatedAt: '2026-01-26T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-pengobatan-gratis',
            title: 'Layanan Pengobatan Gratis',
            slug: 'layanan-pengobatan-gratis',
            pillar: 'Berkah Sehat',
            category: 'Kesehatan Masyarakat',
            target: 'Rp 25.000.000',
            targetAmount: 25000000,
            description: 'Pemeriksaan kesehatan cuma-cuma, cek gula darah & tensi, serta pembagian obat bagi lansia dan dhuafa pelosok.',
            imageUrl: 'assets/images/bantuan-pengobatan.jpg',
            status: 'published',
            createdAt: '2026-01-27T00:00:00.000Z',
            updatedAt: '2026-01-27T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-ambulance-gratis',
            title: 'Ambulance Gratis Ummat',
            slug: 'ambulance-gratis-ummat',
            pillar: 'Berkah Sehat',
            category: 'Kesehatan Masyarakat',
            target: 'Rp 150.000.000',
            targetAmount: 150000000,
            description: 'Layanan antar-jemput pasien gawat darurat dhuafa dan pengantaran jenazah gratis 24 jam di Bangka Belitung.',
            imageUrl: 'assets/images/ambulance-gratis-ummat.jpg',
            status: 'published',
            createdAt: '2026-01-28T00:00:00.000Z',
            updatedAt: '2026-01-28T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },

        // ── 5. Berkah Mandiri (Ekonomi & Pemberdayaan) ──
        {
            id: 'prog-modal-usaha',
            title: 'Modal Usaha Dhuafa',
            slug: 'modal-usaha-dhuafa',
            pillar: 'Berkah Mandiri',
            category: 'Ekonomi & Pemberdayaan',
            target: 'Rp 25.000.000',
            targetAmount: 25000000,
            description: 'Bantuan sarana gerobak berkah, permodalan usaha tanpa riba, dan pendampingan usaha kecil bagi keluarga mustahik.',
            imageUrl: 'assets/images/modal-usaha-dhuafa.jpg',
            status: 'published',
            createdAt: '2026-01-29T00:00:00.000Z',
            updatedAt: '2026-01-29T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        },
        {
            id: 'prog-pelatihan-wirausaha',
            title: 'Pelatihan Keterampilan Wirausaha',
            slug: 'pelatihan-keterampilan-wirausaha',
            pillar: 'Berkah Mandiri',
            category: 'Ekonomi & Pemberdayaan',
            target: 'Rp 15.000.000',
            targetAmount: 15000000,
            description: 'Workshop keterampilan digital, pengolahan produk pangan, dan manajemen keuangan keluarga mandiri.',
            imageUrl: 'assets/images/pelatihan-keterampilan-wirausaha.jpg',
            status: 'published',
            createdAt: '2026-01-30T00:00:00.000Z',
            updatedAt: '2026-01-30T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        }
    ];

    const programs = {
        getAll() {
            const deletedSet = getDeletedProgramIds();
            let raw = getStore(STORAGE_KEYS.PROGRAMS);
            if (!Array.isArray(raw) || raw.length === 0) {
                raw = DEFAULT_PROGRAMS;
                setStore(STORAGE_KEYS.PROGRAMS, raw);
            } else {
                let modified = false;
                DEFAULT_PROGRAMS.forEach(def => {
                    if (!deletedSet.has(def.id) && !raw.find(r => (r.id === def.id || (r.title && r.title.toLowerCase() === def.title.toLowerCase())))) {
                        raw.push(def);
                        modified = true;
                    }
                });
                if (modified) {
                    setStore(STORAGE_KEYS.PROGRAMS, raw);
                }
            }
            return raw
                .filter(p => p && p.id && !deletedSet.has(String(p.id)) && p.status !== 'deleted' && !p.isDeleted)
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        },

        getPublished() {
            return this.getAll().filter(p => p.status === 'published');
        },

        getDrafts() {
            return this.getAll().filter(p => p.status === 'draft');
        },

        getById(id) {
            return this.getAll().find(p => String(p.id) === String(id) || String(p.slug) === String(id)) || null;
        },

        getBySlug(slug) {
            const cleanSlug = String(slug || '').toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[-\s]+/g, '-');
            return this.getAll().find(p => p.slug === cleanSlug || (p.title && p.title.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[-\s]+/g, '-') === cleanSlug)) || null;
        },

        getProgramDetails(query) {
            if (!query) return null;
            let cleanQuery = String(query).trim().toLowerCase();
            const parenMatch = cleanQuery.match(/\(([^)]+)\)/);
            if (parenMatch && parenMatch[1]) {
                cleanQuery = parenMatch[1].trim().toLowerCase();
            }
            const cleanSlug = cleanQuery.replace(/[^\w\s-]/g, '').trim().replace(/[-\s]+/g, '-');
            
            const all = this.getAll();
            return all.find(p => {
                if (!p) return false;
                const pTitle = (p.title || '').toLowerCase();
                const pSlug = (p.slug || '').toLowerCase();
                const pId = (p.id || '').toLowerCase();
                return pTitle === cleanQuery || pSlug === cleanSlug || pId === cleanQuery || pTitle.includes(cleanQuery) || cleanQuery.includes(pTitle);
            }) || null;
        },

        async add(progData) {
            const list = getStore(STORAGE_KEYS.PROGRAMS) || [];
            const cleanTitle = String(progData.title || '').trim();
            if (!cleanTitle) throw new Error('Judul program wajib diisi!');

            const pillar = progData.pillar || 'Berkah Peduli';
            const cleanSlug = cleanTitle.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[-\s]+/g, '-');
            const authorName = (progData.author || sessionStorage.getItem('wiz_admin_name') || 'Admin WIZ Babel').trim();

            const newProgram = {
                id: progData.id || ('prog-' + cleanSlug + '-' + Date.now().toString(36)),
                title: cleanTitle,
                slug: cleanSlug,
                pillar: pillar,
                category: progData.category || mapProgramToPillar(cleanTitle, pillar) || 'Sosial & Kemanusiaan',
                target: progData.target || 'Rp 15.000.000',
                targetAmount: Number(String(progData.target || '').replace(/[^0-9]/g, '')) || 15000000,
                location: (progData.location || 'Kepulauan Bangka Belitung').trim(),
                beneficiaries: (progData.beneficiaries || '').trim(),
                description: (progData.description || '').trim(),
                imageUrl: progData.imageUrl || progData.image || (allocationRulesManager ? allocationRulesManager.getSpecificProgramImage(cleanTitle, pillar) : '') || 'assets/images/foto-utama-wiz.jpg',
                status: progData.status === 'draft' ? 'draft' : 'published',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                author: authorName
            };

            const filtered = list.filter(p => p.title.toLowerCase() !== cleanTitle.toLowerCase());
            filtered.unshift(newProgram);
            setStore(STORAGE_KEYS.PROGRAMS, filtered);

            if (allocationRulesManager) {
                await allocationRulesManager.addOrUpdateSpecificProgram(pillar, cleanTitle, newProgram.imageUrl);
            }

            activityLog.add('system_config', `Program "${cleanTitle}" (${pillar}) disimpan dengan status: ${newProgram.status === 'published' ? 'Dipublikasikan' : 'Draft'}.`, authorName);

            window.dispatchEvent(new CustomEvent('wiz-programs-changed', { detail: newProgram }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));

            (async () => {
                try {
                    if (typeof pushToCloud === 'function') await pushToCloud();
                } catch(e) {}
            })();

            return newProgram;
        },

        async update(id, updates) {
            const list = this.getAll();
            const idx = list.findIndex(p => String(p.id) === String(id) || String(p.slug) === String(id));
            if (idx === -1) return null;

            const old = list[idx];
            const updated = {
                ...old,
                ...updates,
                updatedAt: new Date().toISOString()
            };

            if (updates.title) {
                updated.slug = updates.title.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[-\s]+/g, '-');
            }
            if (updates.target) {
                updated.targetAmount = Number(String(updates.target).replace(/[^0-9]/g, '')) || updated.targetAmount;
            }

            list[idx] = updated;
            setStore(STORAGE_KEYS.PROGRAMS, list);

            if (updates.imageUrl && allocationRulesManager) {
                allocationRulesManager.updateSpecificProgramImageByName(updated.title, updates.imageUrl);
            }

            activityLog.add('system_config', `Program "${updated.title}" diperbarui (Status: ${updated.status}).`, sessionStorage.getItem('wiz_admin_name') || 'Admin');

            window.dispatchEvent(new CustomEvent('wiz-programs-changed', { detail: updated }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));

            (async () => {
                try {
                    if (typeof pushToCloud === 'function') await pushToCloud();
                } catch(e) {}
            })();

            return updated;
        },

        async togglePublish(id) {
            const prog = this.getById(id);
            if (!prog) return null;
            const newStatus = prog.status === 'published' ? 'draft' : 'published';
            return await this.update(id, { status: newStatus });
        },

        async delete(id) {
            const strId = String(id);
            addDeletedProgramId(strId);

            const list = this.getAll();
            const item = list.find(p => String(p.id) === strId || String(p.slug) === strId);
            if (!item) return false;

            const filtered = list.filter(p => String(p.id) !== strId && String(p.slug) !== strId);
            setStore(STORAGE_KEYS.PROGRAMS, filtered);

            if (allocationRulesManager) {
                await allocationRulesManager.deleteSpecificProgram(item.pillar, item.title);
            }

            activityLog.add('system_config', `Program "${item.title}" telah dihapus.`, sessionStorage.getItem('wiz_admin_name') || 'Admin');

            window.dispatchEvent(new CustomEvent('wiz-programs-changed', { detail: { deletedId: strId } }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));

            (async () => {
                try {
                    if (typeof pushToCloud === 'function') await pushToCloud();
                } catch(e) {}
            })();

            return true;
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.saveDisbursement({
                        id: String(newDisb.id),
                        wilayah: newDisb.wilayah,
                        program: newDisb.program,
                        amount: newDisb.amount,
                        description: newDisb.description,
                        disbursed_at: newDisb.disbursedAt,
                        recorded_by: newDisb.recordedBy,
                        created_at: newDisb.createdAt
                    });
                } catch(e) {}
            }

            try { await pushToCloud(); } catch(e) {}

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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.update('disbursements', id, {
                        wilayah: list[idx].wilayah,
                        program: list[idx].program,
                        amount: list[idx].amount,
                        description: list[idx].description,
                        disbursed_at: list[idx].disbursedAt,
                        recorded_by: list[idx].recordedBy
                    });
                } catch(e) {}
            }

            try { await pushToCloud(); } catch(e) {}

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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.remove('disbursements', strId);
                } catch(e) {}
            }

            try { await pushToCloud(); } catch(e) {}

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
                const dWilayah = d.wilayah || 'Pangkalpinang';
                const wRules = (typeof allocationRulesManager !== 'undefined' && allocationRulesManager.get) 
                    ? (allocationRulesManager.get(dWilayah) || ALLOCATION_RULES[dWilayah])
                    : ALLOCATION_RULES[dWilayah];

                if (d.type === 'Infak Umum') {
                    if (wRules && wRules.mainAllocation) {
                        const pillar = mapProgramToPillar(programName);
                        const mainItem = wRules.mainAllocation.find(i => i.key === pillar);
                        if (mainItem) {
                            const pillarAmount = (Number(d.amount) || 0) * (mainItem.percent / 100);
                            const subRule = wRules.subAllocation && wRules.subAllocation[pillar];
                            if (subRule && subRule.items && subRule.items.length > 0) {
                                const subItem = subRule.items.find(si => {
                                    const siLower = si.key.toLowerCase().trim();
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
                    // Infak Terikat / Specific Program: 100% of the verified amount counts toward the program
                    const dProg = (d.programSpesifik || d.program || '').toLowerCase().trim();
                    const dCat = (d.programUtama || d.category || '').toLowerCase().trim();
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
                const dbProg = (db.program || '').toLowerCase().trim();
                if (dbProg && (dbProg.includes(pLower) || pLower.includes(dbProg))) {
                    return sum + (Number(db.amount) || 0);
                }
                return sum;
            }, 0);

            const base = Number(defaultBase) || 0;
            const target = Number(defaultTarget) || 50000000;
            const totalMasuk = base + addedMasuk;
            const saldoAktual = Math.max(0, totalMasuk - addedSalur);
            
            // Reaktif terhadap pengeluaran: Progress bar (%) dan nominal di kartu program 
            // merujuk pada Saldo Aktual Tersedia (Total Masuk - Total Pengeluaran)
            const percent = target > 0 ? Math.min(100, Math.max(0, Math.round((saldoAktual / target) * 100))) : 0;

            return {
                terkumpul: saldoAktual, // Saldo Aktual Tersedia yang tampil di UI kartu
                totalMasuk: totalMasuk, // Akumulasi kotor dana masuk
                masuk: totalMasuk,
                tersalurkan: addedSalur, // Dana terpakai / disalurkan
                saldo: saldoAktual,     // Saldo sisa
                target: target,
                percent: isNaN(percent) ? 0 : percent
            };
        },

        getPerProgram(wilayah) {
            let verified = donations.getVerified();
            const disbList = disbursements.getAll();

            if (wilayah && wilayah !== 'Semua') {
                verified = verified.filter(d => d.wilayah === wilayah);
            }

            const programConfigs = {
                'Berkah Hidayah': { label: 'WIZ Berkah Hidayah (Dakwah & Pembinaan)', target: 2204700000, baseMasuk: 0, baseSalur: 0 },
                'Berkah Peduli': { label: 'WIZ Berkah Peduli (Sosial & Kemanusiaan)', target: 227800000, baseMasuk: 0, baseSalur: 0 },
                'Berkah Juara': { label: 'WIZ Berkah Juara (Pendidikan & Beasiswa)', target: 354390000, baseMasuk: 0, baseSalur: 0 },
                'Berkah Sehat': { label: 'WIZ Berkah Sehat (Kesehatan & Ambulance)', target: 65450000, baseMasuk: 0, baseSalur: 0 },
                'Berkah Mandiri': { label: 'WIZ Berkah Mandiri (Ekonomi & Pemberdayaan)', target: 100500000, baseMasuk: 0, baseSalur: 0 },
            };

            const dynamicMasuk = {};
            const dynamicSalur = {};

            Object.keys(programConfigs).forEach(key => {
                dynamicMasuk[key] = 0;
                dynamicSalur[key] = 0;
            });

            verified.forEach(d => {
                const dWilayah = d.wilayah || 'Pangkalpinang';
                const wRules = (typeof allocationRulesManager !== 'undefined' && allocationRulesManager.get)
                    ? (allocationRulesManager.get(dWilayah) || ALLOCATION_RULES[dWilayah])
                    : ALLOCATION_RULES[dWilayah];

                if (d.type === 'Infak Umum') {
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

            // Also merge any custom programs added from admin
            try {
                const customMap = JSON.parse(localStorage.getItem('wiz_custom_specific_programs') || '{}');
                Object.entries(customMap).forEach(([pillarKey, titles]) => {
                    if (Array.isArray(titles)) {
                        titles.forEach(itemKey => {
                            const fullName = `${pillarKey} - ${itemKey}`;
                            const displayLabel = `WIZ ${pillarKey} (${itemKey})`;
                            if (!specificItemsMap.has(fullName)) {
                                const dynamicImg = (allocationRulesManager ? allocationRulesManager.getSpecificProgramImage(itemKey, pillarKey) : '') || '';
                                specificItemsMap.set(fullName, {
                                    fullName,
                                    displayLabel,
                                    pillarKey,
                                    itemKey,
                                    subPercent: 0,
                                    mainPercent: 0,
                                    image: dynamicImg,
                                    masuk: 0,
                                    tersalurkan: 0
                                });
                            }
                        });
                    }
                });
            } catch(e) {}

            // Also merge any published programs from programs module
            try {
                if (typeof programs !== 'undefined' && programs.getPublished) {
                    const pubList = programs.getPublished();
                    pubList.forEach(p => {
                        const fullName = `${p.pillar} - ${p.title}`;
                        const displayLabel = `WIZ ${p.pillar} (${p.title})`;
                        if (!specificItemsMap.has(fullName)) {
                            const dynamicImg = p.imageUrl || (allocationRulesManager ? allocationRulesManager.getSpecificProgramImage(p.title, p.pillar) : '') || '';
                            specificItemsMap.set(fullName, {
                                fullName,
                                displayLabel,
                                pillarKey: p.pillar,
                                itemKey: p.title,
                                subPercent: 0,
                                mainPercent: 0,
                                image: dynamicImg,
                                masuk: 0,
                                tersalurkan: 0
                            });
                        }
                    });
                }
            } catch(e) {}

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

                    let matched = false;
                    for (const [fullName, spObj] of specificItemsMap.entries()) {
                        const keyLower = spObj.itemKey.toLowerCase();
                        const fullLower = fullName.toLowerCase();

                        if (dLower && (dLower === keyLower || dLower.includes(keyLower) || keyLower.includes(dLower) || fullLower.includes(dLower))) {
                            spObj.masuk += Number(d.amount) || 0;
                            matched = true;
                            break;
                        }
                    }

                    if (!matched) {
                        const pillar = mapProgramToPillar(d.programSpesifik || d.program, d.programUtama || d.category);
                        const pillarItems = Array.from(specificItemsMap.values()).filter(spObj => spObj.pillarKey === pillar);
                        if (pillarItems.length > 0) {
                            const totalSubPct = pillarItems.reduce((acc, pi) => acc + (pi.subPercent || 0), 0) || 100;
                            pillarItems.forEach(pi => {
                                pi.masuk += (Number(d.amount) || 0) * ((pi.subPercent || (100 / pillarItems.length)) / totalSubPct);
                            });
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
                const target = Number(sp.target) || 50000000;
                const percent = target > 0 ? Math.min(100, Math.max(0, Math.round((saldo / target) * 100))) : 0;

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
                    terkumpul: saldo, // Saldo Aktual
                    target: target,
                    percent: isNaN(percent) ? 0 : percent,
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
            const deletedRefSet = getDeletedRefIds();
            const deletedDonationSet = getDeletedIds();
            const rawList = (getStore(STORAGE_KEYS.REFERRALS) || []).filter(r => r && (r.id || r.code || r.name) && !deletedRefSet.has(String(r.id)) && !deletedRefSet.has(String(r.code)) && r.status !== 'deleted' && !r.isDeleted);
            
            // Query only valid, non-deleted donations
            const rawDonations = getStore(STORAGE_KEYS.DONATIONS) || [];
            const activeDonations = rawDonations.filter(d => d && d.id && !deletedDonationSet.has(String(d.id)) && d.status !== 'deleted' && !d.isDeleted);
            const allPayouts = getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || [];

            return rawList.map(ref => {
                const refId = String(ref.id || ref.code || '');
                const refCode = String(ref.code || ref.id || '');
                
                // Match all active donations attributed to this Mitra (by ID or Code)
                const refAllDonations = activeDonations.filter(d => {
                    const dRef = String(d.referralId || d.referral_id || d.referralCode || d.referral_code || '');
                    return dRef && (
                        dRef === refId || 
                        dRef.toLowerCase() === refId.toLowerCase() || 
                        dRef === refCode || 
                        dRef.toLowerCase() === refCode.toLowerCase()
                    );
                });

                // ONLY verified / success transactions count towards incentive totals & withdrawable balance!
                // Rejected, cancelled, or pending donations are excluded from balances.
                const verifiedDonations = refAllDonations.filter(d => d.status === 'verified' || d.status === 'success' || d.status === 'sukses');

                const donationsCount = verifiedDonations.length;
                const totalDonationAmount = verifiedDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
                const totalFee6Percent = verifiedDonations.reduce((sum, d) => {
                    const rate = d.referralRate !== undefined ? Number(d.referralRate) : Number(ref.defaultRate || 6);
                    const fee = d.referralFee !== undefined ? Number(d.referralFee) : Math.round((Number(d.amount) || 0) * (rate / 100));
                    return sum + fee;
                }, 0);
                const totalAdditionalBonus = verifiedDonations.reduce((sum, d) => sum + (Number(d.additionalBonus) || 0), 0);
                const totalEarned = totalFee6Percent + totalAdditionalBonus;

                const refPayouts = allPayouts.filter(p => {
                    const pRefId = String(p.referralId || '');
                    return pRefId && (pRefId === refId || pRefId.toLowerCase() === refId.toLowerCase() || pRefId === refCode || pRefId.toLowerCase() === refCode.toLowerCase());
                });
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
                    pendingBalance,
                    donations: refAllDonations.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)),
                    payouts: refPayouts.sort((a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0))
                };
            }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        },

        getById(id) {
            if (!id) return null;
            const all = this.getAll();
            const clean = String(id).trim().toLowerCase();
            return all.find(r => 
                String(r.id).toLowerCase() === clean || 
                (r.code && String(r.code).toLowerCase() === clean) ||
                (r.phone && r.phone.replace(/\D/g, '') === clean.replace(/\D/g, '') && clean.length >= 5)
            ) || null;
        },

        getByCodeOrId(identifier) {
            return this.getById(identifier);
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

            // ONLY verified donations in this month count towards performance KPI
            const refDonations = (ref.donations || []).filter(d => {
                if (d.status !== 'verified' && d.status !== 'success' && d.status !== 'sukses') return false;
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
                    const sbRes = await window.wizSupabase.saveReferral(newRef);
                    if (sbRes.error) {
                        console.warn('[Referrals Supabase Insert Error]:', sbRes.error);
                    } else {
                        console.log('✅ [Referrals Supabase Insert Success]:', newRef.code);
                    }
                } catch(e) {
                    console.warn('[Referrals Supabase Exception]:', e);
                }
            }

            // Real-time broadcast of new referral to local & production /api/sync
            try {
                await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ referrals: [newRef] })
                });
            } catch(e) {}

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
                    const sbRes = await window.wizSupabase.saveReferral(list[idx]);
                    if (sbRes.error) {
                        console.warn('[Referrals Supabase Update Error]:', sbRes.error);
                    }
                } catch(e) {}
            }

            // Real-time broadcast of updated referral to /api/sync
            try {
                await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ referrals: [list[idx]] })
                });
            } catch(e) {}

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
            const rawList = getStore(STORAGE_KEYS.REFERRALS) || [];
            const ref = rawList.find(r => String(r.id) === strId || (r.code && String(r.code) === strId));
            const targetId = ref ? String(ref.id) : strId;
            const targetCode = ref ? String(ref.code || '') : '';

            addDeletedRefId(targetId);
            if (targetCode) addDeletedRefId(targetCode);

            const filtered = rawList.filter(r => String(r.id) !== targetId && String(r.code) !== targetId && (!targetCode || (String(r.id) !== targetCode && String(r.code) !== targetCode)));
            setStore(STORAGE_KEYS.REFERRALS, filtered);

            if (ref) {
                activityLog.add('referral', `Perantara "${ref.name}" (Kode: ${ref.code || ref.id}) dihapus dari database.`, 'Admin');
            }

            // Direct Supabase deletion
            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.remove('referrals', targetId);
                    if (targetCode && targetCode !== targetId) {
                        await window.wizSupabase.remove('referrals', targetCode);
                    }
                    console.log('✅ [Referrals Supabase Delete Success]:', targetId);
                } catch(e) {
                    console.warn('[Referrals Supabase Delete Error]:', e);
                }
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.remove('referrals', targetId);
                await window.wizFirebase.upsert('deleted_ref_ids', { key: targetId, deletedAt: new Date().toISOString() });
            }

            // Real-time broadcast deleted ref IDs to /api/sync
            try {
                await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deleted_ref_ids: [targetId, targetCode].filter(Boolean) })
                });
            } catch(e) {}

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
        isEnabled() {
            const rawSetting = getStore(STORAGE_KEYS.SITE_SETTINGS) || {};
            if (rawSetting.quotes_enabled !== undefined) {
                return Boolean(rawSetting.quotes_enabled);
            }
            const activeList = this.getAll().filter(q => q && q.status === 'active');
            return activeList.length > 0;
        },

        async setEnabled(enabled) {
            const settings = getStore(STORAGE_KEYS.SITE_SETTINGS) || {};
            settings.quotes_enabled = Boolean(enabled);
            setStore(STORAGE_KEYS.SITE_SETTINGS, settings);
            
            try {
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {}

            window.dispatchEvent(new CustomEvent('wiz-quotes-changed'));
            window.dispatchEvent(new CustomEvent('wiz-site-settings-changed', { detail: settings }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            broadcastSync('QUOTES_VISIBILITY_CHANGED', { enabled: Boolean(enabled) });
            return settings.quotes_enabled;
        },

        getAll() {
            const deletedQuoteSet = getDeletedQuoteIds();
            const stored = getStore(STORAGE_KEYS.QUOTES);
            const list = Array.isArray(stored) ? stored : DEFAULT_QUOTES;
            return list.filter(q => q && q.id && !deletedQuoteSet.has(String(q.id)) && q.status !== 'deleted' && !q.isDeleted)
                .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
        },

        getActive() {
            if (!this.isEnabled()) return [];
            return this.getAll().filter(q => q && q.status === 'active');
        },

        getToday() {
            if (!this.isEnabled()) return null;
            const all = this.getActive();
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.upsert('quotes', newQuote);
                } catch(e) {}
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                try {
                    await window.wizFirebase.insert('quotes', newQuote);
                } catch(e) {}
            }

            try {
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {}

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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.upsert('quotes', list[idx]);
                } catch(e) {}
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                try {
                    await window.wizFirebase.set('quotes', String(id), list[idx]);
                } catch(e) {}
            }

            try {
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {}

            window.dispatchEvent(new CustomEvent('wiz-quotes-changed', { detail: list[idx] }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return list[idx];
        },

        async delete(id) {
            if (!id) return;
            const strId = String(id);
            addDeletedQuoteId(strId);

            const list = this.getAll();
            const quote = list.find(q => String(q.id) === strId);
            const filtered = list.filter(q => String(q.id) !== strId);
            setStore(STORAGE_KEYS.QUOTES, filtered);

            if (quote) {
                activityLog.add('quote', `Quote "${quote.source}" dihapus.`, 'Admin');
            }

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.remove('quotes', strId);
                } catch(e) {}
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                try {
                    await window.wizFirebase.remove('quotes', strId);
                } catch(e) {}
            }

            try {
                if (typeof pushToCloud === 'function') {
                    await pushToCloud();
                }
            } catch(e) {}

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

    // Full sync on startup:
    async function initSync() {
        try {
            await syncFromCloud(true);   // Step 1: Pull fresh authoritative data from Cloud
            const isAdmin = window.location.pathname.includes('admin') || 
                            window.location.href.includes('admin.html') ||
                            sessionStorage.getItem('wiz_admin_authenticated') === 'true' ||
                            localStorage.getItem('wiz_admin_logged_in') === 'true';
            
            if (isAdmin) {
                await pushToCloud();     // Step 2: Push local admin changes to Cloud
                await syncFromCloud(true); // Step 3: Re-verify
            }
            console.log('[WIZ Sync Engine] Init sync complete.');
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        } catch(e) {
            console.warn('[WIZ Sync Engine] Init sync error:', e.message);
        }
    }

    // Slight delay so Firebase client script finishes loading
    setTimeout(initSync, 200);

    // Automatic recurring background cloud sync every 12 seconds (when tab is active)
    setInterval(async () => {
        if (document.visibilityState === 'visible') {
            try {
                await syncFromCloud();
                window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            } catch(e) {}
        }
    }, 12000);

    // ─── Public API ───────────────────────────────────────
    window.wizStore = {
        donations,
        finance,
        news,
        programs,
        disbursements,
        baselines,
        siteImages,
        siteSettings: siteSettingsManager,
        adminUsers,
        referrals,
        donorAttributions: donorAttributionsManager,
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
        utils: { formatRupiahCompact, formatDate, formatDateTime, timeAgo, generateId, mapProgramToPillar, escapeHtml }
    };

    console.log('[WIZ Store] Initialized with real-time cloud sync & 10s auto-polling. Collections ready.');
})();
