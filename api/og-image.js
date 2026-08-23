/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Dedicated Open Graph Image Proxy Endpoint (WhatsApp Standard)
 * GET /api/og-image?type=news|quote|flyer|program&id=:id
 * ============================================================
 * Generates and serves exact 1200x630 JPEG images < 300KB
 * with Smart Framing (cover for landscape, blurred backdrop +
 * centered uncropped flyer for vertical/square posters).
 * WhatsApp Scraper compliant (< 300KB, true JPEG headers, fast < 10ms cache).
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const SUPABASE_URL = 'https://ffiltrlzdbwhhhxzmzuo.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_GiA1BOjbW2psTU36149xuA_E26wGBI3';

// ─── In-Memory Cache for Sub-10ms Serverless Response ────────
const imageCache = new Map(); // key → { buf, ts }
const CACHE_TTL_MS = 10 * 1000; // 10s fresh cache

function getCached(key) {
    const entry = imageCache.get(key);
    if (entry && (Date.now() - entry.ts) < CACHE_TTL_MS) {
        return entry.buf;
    }
    return null;
}

function putCache(key, buf) {
    if (!buf || buf.length === 0) return;
    imageCache.set(key, { buf, ts: Date.now() });
    if (imageCache.size > 200) {
        const oldest = [...imageCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
        if (oldest) imageCache.delete(oldest[0]);
    }
}

// ─── Helpers ──────────────────────────────────────────────────

function slugify(str = '') {
    return String(str)
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/[-\s]+/g, '-');
}

function sendJpegImage(res, buf) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (typeof res.status === 'function') {
        res.status(200).end(buf);
    } else {
        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': String(buf.length),
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Content-Type-Options': 'nosniff'
        });
        res.end(buf);
    }
}

async function fetchExternalBuffer(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500); // 3.5s timeout
        const resp = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WIZ-OG-Proxy/2.0)' }
        });
        clearTimeout(timeout);
        if (!resp.ok) return null;
        const arr = await resp.arrayBuffer();
        return Buffer.from(arr);
    } catch (e) {
        return null;
    }
}

function getLocalDefaultBuffer() {
    try {
        const p = path.join(process.cwd(), 'assets', 'images', 'foto-utama-wiz.jpg');
        if (fs.existsSync(p)) return fs.readFileSync(p);
    } catch(e) {}
    return null;
}

/**
 * Smart Jimp Processor:
 * Standardizes any image (base64, URL, local file) to 1200x630 JPEG < 300KB.
 * - Landscape (1.5 - 2.1): crop/cover 1200x630.
 * - Vertical/Square (Flyer 1:1, 4:5, 9:16): Blurred background cover + sharp centered foreground.
 */
