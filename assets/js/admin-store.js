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
        DELETED_IDS: 'wiz_deleted_donation_ids',
        DELETED_NEWS_IDS: 'wiz_deleted_news_ids',
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
        'Sedekah Beras Dhuafa': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=800&auto=format&fit=crop',
        'Sedekah Jumat': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop',
        'Santunan Yatim': 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=800&auto=format&fit=crop',
        'Tebar Iftar Nusantara': 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?q=80&w=800&auto=format&fit=crop',
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

    const DEFAULT_REFERRALS = [
        {
            id: 'ref-1',
            name: 'Ustadz Ahmad Hidayat',
            phone: '081271234567',
            bankName: 'Bank Syariah Indonesia (BSI)',
            accountNumber: '7123456789',
            accountHolder: 'Ahmad Hidayat',
            defaultRate: 6,
            status: 'active',
            notes: 'Da\'i & Mitra Fundraiser Wilayah Pangkalpinang',
            createdAt: new Date().toISOString()
        },
        {
            id: 'ref-2',
            name: 'Ibu Fatimah Az-Zahra',
            phone: '082198765432',
            bankName: 'Bank Muamalat',
            accountNumber: '1090012345',
            accountHolder: 'Fatimah Az-Zahra',
            defaultRate: 6,
            status: 'active',
            notes: 'Koordinator Komunitas Sedekah Sungailiat',
            createdAt: new Date().toISOString()
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
        async update(key, url, label) {
            const current = this.getAll();
            current[key] = url;
            setStore(STORAGE_KEYS.SITE_IMAGES, current);
            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('settings', `Foto '${label || key}' diperbarui oleh Admin`, sessionStorage.getItem('wiz_admin_user') || 'Admin');
            }
            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.upsert('site_images', { key, url, label: label || key, updatedAt: new Date().toISOString() });
            }
            return current;
        },
        async updateAll(imagesObj) {
            const current = { ...this.getAll(), ...imagesObj };
            setStore(STORAGE_KEYS.SITE_IMAGES, current);
            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('settings', 'Beberapa foto website diperbarui oleh Admin', sessionStorage.getItem('wiz_admin_user') || 'Admin');
            }
            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                for (const [key, url] of Object.entries(imagesObj)) {
                    await window.wizFirebase.upsert('site_images', { key, url, label: key, updatedAt: new Date().toISOString() });
                }
            }
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
                await window.wizFirebase.upsert('site_settings', {
                    key: 'global_settings',
                    value: updated,
                    updatedAt: new Date().toISOString()
                });
            }

            window.dispatchEvent(new CustomEvent('wiz-site-settings-changed', { detail: updated }));
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
            const all = this.getAll();
            const cleanName = (programName || '').trim().toLowerCase();
            let updated = false;

            for (const [w, wData] of Object.entries(all)) {
                if (wData && wData.subAllocation) {
                    let wModified = false;
                    for (const [pillarKey, subObj] of Object.entries(wData.subAllocation)) {
                        if (subObj && subObj.items) {
                            subObj.items.forEach(item => {
                                const kLower = (item.key || '').trim().toLowerCase();
                                const fullLower = `${pillarKey} - ${item.key}`.toLowerCase();
                                if (kLower === cleanName || fullLower === cleanName || cleanName.includes(kLower) || kLower.includes(cleanName)) {
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

            // Also keep flat store in localStorage for fast direct lookup on public pages
            try {
                const flatMap = JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}');
                flatMap[programName] = imageDataUrl;
                localStorage.setItem('wiz_specific_prog_imgs', JSON.stringify(flatMap));
            } catch(e) {}

            return updated;
        },
        getSpecificProgramImage(programName, pillar = '') {
            try {
                const flatMap = JSON.parse(localStorage.getItem('wiz_specific_prog_imgs') || '{}');
                if (flatMap[programName]) return flatMap[programName];
            } catch(e) {}

            const cleanName = (programName || '').trim().toLowerCase();
            const all = this.getAll();
            for (const wData of Object.values(all)) {
                if (wData && wData.subAllocation) {
                    for (const [pillarKey, subObj] of Object.entries(wData.subAllocation)) {
                        if (subObj && subObj.items) {
                            for (const item of subObj.items) {
                                const kLower = (item.key || '').trim().toLowerCase();
                                const fullLower = `${pillarKey} - ${item.key}`.toLowerCase();
                                if ((kLower === cleanName || fullLower === cleanName || cleanName.includes(kLower) || kLower.includes(cleanName)) && item.image) {
                                    return item.image;
                                }
                            }
                        }
                    }
                }
            }

            if (DEFAULT_SPECIFIC_PROGRAM_IMAGES[programName]) {
                return DEFAULT_SPECIFIC_PROGRAM_IMAGES[programName];
            }
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
        setStore(STORAGE_KEYS.REFERRALS, DEFAULT_REFERRALS);
        setStore(STORAGE_KEYS.REFERRAL_PAYOUTS, []);
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }

    // Ensure referrals store is populated if missing or empty
    const existingRefs = getStore(STORAGE_KEYS.REFERRALS);
    if (!existingRefs || !Array.isArray(existingRefs) || existingRefs.length === 0) {
        setStore(STORAGE_KEYS.REFERRALS, DEFAULT_REFERRALS);
    }
    if (!getStore(STORAGE_KEYS.REFERRAL_PAYOUTS)) {
        setStore(STORAGE_KEYS.REFERRAL_PAYOUTS, []);
    }

    // ─── Cloud Sync Helper (Firebase) ─────────────────────
    async function pushToCloud() {
        if (!window.wizFirebase || !window.wizFirebase.isConfigured()) {
            return { status: 'error', message: 'Firebase belum dikonfigurasi' };
        }

        const report = { donationsPushed: 0, newsPushed: 0, disbursementsPushed: 0, referralsPushed: 0, payoutsPushed: 0, errors: [] };

        try {
            const deletedSet = getDeletedIds();

            // Push Donations (excluding deleted IDs)
            const { data: cloudDons } = await window.wizFirebase.select('donations');
            const cloudDonIds = new Set((cloudDons || []).map(d => String(d.id)));
            const localDonations = getStore(STORAGE_KEYS.DONATIONS) || [];
            for (const d of localDonations) {
                if (d && d.id && !deletedSet.has(String(d.id)) && !cloudDonIds.has(String(d.id))) {
                    const { error } = await window.wizFirebase.insert('donations', d);
                    if (!error) report.donationsPushed++;
                }
            }

            // Push News
            const { data: cloudNews } = await window.wizFirebase.select('news');
            const cloudNewsIds = new Set((cloudNews || []).map(n => String(n.id)));
            const localNews = getStore(STORAGE_KEYS.NEWS) || [];
            for (const n of localNews) {
                if (n && n.id && !deletedSet.has(String(n.id)) && !cloudNewsIds.has(String(n.id))) {
                    const { error } = await window.wizFirebase.insert('news', n);
                    if (!error) report.newsPushed++;
                }
            }

            // Push Disbursements
            const { data: cloudDisb } = await window.wizFirebase.select('disbursements');
            const cloudDisbIds = new Set((cloudDisb || []).map(db => String(db.id)));
            const localDisb = getStore(STORAGE_KEYS.DISBURSEMENTS) || [];
            for (const db of localDisb) {
                if (db && db.id && !deletedSet.has(String(db.id)) && !cloudDisbIds.has(String(db.id))) {
                    const { error } = await window.wizFirebase.insert('disbursements', db);
                    if (!error) report.disbursementsPushed++;
                }
            }

            // Push Referrals
            const { data: cloudRefs } = await window.wizFirebase.select('referrals');
            const cloudRefIds = new Set((cloudRefs || []).map(r => String(r.id)));
            const localRefs = getStore(STORAGE_KEYS.REFERRALS) || [];
            for (const r of localRefs) {
                if (r && r.id && !deletedSet.has(String(r.id)) && !cloudRefIds.has(String(r.id))) {
                    const { error } = await window.wizFirebase.insert('referrals', r);
                    if (!error) report.referralsPushed++;
                }
            }

            // Push Referral Payouts
            const { data: cloudPayouts } = await window.wizFirebase.select('referral_payouts');
            const cloudPayoutIds = new Set((cloudPayouts || []).map(p => String(p.id)));
            const localPayouts = getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || [];
            for (const p of localPayouts) {
                if (p && p.id && !deletedSet.has(String(p.id)) && !cloudPayoutIds.has(String(p.id))) {
                    const { error } = await window.wizFirebase.insert('referral_payouts', p);
                    if (!error) report.payoutsPushed++;
                }
            }

            return { status: 'success', report };
        } catch (e) {
            console.error('[WIZ Firebase] Push error:', e);
            return { status: 'error', message: e.message };
        }
    }

    async function syncFromCloud() {
        if (!window.wizFirebase || !window.wizFirebase.isConfigured()) return;

        try {
            const [donRes, newsRes, disbRes, actRes, refRes, payoutRes, settingsRes, baseRes, deletedRes] = await Promise.all([
                window.wizFirebase.select('donations'),
                window.wizFirebase.select('news'),
                window.wizFirebase.select('disbursements'),
                window.wizFirebase.select('activity_log'),
                window.wizFirebase.select('referrals'),
                window.wizFirebase.select('referral_payouts'),
                window.wizFirebase.select('site_settings'),
                window.wizFirebase.select('baselines'),
                window.wizFirebase.select('deleted_ids')
            ]);

            if (deletedRes.data && Array.isArray(deletedRes.data)) {
                deletedRes.data.forEach(d => {
                    if (d && (d.key || d.id)) addDeletedId(d.key || d.id);
                });
            }

            const deletedSet = getDeletedIds();

            function smartMerge(storeKey, cloudData, sortFn) {
                if (!cloudData || !Array.isArray(cloudData)) return;
                const local = getStore(storeKey) || [];
                const map = new Map();
                // Load local first, skipping deleted
                local.forEach(item => {
                    if (item && item.id && !deletedSet.has(String(item.id)) && item.status !== 'deleted') {
                        map.set(String(item.id), item);
                    }
                });
                // Merge cloud data, skipping deleted
                cloudData.forEach(cloudItem => {
                    if (!cloudItem || !cloudItem.id) return;
                    const strId = String(cloudItem.id);
                    if (deletedSet.has(strId) || cloudItem.status === 'deleted' || cloudItem.isDeleted) return;

                    const localItem = map.get(strId);
                    if (localItem) {
                        const mergedItem = { ...localItem, ...cloudItem };
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

            if (donRes.data) {
                // Purge cloud documents that were deleted locally
                for (const cloudDoc of donRes.data) {
                    if (cloudDoc && cloudDoc.id && deletedSet.has(String(cloudDoc.id))) {
                        await window.wizFirebase.remove('donations', String(cloudDoc.id));
                    }
                }
                smartMerge(STORAGE_KEYS.DONATIONS, donRes.data,
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }

            if (newsRes.data) {
                smartMerge(STORAGE_KEYS.NEWS, newsRes.data,
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }

            if (disbRes.data) {
                smartMerge(STORAGE_KEYS.DISBURSEMENTS, disbRes.data,
                    (a, b) => new Date(b.disbursedAt || b.createdAt) - new Date(a.disbursedAt || a.createdAt));
            }

            if (refRes.data) {
                smartMerge(STORAGE_KEYS.REFERRALS, refRes.data,
                    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            }

            if (payoutRes.data) {
                smartMerge(STORAGE_KEYS.REFERRAL_PAYOUTS, payoutRes.data,
                    (a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0));
            }

            if (actRes.data && actRes.data.length > 0) {
                const local = getStore(STORAGE_KEYS.ACTIVITY) || [];
                const map = new Map();
                local.forEach(item => { if (item && item.id) map.set(String(item.id), item); });
                actRes.data.forEach(item => { if (item && item.id) map.set(String(item.id), item); });
                const merged = Array.from(map.values())
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 100);
                setStore(STORAGE_KEYS.ACTIVITY, merged);
            }

            if (settingsRes.data && settingsRes.data.length > 0) {
                const globalSettingDoc = settingsRes.data.find(s => s.key === 'global_settings' || s.id === 'global_settings');
                if (globalSettingDoc && globalSettingDoc.value) {
                    setStore(STORAGE_KEYS.SITE_SETTINGS, globalSettingDoc.value);
                }
            }

            if (baseRes.data && baseRes.data.length > 0) {
                const baseDoc = baseRes.data.find(b => b.id === 'baselines' || b.key === 'baselines');
                if (baseDoc && baseDoc.value) {
                    setStore(STORAGE_KEYS.BASELINES, baseDoc.value);
                }
            }

            console.log('[WIZ Firebase] Cross-device Sync complete. Donations:', donRes.data?.length || 0, 'Disbursements:', disbRes.data?.length || 0);
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        } catch (e) {
            console.warn('[WIZ Firebase] Sync fallback to local storage:', e);
        }
    }

    async function fullBidirectionalSync() {
        if (!window.wizFirebase || !window.wizFirebase.isConfigured()) {
            return { success: false, message: 'Firebase belum dikonfigurasi.' };
        }

        try {
            const pushResult = await pushToCloud();
            await syncFromCloud();

            return {
                success: true,
                message: 'Sinkronisasi dua arah selesai! Data lokal dan Firebase sudah 100% identik.',
                pushDetails: pushResult.report
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
            return (getStore(STORAGE_KEYS.NEWS) || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        },

        getPublished() {
            return this.getAll().filter(n => n.status === 'published');
        },

        getDrafts() {
            return this.getAll().filter(n => n.status === 'draft');
        },

        getById(articleId) {
            return this.getAll().find(n => n.id === articleId) || null;
        },

        async add(article) {
            const list = this.getAll();
            const defaultImg = 'assets/images/sedekah-beras-dhuafa.jpg';
            const newArticle = {
                id: article.id || generateId(),
                title: article.title,
                category: article.category || 'Kegiatan & Event',
                content: article.content,
                imageUrl: article.imageUrl || defaultImg,
                gallery: Array.isArray(article.gallery) ? article.gallery : [],
                eventDate: article.eventDate || new Date().toISOString(),
                status: article.status || 'published',
                author: article.author || 'Admin',
                createdAt: new Date().toISOString()
            };
            list.unshift(newArticle);
            setStore(STORAGE_KEYS.NEWS, list);

            const statusLabel = newArticle.status === 'published' ? 'dipublikasikan' : 'disimpan sebagai draft';
            activityLog.add('news', `Berita "${newArticle.title}" ${statusLabel}.`, newArticle.author || 'Admin');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.insert('news', newArticle);
            }

            return newArticle;
        },

        async update(articleId, updates) {
            const list = this.getAll();
            const idx = list.findIndex(n => n.id === articleId);
            if (idx === -1) return null;

            list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
            setStore(STORAGE_KEYS.NEWS, list);

            activityLog.add('news', `Berita "${list[idx].title}" diperbarui.`, updates.author || 'Admin');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.set('news', articleId, list[idx]);
            }

            return list[idx];
        },

        async delete(articleId) {
            const list = this.getAll();
            const article = list.find(n => n.id === articleId);
            const filtered = list.filter(n => n.id !== articleId);
            setStore(STORAGE_KEYS.NEWS, filtered);

            if (article) {
                activityLog.add('news', `Berita "${article.title}" dihapus.`, 'Admin');
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.remove('news', articleId);
            }
        }
    };

    // ─── Disbursements (Penyaluran Dana) Module ──────────
    const disbursements = {
        getAll() {
            return (getStore(STORAGE_KEYS.DISBURSEMENTS) || []).sort((a, b) => new Date(b.disbursedAt) - new Date(a.disbursedAt));
        },

        getById(id) {
            return this.getAll().find(d => d.id === id) || null;
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

            return newDisb;
        },

        async update(id, updates) {
            const list = this.getAll();
            const idx = list.findIndex(d => d.id === id);
            if (idx === -1) return null;

            list[idx] = { ...list[idx], ...updates, amount: Number(updates.amount) || list[idx].amount, updatedAt: new Date().toISOString() };
            setStore(STORAGE_KEYS.DISBURSEMENTS, list);

            activityLog.add('disbursement', `Penyaluran dana untuk "${list[idx].program}" diperbarui.`, updates.recordedBy || 'Admin');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.set('disbursements', id, list[idx]);
            }

            return list[idx];
        },

        async delete(id) {
            const list = this.getAll();
            const item = list.find(d => d.id === id);
            const filtered = list.filter(d => d.id !== id);
            setStore(STORAGE_KEYS.DISBURSEMENTS, filtered);

            if (item) {
                activityLog.add('disbursement', `Catatan penyaluran dana "${item.program}" (${formatRupiahCompact(item.amount)}) dihapus.`, 'Admin');
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.remove('disbursements', id);
            }
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
                            specificItemsMap.set(fullName, {
                                fullName,
                                displayLabel,
                                pillarKey,
                                itemKey,
                                subPercent: item.percent || 0,
                                mainPercent: mainPct,
                                image: item.image || '',
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
            const rawList = getStore(STORAGE_KEYS.REFERRALS) || [];
            const allDonations = getStore(STORAGE_KEYS.DONATIONS) || [];
            const allPayouts = getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || [];

            return rawList.map(ref => {
                const refDonations = allDonations.filter(d => d.referralId === ref.id);
                const refPayouts = allPayouts.filter(p => p.referralId === ref.id);

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
                    donationsCount,
                    totalDonationAmount,
                    totalFee6Percent,
                    totalAdditionalBonus,
                    totalEarned,
                    totalPaid,
                    pendingBalance
                };
            }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        },

        getById(id) {
            const all = this.getAll();
            const ref = all.find(r => r.id === id);
            if (!ref) return null;

            const allDonations = (getStore(STORAGE_KEYS.DONATIONS) || []).filter(d => d.referralId === id);
            const allPayouts = (getStore(STORAGE_KEYS.REFERRAL_PAYOUTS) || []).filter(p => p.referralId === id).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));

            return {
                ...ref,
                donations: allDonations,
                payouts: allPayouts
            };
        },

        async add(data) {
            const list = getStore(STORAGE_KEYS.REFERRALS) || [];
            const newRef = {
                id: data.id || generateId(),
                name: data.name,
                phone: data.phone || '-',
                bankName: data.bankName || '-',
                accountNumber: data.accountNumber || '-',
                accountHolder: data.accountHolder || data.name,
                defaultRate: Number(data.defaultRate) || 6,
                status: data.status || 'active',
                notes: data.notes || '',
                createdAt: new Date().toISOString()
            };
            list.unshift(newRef);
            setStore(STORAGE_KEYS.REFERRALS, list);

            activityLog.add('referral', `Perantara/Referal baru "${newRef.name}" ditambahkan (Hak ${newRef.defaultRate}%).`, data.createdBy || 'Admin');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.insert('referrals', newRef);
            }
            return newRef;
        },

        async update(id, updates) {
            const list = getStore(STORAGE_KEYS.REFERRALS) || [];
            const idx = list.findIndex(r => r.id === id);
            if (idx === -1) return null;

            list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
            setStore(STORAGE_KEYS.REFERRALS, list);

            activityLog.add('referral', `Data Perantara "${list[idx].name}" diperbarui oleh Admin.`, updates.updatedBy || 'Admin');

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.set('referrals', id, list[idx]);
            }
            return list[idx];
        },

        async delete(id) {
            const list = getStore(STORAGE_KEYS.REFERRALS) || [];
            const ref = list.find(r => r.id === id);
            const filtered = list.filter(r => r.id !== id);
            setStore(STORAGE_KEYS.REFERRALS, filtered);

            if (ref) {
                activityLog.add('referral', `Perantara "${ref.name}" dihapus.`, 'Admin');
            }

            if (window.wizFirebase && window.wizFirebase.isConfigured()) {
                await window.wizFirebase.remove('referrals', id);
            }
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

    // ─── Initialize Data & Sync ───────────────────────────
    seedDefaultData();

    // Full bidirectional sync on startup:
    // 1. Push any local-only data → Firebase (so data from Edge reaches Firebase)
    // 2. Pull Firebase data → localStorage (so Chrome gets data from Firebase)
    async function initSync() {
        try {
            await syncFromCloud();   // Step 1: pull from Firebase first
            await pushToCloud();     // Step 2: push local-only data to Firebase
            await syncFromCloud();   // Step 3: pull again to catch anything missed
            console.log('[WIZ Firebase] Init sync complete.');
            // Notify any listening pages to refresh their UI
            window.dispatchEvent(new CustomEvent('wiz-sync-complete'));
        } catch(e) {
            console.warn('[WIZ Firebase] Init sync failed, using local data:', e.message);
        }
    }

    // Slight delay so Firebase client script finishes loading
    setTimeout(initSync, 800);

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
        allocationRulesManager,
        activity: activityLog,
        allocationRules: ALLOCATION_RULES,
        validateAllocationRule,
        calcInfakUmumAllocation,
        calcInfakTerikatAllocation,
        syncFromCloud,
        pushToCloud,
        fullBidirectionalSync,
        utils: { formatRupiahCompact, formatDate, formatDateTime, timeAgo, generateId, mapProgramToPillar }
    };

    console.log('[WIZ Store] Initialized with Firebase sync. Collections ready.');
})();
