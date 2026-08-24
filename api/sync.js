/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Vercel Serverless Sync Engine — /api/sync
 * ============================================================
 * PRIMARY DATABASE: Supabase PostgreSQL (REST API)
 * Fallback: canonical-store.json
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// Supabase Configuration
const SUPABASE_URL = 'https://ffiltrlzdbwhhhxzmzuo.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_GiA1BOjbW2psTU36149xuA_E26wGBI3';

const supabaseHeaders = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
};

// In-memory cache for fast warm lambda hits
let memCache = null;
let memCacheTime = 0;
const MEM_CACHE_TTL_MS = 1000; // 1s

function invalidateCache() {
    memCache = null;
    memCacheTime = 0;
}

// Default Quotes
const DEFAULT_QUOTES = [
    {
        id: 'quote-1',
        text: 'Sedekah itu tidak akan mengurangi harta. Tidak ada orang yang memberi maaf kepada orang lain melainkan Allah akan menambah kemuliaannya.',
        source: 'HR. Muslim no. 2588',
        category: 'Sedekah & Keberkahan',
        imageUrl: 'assets/images/foto-utama-wiz.jpg',
        date: '2026-08-20',
        status: 'active'
    },
    {
        id: 'quote-2',
        text: 'Tidak ada suatu hari pun ketika seorang hamba memasuki waktu pagi melainkan turun dua malaikat. Salah satunya berdoa: Ya Allah, berikanlah ganti bagi orang yang berinfak.',
        source: 'HR. Bukhari no. 1442 & Muslim no. 1010',
        category: 'Infak Subuh',
        imageUrl: 'assets/images/sedekah-beras-dhuafa.jpg',
        date: '2026-08-19',
        status: 'active'
    },
    {
        id: 'quote-3',
        text: 'Bentengilah hartamu dengan zakat, obatilah orang-orang sakit di antaramu dengan sedekah, dan hadapilah berbagai cobaan dengan doa.',
        source: 'HR. Abu Dawud & At-Thabrani',
        category: 'Zakat & Penyucian Jiwa',
        imageUrl: 'assets/images/sedekah-beras-dai.jpg',
        date: '2026-08-18',
        status: 'active'
    }
];

function mapProgramToPillar(progName, catName) {
    if (catName && catName !== '-' && catName.includes('Berkah')) return catName;
    const p = (progName || '').toLowerCase();
    if (p.includes('markaz') || p.includes('tahfidz') || p.includes('dirosa') || p.includes('dakwah') || p.includes('dai') || p.includes('celengan') || p.includes('jenazah') || p.includes('poster') || p.includes('kantor') || p.includes('muker') || p.includes('kendaraan') || p.includes('mualaf') || p.includes('tabligh') || p.includes('public speaking')) return 'Berkah Hidayah';
    if (p.includes('juara') || p.includes('beasiswa') || p.includes('sekolah') || p.includes('belajar') || p.includes('pendidikan') || p.includes('stiba') || p.includes('unmuh')) return 'Berkah Juara';
    if (p.includes('sehat') || p.includes('pengobatan') || p.includes('khitan') || p.includes('ambulance') || p.includes('ambulans') || p.includes('kesehatan') || p.includes('jantung') || p.includes('pasien')) return 'Berkah Sehat';
    if (p.includes('peduli') || p.includes('beras') || p.includes('sembako') || p.includes('yatim') || p.includes('iftar') || p.includes('ifthar') || p.includes('air') || p.includes('bencana') || p.includes('ntt') || p.includes('palestina') || p.includes('dhuafa') || p.includes('fitrah')) return 'Berkah Peduli';
    if (p.includes('mandiri') || p.includes('modal') || p.includes('umkm') || p.includes('gerobak') || p.includes('usaha') || p.includes('wirausaha') || p.includes('pelatihan')) return 'Berkah Mandiri';
    return 'Berkah Hidayah';
}

