/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Vercel Serverless Sync Engine — /api/sync
 * ============================================================
 * PERSISTENT SYNC: Reads from Firebase Firestore (primary) and
 * canonical-store.json (fallback). In-memory cache is only used
 * within a warm serverless invocation for performance.
 *
 * WHY: Vercel serverless functions can cold-start at any time,
 * wiping in-memory state. Admin changes (bank accounts, settings)
 * must persist in Firebase so all website visitors see them.
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// Firebase config — must match firebase-client.js
const FIREBASE_PROJECT_ID = 'wiz-bangka-belitung';
const FIREBASE_API_KEY    = 'AIzaSyAl8RQSk7Jnb7r4GCclAGbcZc2X-yKRhmQ';
const FIREBASE_BASE_URL   = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// ─── Short-lived in-memory cache (within warm invocations only) ────────────
let memCache = null;
let memCacheTime = 0;
const MEM_CACHE_TTL_MS = 15000; // 15 seconds

// ─── Firebase REST helpers ───────────────────────────────────────────────────
function toFsValue(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsValue) } };
    if (typeof v === 'object') return { mapValue: { fields: toFsFields(v) } };
    return { stringValue: String(v) };
}
function toFsFields(obj) {
    const fields = {};
    for (const [k, v] of Object.entries(obj || {})) {
        if (k === 'id') continue;
        fields[k] = toFsValue(v);
    }
    return fields;
}
function fromFsValue(v) {
    if (!v) return null;
    if ('nullValue' in v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFsValue);
    if ('mapValue' in v) return fromFsFields(v.mapValue.fields || {});
    return null;
}
function fromFsFields(fields) {
    const obj = {};
    for (const [k, v] of Object.entries(fields || {})) { obj[k] = fromFsValue(v); }
    return obj;
}

