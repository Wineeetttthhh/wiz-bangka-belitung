/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Admin Store — Dual-layer Data Manager (Supabase + localStorage)
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
        ADMIN_USERS: 'wiz_admin_users',
        ALLOCATION_RULES: 'wiz_allocation_rules',
        INITIALIZED: 'wiz_store_initialized'
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

    // ─── Helpers ───────────────────────────────────────────
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }

    function getStore(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || null;
        } catch { return null; }
    }

    function setStore(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
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
            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.upsert('site_images', { key, url, label: label || key, updated_at: new Date().toISOString() });
            }
            return current;
        },
        async updateAll(imagesObj) {
            const current = { ...this.getAll(), ...imagesObj };
            setStore(STORAGE_KEYS.SITE_IMAGES, current);
            if (typeof activityLog !== 'undefined' && activityLog.add) {
                activityLog.add('settings', 'Beberapa foto website diperbarui oleh Admin', sessionStorage.getItem('wiz_admin_user') || 'Admin');
            }
            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                for (const [key, url] of Object.entries(imagesObj)) {
                    await window.wizSupabase.upsert('site_images', { key, url, label: key, updated_at: new Date().toISOString() });
                }
            }
            return current;
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.insert('admin_users', {
                    username: newUser.username,
                    password: newUser.password,
                    full_name: newUser.fullName,
                    phone: newUser.phone,
                    role: newUser.role,
                    status: 'pending',
                    created_at: newUser.createdAt
                });
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.update('admin_users', { status: 'approved', verified_at: new Date().toISOString(), verified_by: adminActor || 'Admin 1' }, { id });
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.update('admin_users', { status: 'rejected' }, { id });
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.delete('admin_users', { id });
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.upsert('allocation_rules', { wilayah, data, updated_at: new Date().toISOString() });
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
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }

    // ─── Cloud Sync Helper ────────────────────────────────
    async function pushToCloud() {
        if (!window.wizSupabase || !window.wizSupabase.isConfigured()) {
            return { status: 'error', message: 'Supabase belum dikonfigurasi' };
        }

        const report = { donationsPushed: 0, newsPushed: 0, disbursementsPushed: 0, errors: [] };

        try {
            // 1. Donasi Lokal -> Cloud
            const localDonations = getStore(STORAGE_KEYS.DONATIONS) || [];
            const cloudDonRes = await window.wizSupabase.select('donations');
            const cloudDonIds = new Set((cloudDonRes.data || []).map(d => String(d.id)));

            for (const d of localDonations) {
                if (!cloudDonIds.has(String(d.id))) {
                    const res = await window.wizSupabase.insert('donations', {
                        donor_name: d.donorName || 'Hamba Allah',
                        donor_phone: d.donorPhone || '',
                        donor_email: d.donorEmail || '',
                        wilayah: d.wilayah || 'Pangkalpinang',
                        donation_type: d.type || 'Infak Terikat',
                        program_utama: d.programUtama || mapProgramToPillar(d.program),
                        program_spesifik: d.programSpesifik || d.program || '-',
                        program: d.program || '-',
                        category: d.category || '-',
                        amount: Number(d.amount) || 0,
                        alokasi_operasional: Number(d.alokasiOperasional) || 0,
                        alokasi_program: Number(d.alokasiProgram) || 0,
                        payment_method: d.method || 'Bank Transfer',
                        notes: d.notes || '',
                        status: d.status || 'pending',
                        verified_at: d.verifiedAt || null,
                        verified_by: d.verifiedBy || null,
                        rejected_at: d.rejectedAt || null,
                        rejected_by: d.rejectedBy || null,
                        created_at: d.createdAt || new Date().toISOString()
                    });
                    if (!res.error) report.donationsPushed++;
                }
            }

            // 2. News Lokal -> Cloud
            const localNews = getStore(STORAGE_KEYS.NEWS) || [];
            const cloudNewsRes = await window.wizSupabase.select('news');
            const cloudNewsTitles = new Set((cloudNewsRes.data || []).map(n => n.title));

            for (const n of localNews) {
                if (!cloudNewsTitles.has(n.title)) {
                    const res = await window.wizSupabase.insert('news', {
                        title: n.title,
                        category: n.category || 'Kegiatan & Event',
                        content: n.content || '',
                        image_url: n.imageUrl || '',
                        gallery: n.gallery || [],
                        event_date: n.eventDate || n.createdAt || new Date().toISOString(),
                        status: n.status || 'published',
                        author: n.author || 'Admin',
                        created_at: n.createdAt || new Date().toISOString()
                    });
                    if (!res.error) report.newsPushed++;
                }
            }

            // 3. Disbursements Lokal -> Cloud
            const localDisb = getStore(STORAGE_KEYS.DISBURSEMENTS) || [];
            const cloudDisbRes = await window.wizSupabase.select('disbursements');
            const cloudDisbIds = new Set((cloudDisbRes.data || []).map(db => String(db.id)));

            for (const db of localDisb) {
                if (!cloudDisbIds.has(String(db.id))) {
                    const res = await window.wizSupabase.insert('disbursements', {
                        program: db.program,
                        amount: Number(db.amount) || 0,
                        description: db.description || '',
                        disbursed_at: db.disbursedAt || db.createdAt || new Date().toISOString(),
                        recorded_by: db.recordedBy || 'Admin'
                    });
                    if (!res.error) report.disbursementsPushed++;
                }
            }

            return { status: 'success', report };
        } catch (e) {
            console.error('[WIZ Store] Push to cloud error:', e);
            return { status: 'error', message: e.message };
        }
    }

    async function syncFromCloud() {
        if (!window.wizSupabase || !window.wizSupabase.isConfigured()) return;

        try {
            const [donRes, newsRes, disbRes, actRes] = await Promise.all([
                window.wizSupabase.select('donations', { order: 'created_at.desc' }),
                window.wizSupabase.select('news', { order: 'created_at.desc' }),
                window.wizSupabase.select('disbursements', { order: 'disbursed_at.desc' }),
                window.wizSupabase.select('activity_log', { order: 'created_at.desc', limit: 50 })
            ]);

            if (donRes.data && donRes.data.length > 0) {
                const cloudMapped = donRes.data.map(d => ({
                    id: String(d.id),
                    donorName: d.donor_name,
                    donorPhone: d.donor_phone,
                    donorEmail: d.donor_email,
                    wilayah: d.wilayah || 'Pangkalpinang',
                    programUtama: d.program_utama || mapProgramToPillar(d.program || d.program_spesifik),
                    programSpesifik: d.program_spesifik || d.program || '-',
                    alokasiOperasional: Number(d.alokasi_operasional) || 0,
                    alokasiProgram: Number(d.alokasi_program) || 0,
                    program: d.program || d.program_spesifik || '-',
                    category: d.category || '-',
                    type: d.donation_type,
                    amount: Number(d.amount),
                    method: d.payment_method,
                    notes: d.notes,
                    status: d.status,
                    createdAt: d.created_at,
                    verifiedAt: d.verified_at,
                    verifiedBy: d.verified_by,
                    rejectedAt: d.rejected_at,
                    rejectedBy: d.rejected_by
                }));

                // Smart merge local with cloud
                const local = getStore(STORAGE_KEYS.DONATIONS) || [];
                const mergedMap = new Map();
                local.forEach(item => mergedMap.set(String(item.id), item));
                cloudMapped.forEach(item => mergedMap.set(String(item.id), item));

                const mergedList = Array.from(mergedMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setStore(STORAGE_KEYS.DONATIONS, mergedList);
            }

            if (newsRes.data && newsRes.data.length > 0) {
                const cloudMapped = newsRes.data.map(n => ({
                    id: String(n.id),
                    title: n.title,
                    category: n.category === 'Penyaluran Dana' ? 'Kegiatan & Event' : (n.category || 'Kegiatan & Event'),
                    content: n.content,
                    imageUrl: n.image_url || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=800&auto=format&fit=crop',
                    gallery: Array.isArray(n.gallery) ? n.gallery : (typeof n.gallery === 'string' ? JSON.parse(n.gallery) : []),
                    eventDate: n.event_date || n.created_at,
                    status: n.status,
                    author: n.author,
                    createdAt: n.created_at,
                    updatedAt: n.updated_at
                }));

                const local = getStore(STORAGE_KEYS.NEWS) || [];
                const mergedMap = new Map();
                local.forEach(item => mergedMap.set(String(item.id), item));
                cloudMapped.forEach(item => mergedMap.set(String(item.id), item));

                setStore(STORAGE_KEYS.NEWS, Array.from(mergedMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            }

            if (disbRes.data && disbRes.data.length > 0) {
                const cloudMapped = disbRes.data.map(db => ({
                    id: String(db.id),
                    program: db.program,
                    amount: Number(db.amount),
                    description: db.description,
                    disbursedAt: db.disbursed_at,
                    recordedBy: db.recorded_by,
                    createdAt: db.created_at
                }));

                const local = getStore(STORAGE_KEYS.DISBURSEMENTS) || [];
                const mergedMap = new Map();
                local.forEach(item => mergedMap.set(String(item.id), item));
                cloudMapped.forEach(item => mergedMap.set(String(item.id), item));

                setStore(STORAGE_KEYS.DISBURSEMENTS, Array.from(mergedMap.values()).sort((a, b) => new Date(b.disbursedAt || b.createdAt) - new Date(a.disbursedAt || a.createdAt)));
            }

            if (actRes.data && actRes.data.length > 0) {
                const cloudMapped = actRes.data.map(a => ({
                    id: String(a.id),
                    type: a.type,
                    message: a.message,
                    actor: a.actor,
                    createdAt: a.created_at
                }));

                const local = getStore(STORAGE_KEYS.ACTIVITY) || [];
                const mergedMap = new Map();
                local.forEach(item => mergedMap.set(String(item.id), item));
                cloudMapped.forEach(item => mergedMap.set(String(item.id), item));

                setStore(STORAGE_KEYS.ACTIVITY, Array.from(mergedMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 100));
            }
        } catch (e) {
            console.warn('[WIZ Store] Supabase sync fallback to local storage:', e);
        }
    }

    async function fullBidirectionalSync() {
        if (!window.wizSupabase || !window.wizSupabase.isConfigured()) {
            return { success: false, message: 'Supabase API key/URL belum dikonfigurasi.' };
        }

        try {
            const pushResult = await pushToCloud();
            await syncFromCloud();

            return {
                success: true,
                message: 'Sinkronisasi dua arah selesai! Data lokal dan cloud Supabase sudah 100% identik.',
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
            return (getStore(STORAGE_KEYS.DONATIONS) || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        },

        getPending() {
            return this.getAll().filter(d => d.status === 'pending');
        },

        getVerified() {
            return this.getAll().filter(d => d.status === 'verified');
        },

        getById(id) {
            return this.getAll().find(d => d.id === id) || null;
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
                // Legacy (agar kompatibel dengan render yang sudah ada)
                program: programSpesifik,
                category: programUtama,
                type: donation.type || 'Infak Terikat',
                amount: Number(donation.amount) || 0,
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.insert('donations', {
                    donor_name: newDonation.donorName,
                    donor_phone: newDonation.donorPhone,
                    donor_email: newDonation.donorEmail,
                    wilayah: newDonation.wilayah,
                    program_utama: newDonation.programUtama,
                    program_spesifik: newDonation.programSpesifik,
                    alokasi_operasional: newDonation.alokasiOperasional,
                    alokasi_program: newDonation.alokasiProgram,
                    program: newDonation.program,
                    category: newDonation.category,
                    donation_type: newDonation.type,
                    amount: newDonation.amount,
                    payment_method: newDonation.method,
                    notes: newDonation.notes,
                    status: newDonation.status,
                    verified_at: newDonation.verifiedAt,
                    verified_by: newDonation.verifiedBy
                });
            }

            return newDonation;
        },

        async update(id, updates) {
            const list = this.getAll();
            const idx = list.findIndex(d => d.id === id);
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

            list[idx] = {
                ...list[idx],
                ...updates,
                wilayah: updates.wilayah || list[idx].wilayah,
                programUtama,
                programSpesifik,
                alokasiOperasional,
                alokasiProgram,
                program: programSpesifik,
                category: programUtama,
                amount: newAmount
            };
            setStore(STORAGE_KEYS.DONATIONS, list);

            activityLog.add('donation_edit', `Data donasi ${list[idx].donorName} (${formatRupiahCompact(list[idx].amount)}) diperbarui.`, 'Admin');

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.update('donations', id, {
                    donor_name: list[idx].donorName,
                    donor_phone: list[idx].donorPhone,
                    wilayah: list[idx].wilayah,
                    program_utama: list[idx].programUtama,
                    program_spesifik: list[idx].programSpesifik,
                    alokasi_operasional: list[idx].alokasiOperasional,
                    alokasi_program: list[idx].alokasiProgram,
                    program: list[idx].program,
                    category: list[idx].category,
                    donation_type: list[idx].type,
                    amount: list[idx].amount,
                    payment_method: list[idx].method,
                    notes: list[idx].notes,
                    status: list[idx].status
                });
            }

            return list[idx];
        },

        async verify(donationId, adminName) {
            const list = this.getAll();
            const idx = list.findIndex(d => d.id === donationId);
            if (idx === -1) return null;

            list[idx].status = 'verified';
            list[idx].verifiedAt = new Date().toISOString();
            list[idx].verifiedBy = adminName || 'Admin';
            setStore(STORAGE_KEYS.DONATIONS, list);

            activityLog.add('verification', `Donasi ${formatRupiahCompact(list[idx].amount)} dari ${list[idx].donorName} berhasil diverifikasi.`, adminName || 'Admin');

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.update('donations', donationId, {
                    status: 'verified',
                    verified_at: list[idx].verifiedAt,
                    verified_by: list[idx].verifiedBy
                });
            }

            return list[idx];
        },

        async reject(donationId, adminName) {
            const list = this.getAll();
            const idx = list.findIndex(d => d.id === donationId);
            if (idx === -1) return null;

            list[idx].status = 'rejected';
            list[idx].rejectedAt = new Date().toISOString();
            list[idx].rejectedBy = adminName || 'Admin';
            setStore(STORAGE_KEYS.DONATIONS, list);

            activityLog.add('rejection', `Donasi ${formatRupiahCompact(list[idx].amount)} dari ${list[idx].donorName} ditolak.`, adminName || 'Admin');

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.update('donations', donationId, {
                    status: 'rejected',
                    rejected_at: list[idx].rejectedAt,
                    rejected_by: list[idx].rejectedBy
                });
            }

            return list[idx];
        },

        async delete(donationId) {
            const list = this.getAll();
            const item = list.find(d => d.id === donationId);
            const filtered = list.filter(d => d.id !== donationId);
            setStore(STORAGE_KEYS.DONATIONS, filtered);

            if (item) {
                activityLog.add('donation_delete', `Data donasi ${item.donorName} (${formatRupiahCompact(item.amount)}) dihapus.`, 'Admin');
            }

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.remove('donations', donationId);
            }
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.insert('news', {
                    title: newArticle.title,
                    category: newArticle.category,
                    content: newArticle.content,
                    image_url: newArticle.imageUrl,
                    gallery: newArticle.gallery,
                    event_date: newArticle.eventDate,
                    status: newArticle.status,
                    author: newArticle.author
                });
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.update('news', articleId, {
                    title: list[idx].title,
                    category: list[idx].category,
                    content: list[idx].content,
                    image_url: list[idx].imageUrl,
                    gallery: list[idx].gallery,
                    event_date: list[idx].eventDate,
                    status: list[idx].status,
                    author: list[idx].author,
                    updated_at: list[idx].updatedAt
                });
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.remove('news', articleId);
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
                program: data.program,
                amount: Number(data.amount) || 0,
                description: data.description || '',
                disbursedAt: data.disbursedAt || new Date().toISOString(),
                recordedBy: data.recordedBy || 'Admin',
                createdAt: new Date().toISOString()
            };
            list.unshift(newDisb);
            setStore(STORAGE_KEYS.DISBURSEMENTS, list);

            activityLog.add('disbursement', `Penyaluran dana ${formatRupiahCompact(newDisb.amount)} untuk "${newDisb.program}" dicatat.`, newDisb.recordedBy);

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.insert('disbursements', {
                    program: newDisb.program,
                    amount: newDisb.amount,
                    description: newDisb.description,
                    disbursed_at: newDisb.disbursedAt,
                    recorded_by: newDisb.recordedBy
                });
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.update('disbursements', id, {
                    program: list[idx].program,
                    amount: list[idx].amount,
                    description: list[idx].description,
                    disbursed_at: list[idx].disbursedAt,
                    recorded_by: list[idx].recordedBy,
                    updated_at: list[idx].updatedAt
                });
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.remove('disbursements', id);
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
            const list = disbursements.getAll();
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
                'Berkah Hidayah': { label: 'WIZ Berkah Hidayah (Dakwah & Pembinaan)', target: 600000000, baseMasuk: 0, baseSalur: 0 },
                'Berkah Peduli': { label: 'WIZ Berkah Peduli (Sosial & Kemanusiaan)', target: 500000000, baseMasuk: 0, baseSalur: 0 },
                'Berkah Juara': { label: 'WIZ Berkah Juara (Pendidikan & Beasiswa)', target: 350000000, baseMasuk: 0, baseSalur: 0 },
                'Berkah Sehat': { label: 'WIZ Berkah Sehat (Kesehatan & Ambulance)', target: 300000000, baseMasuk: 0, baseSalur: 0 },
                'Berkah Mandiri': { label: 'WIZ Berkah Mandiri (Ekonomi & Pemberdayaan)', target: 200000000, baseMasuk: 0, baseSalur: 0 },
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

            if (window.wizSupabase && window.wizSupabase.isConfigured()) {
                await window.wizSupabase.insert('activity_log', {
                    type: newItem.type,
                    message: newItem.message,
                    actor: newItem.actor
                });
            }
        }
    };

    // ─── Initialize Data & Sync ───────────────────────────
    seedDefaultData();
    syncFromCloud();

    // ─── Public API ───────────────────────────────────────
    window.wizStore = {
        donations,
        finance,
        news,
        disbursements,
        baselines,
        siteImages,
        adminUsers,
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

})();
