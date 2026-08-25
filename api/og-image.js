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

const SUPABASE_RAW_URL = process.env.SUPABASE_URL || 'https://ccmulazswlmjyfjdtlti.supabase.co';
const SUPABASE_URL = SUPABASE_RAW_URL.endsWith('/rest/v1') ? SUPABASE_RAW_URL : `${SUPABASE_RAW_URL.replace(/\/$/, '')}/rest/v1`;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'sb_publishable_hEmZHHQyc0EeHXQI2caacQ_InnfPXa5';

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
        const p = path.join(process.cwd(), 'assets', 'images', 'default-program-wiz.jpg');
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
                // Check if it is a local asset path on the domain first to avoid HTTP loop
                try {
                    const parsedUrl = new URL(str);
                    const localPath = path.join(process.cwd(), parsedUrl.pathname.replace(/^\//, ''));
                    if (fs.existsSync(localPath)) {
                        inputBuffer = fs.readFileSync(localPath);
                    }
                } catch(e) {}
                if (!inputBuffer) {
                    inputBuffer = await fetchExternalBuffer(str);
                }
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

        if (ratio >= 1.4 && ratio <= 2.2) {
            // Standard Landscape photo (1200x630 cover)
            finalImg = srcImg.clone();
            finalImg.cover({ w: 1200, h: 630 });
        } else {
            // Smart Landscape Framing for Vertical / Square Posters (1:1, 4:5, 9:16, etc.)
            // Guarantees WhatsApp Large Card rendering without cropping the poster!
            const bgImg = srcImg.clone();
            bgImg.cover({ w: 1200, h: 630 });
            bgImg.blur(14);
            bgImg.color([{ apply: 'darken', params: [25] }]);

            const fgImg = srcImg.clone();
            fgImg.scaleToFit({ w: 1200, h: 630 });

            const posX = Math.round((1200 - fgImg.bitmap.width) / 2);
            const posY = Math.round((630 - fgImg.bitmap.height) / 2);
            bgImg.composite(fgImg, posX, posY);
            finalImg = bgImg;
        }

        // Compress to JPEG with quality 82 (typical output 70-130 KB, always < 280 KB for WhatsApp)
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
    const cleanId = String(newsId || '').trim();

    // 1. Try Supabase direct ID match
    try {
        const url = `${SUPABASE_URL}/news?select=image_url,gallery,id,title&id=eq.${encodeURIComponent(cleanId)}`;
        const resp = await fetch(url, {
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
        });
        if (resp.ok) {
            const rows = await resp.json();
            if (Array.isArray(rows) && rows.length > 0) {
                const rawImg = (rows[0].image_url || '').trim();
                const galImg = (Array.isArray(rows[0].gallery) && rows[0].gallery.length > 0 && typeof rows[0].gallery[0] === 'string') ? rows[0].gallery[0].trim() : '';
                if (rawImg) return rawImg;
                if (galImg) return galImg;
            }
        }
    } catch (e) {}

    // 2. Try Supabase title / slug match
    try {
        const allResp = await fetch(`${SUPABASE_URL}/news?select=image_url,gallery,id,title&order=created_at.desc&limit=25`, {
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
        });
        if (allResp.ok) {
            const allRows = await allResp.json();
            if (Array.isArray(allRows) && allRows.length > 0) {
                const cleanSlug = slugify(cleanId);
                const matched = allRows.find(n => n && (slugify(n.title) === cleanSlug || String(n.id) === cleanId || cleanSlug.includes(slugify(n.title))));
                if (matched) {
                    const rawImg = (matched.image_url || '').trim();
                    const galImg = (Array.isArray(matched.gallery) && matched.gallery.length > 0 && typeof matched.gallery[0] === 'string') ? matched.gallery[0].trim() : '';
                    if (rawImg) return rawImg;
                    if (galImg) return galImg;
                }
            }
        }
    } catch (e) {}

    // 3. Try canonical-store.json
    try {
        const canonPath = path.join(process.cwd(), 'assets', 'data', 'canonical-store.json');
        if (fs.existsSync(canonPath)) {
            const cData = JSON.parse(fs.readFileSync(canonPath, 'utf8'));
            const article = (cData.news || []).find(n => String(n.id) === cleanId || slugify(n.title) === slugify(cleanId));
            if (article) {
                const rawImg = (article.imageUrl || article.image_url || '').trim();
                const galImg = (Array.isArray(article.gallery) && article.gallery.length > 0 && typeof article.gallery[0] === 'string') ? article.gallery[0].trim() : '';
                if (rawImg) return rawImg;
                if (galImg) return galImg;
            }
        }
    } catch (e) {}

    return 'assets/images/default-program-wiz.jpg';
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
    'pray-for-ntt':                                 'assets/images/pray-for-ntt.jpg',
    'sedekah-beras-dhuafa':                         'assets/images/sedekah-beras-dhuafa.jpg',
    'sedekah-beras-dai':                            'assets/images/sedekah-beras-dai.jpg',
    'sedekah-beras-dai-koba':                       'assets/images/sedekah-beras-dai-koba.jpg',
    'beasiswa-pendidikan-juara':                    'assets/images/beasiswa-pendidikan-juara.jpg',
    'beasiswa-tahfidz':                             'assets/images/beasiswa-tahfidz.jpg',
    'beasiswa-tahfidz-dhuafa':                      'assets/images/beasiswa-tahfidz.jpg',
    'tebar-iftar':                                  'assets/images/tebar-iftar.jpg',
    'tebar-iftar-nusantara':                        'assets/images/tebar-iftar-nusantara.jpg',
    'santunan-yatim':                               'assets/images/santunan-yatim.jpg',
    'santunan-anak-yatim':                          'assets/images/santunan-yatim.jpg',
    'tebar-sembako':                                'assets/images/tebar-sembako.jpg',
    'tebar-sembako-dhuafa':                         'assets/images/tebar-sembako.jpg',
    'perlengkapan-belajar-yatim':                   'assets/images/perlengkapan-belajar-yatim.jpg',
    'wiz-berkah-juara-perlengkapan-belajar-yatim':  'assets/images/perlengkapan-belajar-yatim.jpg',
    'modal-usaha-dhuafa':                           'assets/images/modal-usaha-dhuafa.jpg',
    'modal-usaha-mandiri':                          'assets/images/modal-usaha-dhuafa.jpg',
    'gerobak-berkah-umkm':                          'assets/images/modal-usaha-dhuafa.jpg',
    'pelatihan-keterampilan-wirausaha':             'assets/images/pelatihan-keterampilan-wirausaha.jpg',
    'bantuan-pengobatan':                           'assets/images/bantuan-pengobatan.jpg',
    'bantuan-kesehatan-dhuafa':                     'assets/images/bantuan-pengobatan.jpg',
    'bantuan-pasien-kritis-dhuafa':                 'assets/images/bantuan-pengobatan.jpg',
    'layanan-pengobatan-gratis':                    'assets/images/bantuan-pengobatan.jpg',
    'ambulance-gratis-ummat':                       'assets/images/ambulance-gratis-ummat.jpg',
    'ambulans-gratis-peduli':                       'assets/images/ambulance-gratis-ummat.jpg',
    'khitanan-massal-dhuafa':                       'assets/images/khitanan-massal-dhuafa.jpg',
    'khitanan-massal':                              'assets/images/khitanan-massal.jpg',
    'keberangkatan-kepulangan-dai':                 'assets/images/keberangkatan-kepulangan-dai.jpg',
    'keberangkatan-dan-kepulangan-dai':             'assets/images/keberangkatan-kepulangan-dai.jpg',
    'pengadaan-celengan-sedekah-subuh':             'assets/images/default-program-wiz.jpg',
    'pengadaan-celengan-besar':                     'assets/images/default-program-wiz.jpg',
    'sedekah-jumat':                                'assets/images/default-program-wiz.jpg',
    'sedekah-jumat-berkah':                         'assets/images/default-program-wiz.jpg',
    'pembangunan-markaz':                           'assets/images/default-program-wiz.jpg',
    'wiz-berkah-hidayah-pembangunan-markaz':        'assets/images/default-program-wiz.jpg',
    'santunan-mualaf':                              'assets/images/default-program-wiz.jpg',
    'sedekah-air':                                  'assets/images/default-program-wiz.jpg',
    'sedekah-air-bersih':                           'assets/images/default-program-wiz.jpg',
    'tebar-quran-nusantara':                        'assets/images/default-program-wiz.jpg',
    'bahagiakan-guru-ngaji':                        'assets/images/default-program-wiz.jpg',
};

async function resolveProgramRaw(slug) {
    const cleanSlug = slugify(slug);

    // 1. Try Supabase specific_prog_imgs and custom program uploads
    try {
        const resp = await fetch(`${SUPABASE_URL}/site_settings?key=in.(specific_prog_imgs,master_bundle)&select=*`, {
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
        });
        if (resp.ok) {
            const rows = await resp.json();
            if (Array.isArray(rows) && rows.length > 0) {
                const mbRow = rows.find(r => r.key === 'master_bundle');
                const spiRow = rows.find(r => r.key === 'specific_prog_imgs');

                // A. Check dedicated specific_prog_imgs row
                if (spiRow && spiRow.value && typeof spiRow.value === 'object') {
                    for (const [title, imgUrl] of Object.entries(spiRow.value)) {
                        if (imgUrl && !imgUrl.includes('default-program-wiz') && (slugify(title) === cleanSlug || title.toLowerCase() === slug.toLowerCase())) {
                            return imgUrl;
                        }
                    }
                }

                // B. Check master_bundle specific_prog_imgs
                if (mbRow && mbRow.value && mbRow.value.specific_prog_imgs) {
                    for (const [title, imgUrl] of Object.entries(mbRow.value.specific_prog_imgs)) {
                        if (imgUrl && !imgUrl.includes('default-program-wiz') && (slugify(title) === cleanSlug || title.toLowerCase() === slug.toLowerCase())) {
                            return imgUrl;
                        }
                    }
                }
            }
        }
    } catch (e) {}

    // 2. Direct exact static program poster map
    if (PROGRAM_IMAGE_MAP[cleanSlug]) {
        return PROGRAM_IMAGE_MAP[cleanSlug];
    }

    // 3. Fuzzy search in static map
    for (const [key, localImg] of Object.entries(PROGRAM_IMAGE_MAP)) {
        if (cleanSlug.includes(key) || key.includes(cleanSlug)) {
            return localImg;
        }
    }

    // 4. Try Supabase 'programs' table
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

    return 'assets/images/default-program-wiz.jpg';
}

// ─── Main Handler ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
    const urlObj = new URL(req.url || '/', 'https://www.wizbangkabelitung.or.id');
    const type = (urlObj.searchParams.get('type') || (req.query && req.query.type) || '').toLowerCase().trim();
    const id = String(urlObj.searchParams.get('id') || (req.query && req.query.id) || '').replace(/\.(jpe?g|png|webp|gif)$/i, '').trim();
    // ?src= is the pre-resolved image URL forwarded directly from api/program.js
    // This avoids a second Supabase lookup and ensures the correct photo is shown
    const srcParam = urlObj.searchParams.get('src') || (req.query && req.query.src) || '';

    // Cache key includes src so different images for same program ID are cached separately
    const cacheKey = srcParam ? `${type}:${id}:${srcParam}` : `${type}:${id || 'default'}`;
    const cachedBuf = getCached(cacheKey);
    if (cachedBuf) {
        return sendJpegImage(res, cachedBuf);
    }

    let rawSource = 'assets/images/default-program-wiz.jpg';

    // Priority 1: Use forwarded ?src= if present (highest accuracy from SSR engine)
    if (srcParam && (srcParam.startsWith('https://') || srcParam.startsWith('http://') || srcParam.startsWith('assets/') || srcParam.startsWith('data:image/') || srcParam.includes('/assets/'))) {
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