async function firebaseGet(docPath) {
    try {
        const url = `${FIREBASE_BASE_URL}/${docPath}?key=${FIREBASE_API_KEY}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return null;
        const doc = await res.json();
        if (!doc || !doc.fields) return null;
        return fromFsFields(doc.fields);
    } catch (e) {
        console.warn('[Sync API] Firebase GET error:', e.message);
        return null;
    }
}

async function firebasePatch(docPath, data) {
    try {
        const { id: _id, ...rest } = data;
        const url = `${FIREBASE_BASE_URL}/${docPath}?key=${FIREBASE_API_KEY}`;
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: toFsFields(rest) })
        });
        return res.ok;
    } catch (e) {
        console.warn('[Sync API] Firebase PATCH error:', e.message);
        return false;
    }
}

// ─── Canonical seed (file-based fallback) ───────────────────────────────────
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

// ─── Merge helpers ────────────────────────────────────────────────────────────
function mergeArrays(existingArr = [], incomingArr = [], deletedIds = []) {
    const deletedSet = new Set((deletedIds || []).map(String));
    const map = new Map();
    existingArr.forEach(item => {
        if (item && item.id && !deletedSet.has(String(item.id)) && item.status !== 'deleted') {
            map.set(String(item.id), item);
        }
    });
    incomingArr.forEach(item => {
        if (!item || !item.id || deletedSet.has(String(item.id)) || item.status === 'deleted') return;
        const id = String(item.id);
        if (!map.has(id)) {
            map.set(id, item);
        } else {
            const existing = map.get(id);
            const tExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            const tIncoming = new Date(item.updatedAt || item.createdAt || 0).getTime();
            if (tIncoming >= tExisting) map.set(id, { ...existing, ...item });
        }
    });
    return Array.from(map.values());
}

// ─── Main handler ─────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // ─── GET: Serve master state to all website visitors ───────────────────
    if (req.method === 'GET') {
        // Use in-memory cache if still fresh
        const now = Date.now();
        if (memCache && (now - memCacheTime) < MEM_CACHE_TTL_MS) {
            return res.status(200).json({ status: 'success', serverTime: new Date().toISOString(), data: memCache });
        }

        // 1. Try Firebase Firestore (persistent across cold starts)
        let master = null;
        try {
            const fbData = await firebaseGet('system_state/master_bundle');
            if (fbData && (fbData.donations || fbData.site_settings || fbData.site_images)) {
                master = fbData;
                console.log('[Sync API] Loaded master bundle from Firebase Firestore.');
            }
        } catch (e) {
            console.warn('[Sync API] Firebase load failed, falling back to canonical seed:', e.message);
        }

        // 2. Fallback: canonical-store.json (static file, always available)
        if (!master) {
            master = loadCanonicalSeed();
            console.log('[Sync API] Loaded from canonical-store.json fallback.');
        }

        memCache = master;
        memCacheTime = now;

        return res.status(200).json({ status: 'success', serverTime: new Date().toISOString(), data: master });
    }

    // ─── POST: Receive and merge data from admin push ─────────────────────
    if (req.method === 'POST') {
        try {
            let body = req.body;
            if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) {} }
            body = body || {};

            const incoming = body.bundle || body.data || body;
            const deletedIds      = body.deletedIds      || incoming.deleted_ids      || [];
            const deletedNewsIds  = body.deletedNewsIds  || incoming.deleted_news_ids  || [];
            const deletedDisbIds  = body.deletedDisbIds  || incoming.deleted_disb_ids  || [];
            const deletedRefIds   = body.deletedRefIds   || incoming.deleted_ref_ids   || [];

            // Load existing master (Firebase first, then canonical seed)
            let master = null;
            try {
                const fbData = await firebaseGet('system_state/master_bundle');
                if (fbData && (fbData.donations || fbData.site_settings)) master = fbData;
            } catch(e) {}
            if (!master) master = loadCanonicalSeed();

            // Merge all collections
            if (Array.isArray(incoming.donations))
                master.donations = mergeArrays(master.donations, incoming.donations, deletedIds);
            if (Array.isArray(incoming.news))
                master.news = mergeArrays(master.news, incoming.news, deletedNewsIds);
            if (Array.isArray(incoming.disbursements))
                master.disbursements = mergeArrays(master.disbursements, incoming.disbursements, deletedDisbIds);
            if (Array.isArray(incoming.referrals))
                master.referrals = mergeArrays(master.referrals, incoming.referrals, deletedRefIds);
            if (Array.isArray(incoming.referral_payouts))
                master.referral_payouts = mergeArrays(master.referral_payouts, incoming.referral_payouts, []);
            if (Array.isArray(incoming.activity))
                master.activity = mergeArrays(master.activity, incoming.activity, []);
            if (Array.isArray(incoming.admin_users) && incoming.admin_users.length > 0)
                master.admin_users = mergeArrays(master.admin_users, incoming.admin_users, []);

            // Merge settings objects (admin changes ALWAYS win — latest timestamp wins)
            if (incoming.site_images && typeof incoming.site_images === 'object')
                master.site_images = { ...(master.site_images || {}), ...incoming.site_images };

            // CRITICAL: site_settings (bank accounts, offices) — admin changes ALWAYS override
            if (incoming.site_settings && typeof incoming.site_settings === 'object') {
                // Incoming from admin is the source of truth for settings
                master.site_settings = incoming.site_settings;
                console.log('[Sync API] site_settings updated by admin:', JSON.stringify(incoming.site_settings).slice(0, 200));
            }

            if (incoming.allocation_rules && typeof incoming.allocation_rules === 'object')
                master.allocation_rules = { ...(master.allocation_rules || {}), ...incoming.allocation_rules };
            if (incoming.baselines && typeof incoming.baselines === 'object')
                master.baselines = { ...(master.baselines || {}), ...incoming.baselines };
            if (incoming.custom_specific_programs && typeof incoming.custom_specific_programs === 'object')
                master.custom_specific_programs = { ...(master.custom_specific_programs || {}), ...incoming.custom_specific_programs };
            if (incoming.specific_prog_imgs && typeof incoming.specific_prog_imgs === 'object')
                master.specific_prog_imgs = { ...(master.specific_prog_imgs || {}), ...incoming.specific_prog_imgs };

            // Track deleted IDs
            master.deleted_ids       = Array.from(new Set([...(master.deleted_ids || []),       ...deletedIds]));
            master.deleted_news_ids  = Array.from(new Set([...(master.deleted_news_ids || []),   ...deletedNewsIds]));
            master.deleted_disb_ids  = Array.from(new Set([...(master.deleted_disb_ids || []),   ...deletedDisbIds]));
            master.deleted_ref_ids   = Array.from(new Set([...(master.deleted_ref_ids || []),    ...deletedRefIds]));
            master.updatedAt = new Date().toISOString();

            // Persist to Firebase Firestore (durable storage, survives cold starts)
            const saved = await firebasePatch('system_state/master_bundle', master);
            if (saved) {
                console.log('[Sync API] Master bundle persisted to Firebase Firestore.');
            } else {
                console.warn('[Sync API] Firebase persist failed — changes are in-memory only until next Firebase sync.');
            }

            // Update in-memory cache
            memCache = master;
            memCacheTime = Date.now();

            return res.status(200).json({
                status: 'success',
                message: 'Master cloud state synchronized successfully',
                serverTime: master.updatedAt,
                data: master
            });
        } catch (err) {
            console.error('[Sync API Error]', err);
            return res.status(500).json({ status: 'error', message: err.message });
        }
    }

    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
};
