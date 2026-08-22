/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Photo Sync Endpoint — /api/sync-photo
 * ============================================================
 * Instantly saves a single program photo to specific_prog_imgs
 * inside master_bundle in Supabase. Called by admin on upload.
 * This avoids the race condition where a full bundle sync
 * hasn't happened yet but the OG image server needs the photo.
 * ============================================================
 */

const SUPABASE_URL = 'https://ffiltrlzdbwhhhxzmzuo.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_GiA1BOjbW2psTU36149xuA_E26wGBI3';

const supabaseHeaders = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
};

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch(e) { body = {}; }
        }

        const { programTitle, imageUrl } = body || {};
        if (!programTitle || !imageUrl) {
            return res.status(400).json({ error: 'programTitle and imageUrl are required' });
        }

        // 1. Fetch current master_bundle from Supabase
        const getRes = await fetch(`${SUPABASE_URL}/site_settings?key=eq.master_bundle&select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Accept': 'application/json'
            }
        });

        let master = null;
        if (getRes.ok) {
            const list = await getRes.json();
            if (Array.isArray(list) && list.length > 0 && list[0].value) {
                master = list[0].value;
            }
        }

        if (!master) {
            return res.status(500).json({ error: 'Could not fetch master_bundle from Supabase' });
        }

        // 2. Merge the new photo into specific_prog_imgs
        if (!master.specific_prog_imgs) master.specific_prog_imgs = {};
        master.specific_prog_imgs[programTitle] = imageUrl;

        // 3. Also update in programs array if exists
        if (Array.isArray(master.programs)) {
            for (const p of master.programs) {
                if (p && p.title && p.title.toLowerCase() === programTitle.toLowerCase()) {
                    p.imageUrl = imageUrl;
                    break;
                }
            }
        }

        master.updatedAt = new Date().toISOString();

        // 4. Save back to Supabase
        const saveRes = await fetch(`${SUPABASE_URL}/site_settings`, {
            method: 'POST',
            headers: supabaseHeaders,
            body: JSON.stringify({
                key: 'master_bundle',
                value: master,
                updated_at: master.updatedAt
            })
        });

        if (!saveRes.ok) {
            const errText = await saveRes.text();
            console.error('[sync-photo] Supabase save error:', errText);
            return res.status(500).json({ error: 'Failed to save to Supabase', detail: errText });
        }

        console.log(`[sync-photo] ✅ Photo saved for "${programTitle}" (${imageUrl.length > 100 ? imageUrl.substring(0, 30) + '... [base64]' : imageUrl})`);

        return res.status(200).json({
            success: true,
            message: `Photo for "${programTitle}" saved to Supabase master_bundle.specific_prog_imgs`,
            updatedAt: master.updatedAt
        });

    } catch(e) {
        console.error('[sync-photo] Error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
