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
        KPI_MITRA: 'wiz_kpi_mitra',
        DONOR_ATTRIBUTIONS: 'wiz_donor_attributions',
        QUOTES: 'wiz_quotes',
        PROGRAMS: 'wiz_programs',
        DELETED_IDS: 'wiz_deleted_donation_ids',
        DELETED_NEWS_IDS: 'wiz_deleted_news_ids',
        DELETED_DISB_IDS: 'wiz_deleted_disb_ids',
        DELETED_REF_IDS: 'wiz_deleted_ref_ids',
        DELETED_KPI_IDS: 'wiz_deleted_kpi_ids',
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
            { id: 'pangkalpinang', name: 'Kantor Pangkalpinang', address: 'Jl. Mentok No. 45, Pangkalpinang, Bangka Belitung', phone: '0823-8083-0808', hotline: '082380830808', mapsUrl: 'https://maps.google.com' },
            { id: 'sungailiat', name: 'Kantor Sungailiat', address: 'Jl. Jenderal Sudirman No. 12, Sungailiat, Bangka', phone: '+62 887-1528-889', hotline: '08871528889', mapsUrl: 'https://maps.google.com' }
        ],
        hotline: '082380830808'
    };

    const DEFAULT_SITE_IMAGES = {
        hero_card: 'assets/images/foto-utama-wiz.jpg',
        about_img: 'assets/images/foto-utama-wiz.jpg',
        berkah_hidayah: 'assets/images/pembangunan-markaz-dakwah.png',
        berkah_juara: 'assets/images/beasiswa-pendidikan-juara.png',
        berkah_sehat: 'assets/images/layanan-pengobatan-gratis.png',
        berkah_peduli: 'assets/images/sedekah-beras-dhuafa.png',
        berkah_mandiri: 'assets/images/modal-usaha-dhuafa.png',
        banner_donasi: 'assets/images/foto-utama-wiz.jpg'
    };

    const DEFAULT_SPECIFIC_PROGRAM_IMAGES = {
        'Pray For NTT': 'assets/images/foto-utama-wiz.jpg',
        'Sedekah Beras Dhuafa': 'assets/images/sedekah-beras-dhuafa.png',
        'Sedekah Beras Dai': 'assets/images/sedekah-beras-dhuafa.png',
        'Sedekah Beras Dai Koba': 'assets/images/sedekah-beras-dhuafa.png',
        'Sedekah Jumat': 'assets/images/sedekah-jumat.png',
        'Sedekah Jumat Berkah': 'assets/images/sedekah-jumat.png',
        'Tebar Sembako': 'assets/images/tebar-sembako.png',
        'Tebar Sembako Dhuafa': 'assets/images/tebar-sembako.png',
        'Tebar Sembako Nusantara': 'assets/images/tebar-sembako.png',
        'Santunan Yatim': 'assets/images/santunan-yatim.png',
        'Santunan Anak Yatim': 'assets/images/santunan-yatim.png',
        'Tebar Iftar': 'assets/images/tebar-iftar-nusantara.png',
        'Tebar Iftar Nusantara': 'assets/images/tebar-iftar-nusantara.png',
        'Tebar Ifthar Nusantara': 'assets/images/tebar-iftar-nusantara.png',
        'Beasiswa Pendidikan Juara': 'assets/images/beasiswa-pendidikan-juara.png',
        'Beasiswa Juara': 'assets/images/beasiswa-pendidikan-juara.png',
        'Beasiswa Tahfidz & Dhuafa': 'assets/images/tahfidz.png',
        'Beasiswa Tahfidz': 'assets/images/tahfidz.png',
        'Tahfidz': 'assets/images/tahfidz.png',
        'Tahfidz (Berkah untuk Ahlul Qur\'an)': 'assets/images/tahfidz.png',
        'Tahfidz Al-Qur\'an': 'assets/images/tahfidz.png',
        'Berkah untuk Ahlul Qur\'an': 'assets/images/tahfidz.png',
        'Perlengkapan Belajar Yatim': 'assets/images/perlengkapan-belajar-yatim.png',
        'WIZ Berkah Juara Perlengkapan Belajar Yatim': 'assets/images/perlengkapan-belajar-yatim.png',
        'Modal Usaha Dhuafa': 'assets/images/modal-usaha-dhuafa.png',
        'Modal Usaha Mandiri': 'assets/images/modal-usaha-dhuafa.png',
        'Modal Usaha': 'assets/images/modal-usaha-dhuafa.png',
        'Gerobak Berkah UMKM': 'assets/images/modal-usaha-dhuafa.png',
        'Pelatihan Keterampilan Wirausaha': 'assets/images/pelatihan-keterampilan-wirausaha.png',
        'Bantuan Pengobatan': 'assets/images/layanan-pengobatan-gratis.png',
        'Bantuan Kesehatan Dhuafa': 'assets/images/bantuan-kesehatan-dhuafa.png',
        'Bantuan Pasien Kritis Dhuafa': 'assets/images/bantuan-kesehatan-dhuafa.png',
        'Layanan Pengobatan Gratis': 'assets/images/layanan-pengobatan-gratis.png',
        'Ambulance Gratis Ummat': 'assets/images/ambulance-gratis-ummat.png',
        'Ambulans Gratis Peduli': 'assets/images/ambulance-gratis-ummat.png',
        'Layanan Ambulance Ummat': 'assets/images/ambulance-gratis-ummat.png',
        'Khitanan Massal Dhuafa': 'assets/images/khitanan-massal-dhuafa.png',
        'Khitanan Massal': 'assets/images/khitanan-massal-dhuafa.png',
        'Keberangkatan Kepulangan Dai': 'assets/images/keberangkatan-kepulangan-dai.jpg',
        'Keberangkatan & Kepulangan Dai': 'assets/images/keberangkatan-kepulangan-dai.jpg',
        'Keberangkatan dan Kepulangan Dai': 'assets/images/keberangkatan-kepulangan-dai.jpg',
        'Pengadaan Celengan Sedekah Subuh': 'assets/images/default-program-wiz.jpg',
        'Pengadaan Celengan Besar': 'assets/images/default-program-wiz.jpg',
        'Pembangunan Markaz': 'assets/images/pembangunan-markaz-dakwah.png',
        'Pembangunan Markaz Dakwah': 'assets/images/pembangunan-markaz-dakwah.png',
        'Pengadaan & Perbaikan Kendaraan': 'assets/images/pengadaan-perbaikan-kendaraan.png',
        'Pengadaan dan Perbaikan Kendaraan': 'assets/images/pengadaan-perbaikan-kendaraan.png',
        'Santunan Mualaf': 'assets/images/santunan-mualaf.png',
        'Pelatihan Public Speaking': 'assets/images/default-program-wiz.jpg',
        'Tabligh Akbar Dzulhijjah': 'assets/images/foto-utama-wiz.jpg',
        'Pelatihan Guru Dirosa': 'assets/images/tahfidz.png',
        'Pelatihan Penyelenggaraan Jenazah': 'assets/images/default-program-wiz.jpg',
        'Pelatihan Volunteer Media Dakwah': 'assets/images/default-program-wiz.jpg',
        'Lomba Desain Poster Dakwah': 'assets/images/default-program-wiz.jpg',
        'Kantor DPW WI Babel & WIZ': 'assets/images/foto-utama-wiz.jpg',
        'Kantor DPW WI Babel dan WIZ': 'assets/images/foto-utama-wiz.jpg',
        'Mukerwil Mukernas Muktamar': 'assets/images/foto-utama-wiz.jpg',
        'Mukerwil/Mukernas/Muktamar': 'assets/images/foto-utama-wiz.jpg',
        "Tebar Qur'an Nusantara": 'assets/images/tebar-quran-nusantara.png',
        "Tebar Quran Nusantara": 'assets/images/tebar-quran-nusantara.png',
        'Bahagiakan Guru Ngaji': 'assets/images/foto-utama-wiz.jpg',
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
            wilayah: 'Semua Wilayah',
            status: 'approved',
            createdAt: new Date().toISOString()
        }
    ];

    const DEFAULT_REFERRALS = [];

    const DEFAULT_NEWS = [];

    // ─── Helpers ───────────────────────────────────────────
    function getDeletedQuoteIds() {
        try {
            return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_QUOTE_IDS) || '[]'));
        } catch { return new Set(); }
    }

    function addDeletedQuoteId(id) {
        if (!id) return;
        const set = getDeletedQuoteIds();
        set.add(String(id));
        setStore(STORAGE_KEYS.DELETED_QUOTE_IDS, Array.from(set));
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
        setStore(STORAGE_KEYS.DELETED_PROGRAM_IDS, Array.from(set));
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
        setStore(STORAGE_KEYS.DELETED_ADMIN_IDS, Array.from(set));
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
            const tempKeys = ['wiz_preview_cache', 'wiz_backup_temp', 'wiz_last_export', 'wiz_temp_log'];
            tempKeys.forEach(k => {
                try { localStorage.removeItem(k); } catch(e) {}
            });
            const acts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY) || '[]');
            if (acts.length > 20) {
                try { localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(acts.slice(-20))); } catch(e) {}
            }
        } catch(e) {}
    }

    function initStore() {
        try {
            if (typeof localStorage === 'undefined') return;

            // One-time Auto-Purge of All Mock/Old Data (Admins, Mitra, Donasi, Penyaluran, Berita, Quote, Log)
            if (localStorage.getItem('wiz_full_data_purge_2026') !== 'true') {
                localStorage.setItem(STORAGE_KEYS.DONATIONS, '[]');
                localStorage.setItem(STORAGE_KEYS.DISBURSEMENTS, '[]');
                localStorage.setItem(STORAGE_KEYS.REFERRALS, '[]');
                localStorage.setItem(STORAGE_KEYS.REFERRAL_PAYOUTS, '[]');
                localStorage.setItem(STORAGE_KEYS.DONOR_ATTRIBUTIONS, '[]');
                localStorage.setItem(STORAGE_KEYS.NEWS, '[]');
                localStorage.setItem(STORAGE_KEYS.QUOTES, '[]');
                localStorage.setItem(STORAGE_KEYS.ACTIVITY, '[]');
                localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(DEFAULT_ADMIN_USERS));
                localStorage.setItem(STORAGE_KEYS.DELETED_IDS, '[]');
                localStorage.setItem(STORAGE_KEYS.DELETED_NEWS_IDS, '[]');
                localStorage.setItem(STORAGE_KEYS.DELETED_DISB_IDS, '[]');
                localStorage.setItem(STORAGE_KEYS.DELETED_REF_IDS, '[]');
                localStorage.setItem(STORAGE_KEYS.DELETED_QUOTE_IDS, '[]');
                localStorage.setItem(STORAGE_KEYS.DELETED_PROGRAM_IDS, '[]');
                localStorage.setItem(STORAGE_KEYS.DELETED_ADMIN_IDS, '[]');
                localStorage.setItem(STORAGE_KEYS.BASELINES, JSON.stringify(DEFAULT_BASELINES));

                memoryStoreFallback.set(STORAGE_KEYS.DONATIONS, []);
                memoryStoreFallback.set(STORAGE_KEYS.DISBURSEMENTS, []);
                memoryStoreFallback.set(STORAGE_KEYS.REFERRALS, []);
                memoryStoreFallback.set(STORAGE_KEYS.REFERRAL_PAYOUTS, []);
                memoryStoreFallback.set(STORAGE_KEYS.DONOR_ATTRIBUTIONS, []);
                memoryStoreFallback.set(STORAGE_KEYS.NEWS, []);
                memoryStoreFallback.set(STORAGE_KEYS.QUOTES, []);
                memoryStoreFallback.set(STORAGE_KEYS.ACTIVITY, []);
                memoryStoreFallback.set(STORAGE_KEYS.ADMIN_USERS, DEFAULT_ADMIN_USERS);

                localStorage.setItem('wiz_full_data_purge_2026', 'true');
            }
        } catch(e) {}
    }

    initStore();

    function getStore(key) {
        try {
            const item = localStorage.getItem(key);
            if (item) {
                let parsed = JSON.parse(item);
                if (key === STORAGE_KEYS.NEWS) {
                    if (Array.isArray(parsed)) return parsed;
                    return [];
                }
                if (key === STORAGE_KEYS.PROGRAMS && Array.isArray(parsed)) {
                    let cleaned = false;
                    parsed.forEach(p => {
                        if (p && p.imageUrl && (p.imageUrl.includes('unsplash.com') || p.imageUrl.includes('placeholder'))) {
                            p.imageUrl = DEFAULT_SPECIFIC_PROGRAM_IMAGES[p.title] || 'assets/images/default-program-wiz.jpg';
                            cleaned = true;
                        }
                    });
                    if (cleaned) {
                        localStorage.setItem(key, JSON.stringify(parsed));
                    }
                }
                return parsed;
            }
        } catch (e) {
            console.warn("[WIZ Store] Gagal baca localStorage, fallback memory:", key);
        }
        if (key === STORAGE_KEYS.NEWS) return [];
        return memoryStoreFallback.get(key) || null;
    }

    function setStore(key, data) {
        memoryStoreFallback.set(key, data);
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
                cleanStorageQuota();
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                } catch (retryErr) {
                    console.warn('[WIZ Store] Data preserved in memory buffer.');
                }
            } else {
                console.warn('[WIZ Store] setStore warning:', key, e.message);
            }
        }
    }

    function formatRupiah(num) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
    }

    function formatRupiahCompact(num) {
        return formatRupiah(num);
    }

    if (typeof window !== 'undefined') {
        window.formatRupiah = formatRupiah;
        window.formatRupiahCompact = formatRupiahCompact;
        window.wizStore = window.wizStore || {};
        window.wizStore.utils = window.wizStore.utils || {};
        window.wizStore.utils.formatRupiah = formatRupiah;
        window.wizStore.utils.formatRupiahCompact = formatRupiahCompact;
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

    const DEFAULT_BASELINES = {
        baseMasuk: 0,
        baseTersalurkan: 0,
        baseDonatur: 0
    };

    function getDeletedIds() {
        try {
            return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_IDS) || '[]'));
        } catch { return new Set(); }
    }

    function addDeletedId(id) {
        if (!id) return;
        const set = getDeletedIds();
        set.add(String(id));
        setStore(STORAGE_KEYS.DELETED_IDS, Array.from(set));
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
        setStore(STORAGE_KEYS.DELETED_NEWS_IDS, Array.from(set));
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
        setStore(STORAGE_KEYS.DELETED_DISB_IDS, Array.from(set));
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
        setStore(STORAGE_KEYS.DELETED_REF_IDS, Array.from(set));
    }

    function getDeletedKpiIds() {
        try {
            return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_KPI_IDS) || '[]'));
        } catch { return new Set(); }
    }

    function addDeletedKpiId(id) {
        if (!id) return;
        const set = getDeletedKpiIds();
        set.add(String(id));
        setStore(STORAGE_KEYS.DELETED_KPI_IDS, Array.from(set));
    }

    function getDeletedQuoteIds() {
        try {
            return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_QUOTE_IDS) || '[]'));
        } catch { return new Set(); }
    }

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
                    items: [
                        { key: 'Pembangunan Markaz', percent: 5 },
                        { key: 'Pengadaan & Perbaikan Kendaraan', percent: 10 },
                        { key: 'Santunan Mualaf', percent: 5 },
                        { key: 'Pengadaan Celengan Sedekah Subuh', percent: 10 },
                        { key: 'Tahfidz', percent: 5 },
                        { key: 'Pelatihan Public Speaking', percent: 5 },
                        { key: 'Tabligh Akbar Dzhulhijjah', percent: 5 },
                        { key: 'Pelatihan Guru Dirosa', percent: 5 },
                        { key: 'Pelatihan Penyelenggaraan Jenazah', percent: 5 },
                        { key: 'Pelatihan Volunteer Media Dakwah', percent: 5 },
                        { key: 'Lomba Desain Poster Dakwah', percent: 5 },
                        { key: 'Kantor DPW WI Babel dan WIZ', percent: 15 },
                        { key: 'Mukerwil/Mukernas/Muktamar', percent: 10 },
                        { key: 'Keberangkatan Kepulangan Dai', percent: 10 }
                    ]
                    // Total = 100% → VALID (Khusus Pangkalpinang)
                },
                'Berkah Juara': {
                    items: [
                        { key: 'Beasiswa Pendidikan Juara', percent: 80 },
                        { key: 'Perlengkapan Belajar Yatim', percent: 15 },
                        { key: 'Beasiswa Tahfidz & Dhuafa', percent: 5 }
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
                        { key: 'Pengadaan & Perbaikan Kendaraan', percent: 25 },
                        { key: 'Pengadaan Celengan Sedekah Subuh', percent: 30 },
                        { key: 'Kantor', percent: 20 },
                        { key: 'Mukerwil/Mukernas/Muktamar', percent: 15 }
                    ]
                    // Total = 100% → VALID
                },
                'Berkah Juara': {
                    items: [
                        { key: 'Beasiswa Pendidikan Juara', percent: 80 },
                        { key: 'Perlengkapan Belajar Yatim', percent: 15 },
                        { key: 'Beasiswa Tahfidz & Dhuafa', percent: 5 }
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
            window.dispatchEvent(new CustomEvent('wiz-site-images-changed', { detail: current }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));

            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    const bc = new BroadcastChannel('wiz_sync_channel');
                    bc.postMessage({ type: 'site-images-updated', key, url, siteImages: current });
                    bc.close();
                } catch(e) {}
            }

            // Immediate Cloud sync to Supabase dedicated key and API endpoints
            (async () => {
                try {
                    // 1. Tulis ke standalone site_images key di Supabase
                    if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                        await window.wizSupabase.upsert('site_settings', {
                            key: 'site_images',
                            value: current,
                            updated_at: new Date().toISOString()
                        });
                    }

                    // 2. Call /api/sync-photo endpoint
                    const syncTargets = ['/api/sync-photo'];
                    if (window.location.hostname !== 'www.wizbangkabelitung.or.id' && window.location.hostname !== 'wizbangkabelitung.or.id') {
                        syncTargets.push('https://www.wizbangkabelitung.or.id/api/sync-photo');
                    }
                    for (const target of syncTargets) {
                        try {
                            await fetch(target, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ siteImageKey: key, imageUrl: url, siteImages: current })
                            });
                        } catch(e) {}
                    }

                    // 3. Push master state so master_bundle is also updated
                    if (typeof pushToCloud === 'function') {
                        pushToCloud().catch(() => {});
                    }

                    // 4. Push to Firebase if configured
                    if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                        await window.wizFirebase.set('site_images', key, { key, url, label: label || key, updatedAt: new Date().toISOString() });
                    }
                } catch(e) {
                    console.warn('[siteImages.update] Cloud sync notice:', e.message);
                }
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

            // Immediate & non-blocking Cloud sync — tulis HANYA ke dedicated site_images key
            (async () => {
                try {
                    // 1. Tulis ke standalone site_images key (cepat, tidak perlu baca master_bundle)
                    if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                        await window.wizSupabase.upsert('site_settings', {
                            key: 'site_images',
                            value: current,
                            updated_at: new Date().toISOString()
                        });
                    }

                    // 2. Call /api/sync-photo endpoint with batch images (server-side backup sync)
                    const syncTargets = ['/api/sync-photo'];
                    if (window.location.hostname !== 'www.wizbangkabelitung.or.id' && window.location.hostname !== 'wizbangkabelitung.or.id') {
                        syncTargets.push('https://www.wizbangkabelitung.or.id/api/sync-photo');
                    }
                    for (const target of syncTargets) {
                        try {
                            await fetch(target, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ siteImages: imagesObj })
                            });
                        } catch(e) {}
                    }

                    // 3. Push to Firebase if configured
                    if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                        for (const [key, url] of Object.entries(imagesObj)) {
                            await window.wizFirebase.set('site_images', key, { key, url, label: key, updatedAt: new Date().toISOString() });
                        }
                    }
                } catch(e) {
                    console.warn('[siteImages.updateAll] Cloud sync notice:', e.message);
                }
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
                                const cleanU = (u.username || '').toLowerCase();
                                mb.deleted_admin_ids = mb.deleted_admin_ids.filter(x => String(x) !== String(u.id) && String(x).toLowerCase() !== cleanU);
                                const idx = mb.admin_users.findIndex(x => String(x.id) === String(u.id) || (x.username && u.username && x.username.toLowerCase() === cleanU));
                                if (idx !== -1) mb.admin_users[idx] = { ...mb.admin_users[idx], ...u, updatedAt: new Date().toISOString() };
                                else mb.admin_users.push({ ...u, updatedAt: new Date().toISOString() });
                            }
                        } else if (action === 'approve_admin_user') {
                            const targetId = String(payload.id);
                            const idx = mb.admin_users.findIndex(x => String(x.id) === targetId || (x.username && x.username.toLowerCase() === targetId.toLowerCase()));
                            if (idx !== -1) {
                                mb.admin_users[idx].status = 'approved';
                                mb.admin_users[idx].verifiedAt = new Date().toISOString();
                                mb.admin_users[idx].verifiedBy = payload.verifiedBy || 'Admin 1';
                                mb.admin_users[idx].updatedAt = new Date().toISOString();
                            }
                        } else if (action === 'delete_admin_user') {
                            const targetId = String(payload.id);
                            const target = mb.admin_users.find(x => String(x.id) === targetId || (x.username && x.username.toLowerCase() === targetId.toLowerCase()));
                            mb.admin_users = mb.admin_users.filter(x => String(x.id) !== targetId && (!target || x.username.toLowerCase() !== target.username.toLowerCase()) && x.username !== 'admin');
                            if (!mb.deleted_admin_ids.includes(targetId)) mb.deleted_admin_ids.push(targetId);
                            if (target && target.username && !mb.deleted_admin_ids.includes(target.username.toLowerCase())) {
                                mb.deleted_admin_ids.push(target.username.toLowerCase());
                            }
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
                .filter(u => u && (u.id || u.username) && !deletedSet.has(String(u.id)) && (!u.username || !deletedSet.has(u.username.toLowerCase())) && u.status !== 'deleted' && u.status !== 'rejected' && !u.isDeleted);
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
            const currentActor = sessionStorage.getItem('wiz_admin_user') || '';
            const currentRole = sessionStorage.getItem('wiz_admin_role') || '';
            const isActorSuper = currentActor === 'admin' || currentRole === 'super_admin';
            if (!isActorSuper) {
                return { success: false, message: 'Akses Ditolak: Hanya Admin 1 Utama atau Super Admin yang berhak menambahkan akun admin baru.' };
            }

            const cleanUser = (username || '').trim().toLowerCase();
            if (!cleanUser || !password) {
                return { success: false, message: 'Username dan kata sandi wajib diisi.' };
            }
            if (cleanUser === 'admin') {
                return { success: false, message: 'Username "admin" adalah akun Admin 1 Utama dan tidak dapat didaftarkan ulang.' };
            }

            // Remove from deleted set if previously deleted
            const delSet = getDeletedAdminIds();
            if (delSet.has(cleanUser)) {
                delSet.delete(cleanUser);
                setStore(STORAGE_KEYS.DELETED_ADMIN_IDS, Array.from(delSet));
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
                    targetUser.verifiedBy = currentActor || 'Admin 1';
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
                    verifiedBy: status === 'approved' ? (currentActor || 'Admin 1') : null
                };
                list.push(targetUser);
            }

            setStore(STORAGE_KEYS.ADMIN_USERS, list);
            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('auth', `Akun admin '${cleanUser}' disimpan (Status: ${targetUser.status}, Peran: ${targetUser.role})`, currentActor || 'Admin 1');
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
            const currentActor = sessionStorage.getItem('wiz_admin_user') || '';
            const currentRole = sessionStorage.getItem('wiz_admin_role') || '';
            const isActorSuper = currentActor === 'admin' || currentRole === 'super_admin';
            if (!isActorSuper) {
                return { success: false, message: 'Akses Ditolak: Hanya Admin 1 Utama atau Super Admin yang berhak mengedit data atau kata sandi admin.' };
            }

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
                    user.verifiedBy = currentActor || 'Admin 1';
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

            // Remove from deleted set if re-registering
            const delSet = getDeletedAdminIds();
            if (delSet.has(cleanUser)) {
                delSet.delete(cleanUser);
                setStore(STORAGE_KEYS.DELETED_ADMIN_IDS, Array.from(delSet));
            }

            let list = this.getAll();
            const existing = list.find(u => u.username.toLowerCase() === cleanUser);

            if (existing) {
                if (existing.status === 'approved') {
                    return { success: false, message: 'Username ini sudah terdaftar dan aktif. Silakan masuk melalui tab Masuk Admin.' };
                }
                existing.fullName = cleanName;
                existing.phone = cleanPhone;
                existing.password = cleanPass;
                existing.role = cleanRole;
                existing.wilayah = cleanWil;
                existing.status = 'pending';
                existing.updatedAt = new Date().toISOString();

                setStore(STORAGE_KEYS.ADMIN_USERS, list);
                if (typeof activityLog !== 'undefined' && activityLog.add) {
                    activityLog.add('auth', `Pembaruan pendaftaran akun admin: '${cleanUser}' (Menunggu persetujuan Admin 1)`, cleanUser);
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
                activityLog.add('auth', `Pendaftaran akun admin baru: '${cleanUser}' (Menunggu persetujuan Admin 1)`, cleanUser);
            }

            window.dispatchEvent(new CustomEvent('wiz-admin-users-changed'));
            broadcastSync('NEW_ADMIN_USER', newUser);

            microSyncAdmin('register_admin_user', { user: newUser });
            if (typeof pushToCloud === 'function') {
                setTimeout(() => pushToCloud().catch(() => {}), 100);
            }

            return { success: true, user: newUser, message: 'Pendaftaran berhasil! Akun Anda otomatis masuk antrean dan menunggu persetujuan Admin 1 Utama untuk dapat login.' };
        },
        async login(username, password) {
            const cleanUser = (username || '').trim().toLowerCase();
            const cleanPass = (password || '').trim();
            let list = this.getAll();

            let found = list.find(u => u.username && u.username.toLowerCase() === cleanUser);

            // Fast path: if already approved and credentials match locally, allow instant login (0ms)
            if (found && found.password === cleanPass && found.status === 'approved') {
                return { success: true, user: found };
            }

            // Real-time Cloud Verification with fast targeted endpoint & timeout (max 2 seconds)
            try {
                let cloudUser = null;
                const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
                const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;

                // 1. Fast targeted query to /api/sync (<50ms)
                try {
                    const fetchOpts = {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'verify_admin_user', username: cleanUser }),
                        cache: 'no-cache'
                    };
                    if (controller) fetchOpts.signal = controller.signal;
                    const res = await fetch('/api/sync', fetchOpts);
                    if (res.ok) {
                        const json = await res.json();
                        if (json && json.status === 'success' && json.user) {
                            cloudUser = json.user;
                        }
                    }
                } catch(e) {}

                // 2. Fallback to Supabase site_settings if not returned by /api/sync
                if (!cloudUser && window.wizSupabase && window.wizSupabase.isConfigured()) {
                    try {
                        const sbRes = await window.wizSupabase.select('site_settings', {
                            filter: 'key=eq.master_bundle',
                            signal: controller ? controller.signal : undefined
                        });
                        if (sbRes && sbRes.data && sbRes.data[0] && sbRes.data[0].value && Array.isArray(sbRes.data[0].value.admin_users)) {
                            cloudUser = sbRes.data[0].value.admin_users.find(u => u && u.username && u.username.toLowerCase() === cleanUser) || null;
                        }
                    } catch(e) {}
                }

                if (timeoutId) clearTimeout(timeoutId);

                if (cloudUser) {
                    const deletedSet = getDeletedAdminIds();
                    if (!deletedSet.has(String(cloudUser.id)) && !deletedSet.has(cleanUser)) {
                        const idx = list.findIndex(u => (u.username && u.username.toLowerCase() === cleanUser) || String(u.id) === String(cloudUser.id));
                        if (idx !== -1) {
                            list[idx] = { ...list[idx], ...cloudUser };
                        } else {
                            list.push(cloudUser);
                        }
                        setStore(STORAGE_KEYS.ADMIN_USERS, list);
                        window.dispatchEvent(new CustomEvent('wiz-admin-users-changed'));
                        found = list.find(u => u.username && u.username.toLowerCase() === cleanUser);
                    }
                }
            } catch(err) {
                console.warn('[Admin Login] Online cloud verify warning:', err);
            }

            if (!found) {
                return { success: false, message: 'Username tidak ditemukan!' };
            }

            if (found.password !== cleanPass) {
                return { success: false, message: 'Kata sandi salah!' };
            }

            if (found.status === 'pending') {
                return { success: false, message: 'Akun Anda belum disetujui oleh Admin 1 Utama. Silakan hubungi Admin 1 untuk verifikasi.' };
            }

            if (found.status === 'rejected') {
                return { success: false, message: 'Akun admin ini dinonaktifkan atau ditolak oleh Admin 1 Utama.' };
            }

            return { success: true, user: found };
        },

        async approve(id, adminActor) {
            const currentActor = adminActor || sessionStorage.getItem('wiz_admin_user') || 'Admin 1';
            const currentRole = sessionStorage.getItem('wiz_admin_role') || '';
            const isActorSuper = currentActor === 'admin' || currentRole === 'super_admin';
            if (!isActorSuper) {
                return { success: false, message: 'Akses Ditolak: Hanya Admin 1 Utama atau Super Admin yang berhak menyetujui pendaftaran admin.' };
            }

            let list = this.getAll();
            const idx = list.findIndex(u => String(u.id) === String(id) || (u.username && u.username.toLowerCase() === String(id).toLowerCase()));
            if (idx === -1) return { success: false, message: 'Pengguna tidak ditemukan' };

            list[idx].status = 'approved';
            list[idx].verifiedAt = new Date().toISOString();
            list[idx].verifiedBy = currentActor;
            list[idx].updatedAt = new Date().toISOString();
            setStore(STORAGE_KEYS.ADMIN_USERS, list);

            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('auth', `Akun admin '${list[idx].username}' telah disetujui & diaktifkan`, currentActor);
            }

            window.dispatchEvent(new CustomEvent('wiz-admin-users-changed'));
            broadcastSync('UPDATE_ADMIN_USERS', list);

            microSyncAdmin('approve_admin_user', { id: list[idx].id, verifiedBy: currentActor });
            if (typeof pushToCloud === 'function') {
                setTimeout(() => pushToCloud().catch(() => {}), 100);
            }
            return { success: true, user: list[idx] };
        },
        async reject(id, adminActor) {
            const currentActor = adminActor || sessionStorage.getItem('wiz_admin_user') || 'Admin 1';
            const currentRole = sessionStorage.getItem('wiz_admin_role') || '';
            const isActorSuper = currentActor === 'admin' || currentRole === 'super_admin';
            if (!isActorSuper) {
                return { success: false, message: 'Akses Ditolak: Hanya Admin 1 Utama atau Super Admin yang berhak menolak pendaftaran admin.' };
            }

            let list = this.getAll();
            const target = list.find(u => String(u.id) === String(id) || (u.username && u.username.toLowerCase() === String(id).toLowerCase()));
            if (!target) return { success: true };
            if (target.username === 'admin') return { success: false, message: 'Akun Admin 1 tidak dapat ditolak/dihapus.' };

            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('auth', `Pendaftaran akun admin '${target.username}' tidak disetujui / ditolak permanen`, currentActor);
            }

            return this.delete(target.id || id);
        },
        async delete(id) {
            const currentActor = sessionStorage.getItem('wiz_admin_user') || 'Admin 1';
            const currentRole = sessionStorage.getItem('wiz_admin_role') || '';
            const isActorSuper = currentActor === 'admin' || currentRole === 'super_admin';
            if (!isActorSuper) {
                return { success: false, message: 'Akses Ditolak: Hanya Admin 1 Utama atau Super Admin yang berhak menghapus akun admin.' };
            }

            let list = this.getAll();
            const target = list.find(u => String(u.id) === String(id) || (u.username && u.username.toLowerCase() === String(id).toLowerCase()));
            if (target && target.username === 'admin') {
                return { success: false, message: 'Akun Super Admin 1 utama tidak dapat dihapus.' };
            }

            const targetId = target ? String(target.id) : String(id);
            addDeletedAdminId(targetId);
            if (target && target.username) {
                addDeletedAdminId(target.username.toLowerCase());
            }

            list = list.filter(u => String(u.id) !== targetId && (!target || u.username.toLowerCase() !== target.username.toLowerCase()));
            setStore(STORAGE_KEYS.ADMIN_USERS, list);

            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('auth', `Akses admin '${target ? target.username : id}' dihapus permanen`, currentActor);
            }

            window.dispatchEvent(new CustomEvent('wiz-admin-users-changed'));
            broadcastSync('UPDATE_ADMIN_USERS', list);

            microSyncAdmin('delete_admin_user', { id: targetId });
            if (typeof pushToCloud === 'function') {
                setTimeout(() => pushToCloud().catch(() => {}), 100);
            }
            return { success: true };
        }
    };

    // ─── Allocation Rules Manager ─────────────────────────
    const allocationRulesManager = {
        getAll() {
            let saved = getStore(STORAGE_KEYS.ALLOCATION_RULES);
            if (!saved) {
                saved = JSON.parse(JSON.stringify(ALLOCATION_RULES));
            }
            let modified = false;

            // 1. Normalisasi Sub-Alokasi Berkah Hidayah KHUSUS Pangkalpinang (14 item tepat 100%, hapus duplikat 0%)
            const targetPangkalpinangHidayah = [
                { key: 'Pembangunan Markaz', percent: 5, image: 'assets/images/default-program-wiz.jpg' },
                { key: 'Pengadaan & Perbaikan Kendaraan', percent: 10, image: 'assets/images/default-program-wiz.jpg' },
                { key: 'Santunan Mualaf', percent: 5, image: 'assets/images/default-program-wiz.jpg' },
                { key: 'Pengadaan Celengan Sedekah Subuh', percent: 10, image: 'assets/images/default-program-wiz.jpg' },
                { key: 'Tahfidz', percent: 5, image: 'assets/images/default-program-wiz.jpg' },
                { key: 'Pelatihan Public Speaking', percent: 5, image: 'assets/images/default-program-wiz.jpg' },
                { key: 'Tabligh Akbar Dzhulhijjah', percent: 5, image: 'assets/images/default-program-wiz.jpg' },
                { key: 'Pelatihan Guru Dirosa', percent: 5, image: 'assets/images/default-program-wiz.jpg' },
                { key: 'Pelatihan Penyelenggaraan Jenazah', percent: 5, image: 'assets/images/default-program-wiz.jpg' },
                { key: 'Pelatihan Volunteer Media Dakwah', percent: 5, image: 'assets/images/default-program-wiz.jpg' },
                { key: 'Lomba Desain Poster Dakwah', percent: 5, image: 'assets/images/default-program-wiz.jpg' },
                { key: 'Kantor DPW WI Babel dan WIZ', percent: 15, image: 'assets/images/default-program-wiz.jpg' },
                { key: 'Mukerwil/Mukernas/Muktamar', percent: 10, image: 'assets/images/default-program-wiz.jpg' },
                { key: 'Keberangkatan Kepulangan Dai', percent: 10, image: 'assets/images/default-program-wiz.jpg' }
            ];

            if (saved['Pangkalpinang']) {
                if (!saved['Pangkalpinang'].subAllocation) saved['Pangkalpinang'].subAllocation = {};
                const currentH = saved['Pangkalpinang'].subAllocation['Berkah Hidayah'];
                let needsUpdate = false;
                if (!currentH || !Array.isArray(currentH.items) || currentH.items.length !== targetPangkalpinangHidayah.length) {
                    needsUpdate = true;
                } else {
                    for (let i = 0; i < targetPangkalpinangHidayah.length; i++) {
                        if (currentH.items[i].key !== targetPangkalpinangHidayah[i].key || currentH.items[i].percent !== targetPangkalpinangHidayah[i].percent) {
                            needsUpdate = true;
                            break;
                        }
                    }
                }
                if (needsUpdate) {
                    saved['Pangkalpinang'].subAllocation['Berkah Hidayah'] = { items: targetPangkalpinangHidayah };
                    modified = true;
                }
            }

            // 2. Normalize Berkah Juara subAllocation across all branches
            for (const [w, wData] of Object.entries(saved)) {
                if (wData && wData.subAllocation && wData.subAllocation['Berkah Juara']) {
                    const subJuara = wData.subAllocation['Berkah Juara'];
                    if (subJuara.items && Array.isArray(subJuara.items)) {
                        // Rename any legacy 'Beasiswa Yatim & Dhuafa' to 'Beasiswa Tahfidz & Dhuafa'
                        subJuara.items.forEach(item => {
                            if (item.key === 'Beasiswa Yatim & Dhuafa' || item.key === 'Beasiswa Yatim dan Dhuafa') {
                                item.key = 'Beasiswa Tahfidz & Dhuafa';
                                modified = true;
                            }
                        });

                        const itemJuara = subJuara.items.find(i => (i.key || '').toLowerCase().includes('pendidikan juara'));
                        const itemYatim = subJuara.items.find(i => (i.key || '').toLowerCase().includes('perlengkapan'));
                        const itemTahfidz = subJuara.items.find(i => (i.key || '').toLowerCase().includes('tahfidz') || (i.key || '').toLowerCase().includes('dhuafa') || (i.key || '').toLowerCase().includes('yatim & dhuafa'));

                        if (itemJuara && itemJuara.percent !== 80) { itemJuara.percent = 80; modified = true; }
                        if (itemYatim && itemYatim.percent !== 15) { itemYatim.percent = 15; modified = true; }
                        if (itemTahfidz) {
                            if (itemTahfidz.key !== 'Beasiswa Tahfidz & Dhuafa') { itemTahfidz.key = 'Beasiswa Tahfidz & Dhuafa'; modified = true; }
                            if (itemTahfidz.percent !== 5) { itemTahfidz.percent = 5; modified = true; }
                        } else {
                            subJuara.items.push({
                                key: 'Beasiswa Tahfidz & Dhuafa',
                                percent: 5,
                                image: 'assets/images/default-program-wiz.jpg'
                            });
                            modified = true;
                        }
                    }
                }
            }
            if (modified) {
                setStore(STORAGE_KEYS.ALLOCATION_RULES, saved);
            }
            return saved;
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

            // 4. Update programs store if exists
            try {
                const progs = getStore(STORAGE_KEYS.PROGRAMS) || [];
                let pModified = false;
                progs.forEach(p => {
                    if (p && p.title && p.title.toLowerCase() === programName.toLowerCase()) {
                        p.imageUrl = imageDataUrl;
                        pModified = true;
                    }
                });
                if (pModified) setStore(STORAGE_KEYS.PROGRAMS, progs);
            } catch(e) {}

            window.dispatchEvent(new CustomEvent('wiz-program-images-changed', { detail: { name: programName, image: imageDataUrl } }));
            window.dispatchEvent(new CustomEvent('wiz-programs-changed'));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));

            // Immediate Cloud sync to Supabase & Firebase
            (async () => {
                try {
                    // 1. Direct Supabase site_settings upsert (specific_prog_imgs & master_bundle)
                    if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                        const flatMap = JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}');
                        await window.wizSupabase.upsert('site_settings', {
                            key: 'specific_prog_imgs',
                            value: flatMap,
                            updated_at: new Date().toISOString()
                        });

                        try {
                            const mbRes = await window.wizSupabase.select('site_settings', { filter: 'key=eq.master_bundle' });
                            if (mbRes && mbRes.data && mbRes.data[0] && mbRes.data[0].value) {
                                const mb = mbRes.data[0].value;
                                if (!mb.specific_prog_imgs) mb.specific_prog_imgs = {};
                                mb.specific_prog_imgs[programName] = imageDataUrl;
                                if (Array.isArray(mb.programs)) {
                                    mb.programs.forEach(p => {
                                        if (p && p.title && p.title.toLowerCase() === programName.toLowerCase()) {
                                            p.imageUrl = imageDataUrl;
                                        }
                                    });
                                }
                                mb.updatedAt = new Date().toISOString();
                                await window.wizSupabase.upsert('site_settings', {
                                    key: 'master_bundle',
                                    value: mb,
                                    updated_at: new Date().toISOString()
                                });
                            }
                        } catch(e) {}
                    }

                    // 2. Call /api/sync-photo endpoint
                    const syncTargets = ['/api/sync-photo'];
                    if (window.location.hostname !== 'www.wizbangkabelitung.or.id' && window.location.hostname !== 'wizbangkabelitung.or.id') {
                        syncTargets.push('https://www.wizbangkabelitung.or.id/api/sync-photo');
                    }
                    for (const target of syncTargets) {
                        try {
                            await fetch(target, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ programTitle: programName, imageUrl: imageDataUrl })
                            });
                        } catch(e) {}
                    }

                    // 3. Push to Firebase if configured
                    if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                        await window.wizFirebase.set('site_images', imgKey, {
                            id: imgKey,
                            key: programName,
                            image_url: imageDataUrl,
                            updated_at: new Date().toISOString()
                        });
                    }

                    if (typeof pushToCloud === 'function') {
                        await pushToCloud();
                    }
                } catch(e) {
                    console.warn('[updateSpecificProgramImageByName] Cloud sync notice:', e.message);
                }
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
            if (!title) return 'assets/images/default-program-wiz.jpg';
            const cleanTitle = String(title).trim();
            const cleanQuery = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

            // 1. Check custom uploaded images store (prioritize admin uploads from Supabase / localStorage)
            try {
                const imgMap = JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}');
                if (imgMap[cleanTitle] && !imgMap[cleanTitle].includes('unsplash.com') && !imgMap[cleanTitle].includes('placeholder')) {
                    return imgMap[cleanTitle];
                }
                for (const [k, v] of Object.entries(imgMap)) {
                    const cleanK = String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                    if ((cleanK === cleanQuery || cleanQuery.includes(cleanK) || cleanK.includes(cleanQuery)) && v && !v.includes('unsplash.com') && !v.includes('placeholder')) {
                        return v;
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
                    if (found && found.imageUrl && !found.imageUrl.includes('unsplash.com') && !found.imageUrl.includes('placeholder')) {
                        return found.imageUrl;
                    }
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
                                    if ((kNorm === cleanQuery || cleanQuery.includes(kNorm) || cleanK.includes(cleanQuery)) && item.image && !item.image.includes('unsplash.com') && !item.image.includes('placeholder')) {
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

            // 5. Default specific program images dictionary
            if (DEFAULT_SPECIFIC_PROGRAM_IMAGES[cleanTitle]) {
                return DEFAULT_SPECIFIC_PROGRAM_IMAGES[cleanTitle];
            }
            for (const [k, v] of Object.entries(DEFAULT_SPECIFIC_PROGRAM_IMAGES)) {
                const cleanK = String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                if (cleanK === cleanQuery || cleanQuery.includes(cleanK) || cleanK.includes(cleanQuery)) {
                    return v;
                }
            }

            // 6. Default pillar fallback
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
            if (!title) return false;
            const cleanTitle = String(title).trim();
            const isCleared = !imgDataUrl || imgDataUrl.includes('default-program-wiz') || imgDataUrl.includes('placeholder');

            let imgMap = {};
            try {
                imgMap = JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}');
            } catch(e) {}

            if (isCleared) {
                delete imgMap[cleanTitle];
            } else {
                imgMap[cleanTitle] = imgDataUrl;
            }
            try {
                localStorage.setItem('wiz_specific_prog_imgs', JSON.stringify(imgMap));
            } catch(e) {
                cleanStorageQuota();
                try { localStorage.setItem('wiz_specific_prog_imgs', JSON.stringify(imgMap)); } catch(err) {}
            }

            try {
                if (typeof programs !== 'undefined' && programs.getAll) {
                    const allP = programs.getAll();
                    const target = allP.find(p => p && p.title && p.title.toLowerCase() === cleanTitle.toLowerCase());
                    if (target) {
                        await programs.update(target.id, { imageUrl: isCleared ? 'assets/images/default-program-wiz.jpg' : imgDataUrl });
                    }
                }
            } catch(e) {}

            // Clean up rules (do not store heavy base64 strings in allocation rules)
            try {
                const rules = this.getAll();
                let modified = false;
                for (const [wKey, wData] of Object.entries(rules)) {
                    if (wData && wData.subAllocation) {
                        for (const sub of Object.values(wData.subAllocation)) {
                            if (sub && sub.items) {
                                sub.items.forEach(i => {
                                    if ((i.key || '').toLowerCase() === cleanTitle.toLowerCase()) {
                                        delete i.image;
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

            // Direct sync to Supabase via dedicated endpoint & client
            (async () => {
                try {
                    const syncTargets = ['/api/sync-photo'];
                    if (window.location.hostname !== 'www.wizbangkabelitung.or.id' && window.location.hostname !== 'wizbangkabelitung.or.id') {
                        syncTargets.push('https://www.wizbangkabelitung.or.id/api/sync-photo');
                    }
                    for (const target of syncTargets) {
                        try {
                            await fetch(target, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ programTitle: cleanTitle, imageUrl: isCleared ? '' : imgDataUrl })
                            });
                        } catch(e) {}
                    }

                    if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                        await window.wizSupabase.upsert('site_settings', {
                            key: 'specific_prog_imgs',
                            value: imgMap,
                            updated_at: new Date().toISOString()
                        });
                    }
                } catch(e) {}
            })();

            // Broadcast real-time across tabs
            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    const bc = new BroadcastChannel('wiz_sync_channel');
                    bc.postMessage({ type: 'program-photo-updated', programTitle: cleanTitle, imageUrl: isCleared ? 'assets/images/default-program-wiz.jpg' : imgDataUrl });
                    bc.close();
                } catch(e) {}
            }

            window.dispatchEvent(new CustomEvent('wiz-program-images-changed', { detail: { title: cleanTitle, image: isCleared ? 'assets/images/default-program-wiz.jpg' : imgDataUrl } }));
            window.dispatchEvent(new CustomEvent('wiz-programs-changed'));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            if (typeof broadcastSync === 'function') {
                broadcastSync('PROGRAM_IMAGES_UPDATED', { title: cleanTitle, image: isCleared ? 'assets/images/default-program-wiz.jpg' : imgDataUrl });
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
        const news = DEFAULT_NEWS;
        const disbursements = [];
        const activity = [
            { id: generateId(), type: 'system', message: 'Sistem WIZ Babel berhasil diinisialisasi.', actor: 'Sistem', createdAt: new Date().toISOString() }
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
            // Safety: Pre-fetch latest remote quotes / settings to avoid overwriting items from other devices
            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    const sbRes = await window.wizSupabase.select('site_settings', { filter: 'key=in.(quotes,master_bundle)' });
                    if (sbRes && Array.isArray(sbRes.data) && sbRes.data.length > 0) {
                        const cloudQuotesDoc = sbRes.data.find(d => d.key === 'quotes');
                        const mbDoc = sbRes.data.find(d => d.key === 'master_bundle');
                        const cloudQuotes = (cloudQuotesDoc && Array.isArray(cloudQuotesDoc.value)) 
                            ? cloudQuotesDoc.value 
                            : (mbDoc && mbDoc.value && Array.isArray(mbDoc.value.quotes) ? mbDoc.value.quotes : []);
                        
                        if (cloudQuotes.length > 0) {
                            const deletedQSet = getDeletedQuoteIds();
                            const localQ = getStore(STORAGE_KEYS.QUOTES) || [];
                            const qMap = new Map();
                            cloudQuotes.forEach(q => {
                                if (q && q.id && !deletedQSet.has(String(q.id)) && q.status !== 'deleted' && !q.isDeleted) {
                                    qMap.set(String(q.id), q);
                                }
                            });
                            localQ.forEach(q => {
                                if (q && q.id && !deletedQSet.has(String(q.id)) && q.status !== 'deleted' && !q.isDeleted) {
                                    const strId = String(q.id);
                                    if (!qMap.has(strId)) {
                                        qMap.set(strId, q);
                                    } else {
                                        const existing = qMap.get(strId);
                                        const tExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
                                        const tLocal = new Date(q.updatedAt || q.createdAt || 0).getTime();
                                        if (tLocal >= tExisting) qMap.set(strId, { ...existing, ...q });
                                    }
                                }
                            });
                            const mergedQ = Array.from(qMap.values()).sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
                            setStore(STORAGE_KEYS.QUOTES, mergedQ);
                        }
                        if (mbDoc && mbDoc.value && Array.isArray(mbDoc.value.admin_users) && mbDoc.value.admin_users.length > 0) {
                            const cloudAdmins = mbDoc.value.admin_users;
                            const delAdminSet = getDeletedAdminIds();
                            const localAdmins = getStore(STORAGE_KEYS.ADMIN_USERS) || DEFAULT_ADMIN_USERS;
                            const adminMap = new Map();
                            cloudAdmins.forEach(u => {
                                if (u && (u.id || u.username) && !delAdminSet.has(String(u.id)) && (!u.username || !delAdminSet.has(u.username.toLowerCase())) && u.status !== 'deleted') {
                                    const key = (u.username || u.id).toLowerCase();
                                    adminMap.set(key, u);
                                }
                            });
                            localAdmins.forEach(u => {
                                if (u && (u.id || u.username) && !delAdminSet.has(String(u.id)) && (!u.username || !delAdminSet.has(u.username.toLowerCase())) && u.status !== 'deleted') {
                                    const key = (u.username || u.id).toLowerCase();
                                    if (!adminMap.has(key)) {
                                        adminMap.set(key, u);
                                    } else {
                                        const existing = adminMap.get(key);
                                        const tEx = new Date(existing.updatedAt || existing.verifiedAt || existing.createdAt || 0).getTime();
                                        const tLoc = new Date(u.updatedAt || u.verifiedAt || u.createdAt || 0).getTime();
                                        let merged;
                                        if (tLoc >= tEx) merged = { ...existing, ...u };
                                        else merged = { ...u, ...existing };
                                        if (existing.status === 'approved' || u.status === 'approved') {
                                            merged.status = 'approved';
                                            merged.verifiedAt = existing.verifiedAt || u.verifiedAt || new Date().toISOString();
                                            merged.verifiedBy = existing.verifiedBy || u.verifiedBy || 'Admin 1';
                                        }
                                        adminMap.set(key, merged);
                                    }
                                }
                            });
                            const mergedAdmins = Array.from(adminMap.values());
                            if (!mergedAdmins.some(u => u.username === 'admin')) {
                                mergedAdmins.unshift(DEFAULT_ADMIN_USERS[0]);
                            }
                            setStore(STORAGE_KEYS.ADMIN_USERS, mergedAdmins);
                        }
                    }
                } catch(e) {
                    console.warn('[pushToCloud] Pre-sync notice:', e);
                }
            }

            const currentQuotes = getStore(STORAGE_KEYS.QUOTES) || DEFAULT_QUOTES;

            // Clean allocation_rules of heavy duplicate base64 images before cloud push
            let cleanRules = getStore(STORAGE_KEYS.ALLOCATION_RULES) || ALLOCATION_RULES;
            try {
                cleanRules = JSON.parse(JSON.stringify(cleanRules));
                for (const wData of Object.values(cleanRules)) {
                    if (wData && wData.subAllocation) {
                        for (const sub of Object.values(wData.subAllocation)) {
                            if (sub && Array.isArray(sub.items)) {
                                sub.items.forEach(it => {
                                    if (it && it.image && it.image.startsWith('data:image')) {
                                        delete it.image;
                                    }
                                });
                            }
                        }
                    }
                }
            } catch(e) {}

            const bundle = {
                donations: getStore(STORAGE_KEYS.DONATIONS) || [],
                news: getStore(STORAGE_KEYS.NEWS) || [],
                disbursements: getStore(STORAGE_KEYS.DISBURSEMENTS) || [],
                referrals: getStore(STORAGE_KEYS.REFERRALS) || [],
                referral_payouts: getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || [],
                kpi_mitra: getStore(STORAGE_KEYS.KPI_MITRA) || [],
                activity: getStore(STORAGE_KEYS.ACTIVITY) || [],
                site_settings: getStore(STORAGE_KEYS.SITE_SETTINGS) || DEFAULT_SITE_SETTINGS,
                site_images: getStore(STORAGE_KEYS.SITE_IMAGES) || DEFAULT_SITE_IMAGES,
                allocation_rules: cleanRules,
                baselines: getStore(STORAGE_KEYS.BASELINES) || DEFAULT_BASELINES,
                admin_users: getStore(STORAGE_KEYS.ADMIN_USERS) || DEFAULT_ADMIN_USERS,
                custom_specific_programs: JSON.parse(localStorage.getItem('wiz_custom_specific_programs') || '{}'),
                specific_prog_imgs: JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}'),
                quotes: currentQuotes,
                programs: getStore(STORAGE_KEYS.PROGRAMS) || DEFAULT_PROGRAMS,
                deleted_ids: Array.from(getDeletedIds()),
                deleted_news_ids: Array.from(getDeletedNewsIds()),
                deleted_disb_ids: Array.from(getDeletedDisbIds()),
                deleted_ref_ids: Array.from(getDeletedRefIds()),
                deleted_kpi_ids: Array.from(getDeletedKpiIds()),
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
                deletedKpiIds: bundle.deleted_kpi_ids,
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

            // 2. Direct Supabase Dedicated Entities & Master Bundle Push
            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    if (Array.isArray(bundle.quotes)) {
                        await window.wizSupabase.saveQuotes(bundle.quotes);
                    }
                    if (bundle.site_settings) {
                        await window.wizSupabase.saveSiteSettings(bundle.site_settings);
                    }
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

    // ─── Smart Merge Helper ──────────────────────────────────────────
    function smartMerge(storageKey, cloudItems, sortFn, deletedIdsSet) {
        if (!Array.isArray(cloudItems)) return;
        const localItems = getStore(storageKey) || [];
        const itemMap = new Map();

        localItems.forEach(item => {
            if (!item) return;
            const key = item.id || item.username || item.title;
            if (key && deletedIdsSet && (deletedIdsSet.has(String(key)) || deletedIdsSet.has(String(key).toLowerCase()))) {
                return;
            }
            if (key) itemMap.set(String(key), item);
        });

        cloudItems.forEach(item => {
            if (!item) return;
            const key = item.id || item.username || item.title;
            if (key && deletedIdsSet && (deletedIdsSet.has(String(key)) || deletedIdsSet.has(String(key).toLowerCase()))) {
                return;
            }
            if (key) {
                const existing = itemMap.get(String(key));
                if (!existing) {
                    itemMap.set(String(key), item);
                } else {
                    const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
                    const cloudTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
                    if (cloudTime >= localTime) {
                        itemMap.set(String(key), { ...existing, ...item });
                    }
                }
            }
        });

        const merged = Array.from(itemMap.values());
        if (typeof sortFn === 'function') {
            merged.sort(sortFn);
        }
        setStore(storageKey, merged);
        return merged;
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
            let directSbKpi = null;
            let directSbSettings = null;
            let directSbQuotes = null;

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                const [sbQResult, sbNewsResult, sbDonResult, sbDisbResult, sbRefResult, sbKpiResult, sbSetResult] = await Promise.allSettled([
                    window.wizSupabase.getQuotes().catch(() => null),
                    window.wizSupabase.select('news', { select: 'id,title,category,content,image_url,gallery,event_date,status,author,created_at,updated_at', order: 'created_at.desc' }).catch(() => null),
                    window.wizSupabase.select('donations').catch(() => null),
                    window.wizSupabase.select('disbursements').catch(() => null),
                    window.wizSupabase.getReferrals().catch(() => null),
                    (typeof window.wizSupabase.getKpiMitra === 'function' ? window.wizSupabase.getKpiMitra() : window.wizSupabase.select('kpi_mitra')).catch(() => null),
                    window.wizSupabase.getSiteSettings().catch(() => null)
                ]);

                const sbQRes = (sbQResult.status === 'fulfilled' && sbQResult.value) ? sbQResult.value : null;
                const sbNewsRes = (sbNewsResult.status === 'fulfilled' && sbNewsResult.value) ? sbNewsResult.value : null;
                const sbDonRes = (sbDonResult.status === 'fulfilled' && sbDonResult.value) ? sbDonResult.value : null;
                const sbDisbRes = (sbDisbResult.status === 'fulfilled' && sbDisbResult.value) ? sbDisbResult.value : null;
                const sbRefRes = (sbRefResult.status === 'fulfilled' && sbRefResult.value) ? sbRefResult.value : null;
                const sbKpiRes = (sbKpiResult.status === 'fulfilled' && sbKpiResult.value) ? sbKpiResult.value : null;
                const sbSetRes = (sbSetResult.status === 'fulfilled' && sbSetResult.value) ? sbSetResult.value : null;

                if (sbKpiRes && Array.isArray(sbKpiRes.data)) {
                    directSbKpi = sbKpiRes.data;
                }

                if (sbQRes && Array.isArray(sbQRes.data) && sbQRes.data.length > 0) {
                    directSbQuotes = sbQRes.data;
                }

                if (sbNewsRes && Array.isArray(sbNewsRes.data) && sbNewsRes.data.length > 0) {
                    directSbNews = sbNewsRes.data.map(n => {
                        const mainImg = (n.image_url || (Array.isArray(n.gallery) && n.gallery.length > 0 ? n.gallery[0] : '') || n.imageUrl || '').trim();
                        return {
                            id: String(n.id),
                            title: n.title,
                            category: n.category || 'Kegiatan & Penyaluran',
                            content: n.content,
                            imageUrl: mainImg,
                            image_url: mainImg,
                            gallery: Array.isArray(n.gallery) ? n.gallery : [],
                            eventDate: n.event_date || n.eventDate || n.created_at,
                            event_date: n.event_date || n.eventDate || n.created_at,
                            status: n.status || 'published',
                            author: n.author || 'Admin WIZ Babel',
                            createdAt: n.created_at || n.createdAt || new Date().toISOString(),
                            created_at: n.created_at || n.createdAt || new Date().toISOString(),
                            updatedAt: n.updated_at || n.updatedAt || new Date().toISOString(),
                            updated_at: n.updated_at || n.updatedAt || new Date().toISOString()
                        };
                    });
                }

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

                        const dType = d.type || d.donation_type || 'Infak Terikat';
                        const dMethod = d.method || d.payment_method || 'Transfer Bank';
                        if (!extractedCat || extractedCat === '-') {
                            extractedCat = mapProgramToPillar(extractedProg, dType);
                        }

                        return {
                            id: d.id,
                            donorName: d.donor_name || d.donorName || 'Hamba Allah',
                            donorPhone: d.donor_phone || d.donorPhone || '-',
                            donorEmail: d.donor_email || d.donorEmail || '',
                            wilayah: extractedWilayah,
                            type: dType,
                            programUtama: extractedCat,
                            programSpesifik: extractedProg,
                            program: extractedProg,
                            category: extractedCat,
                            amount: Number(d.amount) || 0,
                            alokasiOperasional: Number(d.alokasi_operasional !== undefined ? d.alokasi_operasional : (d.alokasiOperasional || (dType === 'Infak Terikat' ? Math.round(Number(d.amount) * 0.125) : 0))),
                            alokasiProgram: Number(d.alokasi_program !== undefined ? d.alokasi_program : (d.alokasiProgram || (dType === 'Infak Terikat' ? Math.round(Number(d.amount) * 0.875) : 0))),
                            method: dMethod,
                            referralId: extractedRef,
                            referralCode: extractedRef,
                            referralRate: Number(d.referral_rate || d.referralRate || 6),
                            referralFee: extractedFee,
                            isRecurringDonor: isRecurring,
                            notes: (d.notes || '-').replace(/\[Meta:[^\]]*\]/g, '').trim() || '-',
                            status: d.status || 'pending',
                            verifiedAt: d.verified_at || (d.status === 'verified' ? (d.updated_at || d.created_at) : null),
                            verifiedBy: d.verified_by || (d.status === 'verified' ? 'Admin' : null),
                            createdAt: d.created_at || d.createdAt || new Date().toISOString()
                        };
                    });
                }

                if (sbDisbRes && Array.isArray(sbDisbRes.data)) {
                    directSbDisbursements = sbDisbRes.data.map(d => {
                        let sType = 'program_spesifik';
                        let tType = 'specific';
                        let fromProg = Number(d.amount) || 0;
                        let fromSub = 0;
                        let cleanDesc = d.description || '';

                        if (cleanDesc.includes('[Meta:')) {
                            const m = cleanDesc.match(/\[Meta:([^\]]+)\]/);
                            if (m) {
                                const parts = m[1].split('|');
                                parts.forEach(p => {
                                    const [k, v] = p.split('=').map(s => s.trim());
                                    if (k === 'source') sType = v;
                                    if (k === 'target') tType = v;
                                    if (k === 'fromProg') fromProg = Number(v) || fromProg;
                                    if (k === 'fromSub') fromSub = Number(v) || fromSub;
                                });
                                cleanDesc = cleanDesc.replace(/\s*\[Meta:[^\]]+\]/, '').trim();
                            }
                        } else if (d.program && (d.program.toLowerCase().includes('global') || d.program.toLowerCase().includes('alih fungsi'))) {
                            sType = 'infak_umum';
                            tType = 'global';
                        }

                        const pillar = mapProgramToPillar(d.program) || 'Berkah Hidayah';
                        const kategoriPilar = mapPillarToKategori(pillar);

                        return {
                            id: d.id,
                            wilayah: d.wilayah || 'Pangkalpinang',
                            sourceType: sType,
                            targetType: tType,
                            pillar: pillar,
                            kategori_pilar: kategoriPilar,
                            program: d.program,
                            amount: Number(d.amount) || 0,
                            amountFromProgram: fromProg,
                            amountFromSubsidi: fromSub,
                            description: cleanDesc,
                            disbursedAt: d.disbursed_at || d.disbursedAt || new Date().toISOString(),
                            recordedBy: d.recorded_by || d.recordedBy || 'Admin',
                            createdAt: d.created_at || d.createdAt || new Date().toISOString()
                        };
                    });
                }

                if (sbRefRes && Array.isArray(sbRefRes.data) && sbRefRes.data.length > 0) {
                    directSbReferrals = sbRefRes.data;
                }

                if (sbSetRes && sbSetRes.data && typeof sbSetRes.data === 'object') {
                    directSbSettings = sbSetRes.data;
                }
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
            if (Array.isArray(masterData.deleted_admin_ids)) {
                masterData.deleted_admin_ids.forEach(id => addDeletedAdminId(id));
            }

            const deletedSet = getDeletedIds();
            const deletedNewsSet = getDeletedNewsIds();
            const deletedDisbSet = getDeletedDisbIds();
            const deletedRefSet = getDeletedRefIds();
            const deletedQuoteSet = getDeletedQuoteIds();
            const deletedAdminSet = getDeletedAdminIds();

            // ─── Authoritative Supabase Cloud SSOT Sync ────────────────
            // Sync Donations: Supabase is Single Source of Truth
            if (directSbDonations !== null && Array.isArray(directSbDonations)) {
                // Filter out any locally deleted donations
                const filteredSbDonations = directSbDonations.filter(d => d && d.id && !deletedSet.has(String(d.id)));
                // Retain recent local donations (last 5 mins) that haven't synced to cloud yet
                const local = getStore(STORAGE_KEYS.DONATIONS) || [];
                const recentLocal = local.filter(d => {
                    if (!d || !d.id || deletedSet.has(String(d.id))) return false;
                    const age = Date.now() - new Date(d.createdAt || 0).getTime();
                    return age < 300000 && !filteredSbDonations.some(sd => String(sd.id) === String(d.id));
                });
                // If there are unsynced recent local items, trigger async save to Supabase
                if (recentLocal.length > 0 && window.wizSupabase && window.wizSupabase.isConfigured()) {
                    recentLocal.forEach(item => {
                        window.wizSupabase.saveDonation(item).catch(() => {});
                    });
                }
                const finalDonations = [...recentLocal, ...filteredSbDonations];
                finalDonations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setStore(STORAGE_KEYS.DONATIONS, finalDonations);
                window.dispatchEvent(new CustomEvent('wiz-donations-changed'));
            } else if (masterData && Array.isArray(masterData.donations)) {
                const filteredMaster = masterData.donations.filter(d => d && d.id && !deletedSet.has(String(d.id)));
                setStore(STORAGE_KEYS.DONATIONS, filteredMaster);
                window.dispatchEvent(new CustomEvent('wiz-donations-changed'));
            }

            // Sync News: Filter out any locally-deleted news from Supabase results
            if (directSbNews !== null && Array.isArray(directSbNews)) {
                const deletedSet = getDeletedNewsIds();
                // NEVER restore deleted news — filter them OUT from Supabase data
                directSbNews = directSbNews.filter(n => n && n.id && !deletedSet.has(String(n.id)));

                const mappedNews = directSbNews.map(rawN => {
                    const img = (rawN.imageUrl || rawN.image_url || (Array.isArray(rawN.gallery) && rawN.gallery.length > 0 ? rawN.gallery[0] : '') || '').trim();
                    return {
                        ...rawN,
                        status: rawN.status || 'published',
                        imageUrl: img,
                        image_url: img,
                        eventDate: rawN.eventDate || rawN.event_date || rawN.createdAt || rawN.created_at || new Date().toISOString(),
                        createdAt: rawN.createdAt || rawN.created_at || new Date().toISOString(),
                        updatedAt: rawN.updatedAt || rawN.updated_at || new Date().toISOString()
                    };
                });
                mappedNews.sort((a, b) => {
                    const timeA = new Date(a.createdAt || a.created_at || a.updatedAt || a.updated_at || a.eventDate || a.event_date || 0).getTime();
                    const timeB = new Date(b.createdAt || b.created_at || b.updatedAt || b.updated_at || b.eventDate || b.event_date || 0).getTime();
                    return timeB - timeA;
                });
                setStore(STORAGE_KEYS.NEWS, mappedNews);
                window.dispatchEvent(new CustomEvent('wiz-news-changed'));
            } else if (masterData && Array.isArray(masterData.news)) {
                setStore(STORAGE_KEYS.NEWS, masterData.news);
                window.dispatchEvent(new CustomEvent('wiz-news-changed'));
            }

            // Sync Disbursements: Supabase disbursements table is authoritative
            if (directSbDisbursements !== null && Array.isArray(directSbDisbursements)) {
                const local = getStore(STORAGE_KEYS.DISBURSEMENTS) || [];
                const recentLocal = local.filter(d => {
                    if (!d || !d.id) return false;
                    const age = Date.now() - new Date(d.createdAt || d.disbursedAt || 0).getTime();
                    return age < 180000 && !directSbDisbursements.some(sd => String(sd.id) === String(d.id));
                });
                const finalDisbursements = [...recentLocal, ...directSbDisbursements];
                finalDisbursements.sort((a, b) => new Date(b.disbursedAt || b.createdAt || 0) - new Date(a.disbursedAt || a.createdAt || 0));
                setStore(STORAGE_KEYS.DISBURSEMENTS, finalDisbursements);
                window.dispatchEvent(new CustomEvent('wiz-disbursements-changed'));
            } else if (masterData && Array.isArray(masterData.disbursements)) {
                setStore(STORAGE_KEYS.DISBURSEMENTS, masterData.disbursements);
                window.dispatchEvent(new CustomEvent('wiz-disbursements-changed'));
            }

            // Sync Referrals / Affiliators: Supabase referrals table is authoritative
            if (directSbReferrals !== null && Array.isArray(directSbReferrals)) {
                directSbReferrals.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                setStore(STORAGE_KEYS.REFERRALS, directSbReferrals);
                window.dispatchEvent(new CustomEvent('wiz-referrals-changed'));
            } else if (masterData && Array.isArray(masterData.referrals)) {
                setStore(STORAGE_KEYS.REFERRALS, masterData.referrals);
                window.dispatchEvent(new CustomEvent('wiz-referrals-changed'));
            }

            if (masterData && Array.isArray(masterData.referral_payouts)) {
                setStore(STORAGE_KEYS.REFERRAL_PAYOUTS, masterData.referral_payouts);
            }

            // Sync KPI Mitra
            if (directSbKpi !== null && Array.isArray(directSbKpi)) {
                setStore(STORAGE_KEYS.KPI_MITRA, directSbKpi);
                window.dispatchEvent(new CustomEvent('wiz-kpi-changed'));
            } else if (masterData && Array.isArray(masterData.kpi_mitra)) {
                setStore(STORAGE_KEYS.KPI_MITRA, masterData.kpi_mitra);
                window.dispatchEvent(new CustomEvent('wiz-kpi-changed'));
            }

            // Sync Quotes: Supabase site_settings (key='quotes') is authoritative
            if (directSbQuotes !== null && Array.isArray(directSbQuotes)) {
                directSbQuotes.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
                setStore(STORAGE_KEYS.QUOTES, directSbQuotes);
                window.dispatchEvent(new CustomEvent('wiz-quotes-changed'));
            } else if (masterData && Array.isArray(masterData.quotes)) {
                setStore(STORAGE_KEYS.QUOTES, masterData.quotes);
                window.dispatchEvent(new CustomEvent('wiz-quotes-changed'));
            }

            // Sync Site Settings (Rekening Banks, Offices, Hotline): Supabase is authoritative
            const authoritativeSettings = directSbSettings || (masterData && masterData.site_settings ? (masterData.site_settings.value || masterData.site_settings) : null);
            if (authoritativeSettings && typeof authoritativeSettings === 'object') {
                const mergedSettings = { ...DEFAULT_SITE_SETTINGS, ...authoritativeSettings };
                setStore(STORAGE_KEYS.SITE_SETTINGS, mergedSettings);
                window.dispatchEvent(new CustomEvent('wiz-site-settings-changed', { detail: mergedSettings }));
                if (typeof window.applySiteSettings === 'function') {
                    try { window.applySiteSettings(); } catch(e) {}
                }
            }

            // Standalone site_images & specific_prog_imgs from Supabase
            let cloudSiteImgsDirect = null;
            let cloudSpecificProgImgsDirect = null;
            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    const siRes = await window.wizSupabase.select('site_settings', { filter: 'key=eq.site_images' });
                    if (siRes && siRes.data && siRes.data[0] && siRes.data[0].value) {
                        cloudSiteImgsDirect = siRes.data[0].value;
                    }
                } catch(e) {}
                try {
                    const spRes = await window.wizSupabase.select('site_settings', { filter: 'key=eq.specific_prog_imgs' });
                    if (spRes && spRes.data && spRes.data[0] && spRes.data[0].value) {
                        cloudSpecificProgImgsDirect = spRes.data[0].value;
                    }
                } catch(e) {}
            }

            // Authoritative Site Images: DEFAULT_SITE_IMAGES + masterData.site_images + cloudSiteImgsDirect
            const _cloudSiteImgs = Object.assign({}, DEFAULT_SITE_IMAGES, (masterData && masterData.site_images) || {}, cloudSiteImgsDirect || {});
            setStore(STORAGE_KEYS.SITE_IMAGES, _cloudSiteImgs);
            window.dispatchEvent(new CustomEvent('wiz-program-images-changed'));
            window.dispatchEvent(new CustomEvent('wiz-site-images-changed', { detail: _cloudSiteImgs }));

            // Authoritative specific_prog_imgs:
            const mergedProgImgs = Object.assign({}, DEFAULT_SPECIFIC_PROGRAM_IMAGES, (masterData && masterData.specific_prog_imgs) || {}, cloudSpecificProgImgsDirect || {});
            localStorage.setItem('wiz_specific_prog_imgs', JSON.stringify(mergedProgImgs));

            if (masterData && masterData.custom_specific_programs && typeof masterData.custom_specific_programs === 'object' && Object.keys(masterData.custom_specific_programs).length > 0) {
                const mergedMap = masterData.custom_specific_programs;
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
                                    const cleanT = (t === 'Beasiswa Yatim & Dhuafa' || t === 'Beasiswa Yatim dan Dhuafa') ? 'Beasiswa Tahfidz & Dhuafa' : t;
                                    if (!items.find(i => (i.key || '').toLowerCase() === cleanT.toLowerCase())) {
                                        const defaultPct = (pillarKey === 'Berkah Juara' && cleanT === 'Beasiswa Tahfidz & Dhuafa') ? 5 : 0;
                                        items.push({ key: cleanT, percent: defaultPct, image: allocationRulesManager.getSpecificProgramImage(cleanT, pillarKey) || '' });
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
            if (masterData && masterData.baselines && typeof masterData.baselines === 'object') {
                setStore(STORAGE_KEYS.BASELINES, masterData.baselines);
            }
            if (masterData && masterData.admin_users && Array.isArray(masterData.admin_users)) {
                const currentDeletedAdminSet = getDeletedAdminIds();
                const cloudAdmins = masterData.admin_users.filter(u => u && (u.id || u.username) && !currentDeletedAdminSet.has(String(u.id)) && (!u.username || !currentDeletedAdminSet.has(u.username.toLowerCase())) && u.status !== 'deleted' && u.status !== 'rejected' && !u.isDeleted);
                
                smartMerge(STORAGE_KEYS.ADMIN_USERS, cloudAdmins, (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0), currentDeletedAdminSet);
                
                // Clean up any remaining deleted or rejected admins in local store
                let curAdmins = getStore(STORAGE_KEYS.ADMIN_USERS) || [];
                curAdmins = curAdmins.filter(u => u && (u.id || u.username) && !currentDeletedAdminSet.has(String(u.id)) && (!u.username || !currentDeletedAdminSet.has(u.username.toLowerCase())) && u.status !== 'deleted' && u.status !== 'rejected' && !u.isDeleted);
                if (!curAdmins.some(u => u.username === 'admin')) {
                    curAdmins.unshift(DEFAULT_ADMIN_USERS[0]);
                }
                setStore(STORAGE_KEYS.ADMIN_USERS, curAdmins);
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

    // Helper: Map program name to its 5 Berkah Pillar / Internal Bucket
    function mapProgramToPillar(progName, catName) {
        if (catName && catName !== '-' && catName.includes('Berkah')) return catName;
        const p = (progName || '').toLowerCase();
        if (p.includes('saving') || p.includes('cadangan')) return 'Dana Saving';
        if (p.includes('operasional') && (p.includes('terikat') || p.includes('mitra'))) return 'Operasional';
        if (p.includes('operasional')) return 'Operasional';
        if (p.includes('markaz') || p.includes('tahfidz') || p.includes('dirosa') || p.includes('dakwah') || p.includes('dai') || p.includes('celengan') || p.includes('jenazah') || p.includes('poster') || p.includes('kantor') || p.includes('muker') || p.includes('kendaraan') || p.includes('mualaf') || p.includes('tabligh') || p.includes('public speaking')) return 'Berkah Hidayah';
        if (p.includes('beasiswa') || p.includes('pendidikan') || p.includes('belajar') || p.includes('juara') || p.includes('perlengkapan')) return 'Berkah Juara';
        if (p.includes('sembako') || p.includes('yatim') || p.includes('beras') || p.includes('jumat') || p.includes('iftar') || p.includes('qur\'an') || p.includes('guru ngaji') || p.includes('air') || p.includes('peduli')) return 'Berkah Peduli';
        if (p.includes('sehat') || p.includes('khitan') || p.includes('ambulance') || p.includes('pengobatan')) return 'Berkah Sehat';
        if (p.includes('mandiri') || p.includes('modal') || p.includes('usaha') || p.includes('wirausaha') || p.includes('umkm')) return 'Berkah Mandiri';
        return 'Berkah Hidayah';
    }

    // Helper: Map pillar to kategori_pilar ('Dakwah', 'Pendidikan', 'Sosial', 'Kesehatan', 'Ekonomi', 'Operasional', 'Saving') and vice-versa
    function mapPillarToKategori(pillar) {
        if (!pillar) return 'Sosial';
        const str = String(pillar).toLowerCase();
        if (str.includes('saving') || str.includes('cadangan')) return 'Cadangan & Tabungan';
        if (str.includes('operasional') && (str.includes('terikat') || str.includes('mitra'))) return 'Operasional (Infak Terikat & Hak Mitra)';
        if (str.includes('operasional')) return 'Operasional (Infak Umum)';
        if (str.includes('hidayah') || str.includes('dakwah')) return 'Dakwah';
        if (str.includes('juara') || str.includes('pendidikan') || str.includes('beasiswa')) return 'Pendidikan';
        if (str.includes('peduli') || str.includes('sosial') || str.includes('kemanusiaan')) return 'Sosial';
        if (str.includes('sehat') || str.includes('kesehatan') || str.includes('medis')) return 'Kesehatan';
        if (str.includes('mandiri') || str.includes('ekonomi') || str.includes('usaha')) return 'Ekonomi';
        return 'Sosial';
    }

    function mapKategoriToPillar(kategori) {
        if (!kategori) return 'Berkah Peduli';
        const str = String(kategori).toLowerCase();
        if (str.includes('dakwah') || str.includes('hidayah')) return 'Berkah Hidayah';
        if (str.includes('pendidikan') || str.includes('beasiswa') || str.includes('juara')) return 'Berkah Juara';
        if (str.includes('sosial') || str.includes('kemanusiaan') || str.includes('peduli')) return 'Berkah Peduli';
        if (str.includes('kesehatan') || str.includes('sehat') || str.includes('medis')) return 'Berkah Sehat';
        if (str.includes('ekonomi') || str.includes('mandiri') || str.includes('usaha')) return 'Berkah Mandiri';
        return 'Berkah Peduli';
    }

    function getProgramPillarKey(progOrTitle) {
        if (!progOrTitle) return 'Berkah Peduli';
        if (typeof progOrTitle === 'object') {
            if (progOrTitle.pillar) return progOrTitle.pillar;
            if (progOrTitle.kategori_pilar) return mapKategoriToPillar(progOrTitle.kategori_pilar);
            if (progOrTitle.category) return mapProgramToPillar(progOrTitle.title, progOrTitle.category);
            return mapProgramToPillar(progOrTitle.title);
        }
        return mapProgramToPillar(String(progOrTitle));
    }

    function getProgramKategoriPilar(progOrTitle) {
        const pillar = getProgramPillarKey(progOrTitle);
        return mapPillarToKategori(pillar);
    }

    function isGeneralInfak(d) {
        if (!d) return false;
        if (d.type === 'Infak Umum') return true;
        const prog = (d.programSpesifik || d.program || '').trim();
        if (!prog || prog === '-' || prog === '.' || prog.toLowerCase() === 'infak umum' || prog.toLowerCase() === 'sedekah umum' || prog.toLowerCase() === 'umum' || prog.toLowerCase() === 'infak' || prog.toLowerCase() === 'sedekah') {
            return true;
        }
        return false;
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
            const now = Date.now();
            const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

            function isAttributionActive(attr) {
                if (!attr || (!attr.mitraId && !attr.referralId)) return false;
                if (!attr.lockedAt) return true;
                const lockedTime = new Date(attr.lockedAt).getTime();
                return (now - lockedTime) <= ONE_YEAR_MS;
            }

            if (cleanPhone && all[cleanPhone]) {
                const item = all[cleanPhone];
                if (isAttributionActive(item)) return item;
            }
            if (email) {
                const cleanEmail = String(email).trim().toLowerCase();
                if (all[cleanEmail] && isAttributionActive(all[cleanEmail])) return all[cleanEmail];
                for (const item of Object.values(all)) {
                    if (item && item.email && item.email.toLowerCase() === cleanEmail && isAttributionActive(item)) {
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
            
            // Retain original mitra if active, or use newly assigned mitra
            const targetMitra = (existing && (existing.mitraId || existing.referralId)) ? (existing.mitraId || existing.referralId) : mitraId;

            const record = {
                phone: cleanPhone || '',
                email: cleanEmail || '',
                donorName: donorName || (existing ? existing.donorName : '') || 'Hamba Allah',
                mitraId: targetMitra,
                lockedAt: new Date().toISOString(),
                isRecurringLocked: true,
                lockDurationMonths: 12
            };

            if (cleanPhone) all[cleanPhone] = record;
            if (cleanEmail) all[cleanEmail] = record;
            setStore(STORAGE_KEYS.DONOR_ATTRIBUTIONS, all);

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    window.wizSupabase.upsert('donor_attributions', {
                        phone: cleanPhone,
                        email: cleanEmail,
                        donor_name: record.donorName,
                        mitra_id: targetMitra,
                        locked_at: record.lockedAt
                    });
                } catch(e) {}
            }

            console.log(`[WIZ Attribution Locking] Donor ${record.donorName} (${cleanPhone}) locked to Mitra: ${targetMitra} for 1 Year (12 Months)`);
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

            // Direct Supabase & Cloud Persistence
            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.saveDonation(newDonation);
                } catch(e) {
                    console.warn('[WIZ Store] Supabase saveDonation direct error:', e);
                }
            }

            // Background async sync & broadcast
            (async () => {
                const cloudTasks = [];
                if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                    cloudTasks.push(window.wizFirebase.insert('donations', newDonation).catch(() => {}));
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
                        status: 'verified',
                        verified_at: list[idx].verifiedAt,
                        verified_by: list[idx].verifiedBy
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
                    ? 'Infak Umum'
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
            let raw = getStore(STORAGE_KEYS.NEWS) || [];
            if (!Array.isArray(raw)) raw = [];

            const deletedSet = typeof getDeletedNewsIds === 'function' ? getDeletedNewsIds() : new Set();

            // Supabase news is authoritative: filter only items explicitly deleted
            const active = raw.filter(n => n && n.id && n.status !== 'deleted' && !n.isDeleted && !deletedSet.has(String(n.id)));

            // Deduplicate by ID and Title: keep latest item and honor its exact status (draft or published)
            const uniqueMap = new Map();
            active.forEach(n => {
                const normKey = String(n.id) || (n.title || '').trim().toLowerCase();
                if (!uniqueMap.has(normKey)) {
                    uniqueMap.set(normKey, { ...n });
                } else {
                    const existing = uniqueMap.get(normKey);
                    const tExisting = new Date(existing.updatedAt || existing.eventDate || existing.createdAt || 0).getTime();
                    const tNew = new Date(n.updatedAt || n.eventDate || n.createdAt || 0).getTime();
                    if (tNew >= tExisting) {
                        uniqueMap.set(normKey, { ...existing, ...n, status: n.status || existing.status || 'published' });
                    } else {
                        uniqueMap.set(normKey, { ...n, ...existing, status: existing.status || n.status || 'published' });
                    }
                }
            });

            return Array.from(uniqueMap.values()).sort((a, b) => {
                const timeA = new Date(a.createdAt || a.created_at || a.updatedAt || a.updated_at || a.eventDate || a.event_date || 0).getTime();
                const timeB = new Date(b.createdAt || b.created_at || b.updatedAt || b.updated_at || b.eventDate || b.event_date || 0).getTime();
                return timeB - timeA;
            });
        },

        getPublished() {
            return this.getAll().filter(n => (n.status || 'published') === 'published');
        },

        getDrafts() {
            return this.getAll().filter(n => n.status === 'draft');
        },

        async publishAll() {
            const list = getStore(STORAGE_KEYS.NEWS) || [];
            if (!Array.isArray(list) || list.length === 0) return 0;
            let count = 0;
            list.forEach(n => {
                if (n && n.status !== 'published') {
                    n.status = 'published';
                    n.updatedAt = new Date().toISOString();
                    count++;
                }
            });
            setStore(STORAGE_KEYS.NEWS, list);

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                for (const item of list) {
                    try {
                        await window.wizSupabase.upsert('news', {
                            id: String(item.id),
                            title: item.title,
                            category: item.category || 'Kegiatan & Penyaluran',
                            content: item.content,
                            image_url: item.imageUrl || item.image_url || '',
                            gallery: item.gallery || [],
                            event_date: item.eventDate || item.event_date || new Date().toISOString(),
                            status: 'published',
                            author: item.author || 'Admin WIZ Babel',
                            created_at: item.createdAt || new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        });
                    } catch(e) {}
                }
            }

            if (typeof pushToCloud === 'function') {
                pushToCloud().catch(() => {});
            }

            broadcastSync('NEWS_ALL_PUBLISHED', { count });
            window.dispatchEvent(new CustomEvent('wiz-news-changed'));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return count;
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
            list.sort((a, b) => {
                const timeA = new Date(a.createdAt || a.created_at || a.updatedAt || a.updated_at || a.eventDate || a.event_date || 0).getTime();
                const timeB = new Date(b.createdAt || b.created_at || b.updatedAt || b.updated_at || b.eventDate || b.event_date || 0).getTime();
                return timeB - timeA;
            });
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

            // Direct instant micro-action to /api/sync
            try {
                fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'save_news', news: newArticle })
                }).catch(() => {});
            } catch(e) {}

            // Direct instant micro-action to /api/sync
            try {
                fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'save_news', news: newArticle })
                }).catch(() => {});
            } catch(e) {}

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
            list.sort((a, b) => {
                const timeA = new Date(a.createdAt || a.created_at || a.updatedAt || a.updated_at || a.eventDate || a.event_date || 0).getTime();
                const timeB = new Date(b.createdAt || b.created_at || b.updatedAt || b.updated_at || b.eventDate || b.event_date || 0).getTime();
                return timeB - timeA;
            });
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

            // Direct instant micro-action to /api/sync
            try {
                fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'save_news', news: list[idx] })
                }).catch(() => {});
            } catch(e) {}

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
            const targetTitle = (list[idx].title || '').trim().toLowerCase();

            list.forEach(n => {
                if (String(n.id) === String(articleId) || (targetTitle && (n.title || '').trim().toLowerCase() === targetTitle)) {
                    n.status = newStatus;
                    n.updatedAt = new Date().toISOString();
                }
            });
            setStore(STORAGE_KEYS.NEWS, list);

            const statusLabel = newStatus === 'published' ? 'dipublikasikan ke web' : 'disimpan sebagai draft (disembunyikan dari web)';
            activityLog.add('news', `Status berita "${list[idx].title}" diubah: ${statusLabel}.`, sessionStorage.getItem('wiz_admin_name') || 'Admin');

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    const item = list[idx];
                    await window.wizSupabase.saveNews({
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
            window.dispatchEvent(new CustomEvent('wiz-news-changed'));
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
            try { fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_news', id: strId }) }).catch(() => {}); } catch(e) {}

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
            kategori_pilar: 'Sosial',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 50.000.000',
            targetAmount: 50000000,
            location: 'Nusa Tenggara Timur (NTT)',
            beneficiaries: 'Warga & Penyintas Terdampak Bencana di NTT',
            description: 'Salurkan kepedulian dan bantuan darurat bencana untuk saudara-saudara kita terdampak bencana di Nusa Tenggara Timur (NTT).',
            imageUrl: '/assets/images/pray-for-ntt.jpg',
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
            kategori_pilar: 'Sosial',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 25.000.000',
            targetAmount: 25000000,
            description: 'Penyaluran paket bahan pangan pokok untuk keluarga dhuafa, janda lansia, dan yatim di pelosok Bangka Belitung.',
            imageUrl: '/assets/images/tebar-sembako.png',
            image_url: '/assets/images/tebar-sembako.png',
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
            kategori_pilar: 'Sosial',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 20.000.000',
            targetAmount: 20000000,
            description: 'Bantuan beras premium secara berkala untuk mencukupi kebutuhan pokok para mustahik dan santri pondok pesantren.',
            imageUrl: '/assets/images/sedekah-beras-dhuafa.png',
            image_url: '/assets/images/sedekah-beras-dhuafa.png',
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
            kategori_pilar: 'Sosial',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 15.000.000',
            targetAmount: 15000000,
            description: 'Program Sedulang Berkah Sedekah Jumat untuk jamaah masjid, musafir, dan dhuafa di hari yang mulia.',
            imageUrl: '/assets/images/sedekah-Jumat.png',
            image_url: '/assets/images/sedekah-Jumat.png',
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
            kategori_pilar: 'Sosial',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 30.000.000',
            targetAmount: 30000000,
            description: 'Santunan bulanan dan pemenuhan kebutuhan primer anak-anak yatim dhuafa agar tumbuh bahagia.',
            imageUrl: '/assets/images/santunan-yatim.png',
            image_url: '/assets/images/santunan-yatim.png',
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
            kategori_pilar: 'Sosial',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 20.000.000',
            targetAmount: 20000000,
            description: 'Distribusi mushaf Al-Qur\'an standar ke rumah tahfidz, TPQ, dan masjid pelosok daerah.',
            imageUrl: '/assets/images/tebar-qur\'an-nusantara.png',
            image_url: '/assets/images/tebar-qur\'an-nusantara.png',
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
            kategori_pilar: 'Sosial',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 30.000.000',
            targetAmount: 30000000,
            description: 'Penyaluran paket makanan buka puasa penuh berkah dan gizi untuk santri serta dhuafa di Bangka Belitung.',
            imageUrl: '/assets/images/tebar-iftar-nusantara.png',
            image_url: '/assets/images/tebar-iftar-nusantara.png',
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
            kategori_pilar: 'Sosial',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 25.000.000',
            targetAmount: 25000000,
            description: 'Apresiasi tunjangan dan bingkisan sembako untuk guru ngaji tradisional yang ikhlas mengajar di pelosok.',
            imageUrl: '/assets/images/default-program-wiz.jpg',
            image_url: '/assets/images/default-program-wiz.jpg',
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
            kategori_pilar: 'Sosial',
            category: 'Sosial & Kemanusiaan',
            target: 'Rp 35.000.000',
            targetAmount: 35000000,
            description: 'Pembuatan sumur bor, instalasi pipa, dan penampungan air bersih untuk daerah rawan kekeringan.',
            imageUrl: '/assets/images/default-program-wiz.jpg',
            image_url: '/assets/images/default-program-wiz.jpg',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 2.004.000.000',
            targetAmount: 2004000000,
            description: 'Dukung pembangunan pusat dakwah terpadu, markaz kaderisasi da\'i, dan asrama santri tahfidz WIZ Bangka Belitung.',
            imageUrl: '/assets/images/pembangunan-markaz-dakwah.png',
            image_url: '/assets/images/pembangunan-markaz-dakwah.png',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 35.000.000',
            targetAmount: 35000000,
            description: 'Pengadaan armada mobil dan sepeda motor operasional untuk mobilitas para da\'i ke pelosok pedalaman.',
            imageUrl: '/assets/images/pengadaan-&-perbaikan-kendaraan.png',
            image_url: '/assets/images/pengadaan-&-perbaikan-kendaraan.png',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 20.000.000',
            targetAmount: 20000000,
            description: 'Bimbingan aqidah, pelatihan ibadah, dan bantuan kemandirian hidup bagi saudara-saudara kita mualaf.',
            imageUrl: '/assets/images/santunan-mualaf.png',
            image_url: '/assets/images/santunan-mualaf.png',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 30.000.000',
            targetAmount: 30000000,
            description: 'Program beasiswa pembinaan santri penghafal Al-Qur\'an 30 juz berkarakter qur\'ani.',
            imageUrl: '/assets/images/tahfidz.png',
            image_url: '/assets/images/tahfidz.png',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 10.000.000',
            targetAmount: 10000000,
            description: 'Workshop retorika dakwah dan public speaking untuk membekali da\'i muda agar siap berkhutbah dan membina masyarakat.',
            imageUrl: '/assets/images/default-program-wiz.jpg',
            image_url: '/assets/images/default-program-wiz.jpg',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 15.000.000',
            targetAmount: 15000000,
            description: 'Penyelenggaraan Tabligh Akbar menyambut bulan haram Dzulhijjah dan syiar keutamaan ibadah qurban.',
            imageUrl: '/assets/images/default-program-wiz.jpg',
            image_url: '/assets/images/default-program-wiz.jpg',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 12.000.000',
            targetAmount: 12000000,
            description: 'Pelatihan standarisasi pengajar metode DIROSA (Pendidikan Al-Qur\'an Orang Dewasa) se-Bangka Belitung.',
            imageUrl: '/assets/images/default-program-wiz.jpg',
            image_url: '/assets/images/default-program-wiz.jpg',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 8.000.000',
            targetAmount: 8000000,
            description: 'Edukasi dan pelatihan praktik fardhu kifayah tata cara memandikan, mengafani, dan menshalatkan jenazah.',
            imageUrl: '/assets/images/default-program-wiz.jpg',
            image_url: '/assets/images/default-program-wiz.jpg',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 10.000.000',
            targetAmount: 10000000,
            description: 'Pelatihan videografi, fotografi jurnalistik, dan copywriting media sosial untuk generasi muda relawan dakwah.',
            imageUrl: '/assets/images/default-program-wiz.jpg',
            image_url: '/assets/images/default-program-wiz.jpg',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 5.000.000',
            targetAmount: 5000000,
            description: 'Kompetisi karya visual kreatif islami untuk mengampanyekan ajakan kebaikan dan nilai-nilai Al-Qur\'an.',
            imageUrl: '/assets/images/default-program-wiz.jpg',
            image_url: '/assets/images/default-program-wiz.jpg',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 150.000.000',
            targetAmount: 150000000,
            description: 'Pusat pelayanan administrasi ummat, dakwah terpadu, dan kantor Laznas WIZ Bangka Belitung.',
            imageUrl: '/assets/images/default-program-wiz.jpg',
            image_url: '/assets/images/default-program-wiz.jpg',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 25.000.000',
            targetAmount: 25000000,
            description: 'Musyawarah kerja tahunan evaluasi program dakwah dan penetapan target keummatan di Bangka Belitung.',
            imageUrl: '/assets/images/default-program-wiz.jpg',
            image_url: '/assets/images/default-program-wiz.jpg',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 30.000.000',
            targetAmount: 30000000,
            description: 'Dukungan akomodasi, transportasi, dan kafalah bagi para da\'i yang bertugas di provinsi Bangka Belitung.',
            imageUrl: '/assets/images/keberangkatan-kepulangan-dai.jpg',
            image_url: '/assets/images/keberangkatan-kepulangan-dai.jpg',
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
            kategori_pilar: 'Dakwah',
            category: 'Dakwah & Pembinaan',
            target: 'Rp 15.000.000',
            targetAmount: 15000000,
            description: 'Penyediaan sarana kaleng infak harian di rumah, pertokoan, dan perkantoran guna memfasilitasi sedekah subuh.',
            imageUrl: '/assets/images/default-program-wiz.jpg',
            image_url: '/assets/images/default-program-wiz.jpg',
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
            kategori_pilar: 'Pendidikan',
            category: 'Pendidikan & Beasiswa',
            target: 'Rp 25.000.000',
            targetAmount: 25000000,
            description: 'Bantuan biaya SPP, uang sekolah, dan buku untuk siswa yatim serta dhuafa berprestasi.',
            imageUrl: '/assets/images/beasiswa-pendidikan-juara.png',
            image_url: '/assets/images/beasiswa-pendidikan-juara.png',
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
            kategori_pilar: 'Pendidikan',
            category: 'Pendidikan & Beasiswa',
            target: 'Rp 35.000.000',
            targetAmount: 35000000,
            description: 'Beasiswa pendidikan penuh dan asrama bagi santri tahfidz yatim dhuafa di Bangka Belitung.',
            imageUrl: '/assets/images/tahfidz.png',
            image_url: '/assets/images/tahfidz.png',
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
            kategori_pilar: 'Pendidikan',
            category: 'Pendidikan & Beasiswa',
            target: 'Rp 15.000.000',
            targetAmount: 15000000,
            description: 'Paket perlengkapan sekolah lengkap (tas, seragam, sepatu, dan buku tulis) menjelang tahun ajaran baru.',
            imageUrl: '/assets/images/perlengkapan-belajar-yatim.png',
            image_url: '/assets/images/perlengkapan-belajar-yatim.png',
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
            kategori_pilar: 'Kesehatan',
            category: 'Kesehatan Masyarakat',
            target: 'Rp 20.000.000',
            targetAmount: 20000000,
            description: 'Layanan khitanan massal gratis dengan metode modern, pemberian bingkisan pakaian muslim, dan uang santunan.',
            imageUrl: '/assets/images/khitanan-massal-dhuafa.png',
            image_url: '/assets/images/khitanan-massal-dhuafa.png',
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
            kategori_pilar: 'Kesehatan',
            category: 'Kesehatan Masyarakat',
            target: 'Rp 25.000.000',
            targetAmount: 25000000,
            description: 'Pemeriksaan kesehatan cuma-cuma, cek gula darah & tensi, serta pembagian obat bagi lansia dan dhuafa pelosok.',
            imageUrl: '/assets/images/layanan-pengobatan-gratis.png',
            image_url: '/assets/images/layanan-pengobatan-gratis.png',
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
            kategori_pilar: 'Kesehatan',
            category: 'Kesehatan Masyarakat',
            target: 'Rp 150.000.000',
            targetAmount: 150000000,
            description: 'Layanan antar-jemput pasien gawat darurat dhuafa dan pengantaran jenazah gratis 24 jam di Bangka Belitung.',
            imageUrl: '/assets/images/ambulance-gratis-ummat.png',
            image_url: '/assets/images/ambulance-gratis-ummat.png',
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
            kategori_pilar: 'Ekonomi',
            category: 'Ekonomi & Pemberdayaan',
            target: 'Rp 25.000.000',
            targetAmount: 25000000,
            description: 'Bantuan sarana gerobak berkah, permodalan usaha tanpa riba, dan pendampingan usaha kecil bagi keluarga mustahik.',
            imageUrl: '/assets/images/modal-usaha-dhuafa.png',
            image_url: '/assets/images/modal-usaha-dhuafa.png',
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
            kategori_pilar: 'Ekonomi',
            category: 'Ekonomi & Pemberdayaan',
            target: 'Rp 15.000.000',
            targetAmount: 15000000,
            description: 'Workshop keterampilan digital, pengolahan produk pangan, dan manajemen keuangan keluarga mandiri.',
            imageUrl: '/assets/images/pelatihan-keterampilan-wirausaha.png',
            image_url: '/assets/images/pelatihan-keterampilan-wirausaha.png',
            status: 'published',
            createdAt: '2026-01-30T00:00:00.000Z',
            updatedAt: '2026-01-30T00:00:00.000Z',
            author: 'Admin WIZ Babel'
        }
    ];

    const PROGRAM_IMAGE_RESOLVER = {
        'pray-for-ntt': '/assets/images/default-program-wiz.jpg',
        'tebar-sembako': '/assets/images/tebar-sembako.png',
        'sedekah-beras-dhuafa': '/assets/images/sedekah-beras-dhuafa.png',
        'sedekah-jumat': '/assets/images/sedekah-Jumat.png',
        'santunan-yatim': '/assets/images/santunan-yatim.png',
        'tebar-quran-nusantara': '/assets/images/tebar-qur\'an-nusantara.png',
        'tebar-iftar-nusantara': '/assets/images/tebar-iftar-nusantara.png',
        'bahagiakan-guru-ngaji': '/assets/images/default-program-wiz.jpg',
        'sedekah-air': '/assets/images/default-program-wiz.jpg',
        'pembangunan-markaz': '/assets/images/pembangunan-markaz-dakwah.png',
        'pengadaan-perbaikan-kendaraan': '/assets/images/pengadaan-&-perbaikan-kendaraan.png',
        'santunan-mualaf': '/assets/images/santunan-mualaf.png',
        'tahfidz': '/assets/images/tahfidz.png',
        'pelatihan-public-speaking': '/assets/images/default-program-wiz.jpg',
        'tabligh-akbar-dzulhijjah': '/assets/images/default-program-wiz.jpg',
        'pelatihan-guru-dirosa': '/assets/images/default-program-wiz.jpg',
        'pelatihan-penyelenggaraan-jenazah': '/assets/images/default-program-wiz.jpg',
        'pelatihan-volunteer-media-dakwah': '/assets/images/default-program-wiz.jpg',
        'lomba-desain-poster-dakwah': '/assets/images/default-program-wiz.jpg',
        'kantor-dpw-wi-babel-dan-wiz': '/assets/images/default-program-wiz.jpg',
        'mukerwil-mukernas-muktamar': '/assets/images/default-program-wiz.jpg',
        'keberangkatan-kepulangan-dai': '/assets/images/keberangkatan-kepulangan-dai.jpg',
        'pengadaan-celengan-sedekah-subuh': '/assets/images/default-program-wiz.jpg',
        'beasiswa-pendidikan-juara': '/assets/images/beasiswa-pendidikan-juara.png',
        'beasiswa-tahfidz-dan-dhuafa': '/assets/images/tahfidz.png',
        'perlengkapan-belajar-yatim': '/assets/images/perlengkapan-belajar-yatim.png',
        'khitanan-massal-dhuafa': '/assets/images/khitanan-massal-dhuafa.png',
        'layanan-pengobatan-gratis': '/assets/images/layanan-pengobatan-gratis.png',
        'ambulance-gratis-ummat': '/assets/images/ambulance-gratis-ummat.png',
        'modal-usaha-dhuafa': '/assets/images/modal-usaha-dhuafa.png',
        'pelatihan-keterampilan-wirausaha': '/assets/images/pelatihan-keterampilan-wirausaha.png'
    };

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

                // Auto-repair & update program images to official PNG assets
                raw.forEach(p => {
                    if (!p) return;
                    const pSlug = (p.slug || (p.title ? p.title.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[-\s]+/g, '-') : '')).toLowerCase();
                    const targetImg = PROGRAM_IMAGE_RESOLVER[pSlug];
                    if (targetImg) {
                        const currentImg = (p.image_url || p.imageUrl || '').trim();
                        // If current image is not a custom uploaded data URL and matches old patterns
                        if (!currentImg.startsWith('data:image') && (!currentImg || currentImg.endsWith('.jpg') || currentImg.includes('foto-utama-wiz') || currentImg !== targetImg)) {
                            p.imageUrl = targetImg;
                            p.image_url = targetImg;
                            modified = true;
                        }
                    }
                });

                // Auto-sync kategori_pilar on all program objects
                raw.forEach(p => {
                    if (p && (!p.kategori_pilar || p.kategori_pilar === '-')) {
                        p.kategori_pilar = mapPillarToKategori(p.pillar || p.category);
                        modified = true;
                    }
                });

                if (modified) {
                    setStore(STORAGE_KEYS.PROGRAMS, raw);
                }
            }
            return raw
                .filter(p => p && p.id && !deletedSet.has(String(p.id)) && p.status !== 'deleted' && !p.isDeleted)
                .map(p => ({
                    ...p,
                    kategori_pilar: p.kategori_pilar || mapPillarToKategori(p.pillar || p.category)
                }))
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
            const kategoriPilar = progData.kategori_pilar || mapPillarToKategori(pillar);
            const cleanSlug = cleanTitle.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[-\s]+/g, '-');
            const authorName = (progData.author || sessionStorage.getItem('wiz_admin_name') || 'Admin WIZ Babel').trim();

            const newProgram = {
                id: progData.id || ('prog-' + cleanSlug + '-' + Date.now().toString(36)),
                title: cleanTitle,
                slug: cleanSlug,
                pillar: pillar,
                kategori_pilar: kategoriPilar,
                category: progData.category || mapProgramToPillar(cleanTitle, pillar) || 'Sosial & Kemanusiaan',
                target: progData.target || 'Rp 15.000.000',
                targetAmount: Number(String(progData.target || '').replace(/[^0-9]/g, '')) || 15000000,
                location: (progData.location || 'Kepulauan Bangka Belitung').trim(),
                beneficiaries: (progData.beneficiaries || '').trim(),
                description: (progData.description || '').trim(),
                imageUrl: progData.image_url || progData.imageUrl || progData.image || (allocationRulesManager ? allocationRulesManager.getSpecificProgramImage(cleanTitle, pillar) : '') || '/assets/images/default-program-wiz.jpg',
                image_url: progData.image_url || progData.imageUrl || progData.image || (allocationRulesManager ? allocationRulesManager.getSpecificProgramImage(cleanTitle, pillar) : '') || '/assets/images/default-program-wiz.jpg',
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

            activityLog.add('system_config', `Program "${cleanTitle}" (${pillar} / ${kategoriPilar}) disimpan dengan status: ${newProgram.status === 'published' ? 'Dipublikasikan' : 'Draft'}.`, authorName);

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

            if (updates.image_url || updates.imageUrl) {
                const targetImg = updates.image_url || updates.imageUrl;
                updated.imageUrl = targetImg;
                updated.image_url = targetImg;
            }

            if (updates.pillar && !updates.kategori_pilar) {
                updated.kategori_pilar = mapPillarToKategori(updates.pillar);
            }

            if (updates.title) {
                updated.slug = updates.title.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[-\s]+/g, '-');
            }
            if (updates.target) {
                updated.targetAmount = Number(String(updates.target).replace(/[^0-9]/g, '')) || updated.targetAmount;
            }

            list[idx] = updated;
            setStore(STORAGE_KEYS.PROGRAMS, list);

            if ((updates.imageUrl || updates.image_url) && allocationRulesManager) {
                allocationRulesManager.updateSpecificProgramImageByName(updated.title, updates.imageUrl || updates.image_url);
            }

            activityLog.add('system_config', `Program "${updated.title}" diperbarui (Status: ${updated.status}).`, sessionStorage.getItem('wiz_admin_name') || 'Admin');

            // Real-time broadcast across all tabs
            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    const bc = new BroadcastChannel('wiz_sync_channel');
                    bc.postMessage({ type: 'program-updated', program: updated });
                    bc.close();
                } catch(e) {}
            }

            window.dispatchEvent(new CustomEvent('wiz-programs-changed', { detail: updated }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));

            // Instant targeted cloud sync
            (async () => {
                try {
                    if (updates.imageUrl) {
                        const syncTargets = ['/api/sync-photo'];
                        if (window.location.hostname !== 'www.wizbangkabelitung.or.id' && window.location.hostname !== 'wizbangkabelitung.or.id') {
                            syncTargets.push('https://www.wizbangkabelitung.or.id/api/sync-photo');
                        }
                        for (const target of syncTargets) {
                            try {
                                await fetch(target, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ programTitle: updated.title, imageUrl: updates.imageUrl })
                                });
                            } catch(e) {}
                        }
                    }
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
                .map(d => {
                    const pillar = d.pillar || mapProgramToPillar(d.program) || 'Berkah Hidayah';
                    const kategoriPilar = d.kategori_pilar || mapPillarToKategori(pillar);
                    return {
                        ...d,
                        pillar: pillar,
                        kategori_pilar: kategoriPilar
                    };
                })
                .sort((a, b) => new Date(b.disbursedAt) - new Date(a.disbursedAt));
        },

        getById(id) {
            return this.getAll().find(d => String(d.id) === String(id)) || null;
        },

        async add(data) {
            const list = this.getAll();
            const sType = data.sourceType || (data.program && (data.program.toLowerCase().includes('global') || data.program.toLowerCase().includes('alih fungsi')) ? 'infak_umum' : 'program_spesifik');
            const tType = data.targetType || (sType === 'auto_split' ? 'auto_split' : (data.program && (data.program.toLowerCase().includes('global') || data.program.toLowerCase().includes('alih fungsi')) ? 'global' : 'specific'));
            const pillar = data.pillar || mapProgramToPillar(data.program) || 'Berkah Hidayah';
            const kategoriPilar = data.kategori_pilar || mapPillarToKategori(pillar);
            const totalAmount = Number(data.amount) || 0;

            const fromProgram = (data.amountFromProgram !== undefined) 
                ? Number(data.amountFromProgram) 
                : (sType === 'auto_split' ? totalAmount : (sType === 'program_spesifik' ? totalAmount : 0));
            const fromSubsidi = (data.amountFromSubsidi !== undefined) 
                ? Number(data.amountFromSubsidi) 
                : (sType === 'infak_umum' ? totalAmount : 0);

            const newDisb = {
                id: data.id || generateId(),
                wilayah: data.wilayah || 'Pangkalpinang',
                sourceType: sType,
                targetType: tType,
                pillar: pillar,
                kategori_pilar: kategoriPilar,
                program: data.program || 'Infak Umum (Alih Fungsi Dana)',
                amount: totalAmount,
                amountFromProgram: fromProgram,
                amountFromSubsidi: fromSubsidi,
                description: data.description || '',
                disbursedAt: data.disbursedAt || new Date().toISOString(),
                recordedBy: data.recordedBy || 'Admin',
                createdAt: new Date().toISOString()
            };
            list.unshift(newDisb);
            setStore(STORAGE_KEYS.DISBURSEMENTS, list);

            const sourceLabel = (sType === 'auto_split') 
                ? `Auto-Split [Kas: ${formatRupiahCompact(fromProgram)} + Subsidi ${kategoriPilar}: ${formatRupiahCompact(fromSubsidi)}]`
                : (sType === 'infak_umum') 
                    ? (tType === 'global' ? `Infak Umum [Alih Fungsi ${kategoriPilar}]` : `Infak Umum [Spesifik ${kategoriPilar}]`) 
                    : 'Dana Spesifik';
            activityLog.add('disbursement', `Penyaluran dana ${formatRupiahCompact(newDisb.amount)} (${newDisb.wilayah}) [${sourceLabel}] untuk "${newDisb.program}" dicatat.`, newDisb.recordedBy);

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                const sbRes = await window.wizSupabase.saveDisbursement(newDisb);
                if (sbRes && sbRes.error) {
                    let errMsg = sbRes.error;
                    try {
                        const parsed = typeof errMsg === 'string' ? JSON.parse(errMsg) : errMsg;
                        if (parsed.message) errMsg = parsed.message;
                    } catch(e) {}
                    throw new Error(errMsg);
                }
            }

            try { await pushToCloud(); } catch(e) {}

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            return newDisb;
        },

        async update(id, updates) {
            const list = this.getAll();
            const idx = list.findIndex(d => String(d.id) === String(id));
            if (idx === -1) return null;

            const sType = updates.sourceType || list[idx].sourceType || (updates.program && (updates.program.toLowerCase().includes('global') || updates.program.toLowerCase().includes('alih fungsi')) ? 'infak_umum' : 'program_spesifik');
            const tType = updates.targetType || list[idx].targetType || (sType === 'auto_split' ? 'auto_split' : (updates.program && (updates.program.toLowerCase().includes('global') || updates.program.toLowerCase().includes('alih fungsi')) ? 'global' : 'specific'));
            const prog = updates.program || list[idx].program;
            const pillar = updates.pillar || list[idx].pillar || mapProgramToPillar(prog) || 'Berkah Hidayah';
            const kategoriPilar = updates.kategori_pilar || list[idx].kategori_pilar || mapPillarToKategori(pillar);
            const totalAmount = (updates.amount !== undefined) ? Number(updates.amount) : list[idx].amount;

            const fromProgram = (updates.amountFromProgram !== undefined) 
                ? Number(updates.amountFromProgram) 
                : (list[idx].amountFromProgram !== undefined ? list[idx].amountFromProgram : (sType === 'program_spesifik' ? totalAmount : 0));
            const fromSubsidi = (updates.amountFromSubsidi !== undefined) 
                ? Number(updates.amountFromSubsidi) 
                : (list[idx].amountFromSubsidi !== undefined ? list[idx].amountFromSubsidi : (sType === 'infak_umum' ? totalAmount : 0));

            const updatedItem = { 
                ...list[idx], 
                ...updates, 
                sourceType: sType,
                targetType: tType,
                pillar: pillar,
                kategori_pilar: kategoriPilar,
                amount: totalAmount, 
                amountFromProgram: fromProgram,
                amountFromSubsidi: fromSubsidi,
                updatedAt: new Date().toISOString() 
            };
            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                const sbRes = await window.wizSupabase.saveDisbursement(updatedItem);
                if (sbRes && sbRes.error) {
                    let errMsg = sbRes.error;
                    try {
                        const parsed = typeof errMsg === 'string' ? JSON.parse(errMsg) : errMsg;
                        if (parsed.message) errMsg = parsed.message;
                    } catch(e) {}
                    throw new Error(errMsg);
                }
            }

            list[idx] = updatedItem;
            setStore(STORAGE_KEYS.DISBURSEMENTS, list);

            activityLog.add('disbursement', `Penyaluran dana untuk "${list[idx].program}" diperbarui.`, updates.recordedBy || 'Admin');

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
                activityLog.add('disbursement', `Pencatatan pengeluaran ${formatRupiahCompact(item.amount)} untuk "${item.program}" dihapus.`, sessionStorage.getItem('wiz_admin_name') || 'Admin');
            }

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.delete('disbursements', strId);
                } catch(e) {}
            }

            try { await pushToCloud(); } catch(e) {}

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        }
    };

    // Helper normalisasi string / slug / ID untuk pencocokan program yang kebal typo & variasi simbol
    function normalizeProgramKey(str) {
        if (!str) return '';
        return String(str)
            .toLowerCase()
            .replace(/&amp;/g, 'dan')
            .replace(/&/g, 'dan')
            .replace(/[^a-z0-9]/g, '')
            .trim();
    }

    function isProgramMatching(queryA, queryB) {
        if (!queryA || !queryB) return false;
        const a = String(queryA).trim().toLowerCase();
        const b = String(queryB).trim().toLowerCase();
        if (a === b) return true;

        const normA = normalizeProgramKey(a);
        const normB = normalizeProgramKey(b);
        if (!normA || !normB) return false;
        if (normA === normB) return true;
        if (normA.includes(normB) || normB.includes(normA)) return true;

        // Alias groups to guarantee exact match across variations
        const aliasGroups = [
            ['celengan', 'sedekahsubuh', 'celenganbesar', 'pengadaancelengan', 'pengadaancelengansedekahsubuh', 'progcelengansubuh', 'pengadaancelenganbesar'],
            ['kendaraan', 'perbaikankendaraan', 'pengadaankendaraan', 'pengadaandanperbaikankendaraan', 'pengadaanperbaikankendaraan', 'progkendaraandakwah'],
            ['dai', 'keberangkatandai', 'kepulangandai', 'keberangkatankepulangandai', 'keberangkatandankepulangandai', 'progdaipelosok'],
            ['markaz', 'pembangunanmarkaz', 'progpembangunanmarkaz', 'markazdakwah'],
            ['kantor', 'kantordpw', 'kantordpwwibabeldanwiz', 'kantordpwwibabelwiz', 'progkantordpw'],
            ['mukerwil', 'mukernas', 'muktamar', 'mukerwilmukernasmuktamar', 'progmukerwil'],
            ['tahfidz', 'beasiswatahfidz', 'progtahfidz'],
            ['mualaf', 'santunanmualaf', 'progsantunanmualaf'],
            ['publicspeaking', 'pelatihanpublicspeaking', 'progpublicspeaking'],
            ['dzulhijjah', 'dzhulhijjah', 'tablighakbar', 'tablighakbardzulhijjah', 'tablighakbardzhulhijjah', 'progtablighakbar'],
            ['dirosa', 'pelatihangurudirosa', 'gurudirosa', 'proggurudirosa'],
            ['jenazah', 'penyelenggaraanjenazah', 'pelatihanpenyelenggaraanjenazah', 'progpenyelenggaraanjenazah'],
            ['volunteermedia', 'mediadakwah', 'pelatihanvolunteermediadakwah', 'progvolunteermedia'],
            ['posterdakwah', 'lombadesainposterdakwah', 'proglombaposter'],
            ['pendidikanjuara', 'beasiswapendidikanjuara', 'progbeasiswapendidikanjuara'],
            ['perlengkapanbelajar', 'perlengkapanbelajaryatim', 'progperlengkapanbelajaryatim'],
            ['beasiswatahfidzdhuafa', 'beasiswayatimmualaf', 'beasiswayatimdhuafa', 'progbeasiswatahfidz']
        ];

        for (const group of aliasGroups) {
            const inA = group.some(alias => normA.includes(alias) || alias.includes(normA));
            const inB = group.some(alias => normB.includes(alias) || alias.includes(normB));
            if (inA && inB) return true;
        }

        return false;
    }

    // Helper pengecekan program prioritas yang terkunci dari pemotongan Alih Fungsi Dana
    function isLockedPriorityProgram(programQuery) {
        if (!programQuery) return false;
        return isProgramMatching(programQuery, 'Pembangunan Markaz') || 
               isProgramMatching(programQuery, 'prog-pembangunan-markaz') || 
               isProgramMatching(programQuery, 'pembangunan-markaz');
    }

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
            if (wilayah && wilayah !== 'Semua') verified = verified.filter(d => (d.wilayah || 'Pangkalpinang') === wilayah);

            const isAnonymous = (name, d) => {
                if (!name || typeof name !== 'string') return true;
                const clean = name.trim().toLowerCase();
                if (!clean || clean === '-' || clean === '.' || clean === 'hamba allah' || clean === 'hamba_allah' || clean === 'hambaallah' || clean === 'anonim' || clean === 'anonymous' || clean === 'tanpa nama') return true;
                if (d && (d.isAnonymous === true || d.is_anonymous === true)) return true;
                return false;
            };

            // Tiap donasi "Hamba Allah" / Anonim dihitung sebagai 1 donatur unik tersendiri (+1 per donasi)
            const donorKeys = verified.map((d, index) => {
                const rawName = (d.donorName || d.donor_name || '').trim();
                const phone = (d.donorPhone || d.donor_phone || '').replace(/[^0-9]/g, '');

                if (isAnonymous(rawName, d)) {
                    return `hamba_allah_${d.id || ('idx_' + index)}`;
                }

                // Donatur dengan nama spesifik: jika nama & no hp sama, dihitung sebagai 1 donatur yang sama
                const cleanName = rawName.toLowerCase();
                return phone ? `named_${cleanName}_${phone}` : `named_${cleanName}_${d.id || ('idx_' + index)}`;
            });

            const uniqueDonors = new Set(donorKeys);
            const base = (wilayah && wilayah !== 'Semua') ? 0 : (Number(baselines.get().baseDonatur) || 0);
            return base + uniqueDonors.size;
        },

        getSpecificProgramStats(programName, defaultBase, defaultTarget, targetWilayah) {
            let verified = donations.getVerified();
            let disbList = disbursements.getAll();
            const pName = String(programName || '').trim();
            const pLower = pName.toLowerCase();
            const reqWilayah = (targetWilayah && targetWilayah !== 'Semua') ? targetWilayah : null;

            if (reqWilayah) {
                verified = verified.filter(d => (d.wilayah || 'Pangkalpinang') === reqWilayah);
                disbList = disbList.filter(db => (db.wilayah || 'Pangkalpinang') === reqWilayah);
            }

            // ─── Skenario Khusus 1: Dana Saving (Alokasi Kas Cadangan) ───
            if (pLower.includes('saving') || pLower.includes('cadangan')) {
                let savingMasuk = 0;
                let savingSalur = 0;
                verified.forEach(d => {
                    const dWilayah = d.wilayah || 'Pangkalpinang';
                    if (reqWilayah && dWilayah !== reqWilayah) return;
                    const wRules = (typeof allocationRulesManager !== 'undefined' && allocationRulesManager.get)
                        ? (allocationRulesManager.get(dWilayah) || ALLOCATION_RULES[dWilayah])
                        : ALLOCATION_RULES[dWilayah];
                    if (isGeneralInfak(d) && wRules && wRules.mainAllocation) {
                        const sItem = wRules.mainAllocation.find(i => i.key === 'Dana Saving');
                        if (sItem) {
                            savingMasuk += Math.round((Number(d.amount) || 0) * ((Number(sItem.percent) || 0) / 100));
                        }
                    }
                });
                disbList.forEach(db => {
                    const dbWil = db.wilayah || 'Pangkalpinang';
                    if (reqWilayah && dbWil !== reqWilayah) return;
                    const dbP = (db.program || '').toLowerCase();
                    if (dbP.includes('saving') || dbP.includes('cadangan')) {
                        savingSalur += Number(db.amount) || 0;
                    }
                });
                const saldo = Math.max(0, Math.round(savingMasuk - savingSalur));
                return {
                    terkumpul: saldo,
                    totalMasuk: savingMasuk,
                    masuk: savingMasuk,
                    tersalurkan: savingSalur,
                    saldo: saldo,
                    target: 50000000,
                    percent: 100,
                    pillar: 'Dana Saving',
                    kategori_pilar: 'Cadangan & Tabungan',
                    isPriorityLocked: false
                };
            }

            // ─── Skenario Khusus 2: Operasional — Infak Umum ───
            if (pLower.includes('operasional') && (pLower.includes('umum') || (!pLower.includes('terikat') && !pLower.includes('mitra')))) {
                let opUmumMasuk = 0;
                let opUmumSalur = 0;
                verified.forEach(d => {
                    const dWilayah = d.wilayah || 'Pangkalpinang';
                    if (reqWilayah && dWilayah !== reqWilayah) return;
                    const wRules = (typeof allocationRulesManager !== 'undefined' && allocationRulesManager.get)
                        ? (allocationRulesManager.get(dWilayah) || ALLOCATION_RULES[dWilayah])
                        : ALLOCATION_RULES[dWilayah];
                    if (isGeneralInfak(d) && wRules && wRules.mainAllocation) {
                        const opItem = wRules.mainAllocation.find(i => i.key === 'Operasional');
                        if (opItem) {
                            opUmumMasuk += Math.round((Number(d.amount) || 0) * ((Number(opItem.percent) || 0) / 100));
                        }
                    }
                });
                disbList.forEach(db => {
                    const dbWil = db.wilayah || 'Pangkalpinang';
                    if (reqWilayah && dbWil !== reqWilayah) return;
                    const dbP = (db.program || '').toLowerCase();
                    if (dbP.includes('operasional') && (dbP.includes('umum') || (!dbP.includes('terikat') && !dbP.includes('mitra')))) {
                        opUmumSalur += Number(db.amount) || 0;
                    }
                });
                const saldo = Math.max(0, Math.round(opUmumMasuk - opUmumSalur));
                return {
                    terkumpul: saldo,
                    totalMasuk: opUmumMasuk,
                    masuk: opUmumMasuk,
                    tersalurkan: opUmumSalur,
                    saldo: saldo,
                    target: 50000000,
                    percent: 100,
                    pillar: 'Operasional',
                    kategori_pilar: 'Operasional (Infak Umum)',
                    isPriorityLocked: false
                };
            }

            // ─── Skenario Khusus 3: Operasional — Infak Terikat ───
            if (pLower.includes('operasional') && (pLower.includes('terikat') || pLower.includes('mitra'))) {
                let opTerikatMasuk = 0;
                let opTerikatSalur = 0;
                verified.forEach(d => {
                    const dWil = d.wilayah || 'Pangkalpinang';
                    if (reqWilayah && dWil !== reqWilayah) return;
                    if (!isGeneralInfak(d)) {
                        const amt = Number(d.amount) || 0;
                        const op = Number(d.alokasiOperasional || d.alokasi_operasional || Math.round(amt * 0.125));
                        opTerikatMasuk += op;
                    }
                });
                disbList.forEach(db => {
                    const dbWil = db.wilayah || 'Pangkalpinang';
                    if (reqWilayah && dbWil !== reqWilayah) return;
                    const dbP = (db.program || '').toLowerCase();
                    if (dbP.includes('operasional') && (dbP.includes('terikat') || dbP.includes('mitra'))) {
                        opTerikatSalur += Number(db.amount) || 0;
                    }
                });
                const saldo = Math.max(0, Math.round(opTerikatMasuk - opTerikatSalur));
                return {
                    terkumpul: saldo,
                    totalMasuk: opTerikatMasuk,
                    masuk: opTerikatMasuk,
                    tersalurkan: opTerikatSalur,
                    saldo: saldo,
                    target: 50000000,
                    percent: 100,
                    pillar: 'Operasional',
                    kategori_pilar: 'Operasional (Infak Terikat)',
                    isPriorityLocked: false
                };
            }

            const progObj = (typeof programs !== 'undefined' && programs.getProgramDetails) 
                ? programs.getProgramDetails(pName) 
                : null;
            const progPillar = (progObj && progObj.pillar) ? progObj.pillar : mapProgramToPillar(pName);
            const kategoriPilar = (progObj && progObj.kategori_pilar) ? progObj.kategori_pilar : mapPillarToKategori(progPillar);

            let infakTerikatMasuk = 0;
            let infakUmumMasuk = 0;

            verified.forEach(d => {
                const dWilayah = d.wilayah || 'Pangkalpinang';
                if (reqWilayah && dWilayah !== reqWilayah) return;
                const wRules = (typeof allocationRulesManager !== 'undefined' && allocationRulesManager.get) 
                    ? (allocationRulesManager.get(dWilayah) || ALLOCATION_RULES[dWilayah])
                    : ALLOCATION_RULES[dWilayah];

                if (isGeneralInfak(d)) {
                    if (wRules && wRules.mainAllocation) {
                        const mainItem = wRules.mainAllocation.find(i => i.key === progPillar);
                        if (mainItem) {
                            const pillarAmount = (Number(d.amount) || 0) * (mainItem.percent / 100);
                            const subRule = wRules.subAllocation && wRules.subAllocation[progPillar];
                            if (subRule && subRule.items && subRule.items.length > 0) {
                                const subItem = subRule.items.find(si => isProgramMatching(si.key, pName));
                                if (subItem) {
                                    infakUmumMasuk += Math.round(pillarAmount * (subItem.percent / 100));
                                    return;
                                }
                            }
                            if (isProgramMatching(progPillar, pName)) {
                                infakUmumMasuk += Math.round(pillarAmount);
                            }
                        }
                    }
                } else {
                    // Infak Terikat / Specific Program: 100% of the verified amount counts toward the program
                    const dProg = d.programSpesifik || d.program || '';
                    const dCat = d.programUtama || d.category || '';
                    if (dProg && isProgramMatching(dProg, pName)) {
                        infakTerikatMasuk += (Number(d.amount) || 0);
                    } else if (dCat && isProgramMatching(dCat, pName)) {
                        infakTerikatMasuk += (Number(d.amount) || 0);
                    }
                }
            });

            let infakUmumAlihFungsiSalur = 0;
            let spesifikSalur = 0;

            disbList.forEach(db => {
                const dbWil = db.wilayah || 'Pangkalpinang';
                if (reqWilayah && dbWil !== reqWilayah) return;
                const sType = db.sourceType || (db.program && (db.program.toLowerCase().includes('global') || db.program.toLowerCase().includes('alih fungsi')) ? 'infak_umum' : 'program_spesifik');
                const tType = db.targetType || (db.program && (db.program.toLowerCase().includes('global') || db.program.toLowerCase().includes('alih fungsi')) ? 'global' : 'specific');
                const dbAmount = Number(db.amount) || 0;

                // 1. Skenario Penyaluran Langsung / Spesifik Program
                if (sType === 'program_spesifik' || tType === 'specific') {
                    const dbProg = db.program || db.programSpesifik || '';
                    if (dbProg && isProgramMatching(dbProg, pName)) {
                        spesifikSalur += dbAmount;
                    }
                } else if (sType === 'infak_umum' && tType === 'global') {
                    // 2. Skenario Infak Umum (Alih Fungsi Dana): RING-FENCING INTRA-PILAR
                    const dbPillar = db.pillar || mapProgramToPillar(db.program, db.category);
                    
                    if (dbPillar !== progPillar) {
                        return;
                    }

                    if (isLockedPriorityProgram(pName)) {
                        return;
                    }

                    const dbWilayah = db.wilayah || 'Pangkalpinang';
                    const wRules = (typeof allocationRulesManager !== 'undefined' && allocationRulesManager.get)
                        ? (allocationRulesManager.get(dbWilayah) || ALLOCATION_RULES[dbWilayah])
                        : ALLOCATION_RULES[dbWilayah];

                    const subRule = wRules && wRules.subAllocation && wRules.subAllocation[progPillar];
                    if (subRule && subRule.items && subRule.items.length > 0) {
                        const subItem = subRule.items.find(si => isProgramMatching(si.key, pName));
                        if (subItem) {
                            let subWeight = (Number(subItem.percent) || 0) / 100;
                            if (progPillar === 'Berkah Hidayah') {
                                const markazSub = subRule.items.find(si => isLockedPriorityProgram(si.key));
                                const markazPct = markazSub ? ((Number(markazSub.percent) || 0) / 100) : 0.05;
                                subWeight = subWeight / (1 - markazPct || 0.95);
                            }
                            infakUmumAlihFungsiSalur += Math.round(dbAmount * subWeight);
                            return;
                        }
                    }
                } else if (sType === 'auto_split' || tType === 'auto_split') {
                    // 3. Skenario Auto-Split (Pemotongan Pintar):
                    const fromProg = (db.amountFromProgram !== undefined) ? Number(db.amountFromProgram) : dbAmount;
                    const fromSub = (db.amountFromSubsidi !== undefined) ? Number(db.amountFromSubsidi) : 0;
                    const dbProg = db.program || db.programSpesifik || '';

                    if (dbProg && isProgramMatching(dbProg, pName)) {
                        spesifikSalur += fromProg;
                    }

                    if (fromSub > 0) {
                        const dbPillar = db.pillar || mapProgramToPillar(db.program, db.category);
                        
                        if (dbPillar !== progPillar) {
                            return;
                        }

                        if (isLockedPriorityProgram(pName)) {
                            return;
                        }

                        const dbWilayah = db.wilayah || 'Pangkalpinang';
                        const wRules = (typeof allocationRulesManager !== 'undefined' && allocationRulesManager.get)
                            ? (allocationRulesManager.get(dbWilayah) || ALLOCATION_RULES[dbWilayah])
                            : ALLOCATION_RULES[dbWilayah];

                        const subRule = wRules && wRules.subAllocation && wRules.subAllocation[progPillar];
                        if (subRule && subRule.items && subRule.items.length > 0) {
                            const subItem = subRule.items.find(si => isProgramMatching(si.key, pName));
                            if (subItem) {
                                let subWeight = (Number(subItem.percent) || 0) / 100;
                                if (progPillar === 'Berkah Hidayah') {
                                    const markazSub = subRule.items.find(si => isLockedPriorityProgram(si.key));
                                    const markazPct = markazSub ? ((Number(markazSub.percent) || 0) / 100) : 0.05;
                                    subWeight = subWeight / (1 - markazPct || 0.95);
                                }
                                infakUmumAlihFungsiSalur += Math.round(fromSub * subWeight);
                                return;
                            }
                        }
                        if (isProgramMatching(progPillar, pName)) {
                            infakUmumAlihFungsiSalur += fromSub;
                        }
                    }
                }
            });

            const base = Number(defaultBase) || 0;
            const target = Number(defaultTarget) || (progObj ? progObj.targetAmount : 50000000) || 50000000;
            const totalMasuk = base + infakTerikatMasuk + infakUmumMasuk;
            const totalSalur = infakUmumAlihFungsiSalur + spesifikSalur;

            const infakUmumBersih = Math.max(0, infakUmumMasuk - infakUmumAlihFungsiSalur);
            const saldoAktual = Math.max(0, base + infakTerikatMasuk + infakUmumBersih - spesifikSalur);
            
            const percent = target > 0 ? Math.min(100, Math.max(0, Math.round((saldoAktual / target) * 100))) : 0;

            return {
                terkumpul: saldoAktual,
                totalMasuk: totalMasuk,
                masuk: totalMasuk,
                tersalurkan: totalSalur,
                saldo: saldoAktual,
                target: target,
                percent: isNaN(percent) ? 0 : percent,
                infakTerikat: infakTerikatMasuk,
                infakUmumMasuk: infakUmumMasuk,
                infakUmumBersih: infakUmumBersih,
                spesifikSalur: spesifikSalur,
                pillar: progPillar,
                kategori_pilar: kategoriPilar,
                isPriorityLocked: isLockedPriorityProgram(pName)
            };
        },

        getPillarAvailableSubsidiPool(pillarName, wilayah, excludeDisbId) {
            const verified = donations.getVerified();
            const pName = pillarName || 'Berkah Hidayah';
            let totalInfakUmumPillarNonMarkaz = 0;

            verified.forEach(d => {
                if (wilayah && wilayah !== 'Semua' && d.wilayah !== wilayah) return;
                if (isGeneralInfak(d)) {
                    const dWilayah = d.wilayah || 'Pangkalpinang';
                    const wRules = (typeof allocationRulesManager !== 'undefined' && allocationRulesManager.get) 
                        ? (allocationRulesManager.get(dWilayah) || ALLOCATION_RULES[dWilayah])
                        : ALLOCATION_RULES[dWilayah];

                    if (wRules && wRules.mainAllocation) {
                        const mainItem = wRules.mainAllocation.find(i => i.key === pName);
                        if (mainItem) {
                            const pillarAmount = (Number(d.amount) || 0) * (mainItem.percent / 100);
                            const subRule = wRules.subAllocation && wRules.subAllocation[pName];
                            if (subRule && subRule.items && subRule.items.length > 0) {
                                // Sum percentage of non-Markaz programs only
                                let nonMarkazPercent = 0;
                                subRule.items.forEach(si => {
                                    if (!isLockedPriorityProgram(si.key)) {
                                        nonMarkazPercent += (Number(si.percent) || 0);
                                    }
                                });
                                totalInfakUmumPillarNonMarkaz += (pillarAmount * (nonMarkazPercent / 100));
                            } else {
                                totalInfakUmumPillarNonMarkaz += pillarAmount;
                            }
                        }
                    }
                }
            });

            let totalDisbursedSubsidiPillar = 0;
            const disbList = disbursements.getAll();
            disbList.forEach(db => {
                if (excludeDisbId && String(db.id) === String(excludeDisbId)) return;
                if (wilayah && wilayah !== 'Semua' && (db.wilayah || 'Pangkalpinang') !== wilayah) return;
                const dbPillar = db.pillar || mapProgramToPillar(db.program, db.category);
                if (dbPillar !== pName) return;

                const sType = db.sourceType;
                if (sType === 'infak_umum' || sType === 'infak_umum_subsidi') {
                    totalDisbursedSubsidiPillar += Number(db.amount) || 0;
                } else if (sType === 'auto_split') {
                    totalDisbursedSubsidiPillar += Number(db.amountFromSubsidi) || 0;
                }
            });

            return Math.max(0, totalInfakUmumPillarNonMarkaz - totalDisbursedSubsidiPillar);
        },

        calculateAutoSplit(programName, requestedAmount, wilayah, excludeDisbId) {
            const reqAmount = Math.max(0, Number(requestedAmount) || 0);
            const pName = String(programName || '').trim();
            const progStats = this.getSpecificProgramStats(pName);
            const currentProgSaldo = progStats ? progStats.saldo : 0;
            const progPillar = (progStats && progStats.pillar) ? progStats.pillar : mapProgramToPillar(pName);
            const kategoriPilar = (progStats && progStats.kategori_pilar) ? progStats.kategori_pilar : mapPillarToKategori(progPillar);

            const fromProgram = Math.min(reqAmount, currentProgSaldo);
            const shortfall = Math.max(0, reqAmount - fromProgram);
            const pillarSubsidiPool = this.getPillarAvailableSubsidiPool(progPillar, wilayah, excludeDisbId);

            const canSpend = (shortfall <= pillarSubsidiPool);
            const totalAvailableInPillar = currentProgSaldo + pillarSubsidiPool;
            const errorMessage = canSpend 
                ? null 
                : 'Total dana di pilar ini (di luar dana Markaz) tidak mencukupi.';

            return {
                canSpend,
                requestedAmount: reqAmount,
                programBalance: currentProgSaldo,
                fromProgram,
                shortfall,
                fromSubsidi: shortfall,
                pillarAvailableSubsidi: pillarSubsidiPool,
                totalAvailableInPillar,
                pillarName: progPillar,
                kategoriPilar: kategoriPilar,
                isMarkazLocked: true,
                errorMessage
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

            const dynamicMasukTerikat = {};
            const dynamicMasukUmum = {};
            const dynamicSalurAlihFungsi = {};
            const dynamicSalurSpesifik = {};

            Object.keys(programConfigs).forEach(key => {
                dynamicMasukTerikat[key] = 0;
                dynamicMasukUmum[key] = 0;
                dynamicSalurAlihFungsi[key] = 0;
                dynamicSalurSpesifik[key] = 0;
            });

            verified.forEach(d => {
                const dWilayah = d.wilayah || 'Pangkalpinang';
                const wRules = (typeof allocationRulesManager !== 'undefined' && allocationRulesManager.get)
                    ? (allocationRulesManager.get(dWilayah) || ALLOCATION_RULES[dWilayah])
                    : ALLOCATION_RULES[dWilayah];

                if (isGeneralInfak(d)) {
                    if (wRules && wRules.mainAllocation) {
                        wRules.mainAllocation.forEach(item => {
                            if (dynamicMasukUmum[item.key] !== undefined) {
                                dynamicMasukUmum[item.key] += (Number(d.amount) || 0) * (item.percent / 100);
                            }
                        });
                    }
                } else {
                    const pillar = mapProgramToPillar(d.programSpesifik || d.program, d.programUtama || d.category);
                    if (dynamicMasukTerikat[pillar] !== undefined) {
                        dynamicMasukTerikat[pillar] += Number(d.amount) || 0;
                    }
                }
            });

            disbList.forEach(db => {
                if (wilayah && wilayah !== 'Semua' && (db.wilayah || 'Pangkalpinang') !== wilayah) return;
                const sType = db.sourceType || (db.program && (db.program.toLowerCase().includes('global') || db.program.toLowerCase().includes('alih fungsi')) ? 'infak_umum' : 'program_spesifik');
                const tType = db.targetType || (db.program && (db.program.toLowerCase().includes('global') || db.program.toLowerCase().includes('alih fungsi')) ? 'global' : 'specific');
                const dbAmount = Number(db.amount) || 0;

                if (sType === 'infak_umum' && tType === 'global') {
                    // Ring-Fencing Intra-Pilar: HANYA mengurangi pilar sasaran alih fungsi!
                    const targetPillar = db.pillar || mapProgramToPillar(db.program, db.category);
                    if (dynamicSalurAlihFungsi[targetPillar] !== undefined) {
                        dynamicSalurAlihFungsi[targetPillar] += dbAmount;
                    }
                } else {
                    const pillar = db.pillar || mapProgramToPillar(db.program, db.category);
                    if (dynamicSalurSpesifik[pillar] !== undefined) {
                        dynamicSalurSpesifik[pillar] += dbAmount;
                    }
                }
            });

            return Object.entries(programConfigs).map(([key, cfg]) => {
                const masukTerikat = dynamicMasukTerikat[key] || 0;
                const masukUmum = dynamicMasukUmum[key] || 0;
                const salurAlihFungsi = dynamicSalurAlihFungsi[key] || 0;
                const salurSpesifik = dynamicSalurSpesifik[key] || 0;

                const totalMasuk = cfg.baseMasuk + masukTerikat + masukUmum;
                const totalSalur = cfg.baseSalur + salurAlihFungsi + salurSpesifik;

                // Proteksi: Alih Fungsi Infak Umum HANYA menyusutkan porsi Infak Umum
                const infakUmumBersih = Math.max(0, masukUmum - salurAlihFungsi);
                const saldo = Math.max(0, cfg.baseMasuk + masukTerikat + infakUmumBersih - salurSpesifik);
                const percent = cfg.target > 0 ? Math.min(100, Math.max(0, Math.round((saldo / cfg.target) * 100))) : 0;

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

                if (isGeneralInfak(d)) {
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

        async registerPublic(payload = {}) {
            const { name, phone, bankName, accountNumber, accountHolder, pin, cabang, notes } = payload;
            const cleanName = (name || '').trim();
            const cleanPhone = (phone || '').trim();
            const cleanPin = (pin || '').trim() || cleanPhone.slice(-4) || '1234';
            const cleanCabang = (cabang || 'Pangkalpinang').trim();
            const cleanNotes = (notes || 'Pendaftaran Mitra Publik via website').trim();

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
                    accountHolder: (accountHolder || existing.accountHolder || cleanName).trim(),
                    cabang: cleanCabang || existing.cabang || 'Pangkalpinang'
                };
                if (pin && pin.trim()) updates.pin = cleanPin;

                const updatedRef = await this.update(existing.id, updates);
                const resultRef = updatedRef || { ...existing, ...updates };
                broadcastSync('UPDATE_REFERRAL', resultRef);
                return { success: true, isExisting: true, referral: resultRef, message: 'Akun Mitra Anda telah aktif & data terhubung ke Web Admin!' };
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
                notes: cleanNotes,
                cabang: cleanCabang,
                createdBy: 'Publik (Pendaftaran Online)'
            });

            return { success: true, isExisting: false, referral: newRef, message: 'Pendaftaran Mitra Penghimpunan berhasil!' };
        },

        async login({ identifier, pin }) {
            if (!identifier) return { success: false, message: 'Masukkan No. WhatsApp atau Kode Mitra.' };
            const cleanIden = String(identifier).trim();
            let ref = this.getByCodeOrId(cleanIden);

            // Fast targeted Supabase fetch only if not found locally
            if (!ref && window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    const sbRes = await window.wizSupabase.getReferrals();
                    if (sbRes && Array.isArray(sbRes.data) && sbRes.data.length > 0) {
                        setStore(STORAGE_KEYS.REFERRALS, sbRes.data);
                        ref = this.getByCodeOrId(cleanIden);
                    }
                } catch(e) {}
            }

            if (!ref) {
                return { success: false, message: 'Akun Mitra tidak ditemukan. Silakan periksa kembali No. WA / Kode Mitra Anda atau lakukan pendaftaran.' };
            }

            const inputPin = String(pin || '').trim();
            const rawPhone = String(ref.phone || '').replace(/\D/g, '');
            const defaultPinFromPhone = rawPhone.length >= 4 ? rawPhone.slice(-4) : '1234';
            const actualPin = String(ref.pin || '').trim() || defaultPinFromPhone;

            if (inputPin && actualPin && inputPin !== actualPin) {
                return { success: false, message: 'PIN yang Anda masukkan salah. Silakan coba lagi atau gunakan menu Lupa PIN.' };
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

            let filterMonth = targetMonthStr; // e.g. "2026-09" or "Semua"
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

            // KPI Mitra & Brankas Wilayah Pool (7% PKP + 8% Sungailiat)
            const kpiRecord = (typeof kpiMitra !== 'undefined' && kpiMitra.getByMitraAndPeriod) 
                ? kpiMitra.getByMitraAndPeriod(ref.id, filterMonth) 
                : null;
            const kpiPoints = kpiRecord ? (Number(kpiRecord.totalPoin || kpiRecord.total_poin) || 0) : 0;

            const poolSummary = (typeof kpiMitra !== 'undefined' && kpiMitra.getPoolSummary)
                ? kpiMitra.getPoolSummary(filterMonth)
                : { totalPoolWilayah: 0, totalPool7Percent: 0, totalGlobalPoints: 0, pointValue: 0 };

            const poolFund = poolSummary.totalPoolWilayah !== undefined ? poolSummary.totalPoolWilayah : (poolSummary.totalPool7Percent || 0);

            const additionalIncentive = (poolSummary.totalGlobalPoints > 0 && kpiPoints > 0)
                ? Math.round((kpiPoints / poolSummary.totalGlobalPoints) * poolFund)
                : 0;

            const totalEarnedMonth = monthEarnedFee + additionalIncentive;

            let performanceTier = '🚀 Perlu Dorongan';
            let tierClass = 'bg-amber-100 text-amber-800 border-amber-200';

            if (monthDonationCount >= 5 || monthTotalAmount >= 5000000 || kpiPoints >= 100) {
                performanceTier = '⭐ Top Performer';
                tierClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
            } else if (monthDonationCount >= 1 || kpiPoints >= 30) {
                performanceTier = '✅ Stabil';
                tierClass = 'bg-blue-100 text-blue-800 border-blue-200';
            }

            return {
                referralId: ref.id,
                name: ref.name,
                code: ref.code || ref.id,
                phone: ref.phone,
                cabang: ref.cabang || 'Pangkalpinang',
                month: filterMonth,
                monthDonationCount,
                monthTotalAmount,
                monthEarnedFee,
                kpiPoints,
                kpiRecord,
                additionalIncentive,
                totalEarnedMonth,
                poolSummary,
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
                cabang: data.cabang || 'Pangkalpinang', // 'Pangkalpinang' | 'Sungailiat' | 'Wilayah'
                defaultRate: Number(data.defaultRate) || 6,
                pin: data.pin || (data.phone ? data.phone.slice(-4) : '1234'),
                status: data.status || 'active',
                notes: data.notes || '',
                createdAt: regDate.toISOString()
            };
            list.unshift(newRef);
            setStore(STORAGE_KEYS.REFERRALS, list);

            activityLog.add('referral', `Perantara/Affiliate baru "${newRef.name}" (Cabang: ${newRef.cabang}, ID: ${newRef.code}) ditambahkan (Hak ${newRef.defaultRate}%).`, data.createdBy || 'Admin');

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

            activityLog.add('referral', `Data Perantara "${list[idx].name}" (Cabang: ${list[idx].cabang || 'Pangkalpinang'}, Rekening: ${list[idx].bankName} ${list[idx].accountNumber}) diperbarui.`, updates.updatedBy || 'Affiliate/System');

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

        // Monthly KPI and Brankas Wilayah calculation for Mitra
        async getMonthlyKPI(mitraId, targetMonthStr, overrides = null) {
            let filterMonth = targetMonthStr;
            if (!filterMonth || filterMonth === 'Semua') {
                filterMonth = getCurrentPeriod();
            }

            const ref = this.getById(mitraId);
            const mCabang = ref ? (ref.cabang || 'Pangkalpinang') : 'Pangkalpinang';
            const cleanId = String(mitraId || '').toLowerCase();
            const cleanCode = ref ? String(ref.code || '').toLowerCase() : '';
            const cleanPhone = ref ? String(ref.phone || '').replace(/\D/g, '') : '';

            // 1. Get filtered verified donations for this referral in targetMonth
            const allDonations = getStore(STORAGE_KEYS.DONATIONS) || [];
            const myMonthDonations = allDonations.filter(d => {
                if (!d || (d.status !== 'verified' && d.status !== 'success' && d.status !== 'sukses')) return false;
                const dDate = d.createdAt || d.verifiedAt || d.date || '';
                if (!dDate.startsWith(filterMonth)) return false;

                const dRefId = String(d.referralId || d.referral_id || '').toLowerCase();
                const dRefCode = String(d.referralCode || d.referral_code || '').toLowerCase();
                const dPhone = String(d.referralPhone || d.referral_phone || '').replace(/\D/g, '');

                return (cleanId && (dRefId === cleanId || dRefCode === cleanId)) ||
                       (cleanCode && (dRefId === cleanCode || dRefCode === cleanCode)) ||
                       (cleanPhone && dPhone && dPhone === cleanPhone);
            });

            const monthDonationCount = myMonthDonations.length;
            const monthTotalAmount = myMonthDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
            const fixRatePercent = Number(ref?.defaultRate || ref?.rate || 6);
            const monthEarnedFee = Math.round(monthTotalAmount * (fixRatePercent / 100));

            // 2. Fetch KPI record for this mitra
            const kpiRecord = kpiMitra.getByMitraAndPeriod(mitraId, filterMonth);
            const kpiPoints = kpiRecord ? Number(kpiRecord.totalPoin || kpiRecord.total_poin || 0) : 0;

            // 3. Pool Wilayah calculation
            const poolSummary = await kpiMitra.getPoolSummary(filterMonth, overrides);
            const totalGlobalPoints = poolSummary.totalGlobalPoints || 0;
            const totalPoolWilayah = poolSummary.totalPoolWilayah || 0;

            const poolPortionPercent = totalGlobalPoints > 0 ? Number(((kpiPoints / totalGlobalPoints) * 100).toFixed(2)) : 0;
            const additionalIncentive = totalGlobalPoints > 0 ? Math.round((kpiPoints / totalGlobalPoints) * totalPoolWilayah) : 0;
            const totalEarnedMonth = monthEarnedFee + additionalIncentive;

            // 4. Performance Tier
            let performanceTier = 'Pejuang Kebaikan';
            if (monthTotalAmount >= 10000000 || kpiPoints >= 100) {
                performanceTier = '⭐ Top Performer';
            } else if (monthTotalAmount >= 5000000 || kpiPoints >= 50) {
                performanceTier = '🥈 Mitra Utama';
            } else if (monthTotalAmount >= 1000000 || kpiPoints >= 20) {
                performanceTier = '🥉 Mitra Aktif';
            }

            return {
                mitraId,
                targetMonth: filterMonth,
                cabang: mCabang,
                monthDonationCount,
                monthTotalAmount,
                fixRatePercent,
                monthEarnedFee,
                kpiPoints,
                kpiRecord,
                totalGlobalPoints,
                totalPoolWilayah,
                poolPortionPercent,
                additionalIncentive,
                totalEarnedMonth,
                performanceTier
            };
        },

        // Payout / Pencairan Hak Perantara
        getPayouts(referralId) {
            const allPayouts = getStore(STORAGE_KEYS.REFERRALS_PAYOUTS) || getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || [];
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

    // ─── Periods Generator Helper ─────────────────────────────
    function generatePeriods(count = 12) {
        const monthNamesIndo = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth();
        const periods = [];

        for (let i = 0; i < count; i++) {
            const d = new Date(curYear, curMonth - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth();
            const val = `${y}-${String(m + 1).padStart(2, '0')}`;
            const label = `${monthNamesIndo[m]} ${y}`;
            periods.push({
                value: val,
                label: label,
                isCurrent: i === 0,
                year: y,
                month: m + 1,
                monthName: monthNamesIndo[m]
            });
        }
        return periods;
    }

    function getCurrentPeriod() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // ─── KPI Mitra Manager (Centralized Brankas Wilayah) ────────────
    const KPI_WEIGHTS = {
        rapat: 5,
        admin: 20,
        desain: 35,
        video: 50,
        lapangan: 60
    };

    function calculateKpiPoints(data = {}) {
        const r = (Number(data.qtyRapat !== undefined ? data.qtyRapat : data.qty_rapat) || 0) * KPI_WEIGHTS.rapat;
        const a = (Number(data.qtyAdmin !== undefined ? data.qtyAdmin : data.qty_admin) || 0) * KPI_WEIGHTS.admin;
        const d = (Number(data.qtyDesain !== undefined ? data.qtyDesain : data.qty_desain) || 0) * KPI_WEIGHTS.desain;
        const v = (Number(data.qtyVideo !== undefined ? data.qtyVideo : data.qty_video) || 0) * KPI_WEIGHTS.video;
        const l = (Number(data.qtyLapangan !== undefined ? data.qtyLapangan : data.qty_lapangan) || 0) * KPI_WEIGHTS.lapangan;
        const o = Number(data.poinLainnya !== undefined ? data.poinLainnya : data.poin_lainnya) || 0;
        return r + a + d + v + l + o;
    }

    const kpiMitra = {
        weights: KPI_WEIGHTS,
        generatePeriods,
        getCurrentPeriod,

        calculatePoints(data) {
            return calculateKpiPoints(data || {});
        },

        getAll() {
            const list = getStore(STORAGE_KEYS.KPI_MITRA) || [];
            return list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
        },

        getByPeriod(periodeBulan) {
            const all = this.getAll();
            if (!periodeBulan || periodeBulan === 'Semua') return all;
            return all.filter(k => (k.periodeBulan || k.periode_bulan) === periodeBulan);
        },

        getByMitraAndPeriod(mitraId, periodeBulan) {
            if (!mitraId) return null;
            const all = this.getAll();
            const cleanId = String(mitraId).trim().toLowerCase();
            return all.find(k => {
                const kMid = String(k.mitraId || k.mitra_id || '').trim().toLowerCase();
                const kMonth = String(k.periodeBulan || k.periode_bulan || '').trim();
                return kMid === cleanId && (!periodeBulan || periodeBulan === 'Semua' || kMonth === periodeBulan);
            }) || null;
        },

        getPoolSummary(targetMonthStr, overrides = null) {
            let filterMonth = targetMonthStr;
            if (!filterMonth || filterMonth === 'Semua') {
                filterMonth = getCurrentPeriod();
            }

            // Also check localStorage for saved overrides if not explicitly passed
            if (!overrides && typeof localStorage !== 'undefined') {
                try {
                    const saved = JSON.parse(localStorage.getItem('wiz_kpi_pool_overrides') || '{}');
                    if (saved && saved[filterMonth]) {
                        overrides = saved[filterMonth];
                    }
                } catch(e) {}
            }

            // 1. Fetch all verified donations for this month
            const allDonations = getStore(STORAGE_KEYS.DONATIONS) || [];
            const allRefs = getStore(STORAGE_KEYS.REFERRALS) || [];
            const refMap = new Map();
            allRefs.forEach(r => {
                if (r && r.id) refMap.set(String(r.id).toLowerCase(), r);
                if (r && r.code) refMap.set(String(r.code).toLowerCase(), r);
            });

            const monthDonations = allDonations.filter(d => {
                if (!d || (d.status !== 'verified' && d.status !== 'success' && d.status !== 'sukses')) return false;
                const dDate = d.createdAt || d.verifiedAt || d.date || '';
                return dDate.startsWith(filterMonth);
            });

            let sumPKP = 0;
            let sumSungailiat = 0;
            let countPKP = 0;
            let countSungailiat = 0;

            monthDonations.forEach(d => {
                const amt = Number(d.amount) || 0;
                const dWil = String(d.wilayah || d.cabang || d.branch || '').toLowerCase();
                const dRefId = String(d.referralId || d.referral_id || d.referralCode || d.referral_code || '').toLowerCase();
                const refObj = refMap.get(dRefId);
                const refCabang = refObj ? String(refObj.cabang || '').toLowerCase() : '';

                if (dWil.includes('sungailiat') || refCabang.includes('sungailiat')) {
                    sumSungailiat += amt;
                    countSungailiat++;
                } else {
                    sumPKP += amt;
                    countPKP++;
                }
            });

            // Pangkalpinang: 7% Pool, Sungailiat: 8% Pool -> Merged into "Brankas Wilayah"
            const rawPoolPKP = Math.round(sumPKP * 0.07);
            const rawPoolSungailiat = Math.round(sumSungailiat * 0.08);

            const overridePkp = (overrides && overrides.overridePoolPkp !== undefined && overrides.overridePoolPkp !== null && overrides.overridePoolPkp !== '')
                ? Math.max(0, Number(overrides.overridePoolPkp))
                : null;
            const overrideSungailiat = (overrides && overrides.overridePoolSungailiat !== undefined && overrides.overridePoolSungailiat !== null && overrides.overridePoolSungailiat !== '')
                ? Math.max(0, Number(overrides.overridePoolSungailiat))
                : null;

            const final_pool_pkp = overridePkp !== null ? overridePkp : rawPoolPKP;
            const final_pool_sungailiat = overrideSungailiat !== null ? overrideSungailiat : rawPoolSungailiat;
            const totalPoolWilayah = final_pool_pkp + final_pool_sungailiat;

            // 2. Fetch all KPI records for this month
            const monthKpiList = this.getByPeriod(filterMonth);
            const totalGlobalPoints = monthKpiList.reduce((sum, k) => sum + (Number(k.totalPoin || k.total_poin) || 0), 0);
            const pointValue = totalGlobalPoints > 0 ? (totalPoolWilayah / totalGlobalPoints) : 0;

            return {
                periodeBulan: filterMonth,
                donationCount: monthDonations.length,
                totalVerifiedDonations: sumPKP + sumSungailiat,
                donationsPKP: sumPKP,
                countPKP,
                rawPoolPKP,
                poolPKP: final_pool_pkp,
                overridePoolPkp: overridePkp,
                isOverriddenPKP: overridePkp !== null,
                donationsSungailiat: sumSungailiat,
                countSungailiat,
                rawPoolSungailiat,
                poolSungailiat: final_pool_sungailiat,
                overridePoolSungailiat: overrideSungailiat,
                isOverriddenSungailiat: overrideSungailiat !== null,
                totalPoolWilayah,
                totalPool7Percent: totalPoolWilayah, // Backward-compatibility
                totalGlobalPoints,
                pointValue,
                pointConversionRate: pointValue,
                konversiPoin: pointValue,
                kpiCount: monthKpiList.length
            };
        },

        async save(data) {
            const mId = data ? String(data.mitraId || data.mitra_id || data.referralId || data.referral_id || '').trim() : '';
            const pMonth = data ? String(data.periodeBulan || data.periode_bulan || data.periode || data.targetMonth || '').trim() : '';
            if (!mId || !pMonth) {
                throw new Error('Mitra dan Periode Bulan wajib diisi.');
            }
            const qRapat = Number(data.qtyRapat !== undefined ? data.qtyRapat : (data.qty_rapat || 0));
            const qAdmin = Number(data.qtyAdmin !== undefined ? data.qtyAdmin : (data.qty_admin || 0));
            const qDesain = Number(data.qtyDesain !== undefined ? data.qtyDesain : (data.qty_desain || 0));
            const qVideo = Number(data.qtyVideo !== undefined ? data.qtyVideo : (data.qty_video || 0));
            const qLapangan = Number(data.qtyLapangan !== undefined ? data.qtyLapangan : (data.qty_lapangan || 0));
            const ketLain = String(data.keteranganLainnya !== undefined ? data.keteranganLainnya : (data.keterangan_lainnya || '')).trim();
            const pLain = Number(data.poinLainnya !== undefined ? data.poinLainnya : (data.poin_lainnya || 0));

            const totalPoinCalculated = calculateKpiPoints({
                qtyRapat: qRapat,
                qtyAdmin: qAdmin,
                qtyDesain: qDesain,
                qtyVideo: qVideo,
                qtyLapangan: qLapangan,
                poinLainnya: pLain
            });

            const list = getStore(STORAGE_KEYS.KPI_MITRA) || [];
            const existingIdx = list.findIndex(k => 
                String(k.mitraId || k.mitra_id).toLowerCase() === mId.toLowerCase() &&
                String(k.periodeBulan || k.periode_bulan) === pMonth
            );

            const nowIso = new Date().toISOString();
            const kpiObj = {
                id: data.id || (existingIdx !== -1 ? list[existingIdx].id : generateUUID()),
                mitraId: mId,
                mitra_id: mId,
                periodeBulan: pMonth,
                periode_bulan: pMonth,
                qtyRapat: qRapat,
                qty_rapat: qRapat,
                qtyAdmin: qAdmin,
                qty_admin: qAdmin,
                qtyDesain: qDesain,
                qty_desain: qDesain,
                qtyVideo: qVideo,
                qty_video: qVideo,
                qtyLapangan: qLapangan,
                qty_lapangan: qLapangan,
                keteranganLainnya: ketLain,
                keterangan_lainnya: ketLain,
                poinLainnya: pLain,
                poin_lainnya: pLain,
                totalPoin: totalPoinCalculated,
                total_poin: totalPoinCalculated,
                createdAt: (existingIdx !== -1 ? list[existingIdx].createdAt : null) || data.createdAt || nowIso,
                updatedAt: nowIso
            };

            if (existingIdx !== -1) {
                list[existingIdx] = kpiObj;
            } else {
                list.unshift(kpiObj);
            }
            setStore(STORAGE_KEYS.KPI_MITRA, list);

            const ref = referrals.getById(mId);
            const refName = ref ? ref.name : mId;
            activityLog.add('kpi', `Input/Update KPI Mitra "${refName}" (${totalPoinCalculated} Poin) periode ${pMonth}.`, data.createdBy || 'Admin');

            // Non-blocking Supabase Upsert
            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.saveKpiMitra(kpiObj);
                } catch(e) {
                    console.warn('[KPI Mitra Supabase Upsert Error]:', e);
                }
            }

            // Sync to /api/sync
            try {
                fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'save_kpi_mitra', kpi: kpiObj })
                }).catch(() => {});
            } catch(e) {}

            try {
                if (typeof pushToCloud === 'function') {
                    pushToCloud().catch(() => {});
                }
            } catch(e) {}

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            window.dispatchEvent(new CustomEvent('wiz-kpi-changed', { detail: kpiObj }));
            broadcastSync('UPDATE_KPI_MITRA', kpiObj);
            return kpiObj;
        },

        async delete(id) {
            if (!id) return;
            const strId = String(id);
            addDeletedKpiId(strId);

            const list = getStore(STORAGE_KEYS.KPI_MITRA) || [];
            const item = list.find(k => String(k.id) === strId);
            const filtered = list.filter(k => String(k.id) !== strId);
            setStore(STORAGE_KEYS.KPI_MITRA, filtered);

            if (item) {
                const ref = referrals.getById(item.mitraId || item.mitra_id);
                activityLog.add('kpi', `Data KPI Mitra "${ref ? ref.name : item.mitraId}" periode ${item.periodeBulan} dihapus.`, 'Admin');
            }

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                try {
                    await window.wizSupabase.deleteKpiMitra(strId);
                } catch(e) {}
            }

            try {
                fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deleted_kpi_ids: [strId] })
                }).catch(() => {});
            } catch(e) {}

            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            window.dispatchEvent(new CustomEvent('wiz-kpi-changed'));
            broadcastSync('DELETE_KPI_MITRA', { id: strId });
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
            
            window.dispatchEvent(new CustomEvent('wiz-quotes-changed'));
            window.dispatchEvent(new CustomEvent('wiz-site-settings-changed', { detail: settings }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            broadcastSync('QUOTES_VISIBILITY_CHANGED', { enabled: Boolean(enabled) });

            // Non-blocking background sync
            (async () => {
                try {
                    if (window.wizSupabase && window.wizSupabase.isConfigured() && typeof window.wizSupabase.saveSiteSettings === 'function') {
                        await window.wizSupabase.saveSiteSettings(settings);
                    }
                    if (typeof pushToCloud === 'function') {
                        await pushToCloud();
                    }
                } catch(e) {}
            })();

            return settings.quotes_enabled;
        },

        getAll() {
            const deletedQuoteSet = getDeletedQuoteIds();
            const stored = getStore(STORAGE_KEYS.QUOTES);
            let list = Array.isArray(stored) ? stored : DEFAULT_QUOTES;
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

            // Instant UI events
            window.dispatchEvent(new CustomEvent('wiz-quotes-changed', { detail: newQuote }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            broadcastSync('NEW_QUOTE', newQuote);

            // Direct micro-action to /api/sync
            try {
                fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'save_quote', quote: newQuote })
                }).catch(() => {});
            } catch(e) {}

            // Non-blocking concurrent cloud sync in background
            (async () => {
                try {
                    const tasks = [];
                    if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                        if (typeof window.wizSupabase.saveQuotes === 'function') {
                            tasks.push(window.wizSupabase.saveQuotes(list));
                        }
                    }
                    if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                        tasks.push(window.wizFirebase.insert('quotes', newQuote));
                    }
                    if (typeof pushToCloud === 'function') {
                        tasks.push(pushToCloud());
                    }
                    await Promise.allSettled(tasks);
                } catch(e) {}
            })();

            return newQuote;
        },

        async update(id, updates) {
            const list = this.getAll();
            const idx = list.findIndex(q => String(q.id) === String(id));
            if (idx === -1) return null;

            list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
            setStore(STORAGE_KEYS.QUOTES, list);

            activityLog.add('quote', `Quote harian "${list[idx].source}" diperbarui.`, updates.author || 'Admin');

            // Direct micro-action to /api/sync
            try {
                fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'save_quote', quote: list[idx] })
                }).catch(() => {});
            } catch(e) {}

            // Instant UI events
            window.dispatchEvent(new CustomEvent('wiz-quotes-changed', { detail: list[idx] }));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));

            // Non-blocking concurrent cloud sync in background
            (async () => {
                try {
                    const tasks = [];
                    if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                        if (typeof window.wizSupabase.saveQuotes === 'function') {
                            tasks.push(window.wizSupabase.saveQuotes(list));
                        }
                    }
                    if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                        tasks.push(window.wizFirebase.set('quotes', String(id), list[idx]));
                    }
                    if (typeof pushToCloud === 'function') {
                        tasks.push(pushToCloud());
                    }
                    await Promise.allSettled(tasks);
                } catch(e) {}
            })();

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

            // Direct micro-action to /api/sync
            try {
                fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete_quote', id: strId })
                }).catch(() => {});
            } catch(e) {}

            // Instant UI events
            window.dispatchEvent(new CustomEvent('wiz-quotes-changed'));
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));

            // Non-blocking concurrent cloud sync in background
            (async () => {
                try {
                    const tasks = [];
                    if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                        if (typeof window.wizSupabase.saveQuotes === 'function') {
                            tasks.push(window.wizSupabase.saveQuotes(filtered));
                        }
                        tasks.push(window.wizSupabase.remove('quotes', strId));
                    }
                    if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                        tasks.push(window.wizFirebase.remove('quotes', strId));
                    }
                    if (typeof pushToCloud === 'function') {
                        tasks.push(pushToCloud());
                    }
                    await Promise.allSettled(tasks);
                } catch(e) {}
            })();
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

    // Full authoritative sync on startup:
    async function initSync() {
        try {
            // Jika local store kosong atau data berita kurang dari snapshot, segera isi dari canonical snapshot dulu
            const curDons = getStore(STORAGE_KEYS.DONATIONS) || [];
            const curRefs = getStore(STORAGE_KEYS.REFERRALS) || [];
            const curNews = getStore(STORAGE_KEYS.NEWS) || [];
            if (curDons.length === 0 || curRefs.length === 0 || curNews.length < 9) {
                try {
                    const cRes = await fetch('assets/data/canonical-store.json', { cache: 'no-cache' });
                    if (cRes.ok) {
                        const cData = await cRes.json();
                        if (cData && Array.isArray(cData.donations) && cData.donations.length > 0 && curDons.length === 0) {
                            setStore(STORAGE_KEYS.DONATIONS, cData.donations);
                        }
                        if (cData && Array.isArray(cData.referrals) && cData.referrals.length > 0 && curRefs.length === 0) {
                            setStore(STORAGE_KEYS.REFERRALS, cData.referrals);
                        }
                        if (cData && Array.isArray(cData.disbursements) && cData.disbursements.length > 0) {
                            const curDisb = getStore(STORAGE_KEYS.DISBURSEMENTS) || [];
                            if (curDisb.length === 0) setStore(STORAGE_KEYS.DISBURSEMENTS, cData.disbursements);
                        }
                    }
                } catch(e) {}
            }

            await syncFromCloud(true);   // Pull fresh authoritative data from Supabase Cloud and replace local state
            console.log('[WIZ Sync Engine] Initial real-time cloud sync complete (Supabase SSOT active).');
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            window.dispatchEvent(new CustomEvent('wiz-donations-changed'));
            window.dispatchEvent(new CustomEvent('wiz-referrals-changed'));
            window.dispatchEvent(new CustomEvent('wiz-disbursements-changed'));
        } catch(e) {
            console.warn('[WIZ Sync Engine] Init sync warning:', e.message);
        }
    }

    // Execute immediately on startup
    initSync();
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => initSync());
        }
    }

    // Instant cross-device cloud sync on tab focus or mobile app wake
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible') {
                try {
                    await syncFromCloud();
                    window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
                } catch(e) {}
            }
        });
    }
    if (typeof window !== 'undefined') {
        window.addEventListener('focus', async () => {
            try {
                await syncFromCloud();
                window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            } catch(e) {}
        });
    }

    // Automatic recurring background cloud sync every 8 seconds (when tab is active)
    setInterval(async () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            try {
                await syncFromCloud();
                window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
            } catch(e) {}
        }
    }, 8000);

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
        kpiMitra,
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
        utils: { formatRupiah, formatRupiahCompact, formatDate, formatDateTime, timeAgo, generateId, generatePeriods, getCurrentPeriod, mapProgramToPillar, mapPillarToKategori, mapKategoriToPillar, getProgramPillarKey, getProgramKategoriPilar, escapeHtml, isLockedPriorityProgram, normalizeProgramKey, isProgramMatching }
    };

    if (typeof window !== 'undefined') {
        window.generatePeriods = generatePeriods;
        window.getCurrentPeriod = getCurrentPeriod;
    }

    console.log('[WIZ Store] Initialized with real-time cloud sync & 10s auto-polling. Collections ready.');
})();