async function supabaseGetMaster() {
    try {
        const fetchOpts = {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Accept': 'application/json'
            }
        };

        const [settingsRes, donRes, newsRes, disbRes, refRes] = await Promise.allSettled([
            fetch(`${SUPABASE_URL}/site_settings?select=*`, fetchOpts).then(r => r.ok ? r.json() : null),
            fetch(`${SUPABASE_URL}/donations?select=*`, fetchOpts).then(r => r.ok ? r.json() : null),
            fetch(`${SUPABASE_URL}/news?select=*`, fetchOpts).then(r => r.ok ? r.json() : null),
            fetch(`${SUPABASE_URL}/disbursements?select=*`, fetchOpts).then(r => r.ok ? r.json() : null),
            fetch(`${SUPABASE_URL}/referrals?select=*`, fetchOpts).then(r => r.ok ? r.json() : null)
        ]);

        const list = (settingsRes.status === 'fulfilled' && Array.isArray(settingsRes.value)) ? settingsRes.value : [];
        const masterDoc = list.find(d => d.key === 'master_bundle');
        const siteImagesDoc = list.find(d => d.key === 'site_images');
        const specificProgDoc = list.find(d => d.key === 'specific_prog_imgs');
        const siteSettingsDoc = list.find(d => d.key === 'site_settings');
        const quotesDoc = list.find(d => d.key === 'quotes');

        let master = (masterDoc && masterDoc.value && typeof masterDoc.value === 'object') ? masterDoc.value : loadCanonicalSeed();

        if (siteImagesDoc && siteImagesDoc.value && typeof siteImagesDoc.value === 'object') {
            master.site_images = { ...(master.site_images || {}), ...siteImagesDoc.value };
        }
        if (specificProgDoc && specificProgDoc.value && typeof specificProgDoc.value === 'object') {
            master.specific_prog_imgs = { ...(master.specific_prog_imgs || {}), ...specificProgDoc.value };
        }
        if (siteSettingsDoc && siteSettingsDoc.value && typeof siteSettingsDoc.value === 'object') {
            master.site_settings = { ...(master.site_settings || {}), ...siteSettingsDoc.value };
        }
        if (quotesDoc && quotesDoc.value && Array.isArray(quotesDoc.value) && quotesDoc.value.length > 0) {
            master.quotes = quotesDoc.value;
        } else if (!master.quotes || !Array.isArray(master.quotes) || master.quotes.length === 0) {
            master.quotes = DEFAULT_QUOTES;
        }

        // Direct table donations mapping
        if (donRes.status === 'fulfilled' && Array.isArray(donRes.value) && donRes.value.length > 0) {
            master.donations = donRes.value.map(d => {
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

        // Direct table news mapping
        if (newsRes.status === 'fulfilled' && Array.isArray(newsRes.value) && newsRes.value.length > 0) {
            master.news = newsRes.value.map(n => ({
                id: n.id,
                title: n.title,
                category: n.category,
                content: n.content,
                imageUrl: n.image_url || n.imageUrl || '',
                image_url: n.image_url || n.imageUrl || '',
                gallery: Array.isArray(n.gallery) ? n.gallery : [],
                eventDate: n.event_date || n.eventDate || n.created_at || new Date().toISOString(),
                status: n.status || 'published',
                author: n.author || 'Admin WIZ Babel',
                createdAt: n.created_at || new Date().toISOString(),
                updatedAt: n.updated_at || new Date().toISOString()
            }));
        }

        // Direct table disbursements mapping
        if (disbRes.status === 'fulfilled' && Array.isArray(disbRes.value) && disbRes.value.length > 0) {
            master.disbursements = disbRes.value.map(d => ({
                id: d.id,
                wilayah: d.wilayah || 'Pangkalpinang',
                program: d.program,
                amount: Number(d.amount) || 0,
                description: d.description,
                disbursedAt: d.disbursed_at || d.created_at,
                recordedBy: d.recorded_by || 'Admin',
                createdAt: d.created_at
            }));
        }

        // Direct table referrals mapping
        if (refRes.status === 'fulfilled' && Array.isArray(refRes.value) && refRes.value.length > 0) {
            master.referrals = refRes.value.map(r => ({
                id: r.id,
                code: r.code || r.id,
                name: r.name,
                phone: r.phone,
                bankName: r.bank_name,
                accountNumber: r.account_number,
                accountHolder: r.account_holder,
                defaultRate: Number(r.default_rate) || 6,
                status: r.status || 'active',
                notes: r.notes || '',
                createdAt: r.created_at,
                updatedAt: r.updated_at
            }));
        }

        return master;
    } catch(e) {
        console.warn('[Sync API] Supabase GET error:', e.message);
        return null;
    }
}

async function supabaseSaveMaster(data) {
    try {
        const res = await fetch(`${SUPABASE_URL}/site_settings`, {
            method: 'POST',
            headers: supabaseHeaders,
            body: JSON.stringify({
                key: 'master_bundle',
                value: data,
                updated_at: new Date().toISOString()
            })
        });
        return res.ok;
    } catch(e) {
        console.warn('[Sync API] Supabase POST error:', e.message);
        return false;
    }
}

// Canonical seed fallback
function loadCanonicalSeed() {
    try {
        const filePath = path.join(process.cwd(), 'assets', 'data', 'canonical-store.json');
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (e) {
        console.warn('[Sync API] Could not load canonical-store.json:', e.message);
    }
    return {
        updatedAt: new Date().toISOString(),
        version: '2.0.0',
        donations: [], news: [], disbursements: [], activity: [],
        baselines: { baseMasuk: 0, baseTersalurkan: 0, baseDonatur: 0 },
        site_settings: {}, site_images: {},
        admin_users: [], referrals: [], referral_payouts: [],
        deleted_ids: [], deleted_news_ids: [], deleted_disb_ids: [], deleted_ref_ids: []
    };
}

function mergeArrays(existingArr = [], incomingArr = [], deletedIds = []) {
    const deletedSet = new Set((deletedIds || []).map(String));
    const map = new Map();
    (existingArr || []).forEach(item => {
        if (!item) return;
        const itemId = String(item.id || item.code || '');
        if (itemId && !deletedSet.has(itemId) && item.status !== 'deleted' && !item.isDeleted) {
            item.id = item.id || itemId;
            map.set(itemId, item);
        }
    });
    (incomingArr || []).forEach(item => {
        if (!item) return;
        const itemId = String(item.id || item.code || (item.name ? `${item.name}-${item.phone || ''}` : ''));
        if (!itemId || deletedSet.has(itemId) || item.status === 'deleted' || item.isDeleted) return;
        item.id = item.id || itemId;
        if (!map.has(itemId)) {
            map.set(itemId, item);
        } else {
            const existing = map.get(itemId);
            const tExisting = new Date(existing.updatedAt || existing.verifiedAt || existing.createdAt || 0).getTime();
            const tIncoming = new Date(item.updatedAt || item.verifiedAt || item.createdAt || 0).getTime();
            let merged;
            if (tIncoming >= tExisting) {
                merged = { ...existing, ...item };
            } else {
                merged = { ...item, ...existing };
            }
            if (existing.status === 'approved' || item.status === 'approved') {
                merged.status = 'approved';
                merged.verifiedAt = existing.verifiedAt || item.verifiedAt || new Date().toISOString();
                merged.verifiedBy = existing.verifiedBy || item.verifiedBy || 'Admin 1';
            }
            map.set(itemId, merged);
        }
    });
    return Array.from(map.values());
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        try {
            // Check in-memory cache
            if (memCache && (Date.now() - memCacheTime < MEM_CACHE_TTL_MS)) {
                return res.status(200).json({
                    status: 'success',
                    source: 'memory_cache',
                    data: memCache
                });
            }

            // 1. Fetch from Supabase
            let masterData = await supabaseGetMaster();

            // 2. Fallback to canonical-store.json only if completely uninitialized
            if (!masterData) {
                masterData = loadCanonicalSeed();
            }

            memCache = masterData;
            memCacheTime = Date.now();

            return res.status(200).json({
                status: 'success',
                source: 'supabase_cloud',
                data: masterData
            });
        } catch (err) {
            console.error('[Sync API GET Error]', err);
            const fallback = loadCanonicalSeed();
            return res.status(200).json({ status: 'success', source: 'fallback', data: fallback });
        }
    }

    if (req.method === 'POST') {
        try {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch(e) { body = {}; }
            }
            const bundleData = (body && typeof body.bundle === 'object') ? body.bundle : {};
            const incoming = { ...bundleData, ...body };

            // Load existing state from Supabase
            let master = await supabaseGetMaster();
            if (!master) master = loadCanonicalSeed();

            // ─── HIGH-SPEED TARGETED MICRO-ACTIONS (<100ms) ─────────
            if (body && body.action === 'register_admin_user' && body.user) {
                const incomingUser = body.user;
                if (!master.admin_users) master.admin_users = [];
                if (!master.deleted_admin_ids) master.deleted_admin_ids = [];
                const cleanUser = (incomingUser.username || '').toLowerCase().trim();
                master.deleted_admin_ids = master.deleted_admin_ids.filter(id => String(id) !== String(incomingUser.id) && String(id).toLowerCase() !== cleanUser);
                const existingIdx = master.admin_users.findIndex(u => (u.username && u.username.toLowerCase() === cleanUser) || String(u.id) === String(incomingUser.id));
                if (existingIdx !== -1) {
                    master.admin_users[existingIdx] = {
                        ...master.admin_users[existingIdx],
                        ...incomingUser,
                        updatedAt: new Date().toISOString()
                    };
                } else {
                    master.admin_users.push({ ...incomingUser, updatedAt: new Date().toISOString() });
                }
                master.updatedAt = new Date().toISOString();
                memCache = master;
                memCacheTime = Date.now();
                await supabaseSaveMaster(master);
                return res.status(200).json({ status: 'success', action: 'register_admin_user', user: incomingUser });
            }

            if (body && body.action === 'approve_admin_user' && body.id) {
                const targetId = String(body.id);
                if (!master.admin_users) master.admin_users = [];
                const idx = master.admin_users.findIndex(u => String(u.id) === targetId || (u.username && u.username.toLowerCase() === targetId.toLowerCase()));
                if (idx !== -1) {
                    master.admin_users[idx].status = 'approved';
                    master.admin_users[idx].verifiedAt = new Date().toISOString();
                    master.admin_users[idx].verifiedBy = body.verifiedBy || 'Admin 1';
                    master.admin_users[idx].updatedAt = new Date().toISOString();
                }
                master.updatedAt = new Date().toISOString();
                memCache = master;
                memCacheTime = Date.now();
                await supabaseSaveMaster(master);
                return res.status(200).json({ status: 'success', action: 'approve_admin_user', user: idx !== -1 ? master.admin_users[idx] : null });
            }

            if (body && body.action === 'update_admin_user' && body.user) {
                const incomingUser = body.user;
                if (!master.admin_users) master.admin_users = [];
                const cleanUser = (incomingUser.username || '').toLowerCase().trim();
                const idx = master.admin_users.findIndex(u => String(u.id) === String(incomingUser.id) || (u.username && u.username.toLowerCase() === cleanUser));
                if (idx !== -1) {
                    master.admin_users[idx] = {
                        ...master.admin_users[idx],
                        ...incomingUser,
                        updatedAt: new Date().toISOString()
                    };
                } else {
                    master.admin_users.push({ ...incomingUser, updatedAt: new Date().toISOString() });
                }
                master.updatedAt = new Date().toISOString();
                memCache = master;
                memCacheTime = Date.now();
                await supabaseSaveMaster(master);
                return res.status(200).json({ status: 'success', action: 'update_admin_user', user: incomingUser });
            }

            if (body && body.action === 'delete_admin_user' && body.id) {
                const targetId = String(body.id);
                if (!master.admin_users) master.admin_users = [];
                if (!master.deleted_admin_ids) master.deleted_admin_ids = [];
                const targetUser = master.admin_users.find(u => String(u.id) === targetId || (u.username && u.username.toLowerCase() === targetId.toLowerCase()));
                master.admin_users = master.admin_users.filter(u => String(u.id) !== targetId && (u.username || '').toLowerCase() !== targetId.toLowerCase() && u.username !== 'admin');
                master.deleted_admin_ids = Array.from(new Set([...master.deleted_admin_ids, targetId]));
                if (targetUser && targetUser.username) {
                    master.deleted_admin_ids = Array.from(new Set([...master.deleted_admin_ids, targetUser.username.toLowerCase()]));
                }
                master.updatedAt = new Date().toISOString();
                memCache = master;
                memCacheTime = Date.now();
                await supabaseSaveMaster(master);
                return res.status(200).json({ status: 'success', action: 'delete_admin_user', id: targetId });
            }

            const deletedDonationIds = [
                ...(Array.isArray(incoming.deleted_ids) ? incoming.deleted_ids : []),
                ...(Array.isArray(incoming.deleted_donation_ids) ? incoming.deleted_donation_ids : [])
            ];
            const deletedIds = Array.from(new Set(deletedDonationIds));
            const deletedNewsIds = Array.isArray(incoming.deleted_news_ids) ? incoming.deleted_news_ids : [];
            const deletedDisbIds = Array.isArray(incoming.deleted_disb_ids) ? incoming.deleted_disb_ids : [];
            const deletedRefIds = Array.isArray(incoming.deleted_ref_ids) ? incoming.deleted_ref_ids : [];
            const deletedQuoteIds = Array.isArray(incoming.deleted_quote_ids) ? incoming.deleted_quote_ids : [];
            const deletedProgramIds = Array.isArray(incoming.deleted_program_ids) ? incoming.deleted_program_ids : [];
            const deletedAdminIds = Array.from(new Set([
                ...(Array.isArray(incoming.deleted_admin_ids) ? incoming.deleted_admin_ids : []),
                ...(Array.isArray(incoming.deletedAdminIds) ? incoming.deletedAdminIds : [])
            ]));

            if (deletedIds.length > 0 && Array.isArray(master.donations)) {
                master.donations = master.donations.filter(d => d && d.id && !deletedIds.includes(String(d.id)));
            }
            if (deletedQuoteIds.length > 0 && Array.isArray(master.quotes)) {
                master.quotes = master.quotes.filter(q => q && q.id && !deletedQuoteIds.includes(String(q.id)));
            }
            if (deletedNewsIds.length > 0 && Array.isArray(master.news)) {
                master.news = master.news.filter(n => n && n.id && !deletedNewsIds.includes(String(n.id)));
            }
            if (deletedProgramIds.length > 0 && Array.isArray(master.programs)) {
                master.programs = master.programs.filter(p => p && p.id && !deletedProgramIds.includes(String(p.id)));
            }
            if (deletedDisbIds.length > 0 && Array.isArray(master.disbursements)) {
                master.disbursements = master.disbursements.filter(d => d && d.id && !deletedDisbIds.includes(String(d.id)));
            }
            if (deletedRefIds.length > 0 && Array.isArray(master.referrals)) {
                master.referrals = master.referrals.filter(r => r && (r.id || r.code) && !deletedRefIds.includes(String(r.id || r.code)));
            }

            if (Array.isArray(incoming.donations)) {
                master.donations = mergeArrays(master.donations, incoming.donations, deletedIds);
            }

            if (Array.isArray(incoming.news)) {
                master.news = mergeArrays(master.news, incoming.news, deletedNewsIds);
            }

            if (Array.isArray(incoming.programs)) {
                master.programs = mergeArrays(master.programs, incoming.programs, deletedProgramIds);
            }

            if (Array.isArray(incoming.disbursements)) {
                master.disbursements = mergeArrays(master.disbursements, incoming.disbursements, deletedDisbIds);
            }
            if (Array.isArray(incoming.referrals)) {
                master.referrals = mergeArrays(master.referrals, incoming.referrals, deletedRefIds);
            }
            if (Array.isArray(incoming.referral_payouts)) {
                master.referral_payouts = mergeArrays(master.referral_payouts, incoming.referral_payouts, []);
            }
            if (Array.isArray(incoming.quotes)) {
                master.quotes = mergeArrays(master.quotes, incoming.quotes, deletedQuoteIds);
            }
            if (Array.isArray(incoming.activity)) {
                master.activity = mergeArrays(master.activity, incoming.activity, []);
            }

            if (deletedAdminIds.length > 0 && Array.isArray(master.admin_users)) {
                master.admin_users = master.admin_users.filter(u => u && u.id && !deletedAdminIds.includes(String(u.id)));
            }
            if (Array.isArray(incoming.admin_users) && incoming.admin_users.length > 0) {
                master.admin_users = mergeArrays(master.admin_users, incoming.admin_users, deletedAdminIds);
            }

            const syncTasks = [];

            if (Array.isArray(master.quotes)) {
                syncTasks.push(
                    fetch(`${SUPABASE_URL}/site_settings`, {
                        method: 'POST',
                        headers: supabaseHeaders,
                        body: JSON.stringify({
                            key: 'quotes',
                            value: master.quotes,
                            updated_at: new Date().toISOString()
                        })
                    }).catch(e => console.error('[Supabase Sync quotes error]', e))
                );
            }

            if (incoming.site_images && typeof incoming.site_images === 'object') {
                master.site_images = { ...(master.site_images || {}), ...incoming.site_images };
                syncTasks.push(
                    fetch(`${SUPABASE_URL}/site_settings`, {
                        method: 'POST',
                        headers: supabaseHeaders,
                        body: JSON.stringify({
                            key: 'site_images',
                            value: master.site_images,
                            updated_at: new Date().toISOString()
                        })
                    }).catch(e => console.error('[Supabase Sync site_images error]', e))
                );
            }

            if (incoming.site_settings && typeof incoming.site_settings === 'object') {
                master.site_settings = { ...(master.site_settings || {}), ...incoming.site_settings };
                syncTasks.push(
                    fetch(`${SUPABASE_URL}/site_settings`, {
                        method: 'POST',
                        headers: supabaseHeaders,
                        body: JSON.stringify({
                            key: 'site_settings',
                            value: master.site_settings,
                            updated_at: new Date().toISOString()
                        })
                    }).catch(e => console.error('[Supabase Sync site_settings error]', e))
                );
            }

            if (incoming.allocation_rules && typeof incoming.allocation_rules === 'object')
                master.allocation_rules = { ...(master.allocation_rules || {}), ...incoming.allocation_rules };
            if (incoming.baselines && typeof incoming.baselines === 'object')
                master.baselines = { ...(master.baselines || {}), ...incoming.baselines };
            if (incoming.custom_specific_programs && typeof incoming.custom_specific_programs === 'object')
                master.custom_specific_programs = { ...(master.custom_specific_programs || {}), ...incoming.custom_specific_programs };
            if (incoming.specific_prog_imgs && typeof incoming.specific_prog_imgs === 'object') {
                master.specific_prog_imgs = { ...(master.specific_prog_imgs || {}), ...incoming.specific_prog_imgs };
                syncTasks.push(
                    fetch(`${SUPABASE_URL}/site_settings`, {
                        method: 'POST',
                        headers: supabaseHeaders,
                        body: JSON.stringify({
                            key: 'specific_prog_imgs',
                            value: master.specific_prog_imgs,
                            updated_at: new Date().toISOString()
                        })
                    }).catch(e => console.error('[Supabase Sync specific_prog_imgs error]', e))
                );
            }

            if (syncTasks.length > 0) {
                await Promise.allSettled(syncTasks);
            }

            master.deleted_ids         = Array.from(new Set([...(master.deleted_ids || []),         ...deletedIds]));
            master.deleted_news_ids    = Array.from(new Set([...(master.deleted_news_ids || []),     ...deletedNewsIds]));
            master.deleted_disb_ids    = Array.from(new Set([...(master.deleted_disb_ids || []),     ...deletedDisbIds]));
            master.deleted_ref_ids     = Array.from(new Set([...(master.deleted_ref_ids || []),      ...deletedRefIds]));
            master.deleted_quote_ids   = Array.from(new Set([...(master.deleted_quote_ids || []),    ...deletedQuoteIds]));
            master.deleted_program_ids = Array.from(new Set([...(master.deleted_program_ids || []),  ...deletedProgramIds]));
            master.deleted_admin_ids   = Array.from(new Set([...(master.deleted_admin_ids || []),    ...deletedAdminIds]));
            master.updatedAt = new Date().toISOString();

            // Persist to Supabase Database
            await supabaseSaveMaster(master);

            // Also upsert individual donation records to Supabase donations table
            if (Array.isArray(master.donations)) {
                for (const d of master.donations) {
                    if (!d || !d.id) continue;
                    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(d.id || ''));
                    
                    const rawProg = d.program_title || d.programSpesifik || d.program || d.programUtama || d.type || 'Infak Umum';
                    const wilayahStr = (d.wilayah && d.wilayah !== '-') ? ` [${d.wilayah}]` : '';
                    const programTitleFormatted = rawProg.includes('[') ? rawProg : `${rawProg}${wilayahStr}`;

                    const extraMeta = [];
                    if (d.wilayah && d.wilayah !== '-') extraMeta.push(`Wilayah: ${d.wilayah}`);
                    if (d.programUtama || d.program_utama) extraMeta.push(`Kategori: ${d.programUtama || d.program_utama}`);
                    if (d.programSpesifik || d.program_spesifik) extraMeta.push(`Program: ${d.programSpesifik || d.program_spesifik}`);
                    if (d.referralId || d.referral_id || d.referralCode || d.referral_code) {
                        const refCode = d.referralCode || d.referral_code || d.referralId || d.referral_id;
                        const refRate = d.referralRate !== undefined ? d.referralRate : (d.referral_rate !== undefined ? d.referral_rate : 6);
                        const refFee = d.referralFee !== undefined ? d.referralFee : (d.referral_fee !== undefined ? d.referral_fee : 0);
                        extraMeta.push(`Mitra: ${refCode} (${refRate}% - Rp ${refFee})`);
                    }
                    if (d.isRecurringDonor || d.is_recurring_donor) extraMeta.push('Donatur Tetap Mitra');

                    const baseNotes = String(d.notes || '').replace(/\[Meta:[^\]]*\]/g, '').trim();
                    const metaTag = extraMeta.length > 0 ? ` [Meta: ${extraMeta.join(' | ')}]` : '';
                    const finalNotes = baseNotes ? (baseNotes === '-' ? metaTag.trim() : `${baseNotes}${metaTag}`) : (metaTag.trim() || '-');

                    const payload = {
                        donor_name: String(d.donorName || d.donor_name || 'Hamba Allah'),
                        donor_phone: String(d.donorPhone || d.donor_phone || '-'),
                        donor_email: String(d.donorEmail || d.donor_email || ''),
                        program_title: programTitleFormatted,
                        donation_type: String(d.type || d.donation_type || 'Infak Terikat'),
                        amount: Number(d.amount) || 0,
                        payment_method: String(d.method || d.payment_method || 'Transfer Bank'),
                        notes: finalNotes,
                        status: String(d.status || 'pending'),
                        created_at: d.createdAt || d.created_at || new Date().toISOString()
                    };
                    if (isValidUUID) {
                        payload.id = d.id;
                    }

                    fetch(`${SUPABASE_URL}/donations`, {
                        method: 'POST',
                        headers: supabaseHeaders,
                        body: JSON.stringify(payload)
                    }).catch(() => {});
                }
            }

            // Also upsert individual news records to Supabase news table
            if (Array.isArray(master.news)) {
                for (const item of master.news) {
                    fetch(`${SUPABASE_URL}/news`, {
                        method: 'POST',
                        headers: supabaseHeaders,
                        body: JSON.stringify({
                            id: String(item.id),
                            title: item.title,
                            category: item.category || 'Kegiatan & Penyaluran',
                            content: item.content,
                            image_url: item.imageUrl || item.image_url || '',
                            gallery: Array.isArray(item.gallery) ? item.gallery : [],
                            event_date: item.eventDate || item.event_date || new Date().toISOString(),
                            status: item.status || 'published',
                            author: item.author || 'Super Admin 1 (WIZ Babel)',
                            created_at: item.createdAt || item.created_at || new Date().toISOString(),
                            updated_at: item.updatedAt || new Date().toISOString()
                        })
                    }).catch(() => {});
                }
            }

            // Also upsert individual referral records to Supabase referrals table
            if (Array.isArray(master.referrals)) {
                for (const r of master.referrals) {
                    if (!r || (!r.id && !r.code)) continue;
                    const rawNotes = r.notes || '';
                    const pinPart = r.pin ? ` [PIN:${r.pin}]` : '';
                    const notesWithPin = rawNotes.includes('[PIN:') ? rawNotes : (rawNotes + pinPart);

                    fetch(`${SUPABASE_URL}/referrals`, {
                        method: 'POST',
                        headers: supabaseHeaders,
                        body: JSON.stringify({
                            id: String(r.id || r.code),
                            code: String(r.code || r.id),
                            name: String(r.name || 'Affiliator'),
                            phone: String(r.phone || '-'),
                            bank_name: String(r.bankName || r.bank_name || '-'),
                            account_number: String(r.accountNumber || r.account_number || '-'),
                            account_holder: String(r.accountHolder || r.account_holder || r.name || '-'),
                            default_rate: Number(r.defaultRate !== undefined ? r.defaultRate : (r.default_rate !== undefined ? r.default_rate : 6)),
                            status: String(r.status || 'active'),
                            notes: notesWithPin,
                            created_at: r.createdAt || r.created_at || new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                    }).catch(() => {});
                }
            }

            // Also upsert site_settings direct key
            if (master.site_settings && typeof master.site_settings === 'object') {
                fetch(`${SUPABASE_URL}/site_settings`, {
                    method: 'POST',
                    headers: supabaseHeaders,
                    body: JSON.stringify({
                        key: 'site_settings',
                        value: master.site_settings,
                        updated_at: new Date().toISOString()
                    })
                }).catch(() => {});
            }

            memCache = master;
            memCacheTime = Date.now();

            return res.status(200).json({
                status: 'success',
                message: 'Supabase master cloud state synchronized successfully',
                serverTime: master.updatedAt,
                data: master
            });
        } catch (err) {
            console.error('[Sync API Error]', err);
            return res.status(500).json({ status: 'error', message: err.message });
        }
    }

    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
};

module.exports.invalidateCache = invalidateCache;
