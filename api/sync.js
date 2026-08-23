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

async function supabaseGetMaster() {
    try {
        const res = await fetch(`${SUPABASE_URL}/site_settings?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Accept': 'application/json'
            }
        });
        if (!res.ok) return null;
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
            const masterDoc = list.find(d => d.key === 'master_bundle');
            const siteImagesDoc = list.find(d => d.key === 'site_images');
            const specificProgDoc = list.find(d => d.key === 'specific_prog_imgs');
            const siteSettingsDoc = list.find(d => d.key === 'site_settings');

            let master = (masterDoc && masterDoc.value) ? masterDoc.value : null;
            if (!master) master = loadCanonicalSeed();

            if (siteImagesDoc && siteImagesDoc.value && typeof siteImagesDoc.value === 'object') {
                master.site_images = { ...(master.site_images || {}), ...siteImagesDoc.value };
            }
            if (specificProgDoc && specificProgDoc.value && typeof specificProgDoc.value === 'object') {
                master.specific_prog_imgs = { ...(master.specific_prog_imgs || {}), ...specificProgDoc.value };
            }
            if (siteSettingsDoc && siteSettingsDoc.value && typeof siteSettingsDoc.value === 'object') {
                master.site_settings = { ...(master.site_settings || {}), ...siteSettingsDoc.value };
            }

            return master;
        }
        return null;
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
            if (tIncoming >= tExisting) {
                map.set(itemId, { ...existing, ...item });
            } else {
                map.set(itemId, { ...item, ...existing });
            }
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

            // 2. Fallback to canonical-store.json
            if (!masterData || !Array.isArray(masterData.news) || masterData.news.length === 0) {
                masterData = loadCanonicalSeed();
                // Push canonical to Supabase
                supabaseSaveMaster(masterData).catch(() => {});
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

            if (Array.isArray(incoming.donations))
                master.donations = mergeArrays(master.donations, incoming.donations, deletedIds);

            if (Array.isArray(incoming.news) && incoming.news.length > 0) {
                master.news = incoming.news.filter(n => n && n.id && !deletedNewsIds.includes(String(n.id)) && n.status !== 'deleted');
            } else if (Array.isArray(incoming.news)) {
                master.news = mergeArrays(master.news, incoming.news, deletedNewsIds);
            }

            if (Array.isArray(incoming.programs) && incoming.programs.length > 0) {
                master.programs = incoming.programs.filter(p => p && p.id && !deletedProgramIds.includes(String(p.id)) && p.status !== 'deleted');
            } else if (Array.isArray(incoming.programs)) {
                master.programs = mergeArrays(master.programs, incoming.programs, deletedProgramIds);
            }

            if (Array.isArray(incoming.disbursements))
                master.disbursements = mergeArrays(master.disbursements, incoming.disbursements, deletedDisbIds);
            if (Array.isArray(incoming.referrals))
                master.referrals = mergeArrays(master.referrals, incoming.referrals, deletedRefIds);
            if (Array.isArray(incoming.referral_payouts))
                master.referral_payouts = mergeArrays(master.referral_payouts, incoming.referral_payouts, []);
            if (Array.isArray(incoming.quotes))
                master.quotes = incoming.quotes.length > 0 ? incoming.quotes : mergeArrays(master.quotes, incoming.quotes, deletedQuoteIds);
            if (Array.isArray(incoming.activity))
                master.activity = mergeArrays(master.activity, incoming.activity, []);

            if (deletedAdminIds.length > 0 && Array.isArray(master.admin_users)) {
                master.admin_users = master.admin_users.filter(u => u && u.id && !deletedAdminIds.includes(String(u.id)));
            }
            if (Array.isArray(incoming.admin_users) && incoming.admin_users.length > 0) {
                master.admin_users = mergeArrays(master.admin_users, incoming.admin_users, deletedAdminIds);
            }

            if (incoming.site_images && typeof incoming.site_images === 'object') {
                master.site_images = { ...(master.site_images || {}), ...incoming.site_images };
                fetch(`${SUPABASE_URL}/site_settings`, {
                    method: 'POST',
                    headers: supabaseHeaders,
                    body: JSON.stringify({
                        key: 'site_images',
                        value: master.site_images,
                        updated_at: new Date().toISOString()
                    })
                }).catch(() => {});
            }

            if (incoming.site_settings && typeof incoming.site_settings === 'object') {
                master.site_settings = incoming.site_settings;
                fetch(`${SUPABASE_URL}/site_settings`, {
                    method: 'POST',
                    headers: supabaseHeaders,
                    body: JSON.stringify({
                        key: 'site_settings',
                        value: incoming.site_settings,
                        updated_at: new Date().toISOString()
                    })
                }).catch(() => {});
            }

            if (incoming.allocation_rules && typeof incoming.allocation_rules === 'object')
                master.allocation_rules = { ...(master.allocation_rules || {}), ...incoming.allocation_rules };
            if (incoming.baselines && typeof incoming.baselines === 'object')
                master.baselines = { ...(master.baselines || {}), ...incoming.baselines };
            if (incoming.custom_specific_programs && typeof incoming.custom_specific_programs === 'object')
                master.custom_specific_programs = { ...(master.custom_specific_programs || {}), ...incoming.custom_specific_programs };
            if (incoming.specific_prog_imgs && typeof incoming.specific_prog_imgs === 'object') {
                master.specific_prog_imgs = { ...(master.specific_prog_imgs || {}), ...incoming.specific_prog_imgs };
                fetch(`${SUPABASE_URL}/site_settings`, {
                    method: 'POST',
                    headers: supabaseHeaders,
                    body: JSON.stringify({
                        key: 'specific_prog_imgs',
                        value: master.specific_prog_imgs,
                        updated_at: new Date().toISOString()
                    })
                }).catch(() => {});
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
