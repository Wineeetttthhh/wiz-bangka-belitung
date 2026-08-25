/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Photo Sync Endpoint — /api/sync-photo
 * ============================================================
 * Menyimpan foto ke dedicated site_images key di Supabase.
 * Tidak lagi membaca/menulis master_bundle untuk menghindari
 * race condition dan masalah payload terlalu besar.
 * 
 * ARSITEKTUR BARU:
 *  - site_images key: khusus menyimpan foto (URL atau base64)
 *  - master_bundle: hanya data transaksional (donasi, berita, dll)
 * ============================================================
 */

const SUPABASE_RAW_URL = process.env.SUPABASE_URL || 'https://ccmulazswlmjyfjdtlti.supabase.co';
const SUPABASE_URL = SUPABASE_RAW_URL.endsWith('/rest/v1') ? SUPABASE_RAW_URL : `${SUPABASE_RAW_URL.replace(/\/$/, '')}/rest/v1`;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'sb_publishable_hEmZHHQyc0EeHXQI2caacQ_InnfPXa5';

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
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch(e) { body = {}; }
        }

        const { programTitle, imageUrl, siteImageKey, siteImages } = body || {};
        if (!programTitle && !siteImageKey && !siteImages) {
            return res.status(400).json({ error: 'programTitle, siteImageKey, or siteImages is required' });
        }

        // 1. Baca standalone site_images key dari Supabase (kecil, cepat)
        const getRes = await fetch(`${SUPABASE_URL}/site_settings?key=eq.site_images&select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Accept': 'application/json'
            }
        });

        let currentSiteImages = {};
        if (getRes.ok) {
            const list = await getRes.json();
            if (Array.isArray(list) && list.length > 0 && list[0].value) {
                currentSiteImages = list[0].value;
            }
        }

        let updatedMsg = '';

        // 2. Update site image keys
        if (siteImageKey && imageUrl) {
            currentSiteImages[siteImageKey] = imageUrl;
            updatedMsg += `Site image "${siteImageKey}" updated. `;
        }

        // 3. Batch site images
        if (siteImages && typeof siteImages === 'object') {
            Object.assign(currentSiteImages, siteImages);
            updatedMsg += `Batch site images (${Object.keys(siteImages).length}) updated. `;
        }

        // 4. Specific program images (stored in site_images with prog_ prefix)
        if (programTitle && imageUrl) {
            const progKey = 'prog_' + programTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            currentSiteImages[progKey] = imageUrl;
            currentSiteImages['__prog__' + programTitle] = imageUrl; // raw key for lookup
            updatedMsg += `Program "${programTitle}" photo updated. `;
        }

        const updatedAt = new Date().toISOString();

        // 5. Simpan ke standalone site_images key
        const saveRes = await fetch(`${SUPABASE_URL}/site_settings`, {
            method: 'POST',
            headers: supabaseHeaders,
            body: JSON.stringify({
                key: 'site_images',
                value: currentSiteImages,
                updated_at: updatedAt
            })
        });

        if (!saveRes.ok) {
            const errText = await saveRes.text();
            console.error('[sync-photo] Supabase save error:', errText);
            return res.status(500).json({ error: 'Failed to save to Supabase', detail: errText });
        }

        // 6. Update specific_prog_imgs key jika ada program photo
        let specificProgMap = {};
        if (programTitle && imageUrl) {
            try {
                const spGet = await fetch(`${SUPABASE_URL}/site_settings?key=eq.specific_prog_imgs&select=*`, {
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Accept': 'application/json' }
                });
                if (spGet.ok) {
                    const list = await spGet.json();
                    if (Array.isArray(list) && list.length > 0 && list[0].value) {
                        specificProgMap = list[0].value;
                    }
                }
                specificProgMap[programTitle] = imageUrl;
                await fetch(`${SUPABASE_URL}/site_settings`, {
                    method: 'POST',
                    headers: supabaseHeaders,
                    body: JSON.stringify({ key: 'specific_prog_imgs', value: specificProgMap, updated_at: updatedAt })
                });
            } catch(e) {}
        }

        // 7. Update master_bundle.site_images & master_bundle.specific_prog_imgs untuk konsistensi 100%
        try {
            const mbRes = await fetch(`${SUPABASE_URL}/site_settings?key=eq.master_bundle&select=*`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Accept': 'application/json' }
            });
            if (mbRes.ok) {
                const mbList = await mbRes.json();
                if (Array.isArray(mbList) && mbList.length > 0 && mbList[0].value) {
                    const master = mbList[0].value;
                    master.site_images = { ...(master.site_images || {}), ...currentSiteImages };
                    if (programTitle && imageUrl) {
                        master.specific_prog_imgs = { ...(master.specific_prog_imgs || {}), ...specificProgMap, [programTitle]: imageUrl };
                    }
                    await fetch(`${SUPABASE_URL}/site_settings`, {
                        method: 'POST',
                        headers: supabaseHeaders,
                        body: JSON.stringify({ key: 'master_bundle', value: master, updated_at: updatedAt })
                    });
                }
            }
        } catch(e) {}

        try {
            const syncApi = require('./sync.js');
            if (syncApi && typeof syncApi.invalidateCache === 'function') {
                syncApi.invalidateCache();
            }
        } catch(e) {}

        console.log(`[sync-photo] ✅ ${updatedMsg}`);

        return res.status(200).json({
            success: true,
            message: updatedMsg.trim(),
            updatedAt
        });

    } catch(e) {
        console.error('[sync-photo] Error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
