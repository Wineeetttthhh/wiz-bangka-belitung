/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Vercel Serverless Sync Engine — /api/sync
 * ============================================================
 * Menyediakan sinkronisasi data master terpusat real-time
 * untuk seluruh perangkat (HP, Laptop, Tablet, PC).
 * Bebas rate-limit pihak ketiga & terintegrasi langsung di domain
 * https://www.wizbangkabelitung.or.id
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// In-Memory global cache across serverless warm invocations
let memoryStore = null;

function loadCanonicalSeed() {
    try {
        const filePath = path.join(process.cwd(), 'assets', 'data', 'canonical-store.json');
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn('[Sync API] Could not load canonical-store.json:', e.message);
    }
    return {
        updatedAt: new Date().toISOString(),
        version: "2.0.0",
        donations: [],
        news: [],
        disbursements: [],
        activity: [],
        baselines: { baseMasuk: 0, baseTersalurkan: 0, baseDonatur: 0 },
        site_settings: {},
        site_images: {},
        admin_users: [],
        referrals: [],
        referral_payouts: [],
        deleted_ids: [],
        deleted_news_ids: [],
        deleted_disb_ids: [],
        deleted_ref_ids: []
    };
}

function getMasterStore() {
    if (!memoryStore) {
        memoryStore = loadCanonicalSeed();
    }
    return memoryStore;
}

function mergeArrays(existingArr = [], incomingArr = [], deletedIds = []) {
    const deletedSet = new Set((deletedIds || []).map(String));
    const map = new Map();

    // Add existing
    existingArr.forEach(item => {
        if (item && item.id && !deletedSet.has(String(item.id)) && item.status !== 'deleted') {
            map.set(String(item.id), item);
        }
    });

    // Merge or update incoming
    incomingArr.forEach(item => {
        if (!item || !item.id || deletedSet.has(String(item.id)) || item.status === 'deleted') return;
        const id = String(item.id);
        if (!map.has(id)) {
            map.set(id, item);
        } else {
            const existing = map.get(id);
            const tExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            const tIncoming = new Date(item.updatedAt || item.createdAt || 0).getTime();
            if (tIncoming >= tExisting) {
                map.set(id, { ...existing, ...item });
            }
        }
    });

    return Array.from(map.values());
}

module.exports = async function handler(req, res) {
    // Enable CORS for all devices & origin domains
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const master = getMasterStore();

    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'success',
            serverTime: new Date().toISOString(),
            data: master
        });
    }

    if (req.method === 'POST') {
        try {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch(e) {}
            }
            body = body || {};

            const incoming = body.bundle || body.data || body;
            const deletedIds = body.deletedIds || incoming.deleted_ids || [];
            const deletedNewsIds = body.deletedNewsIds || incoming.deleted_news_ids || [];
            const deletedDisbIds = body.deletedDisbIds || incoming.deleted_disb_ids || [];
            const deletedRefIds = body.deletedRefIds || incoming.deleted_ref_ids || [];

            // Merge collections
            if (Array.isArray(incoming.donations)) {
                master.donations = mergeArrays(master.donations, incoming.donations, deletedIds);
            }
            if (Array.isArray(incoming.news)) {
                master.news = mergeArrays(master.news, incoming.news, deletedNewsIds);
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
            if (Array.isArray(incoming.activity)) {
                master.activity = mergeArrays(master.activity, incoming.activity, []);
            }
            if (Array.isArray(incoming.admin_users) && incoming.admin_users.length > 0) {
                master.admin_users = mergeArrays(master.admin_users, incoming.admin_users, []);
            }
            if (incoming.site_images && typeof incoming.site_images === 'object') {
                master.site_images = { ...(master.site_images || {}), ...incoming.site_images };
            }
            if (incoming.site_settings && typeof incoming.site_settings === 'object') {
                master.site_settings = { ...(master.site_settings || {}), ...incoming.site_settings };
            }
            if (incoming.allocation_rules && typeof incoming.allocation_rules === 'object') {
                master.allocation_rules = { ...(master.allocation_rules || {}), ...incoming.allocation_rules };
            }
            if (incoming.baselines && typeof incoming.baselines === 'object') {
                master.baselines = { ...(master.baselines || {}), ...incoming.baselines };
            }

            // Track deleted IDs
            master.deleted_ids = Array.from(new Set([...(master.deleted_ids || []), ...deletedIds]));
            master.deleted_news_ids = Array.from(new Set([...(master.deleted_news_ids || []), ...deletedNewsIds]));
            master.deleted_disb_ids = Array.from(new Set([...(master.deleted_disb_ids || []), ...deletedDisbIds]));
            master.deleted_ref_ids = Array.from(new Set([...(master.deleted_ref_ids || []), ...deletedRefIds]));

            master.updatedAt = new Date().toISOString();

            return res.status(200).json({
                status: 'success',
                message: 'Master cloud state synchronized successfully',
                serverTime: master.updatedAt,
                data: master
            });
        } catch (err) {
            console.error('[Sync API Error]', err);
            return res.status(500).json({
                status: 'error',
                message: err.message
            });
        }
    }

    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
};
