/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Vercel Serverless Sync Engine — /api/sync
 * ============================================================
 * PRIMARY DATABASE: Supabase PostgreSQL (REST API)
 * Fallback: canonical-store.json
 * ============================================================
 */

import fs from 'fs';
import path from 'path';

// Supabase Configuration
const SUPABASE_RAW_URL = process.env.SUPABASE_URL || 'https://kmpwdqremvltgglmoxgx.supabase.co';
const SUPABASE_URL = SUPABASE_RAW_URL.endsWith('/rest/v1') ? SUPABASE_RAW_URL : `${SUPABASE_RAW_URL.replace(/\/$/, '')}/rest/v1`;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttcHdkcXJlbXZsdGdnbG1veGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMjEyMTksImV4cCI6MjEwMzU5NzIxOX0.MhNqr36yvqRAgiVsLil608P-DyYBLJ6WBWxXMbfvbH8';

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
        const [settingsRes, newsRes, referralsRes] = await Promise.all([
            fetch(`${SUPABASE_URL}/site_settings?select=*`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Accept': 'application/json'
                }
            }).catch(() => null),
            fetch(`${SUPABASE_URL}/news?select=id,slug,title,category,content,image_url,gallery,event_date,status,author,created_at,updated_at&order=created_at.desc`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Accept': 'application/json'
                }
            }).catch(() => null),
            fetch(`${SUPABASE_URL}/referrals?select=*`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Accept': 'application/json'
                }
            }).catch(() => null)
        ]);

        let master = null;
        if (settingsRes && settingsRes.ok) {
            const list = await settingsRes.json();
            if (Array.isArray(list) && list.length > 0) {
                const masterDoc = list.find(d => d.key === 'master_bundle');
                const siteImagesDoc = list.find(d => d.key === 'site_images');
                const specificProgDoc = list.find(d => d.key === 'specific_prog_imgs');
                const siteSettingsDoc = list.find(d => d.key === 'site_settings');
                const quotesDoc = list.find(d => d.key === 'quotes');

                master = (masterDoc && masterDoc.value) ? masterDoc.value : null;
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
                if (quotesDoc && quotesDoc.value && Array.isArray(quotesDoc.value)) {
                    master.quotes = quotesDoc.value;
                }
            }
        }
        if (!master) master = loadCanonicalSeed();

        if (newsRes && newsRes.ok) {
            const newsList = await newsRes.json();
            if (Array.isArray(newsList) && newsList.length > 0) {
                master.news = newsList.map(n => ({
                    id: String(n.id),
                    slug: n.slug || '',
                    title: n.title,
                    category: n.category || 'Kegiatan & Penyaluran',
                    content: n.content,
                    imageUrl: (n.image_url || n.imageUrl || (Array.isArray(n.gallery) && n.gallery.length > 0 ? n.gallery[0] : '') || '').trim(),
                    image_url: (n.image_url || n.imageUrl || (Array.isArray(n.gallery) && n.gallery.length > 0 ? n.gallery[0] : '') || '').trim(),
                    gallery: Array.isArray(n.gallery) ? n.gallery : [],
                    eventDate: n.event_date || n.eventDate || n.created_at || new Date().toISOString(),
                    event_date: n.event_date || n.eventDate || n.created_at || new Date().toISOString(),
                    status: n.status || 'published',
                    author: n.author || 'Super Admin 1 (WIZ Babel)',
                    createdAt: n.created_at || n.createdAt || new Date().toISOString(),
                    created_at: n.created_at || n.createdAt || new Date().toISOString(),
                    updatedAt: n.updated_at || n.updatedAt || new Date().toISOString(),
                    updated_at: n.updated_at || n.updatedAt || new Date().toISOString()
                }));
                // Sort by publication timestamp descending so newly published news is immediately at the top
                master.news.sort((a, b) => {
                    const timeA = new Date(a.created_at || a.createdAt || a.updated_at || a.updatedAt || a.event_date || a.eventDate || 0).getTime();
                    const timeB = new Date(b.created_at || b.createdAt || b.updated_at || b.updatedAt || b.event_date || b.eventDate || 0).getTime();
                    return timeB - timeA;
                });
            }
        }

        if (referralsRes && referralsRes.ok) {
            const refList = await referralsRes.json();
            if (Array.isArray(refList) && refList.length > 0) {
                master.referrals = refList.map(r => {
                    let pin = r.pin || '';
                    if (!pin && r.notes && r.notes.includes('[PIN:')) {
                        const m = r.notes.match(/\[PIN:([^\]]+)\]/);
                        if (m) pin = m[1].trim();
                    }
                    return {
                        id: r.id || r.code,
                        code: r.code || r.id,
                        name: r.name || 'Mitra WIZ',
                        phone: r.phone || '-',
                        bankName: r.bank_name || r.bankName || '-',
                        accountNumber: r.account_number || r.accountNumber || '-',
                        accountHolder: r.account_holder || r.accountHolder || r.name || '-',
                        defaultRate: Number(r.default_rate !== undefined ? r.default_rate : 6),
                        status: r.status || 'active',
                        pin: pin,
                        notes: r.notes || '',
                        createdAt: r.created_at || r.createdAt || new Date().toISOString()
                    };
                });
            }
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
    const titleToIdMap = new Map();

    const getNormTitle = (item) => (item && item.title ? item.title.trim().toLowerCase() : null);

    (existingArr || []).forEach(item => {
        if (!item) return;
        const itemId = String(item.id || item.code || '');
        if (itemId && !deletedSet.has(itemId) && item.status !== 'deleted' && !item.isDeleted) {
            item.id = item.id || itemId;
            map.set(itemId, item);
            const normTitle = getNormTitle(item);
            if (normTitle) titleToIdMap.set(normTitle, itemId);
        }
    });

    (incomingArr || []).forEach(item => {
        if (!item) return;
        let itemId = String(item.id || item.code || (item.name ? `${item.name}-${item.phone || ''}` : ''));
        if (!itemId || deletedSet.has(itemId) || item.status === 'deleted' || item.isDeleted) return;

        const normTitle = getNormTitle(item);
        if (normTitle && titleToIdMap.has(normTitle)) {
            itemId = titleToIdMap.get(normTitle);
            item.id = itemId;
        }

        if (!map.has(itemId)) {
            map.set(itemId, item);
            if (normTitle) titleToIdMap.set(normTitle, itemId);
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

export default async function handler(req, res) {
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
            if (body && body.action === 'verify_admin_user' && body.username) {
                const cleanUser = (body.username || '').toLowerCase().trim();
                const users = Array.isArray(master.admin_users) ? master.admin_users : [];
                const found = users.find(u => u && u.username && u.username.toLowerCase() === cleanUser);
                return res.status(200).json({ status: 'success', action: 'verify_admin_user', user: found || null });
            }

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

            if (body && (body.action === 'save_news' || body.action === 'add_news' || body.action === 'update_news') && body.news) {
                const incomingArticle = body.news;
                const articleId = String(incomingArticle.id || '');
                if (!articleId) {
                    return res.status(400).json({ status: 'error', message: 'Article id is required' });
                }

                const cleanGallery = Array.isArray(incomingArticle.gallery) ? incomingArticle.gallery.filter(Boolean) : [];
                const mainImg = (incomingArticle.imageUrl || incomingArticle.image_url || (cleanGallery.length > 0 ? cleanGallery[0] : '') || '').trim();
                const cleanDate = incomingArticle.eventDate || incomingArticle.event_date || incomingArticle.createdAt || incomingArticle.created_at || new Date().toISOString();

                const dbPayload = {
                    id: articleId,
                    title: (incomingArticle.title || '').trim(),
                    category: incomingArticle.category || 'Kegiatan & Penyaluran',
                    content: (incomingArticle.content || '').trim(),
                    image_url: mainImg,
                    gallery: cleanGallery,
                    event_date: cleanDate,
                    status: incomingArticle.status || 'published',
                    author: (incomingArticle.author || 'Admin WIZ Babel').trim(),
                    created_at: incomingArticle.createdAt || incomingArticle.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                // 1. Upsert directly to Supabase news table
                await fetch(`${SUPABASE_URL}/news`, {
                    method: 'POST',
                    headers: supabaseHeaders,
                    body: JSON.stringify(dbPayload)
                }).catch(e => console.error('[Micro-Action save_news Error]', e));

                // 2. Synchronize master_bundle & in-memory cache
                if (!master.news) master.news = [];
                const existIdx = master.news.findIndex(n => String(n.id) === articleId);
                const fullArticle = {
                    id: articleId,
                    title: dbPayload.title,
                    category: dbPayload.category,
                    content: dbPayload.content,
                    imageUrl: dbPayload.image_url,
                    image_url: dbPayload.image_url,
                    gallery: dbPayload.gallery,
                    eventDate: dbPayload.event_date,
                    event_date: dbPayload.event_date,
                    status: dbPayload.status,
                    author: dbPayload.author,
                    createdAt: dbPayload.created_at,
                    created_at: dbPayload.created_at,
                    updatedAt: dbPayload.updated_at,
                    updated_at: dbPayload.updated_at
                };
                if (existIdx !== -1) {
                    master.news[existIdx] = fullArticle;
                } else {
                    master.news.unshift(fullArticle);
                }
                master.news.sort((a, b) => {
                    const timeA = new Date(a.created_at || a.createdAt || a.updated_at || a.updatedAt || a.event_date || a.eventDate || 0).getTime();
                    const timeB = new Date(b.created_at || b.createdAt || b.updated_at || b.updatedAt || b.event_date || b.eventDate || 0).getTime();
                    return timeB - timeA;
                });
                master.updatedAt = new Date().toISOString();
                supabaseSaveMaster(master).catch(() => {});

                // 3. Invalidate caches
                invalidateCache();

                return res.status(200).json({
                    status: 'success',
                    action: 'save_news',
                    news: dbPayload
                });
            }

            if (body && body.action === 'delete_news' && body.id) {
                const targetId = String(body.id);
                // 1. Delete from Supabase news table
                await fetch(`${SUPABASE_URL}/news?id=eq.${encodeURIComponent(targetId)}`, {
                    method: 'DELETE',
                    headers: supabaseHeaders
                }).catch(e => console.error('[Micro-Action delete_news Error]', e));

                // 2. Update master state
                if (master.news) {
                    master.news = master.news.filter(n => String(n.id) !== targetId);
                    master.updatedAt = new Date().toISOString();
                    supabaseSaveMaster(master).catch(() => {});
                }

                // 3. Invalidate caches
                invalidateCache();

                return res.status(200).json({
                    status: 'success',
                    action: 'delete_news',
                    id: targetId
                });
            }

            if (body && body.action === 'clear_all_news') {
                // 1. Delete all from Supabase news table
                await fetch(`${SUPABASE_URL}/news`, {
                    method: 'DELETE',
                    headers: supabaseHeaders
                }).catch(e => console.error('[Micro-Action clear_all_news Error]', e));

                // 2. Clear master news state
                master.news = [];
                master.updatedAt = new Date().toISOString();
                supabaseSaveMaster(master).catch(() => {});

                // 3. Invalidate caches
                invalidateCache();

                return res.status(200).json({
                    status: 'success',
                    action: 'clear_all_news'
                });
            }

            if (body && (body.action === 'save_quote' || body.action === 'add_quote' || body.action === 'update_quote') && body.quote) {
                const incomingQuote = body.quote;
                const quoteId = String(incomingQuote.id || '');
                if (!quoteId) {
                    return res.status(400).json({ status: 'error', message: 'Quote id is required' });
                }

                const fullQuote = {
                    id: quoteId,
                    text: (incomingQuote.text || '').trim(),
                    source: (incomingQuote.source || 'Wahdah Inspirasi Zakat').trim(),
                    category: incomingQuote.category || 'Motivasi & Doa',
                    date: incomingQuote.date || new Date().toISOString().split('T')[0],
                    status: incomingQuote.status || 'active',
                    imageUrl: (incomingQuote.imageUrl || incomingQuote.image_url || 'assets/images/foto-utama-wiz.jpg').trim(),
                    author: incomingQuote.author || 'Admin WIZ Babel',
                    createdAt: incomingQuote.createdAt || incomingQuote.created_at || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                if (!master.quotes) master.quotes = [];
                const existIdx = master.quotes.findIndex(q => String(q.id) === quoteId);
                if (existIdx !== -1) {
                    master.quotes[existIdx] = fullQuote;
                } else {
                    master.quotes.unshift(fullQuote);
                }
                master.quotes.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
                master.updatedAt = new Date().toISOString();

                // Save to Supabase site_settings
                await Promise.allSettled([
                    fetch(`${SUPABASE_URL}/site_settings`, {
                        method: 'POST',
                        headers: supabaseHeaders,
                        body: JSON.stringify({
                            key: 'quotes',
                            value: master.quotes,
                            updated_at: new Date().toISOString()
                        })
                    }),
                    supabaseSaveMaster(master)
                ]);

                invalidateCache();
                return res.status(200).json({ status: 'success', action: 'save_quote', quote: fullQuote });
            }

            if (body && body.action === 'delete_quote' && body.id) {
                const targetId = String(body.id);
                if (!master.quotes) master.quotes = [];
                master.quotes = master.quotes.filter(q => String(q.id) !== targetId);
                master.updatedAt = new Date().toISOString();

                await Promise.allSettled([
                    fetch(`${SUPABASE_URL}/site_settings`, {
                        method: 'POST',
                        headers: supabaseHeaders,
                        body: JSON.stringify({
                            key: 'quotes',
                            value: master.quotes,
                            updated_at: new Date().toISOString()
                        })
                    }),
                    supabaseSaveMaster(master)
                ]);

                invalidateCache();
                return res.status(200).json({ status: 'success', action: 'delete_quote', id: targetId });
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

            if (incoming.allocation_rules && typeof incoming.allocation_rules === 'object') {
                // Strip redundant huge base64 strings from allocation_rules before persisting
                for (const [w, rules] of Object.entries(incoming.allocation_rules)) {
                    if (rules && rules.subAllocation) {
                        for (const [p, sub] of Object.entries(rules.subAllocation)) {
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
                master.allocation_rules = { ...(master.allocation_rules || {}), ...incoming.allocation_rules };
            }
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
            master.deleted_news_ids    = [];
            master.deleted_disb_ids    = Array.from(new Set([...(master.deleted_disb_ids || []),     ...deletedDisbIds]));
            master.deleted_ref_ids     = Array.from(new Set([...(master.deleted_ref_ids || []),      ...deletedRefIds]));
            master.deleted_quote_ids   = Array.from(new Set([...(master.deleted_quote_ids || []),    ...deletedQuoteIds]));
            master.deleted_program_ids = Array.from(new Set([...(master.deleted_program_ids || []),  ...deletedProgramIds]));
            master.deleted_admin_ids   = Array.from(new Set([...(master.deleted_admin_ids || []),    ...deletedAdminIds]));

            master.updatedAt = new Date().toISOString();
            memCache = master;
            memCacheTime = Date.now();

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
                        id: String(d.id),
                        donor_name: String(d.donorName || d.donor_name || 'Hamba Allah'),
                        donor_phone: String(d.donorPhone || d.donor_phone || '-'),
                        donor_email: String(d.donorEmail || d.donor_email || ''),
                        wilayah: String(d.wilayah || 'Pangkalpinang'),
                        program: String(d.programSpesifik || d.program || d.program_spesifik || '-'),
                        program_spesifik: String(d.programSpesifik || d.program || d.program_spesifik || '-'),
                        program_utama: String(d.programUtama || d.category || d.program_utama || '-'),
                        program_title: programTitleFormatted,
                        category: String(d.programUtama || d.category || d.program_utama || '-'),
                        type: String(d.type || d.donation_type || 'Infak Terikat'),
                        donation_type: String(d.type || d.donation_type || 'Infak Terikat'),
                        amount: Number(d.amount) || 0,
                        alokasi_operasional: Number(d.alokasiOperasional || d.alokasi_operasional || 0),
                        alokasi_program: Number(d.alokasiProgram || d.alokasi_program || 0),
                        payment_method: String(d.payment_method || d.method || 'Transfer Bank'),
                        method: String(d.method || d.payment_method || 'Transfer Bank'),
                        notes: finalNotes,
                        status: String(d.status || 'pending'),
                        referral_id: d.referralId || d.referral_id || null,
                        referral_code: d.referralCode || d.referral_code || d.referralId || d.referral_id || null,
                        referral_name: d.referralName || d.referral_name || null,
                        referral_rate: d.referralRate !== undefined ? Number(d.referralRate) : (d.referral_rate !== undefined ? Number(d.referral_rate) : 6),
                        referral_fee: d.referralFee !== undefined ? Number(d.referralFee) : (d.referral_fee !== undefined ? Number(d.referral_fee) : 0),
                        additional_bonus: Number(d.additionalBonus || d.additional_bonus || 0),
                        is_recurring_donor: Boolean(d.isRecurringDonor || d.is_recurring_donor || false),
                        created_at: d.createdAt || d.created_at || new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    entityTasks.push(
                        fetch(`${SUPABASE_URL}/donations`, {
                            method: 'POST',
                            headers: supabaseHeaders,
                            body: JSON.stringify(payload)
                        }).catch(() => {})
                    );
                }
            }

            // Also upsert individual news records to Supabase news table
            if (Array.isArray(master.news)) {
                for (const item of master.news) {
                    entityTasks.push(
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
                        }).catch(() => {})
                    );
                }
            }

            // Also upsert individual referral records to Supabase referrals table
            if (Array.isArray(master.referrals)) {
                for (const r of master.referrals) {
                    if (!r || (!r.id && !r.code)) continue;
                    const rawNotes = r.notes || '';
                    const pinPart = r.pin ? ` [PIN:${r.pin}]` : '';
                    const notesWithPin = rawNotes.includes('[PIN:') ? rawNotes : (rawNotes + pinPart);

                    entityTasks.push(
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
                        }).catch(() => {})
                    );
                }
            }

            // Also upsert individual disbursement records to Supabase disbursements table
            if (Array.isArray(master.disbursements)) {
                for (const disb of master.disbursements) {
                    if (!disb || !disb.id) continue;
                    const sType = disb.sourceType || disb.source_type || 'program_spesifik';
                    const tType = disb.targetType || disb.target_type || 'specific';
                    const fromProg = (disb.amountFromProgram !== undefined) ? disb.amountFromProgram : (disb.amount_from_program !== undefined ? disb.amount_from_program : Number(disb.amount) || 0);
                    const fromSub = (disb.amountFromSubsidi !== undefined) ? disb.amountFromSubsidi : (disb.amount_from_subsidi !== undefined ? disb.amount_from_subsidi : 0);

                    let cleanDesc = String(disb.description || '').replace(/\s*\[Meta:[^\]]+\]/, '').trim();
                    const fullDesc = `${cleanDesc} [Meta: source=${sType}|target=${tType}|fromProg=${fromProg}|fromSub=${fromSub}]`;

                    entityTasks.push(
                        fetch(`${SUPABASE_URL}/disbursements`, {
                            method: 'POST',
                            headers: supabaseHeaders,
                            body: JSON.stringify({
                                id: String(disb.id),
                                wilayah: String(disb.wilayah || 'Pangkalpinang'),
                                program: String(disb.program || 'Infak Umum'),
                                amount: Number(disb.amount) || 0,
                                description: fullDesc,
                                disbursed_at: disb.disbursedAt || disb.disbursed_at || new Date().toISOString(),
                                recorded_by: String(disb.recordedBy || disb.recorded_by || 'Admin'),
                                created_at: disb.createdAt || disb.created_at || new Date().toISOString()
                            })
                        }).catch(() => {})
                    );
                }
            }

            // Also upsert site_settings direct key
            if (master.site_settings && typeof master.site_settings === 'object') {
                entityTasks.push(
                    fetch(`${SUPABASE_URL}/site_settings`, {
                        method: 'POST',
                        headers: supabaseHeaders,
                        body: JSON.stringify({
                            key: 'site_settings',
                            value: master.site_settings,
                            updated_at: new Date().toISOString()
                        })
                    }).catch(() => {})
                );
            }

            if (entityTasks.length > 0) {
                await Promise.allSettled(entityTasks);
            }

            invalidateCache();

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

export { invalidateCache };