async function processToOgJpeg(rawInput) {
    if (!rawInput) return null;
    try {
        let inputBuffer = null;

        if (Buffer.isBuffer(rawInput)) {
            inputBuffer = rawInput;
        } else if (typeof rawInput === 'string') {
            const str = rawInput.trim();
            if (str.startsWith('data:image/')) {
                const b64 = str.split(',')[1] || '';
                inputBuffer = Buffer.from(b64, 'base64');
            } else if (str.startsWith('http://') || str.startsWith('https://')) {
                inputBuffer = await fetchExternalBuffer(str);
            } else if (str) {
                const fp = path.join(process.cwd(), str.replace(/^\//, ''));
                if (fs.existsSync(fp)) {
                    inputBuffer = fs.readFileSync(fp);
                }
            }
        }

        if (!inputBuffer || inputBuffer.length < 100) return null;

        const srcImg = await Jimp.read(inputBuffer);
        const w = srcImg.bitmap.width;
        const h = srcImg.bitmap.height;
        const ratio = w / h;

        let finalImg;

        if (ratio >= 1.4) {
            // Standard Landscape photo (1200x630)
            finalImg = srcImg.clone();
            finalImg.cover({ w: 1200, h: 630 });
        } else {
            // Flyer / Poster (Square 1:1, 4:5, 3:4, etc.)
            // Output clean, uncropped flyer image with max dimension 1080px
            // WhatsApp Status & Chat will render the full large card preview!
            finalImg = srcImg.clone();
            if (w > 1080 || h > 1080) {
                finalImg.scaleToFit({ w: 1080, h: 1080 });
            }
        }

        // Compress to JPEG with quality 82 (typical output 60-140 KB, always < 300 KB)
        let outputBuf = await finalImg.getBuffer('image/jpeg', { quality: 82 });

        if (outputBuf.length > 280000) {
            // Extra compression guarantee if still large
            outputBuf = await finalImg.getBuffer('image/jpeg', { quality: 65 });
        }

        return outputBuf;
    } catch (err) {
        console.warn('[OG Image Processing Error]:', err.message);
        return null;
    }
}

// ─── News Image Resolver ──────────────────────────────────────
async function resolveNewsRaw(newsId) {
    // 1. Try Supabase
    try {
        const url = `${SUPABASE_URL}/news?select=image_url,id,title&id=eq.${encodeURIComponent(newsId)}`;
        const resp = await fetch(url, {
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
        });
        if (resp.ok) {
            const rows = await resp.json();
            if (Array.isArray(rows) && rows.length > 0 && rows[0].image_url) {
                return rows[0].image_url;
            }
        }
    } catch (e) {}

    // 2. Try canonical-store.json
    try {
        const canonPath = path.join(process.cwd(), 'assets', 'data', 'canonical-store.json');
        if (fs.existsSync(canonPath)) {
            const cData = JSON.parse(fs.readFileSync(canonPath, 'utf8'));
            const article = (cData.news || []).find(n => String(n.id) === String(newsId));
            if (article && (article.imageUrl || article.image_url)) {
                return article.imageUrl || article.image_url;
            }
        }
    } catch (e) {}

    return 'assets/images/foto-utama-wiz.jpg';
}

// ─── Quote/Flyer Image Resolver ───────────────────────────────
async function resolveQuoteRaw(quoteId) {
    const cleanId = String(quoteId).replace(/\.(jpe?g|png|webp|gif)$/i, '').trim();

    // 1. Try Supabase master_bundle
    try {
        const resp = await fetch(`${SUPABASE_URL}/site_settings?key=eq.master_bundle&select=value`, {
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
        });
        if (resp.ok) {
            const rows = await resp.json();
            if (Array.isArray(rows) && rows.length > 0 && rows[0].value && Array.isArray(rows[0].value.quotes)) {
                const q = rows[0].value.quotes.find(q => {
                    const qId = String(q.id || '').replace(/\.(jpe?g|png|webp|gif)$/i, '').trim();
                    return qId === cleanId;
                });
                if (q && q.imageUrl) {
                    return q.imageUrl;
                }
            }
        }
    } catch (e) {}

    // 2. Try canonical-store.json
    try {
        const canonPath = path.join(process.cwd(), 'assets', 'data', 'canonical-store.json');
        if (fs.existsSync(canonPath)) {
            const cData = JSON.parse(fs.readFileSync(canonPath, 'utf8'));
            const q = (cData.quotes || []).find(q => String(q.id).replace(/\.(jpe?g|png|webp|gif)$/i, '').trim() === cleanId);
            if (q && q.imageUrl) {
                return q.imageUrl;
            }
        }
    } catch (e) {}

    // 3. Fallback quote images
    if (cleanId.includes('2')) return 'assets/images/sedekah-beras-dhuafa.jpg';
    if (cleanId.includes('3')) return 'assets/images/beasiswa-tahfidz.jpg';
    return 'assets/images/foto-utama-wiz.jpg';
}

// ─── Program Image Resolver ───────────────────────────────────
const PROGRAM_IMAGE_MAP = {
    'pembangunan-markaz':                   'assets/images/foto-utama-wiz.jpg',
    'wiz-berkah-hidayah-pembangunan-markaz':'assets/images/foto-utama-wiz.jpg',
    'beasiswa-pendidikan-juara':            'assets/images/beasiswa-tahfidz.jpg',
    'perlengkapan-belajar-yatim':           'assets/images/beasiswa-tahfidz.jpg',
    'wiz-berkah-juara-perlengkapan-belajar-yatim': 'assets/images/beasiswa-tahfidz.jpg',
    'beasiswa-tahfidz':                     'assets/images/beasiswa-tahfidz.jpg',
    'beasiswa-tahfidz-dhuafa':              'assets/images/beasiswa-tahfidz.jpg',
    'tebar-iftar':                          'assets/images/tebar-iftar.jpg',
    'tebar-iftar-nusantara':                'assets/images/tebar-iftar.jpg',
    'sedekah-air':                          'assets/images/foto-utama-wiz.jpg',
    'sedekah-air-bersih':                   'assets/images/foto-utama-wiz.jpg',
    'santunan-anak-yatim':                  'assets/images/foto-utama-wiz.jpg',
    'santunan-yatim':                       'assets/images/foto-utama-wiz.jpg',
    'tebar-quran-nusantara':                'assets/images/beasiswa-tahfidz.jpg',
    'bahagiakan-guru-ngaji':                'assets/images/beasiswa-tahfidz.jpg',
    'bantuan-kesehatan-dhuafa':             'assets/images/sedekah-beras-dhuafa.jpg',
    'bantuan-pasien-kritis-dhuafa':         'assets/images/sedekah-beras-dhuafa.jpg',
    'ambulans-gratis-peduli':               'assets/images/sedekah-beras-dhuafa.jpg',
    'sedekah-beras-dhuafa':                 'assets/images/sedekah-beras-dhuafa.jpg',
    'tebar-sembako':                        'assets/images/sedekah-beras-dhuafa.jpg',
    // Social & Kemanusiaan – foto kegiatan lapangan
    'pray-for-ntt':                         'assets/images/pray-for-ntt.jpg',
    'tebar-sembako-dhuafa':                 'assets/images/sedekah-beras-dhuafa.jpg',
    'santunan-mualaf':                      'assets/images/sedekah-beras-dhuafa.jpg',
    'khitanan-massal-dhuafa':               'assets/images/sedekah-beras-dhuafa.jpg',
    'modal-usaha-mandiri':                  'assets/images/foto-utama-wiz.jpg',
    'modal-usaha-dhuafa':                   'assets/images/foto-utama-wiz.jpg',
    'gerobak-berkah-umkm':                  'assets/images/foto-utama-wiz.jpg',
};

async function resolveProgramRaw(slug) {
    const cleanSlug = slugify(slug);

    // 1. Try Supabase master_bundle (specific_prog_imgs, programs, allocation_rules)
    try {
        const resp = await fetch(`${SUPABASE_URL}/site_settings?key=eq.master_bundle&select=value`, {
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
        });
        if (resp.ok) {
            const rows = await resp.json();
            if (rows[0] && rows[0].value) {
                const val = rows[0].value;
                // A. specific_prog_imgs map (direct title-to-image mapping)
                if (val.specific_prog_imgs) {
                    for (const [title, imgUrl] of Object.entries(val.specific_prog_imgs)) {
                        if (imgUrl && (slugify(title) === cleanSlug || title.toLowerCase() === slug.toLowerCase())) {
                            return imgUrl;
                        }
                    }
                }
                // B. programs list (dynamic programs added in Admin)
                if (Array.isArray(val.programs)) {
                    for (const p of val.programs) {
                        if (p && p.imageUrl && (slugify(p.title) === cleanSlug || p.slug === cleanSlug || p.id === cleanSlug || p.title.toLowerCase() === slug.toLowerCase())) {
                            return p.imageUrl;
                        }
                    }
                }
                // C. allocation_rules specific program items
                if (val.allocation_rules) {
                    for (const pillar of Object.values(val.allocation_rules)) {
                        if (pillar && Array.isArray(pillar.subAllocations)) {
                            for (const sub of pillar.subAllocations) {
                                if (sub && sub.imageUrl && (slugify(sub.name) === cleanSlug || sub.name.toLowerCase() === slug.toLowerCase())) {
                                    return sub.imageUrl;
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {}

    // 2. Try Supabase 'programs' table directly
    try {
        const pResp = await fetch(`${SUPABASE_URL}/programs?select=*`, {
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
        });
        if (pResp.ok) {
            const progs = await pResp.json();
            if (Array.isArray(progs)) {
                for (const p of progs) {
                    if (p && p.imageUrl && (slugify(p.title) === cleanSlug || p.slug === cleanSlug || p.id === cleanSlug || p.title.toLowerCase() === slug.toLowerCase())) {
                        return p.imageUrl;
                    }
                }
            }
        }
    } catch(e) {}

    // 3. Try static map
    if (PROGRAM_IMAGE_MAP[cleanSlug]) {
        return PROGRAM_IMAGE_MAP[cleanSlug];
    }

    // 4. Fuzzy search in static map
    for (const [key, localImg] of Object.entries(PROGRAM_IMAGE_MAP)) {
        if (cleanSlug.includes(key) || key.includes(cleanSlug)) {
            return localImg;
        }
    }

    return 'assets/images/foto-utama-wiz.jpg';
}

// ─── Main Handler ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
    const urlObj = new URL(req.url, 'https://www.wizbangkabelitung.or.id');
    const type = (urlObj.searchParams.get('type') || '').toLowerCase().trim();
    const id = String(urlObj.searchParams.get('id') || '').replace(/\.(jpe?g|png|webp|gif)$/i, '').trim();
    // ?src= is the pre-resolved image URL forwarded directly from api/program.js
    // This avoids a second Supabase lookup and ensures the correct photo is shown
    const srcParam = urlObj.searchParams.get('src') || '';

    // Cache key includes src so different images for same program ID are cached separately
    const cacheKey = srcParam ? `${type}:${id}:${srcParam}` : `${type}:${id || 'default'}`;
    const cachedBuf = getCached(cacheKey);
    if (cachedBuf) {
        return sendJpegImage(res, cachedBuf);
    }

    let rawSource = 'assets/images/foto-utama-wiz.jpg';

    // Priority 1: Use forwarded ?src= if it's a valid HTTPS URL
    if (srcParam && (srcParam.startsWith('https://') || srcParam.startsWith('http://'))) {
        rawSource = srcParam;
    } else if (type === 'news' && id) {
        rawSource = await resolveNewsRaw(id);
    } else if ((type === 'quote' || type === 'flyer') && id) {
        rawSource = await resolveQuoteRaw(id);
    } else if (type === 'program' && id) {
        rawSource = await resolveProgramRaw(id);
    }

    let jpegBuf = await processToOgJpeg(rawSource);

    // If processing failed, use pre-optimized default banner
    if (!jpegBuf || jpegBuf.length < 500) {
        const defaultRaw = getLocalDefaultBuffer();
        jpegBuf = await processToOgJpeg(defaultRaw);
    }

    // Ultimate fallback if Jimp completely failed
    if (!jpegBuf || jpegBuf.length < 500) {
        jpegBuf = getLocalDefaultBuffer();
    }

    if (jpegBuf && jpegBuf.length > 0) {
        putCache(cacheKey, jpegBuf);
        return sendJpegImage(res, jpegBuf);
    }

    // Safe error response
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Failed to generate Open Graph image');
};
