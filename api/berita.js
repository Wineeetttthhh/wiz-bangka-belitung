/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Dynamic News Reader & Social Media Open Graph Generator
 * Endpoint: /berita/:id  or  /api/berita?id=:id
 * Direct Image: /berita-image/:id.jpg  or  /api/berita?id=:id&img=1
 * ============================================================
 * Menghasilkan kartu preview Open Graph (OG) kaya foto
 * untuk WhatsApp Chat, WhatsApp Story, Facebook, Twitter/X,
 * Telegram, dan LinkedIn.
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// Supabase Configuration
const SUPABASE_RAW_URL = process.env.SUPABASE_URL || 'https://ccmulazswlmjyfjdtlti.supabase.co';
const SUPABASE_URL = SUPABASE_RAW_URL.endsWith('/rest/v1') ? SUPABASE_RAW_URL : `${SUPABASE_RAW_URL.replace(/\/$/, '')}/rest/v1`;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'sb_publishable_hEmZHHQyc0EeHXQI2caacQ_InnfPXa5';

// In-memory cache for ultra-fast serverless execution
let cachedNewsMap = new Map();
let cachedNewsAll = null;
let cachedNewsTime = 0;
const CACHE_TTL_MS = 20000; // 20s

async function supabaseGetNews(newsId) {
    if (newsId && cachedNewsMap.has(newsId) && (Date.now() - cachedNewsTime < CACHE_TTL_MS)) {
        return [cachedNewsMap.get(newsId)];
    }
    if (!newsId && cachedNewsAll && (Date.now() - cachedNewsTime < CACHE_TTL_MS)) {
        return cachedNewsAll;
    }

    try {
        let url = `${SUPABASE_URL}/news?select=*`;
        if (newsId) {
            url += `&id=eq.${encodeURIComponent(newsId)}`;
        }
        const res = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Accept': 'application/json'
            }
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (Array.isArray(data)) {
            if (newsId && data.length > 0) {
                cachedNewsMap.set(newsId, data[0]);
            } else if (!newsId) {
                cachedNewsAll = data;
                data.forEach(n => { if (n && n.id) cachedNewsMap.set(String(n.id), n); });
            }
            cachedNewsTime = Date.now();
            return data;
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Canonical seed fallback
function getCanonicalData() {
    try {
        const filePath = path.join(process.cwd(), 'assets', 'data', 'canonical-store.json');
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn('[Berita API] Error reading canonical-store.json:', e.message);
    }
    return { news: [] };
}

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDateIndo(isoStr) {
    if (!isoStr) return '-';
    try {
        const d = new Date(isoStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch(e) {
        return isoStr;
    }
}

function getMimeType(filePathOrDataUrl) {
    if (!filePathOrDataUrl) return 'image/jpeg';
    const s = String(filePathOrDataUrl).toLowerCase();
    if (s.startsWith('data:image/png') || s.endsWith('.png')) return 'image/png';
    if (s.startsWith('data:image/webp') || s.endsWith('.webp')) return 'image/webp';
    if (s.startsWith('data:image/gif') || s.endsWith('.gif')) return 'image/gif';
    if (s.endsWith('.svg')) return 'image/svg+xml';
    return 'image/jpeg';
}

module.exports = async function handler(req, res) {
    const origin = 'https://www.wizbangkabelitung.or.id';
    const urlObj = new URL(req.url, `http://${req.headers.host || 'www.wizbangkabelitung.or.id'}`);
    let newsId = (req.query && req.query.id) || urlObj.searchParams.get('id') || urlObj.searchParams.get('newsId');
    const isImageRequest = urlObj.searchParams.get('img') === '1' || 
                           urlObj.searchParams.has('img') ||
                           urlObj.pathname.includes('berita-image') || 
                           urlObj.pathname.includes('berita-img');

    // Parse ID from path /berita/[id] or /berita-image/[id] if applicable
    if (!newsId) {
        const parts = urlObj.pathname.split('/').filter(Boolean);
        const beritaIndex = parts.findIndex(p => p === 'berita' || p === 'berita-image' || p === 'berita-img');
        if (beritaIndex !== -1 && parts[beritaIndex + 1]) {
            newsId = decodeURIComponent(parts[beritaIndex + 1]);
        }
    }

    // Clean newsId: strip extension (.jpg, .png)
    const cleanNewsId = String(newsId || '').replace(/\.(jpe?g|png|webp|gif)$/i, '').trim();

    // 1. Fetch news from Supabase PostgreSQL
    let allNews = [];
    let article = null;
    try {
        const fetched = await supabaseGetNews(cleanNewsId);
        if (Array.isArray(fetched) && fetched.length > 0) {
            if (cleanNewsId) {
                article = fetched[0];
            } else {
                allNews = fetched;
            }
        }
    } catch(e) {}

    // 2. Fallback: check canonical-store.json
    if (!article) {
        const canonical = getCanonicalData();
        const canonList = (canonical && Array.isArray(canonical.news)) ? canonical.news : [];
        if (cleanNewsId) {
            const cleanIdLower = cleanNewsId.toLowerCase();
            article = canonList.find(n => n && (String(n.id) === cleanNewsId || String(n.id).toLowerCase() === cleanIdLower));
            
            // Fuzzy search by title keyword if direct ID match not found
            if (!article) {
                article = canonList.find(n => {
                    const titleLower = String(n.title || '').toLowerCase();
                    return cleanIdLower.split(/[-_\s]+/).some(word => word.length > 3 && titleLower.includes(word));
                });
            }
        }
        if (!article && allNews.length === 0) {
            allNews = canonList;
        }
    }

    // 3. If no specific newsId was passed in URL, default to latest published news
    if (!article && !cleanNewsId && allNews.length > 0) {
        article = allNews.find(n => n && n.status === 'published') || allNews[0];
    }

    // 4. Default fallback article if still not found
    if (!article) {
        article = {
            id: cleanNewsId || 'wiz-berita-default',
            title: 'Berita & Kegiatan Penyaluran — WIZ Bangka Belitung',
            content: 'Dokumentasi kegiatan penyaluran dan pemberdayaan ummat oleh Wahdah Inspirasi Zakat (WIZ) Bangka Belitung. Silakan kunjungi website utama untuk melihat berita dan laporan lengkap.',
            imageUrl: 'assets/images/foto-utama-wiz.jpg',
            image_url: 'assets/images/foto-utama-wiz.jpg',
            category: 'Kegiatan & Penyaluran',
            eventDate: new Date().toISOString(),
            status: 'published',
            author: 'Admin WIZ Babel',
            gallery: []
        };
    }

    // Normalize field names from Supabase snake_case to camelCase
    const title = article.title || 'Berita WIZ Bangka Belitung';
    const rawContent = article.content || '';
    const rawImg = (article.imageUrl || article.image_url || '').trim();
    const eventDate = article.eventDate || article.event_date || article.createdAt || article.created_at || new Date().toISOString();
    const category = article.category || 'Kegiatan & Penyaluran';
    const author = article.author || 'Admin WIZ Babel';
    const gallery = Array.isArray(article.gallery) ? article.gallery.filter(Boolean) : [];
    const mimeType = getMimeType(rawImg);

    // ─── 1. SERVE BINARY IMAGE DIRECTLY IF REQUESTED ─────────────────────────────
    if (isImageRequest) {
        const defaultPath = path.join(process.cwd(), 'assets', 'images', 'foto-utama-wiz.jpg');

        if (rawImg.startsWith('data:image/')) {
            try {
                const base64Data = rawImg.split(',')[1] || '';
                const buffer = Buffer.from(base64Data, 'base64');
                res.setHeader('Content-Type', mimeType);
                res.setHeader('Content-Length', buffer.length);
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
                return res.status(200).end(buffer);
            } catch (err) {
                console.error('[Berita Image API] Base64 error:', err);
            }
        } else if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
            try {
                const imgFetch = await fetch(rawImg);
                if (imgFetch.ok) {
                    const arrayBuf = await imgFetch.arrayBuffer();
                    const buf = Buffer.from(arrayBuf);
                    res.setHeader('Content-Type', imgFetch.headers.get('content-type') || mimeType);
                    res.setHeader('Content-Length', buf.length);
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
                    return res.status(200).end(buf);
                }
            } catch(e) {}
        } else if (rawImg) {
            const cleanPath = rawImg.replace(/^\//, '');
            const fullPath = path.join(process.cwd(), cleanPath);
            if (fs.existsSync(fullPath)) {
                const fileBuf = fs.readFileSync(fullPath);
                res.setHeader('Content-Type', mimeType);
                res.setHeader('Content-Length', fileBuf.length);
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
                return res.status(200).end(fileBuf);
            }
        }

        if (fs.existsSync(defaultPath)) {
            const fileBuf = fs.readFileSync(defaultPath);
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Length', fileBuf.length);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
            return res.status(200).end(fileBuf);
        }

        return res.status(404).send('Image not found');
    }

    // ─── 2. DEDICATED OG IMAGE URL (Direct, Instant & Highest Accuracy) ──────────
    const firstGalleryImg = (Array.isArray(gallery) && gallery.length > 0 && typeof gallery[0] === 'string') ? gallery[0].trim() : '';
    const primaryImg = rawImg || firstGalleryImg || 'assets/images/default-program-wiz.jpg';

    // WhatsApp, Facebook, and Twitter standard proxy: guarantees <280KB, JPEG, and exact framing
    const ogImageUrl = `${origin}/api/og-image?type=news&id=${encodeURIComponent(article.id)}`;
    const secureImgUrl = ogImageUrl;

    // Determine actual page body image (can still use base64/direct for display quality)
    let absoluteImgUrl = ogImageUrl;
    if (primaryImg.startsWith('data:image/')) {
        absoluteImgUrl = `${origin}/berita-image/${encodeURIComponent(article.id)}.jpg`;
    } else if (primaryImg.startsWith('http://') || primaryImg.startsWith('https://')) {
        absoluteImgUrl = primaryImg;
    } else if (primaryImg) {
        absoluteImgUrl = `${origin}/${primaryImg.replace(/^\//, '')}`;
    }

    const refCode = (urlObj.searchParams.get('ref') || urlObj.searchParams.get('affiliate') || urlObj.searchParams.get('perantara') || '').trim();
    const excerpt = rawContent.slice(0, 180).replace(/\r?\n|\r/g, ' ') + (rawContent.length > 180 ? '...' : '');

    const canonicalUrlObj = new URL(`${origin}/berita/${encodeURIComponent(article.id)}`);
    if (refCode) canonicalUrlObj.searchParams.set('ref', refCode);
    const canonicalUrl = canonicalUrlObj.toString();

    const shareUrlObj = new URL(`${origin}/berita/${encodeURIComponent(article.id)}`);
    if (refCode) shareUrlObj.searchParams.set('ref', refCode);
    const shareUrlWithBuster = shareUrlObj.toString();

    const donateUrlObj = new URL(`${origin}/donasi.html`);
    if (refCode) donateUrlObj.searchParams.set('ref', refCode);
    const donateUrl = donateUrlObj.toString();

    const portalUrl = `${origin}/berita`;
    const formattedDate = formatDateIndo(eventDate);

    // Full responsive HTML with Social Media Open Graph Cards & 30-day Referral Engine
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${escapeHtml(title)} | WIZ Bangka Belitung</title>
    <meta name="description" content="${escapeHtml(excerpt)}"/>
    <link rel="icon" href="${origin}/assets/images/logo-wiz-babel.png" type="image/png"/>

    <!-- Open Graph / WhatsApp / Facebook / Instagram / Telegram / LinkedIn -->
    <meta property="og:type" content="website"/>
    <meta property="og:site_name" content="Wahdah Inspirasi Zakat (WIZ) Bangka Belitung"/>
    <meta property="og:locale" content="id_ID"/>
    <meta property="og:url" content="${canonicalUrl}"/>
    <meta property="og:title" content="${escapeHtml(title)}"/>
    <meta property="og:description" content="${escapeHtml(excerpt)}"/>
    <meta property="og:image" content="${ogImageUrl}"/>
    <meta property="og:image:secure_url" content="${ogImageUrl}"/>
    <meta property="og:image:alt" content="${escapeHtml(title)}"/>
    <meta property="og:image:type" content="image/jpeg"/>
    <meta property="og:image:width" content="1200"/>
    <meta property="og:image:height" content="630"/>
    <link rel="image_src" href="${ogImageUrl}"/>
    <meta name="thumbnail" content="${ogImageUrl}"/>
    <meta itemprop="image" content="${ogImageUrl}"/>

    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:site" content="@wizbangkabelitung"/>
    <meta name="twitter:title" content="${escapeHtml(title)}"/>
    <meta name="twitter:description" content="${escapeHtml(excerpt)}"/>
    <meta name="twitter:image" content="${ogImageUrl}"/>

    <!-- Google Fonts & Tailwind -->
    <!-- Google Fonts & Material Icons -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet"/>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#006834',
                        'primary-dark': '#005228',
                        'primary-fixed': '#8ef9ab',
                        secondary: '#F7941D',
                        'inverse-surface': '#293040',
                        'surface-bright': '#f9f9ff',
                        'surface-variant': '#dce2f7',
                        'on-surface-variant': '#3e4a3f'
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        headline: ['Plus Jakarta Sans', 'sans-serif'],
                        'label-md': ['Inter', 'sans-serif'],
                        'body-md': ['Inter', 'sans-serif'],
                        'headline-lg': ['Plus Jakarta Sans', 'sans-serif'],
                        caption: ['Inter', 'sans-serif']
                    }
                }
            }
        };

        // 30-Day Referral Cookie Engine
        (function() {
            const urlParams = new URLSearchParams(window.location.search);
            const ref = urlParams.get('ref') || urlParams.get('affiliate') || urlParams.get('perantara');
            if (ref) {
                const cleanRef = ref.trim().toUpperCase();
                const d = new Date();
                d.setTime(d.getTime() + (40 * 24 * 60 * 60 * 1000));
                document.cookie = "wiz_ref=" + encodeURIComponent(cleanRef) + ";expires=" + d.toUTCString() + ";path=/;max-age=3456000;SameSite=Lax";
                try {
                    localStorage.setItem('wiz_ref_code', cleanRef);
                    localStorage.setItem('wiz_ref_exp', String(d.getTime()));
                    localStorage.setItem('wiz_referral_code', cleanRef);
                    localStorage.setItem('wiz_referral_expiry', d.toISOString());
                    sessionStorage.setItem('wiz_active_ref_id', cleanRef);
                } catch(e) {}
            }
        })();
    </script>
</head>
<body class="bg-[#f9f9ff] text-[#141b2b] font-sans min-h-screen flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900">

    <!-- TopNavBar -->
    <nav class="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200/60 shadow-sm w-full">
        <div class="flex justify-between items-center w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto h-20 sm:h-24 gap-4">
            <a href="${origin}/index.html" class="flex items-center group py-2 shrink-0 max-w-xs">
                <img src="${origin}/assets/images/logo-wiz-babel.png" alt="WIZ Babel" loading="eager" class="object-contain transition-transform group-hover:scale-105 h-12 sm:h-14 w-auto max-w-[160px] block"/>
            </a>
            
            <div class="hidden lg:flex gap-6 xl:gap-8 items-center text-sm font-semibold text-slate-600">
                <a class="hover:text-primary transition-all border-b-2 border-transparent pb-1 whitespace-nowrap" href="${origin}/index.html">Beranda</a>
                <a class="hover:text-primary transition-all border-b-2 border-transparent pb-1 whitespace-nowrap" href="${origin}/index.html#tentang-kami">Tentang Kami</a>
                <a class="hover:text-primary transition-all border-b-2 border-transparent pb-1 whitespace-nowrap" href="${origin}/program.html">Program</a>
                <a class="hover:text-primary transition-all border-b-2 border-transparent pb-1 whitespace-nowrap" href="${origin}/laporan.html">Laporan Transparansi</a>
                <a class="text-primary font-bold transition-all border-b-2 border-primary pb-1 whitespace-nowrap" href="${portalUrl}">Berita &amp; Kegiatan</a>
                <a class="hover:text-primary transition-all border-b-2 border-transparent pb-1 whitespace-nowrap" href="${origin}/index.html#kontak">Kontak</a>
            </div>

            <div class="flex items-center gap-3 shrink-0">
                <a href="${donateUrl}" class="hidden sm:inline-flex bg-[#F7941D] hover:bg-[#e08416] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-95 transition-all shadow-sm items-center gap-1.5 whitespace-nowrap shrink-0">
                    <span class="material-symbols-outlined text-[18px]">favorite</span>
                    <span>Donasi Sekarang</span>
                </a>
            </div>
        </div>
    </nav>

    <!-- Main Content Reader -->
    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-grow w-full">

        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-xs text-slate-500 font-medium mb-6">
            <a href="${origin}/index.html" class="hover:text-primary transition-colors">Beranda</a>
            <span class="text-slate-300">/</span>
            <a href="${portalUrl}" class="hover:text-primary transition-colors">Berita &amp; Kegiatan</a>
            <span class="text-slate-300">/</span>
            <span class="text-slate-900 font-semibold truncate max-w-[200px] sm:max-w-xs">${escapeHtml(title)}</span>
        </nav>

        <!-- Article Card -->
        <article class="bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100 mb-10">

            <!-- Featured Image -->
            <div class="relative w-full bg-slate-900 overflow-hidden group">
                <img src="${escapeHtml(absoluteImgUrl)}" alt="${escapeHtml(title)}" class="w-full h-auto max-h-[500px] object-cover object-center transition-transform duration-700 group-hover:scale-105" onerror="this.src='${origin}/assets/images/foto-utama-wiz.jpg'"/>
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                <span class="absolute top-4 left-4 bg-primary/90 backdrop-blur-md text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-sm">label</span>
                    ${escapeHtml(category)}
                </span>
            </div>

            <!-- Content Area -->
            <div class="p-6 sm:p-10 space-y-6">

                <!-- Meta Header -->
                <div class="space-y-3 border-b border-slate-100 pb-6">
                    <h1 class="font-headline font-extrabold text-2xl sm:text-3xl md:text-4xl text-slate-900 leading-tight">
                        ${escapeHtml(title)}
                    </h1>
                    <div class="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-500 flex-wrap">
                        <div class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-primary text-base">calendar_today</span>
                            <span>${formattedDate}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-primary text-base">person</span>
                            <span>${escapeHtml(author)}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-primary text-base">verified</span>
                            <span class="text-emerald-700 font-semibold">Dokumentasi Resmi WIZ Babel</span>
                        </div>
                    </div>
                </div>

                <!-- Body Text -->
                <div class="prose prose-slate max-w-none text-slate-700 leading-relaxed sm:text-lg whitespace-pre-line space-y-4">
                    ${escapeHtml(rawContent)}
                </div>

                <!-- Gallery Grid if Available -->
                ${gallery.length > 0 ? `
                <div class="pt-6 border-t border-slate-100 space-y-4">
                    <h3 class="font-headline font-bold text-slate-900 text-lg sm:text-xl flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">photo_library</span> Galeri Dokumentasi Penyaluran
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        ${gallery.map(img => `
                        <div class="rounded-2xl overflow-hidden shadow-xs border border-slate-100 group relative aspect-video bg-slate-100">
                            <img src="${img.startsWith('http') ? escapeHtml(img) : origin + '/' + escapeHtml(img.replace(/^\//, ''))}" alt="Galeri Kegiatan" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" onerror="this.src='${origin}/assets/images/foto-utama-wiz.jpg'"/>
                        </div>`).join('')}
                    </div>
                </div>` : ''}

            </div>

            <!-- Call to Action Banner -->
            <div class="p-6 md:p-10 bg-gradient-to-br from-primary/5 via-emerald-50/50 to-primary/5 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h4 class="font-headline font-bold text-slate-900 text-lg">Bagikan Berita Kebaikan Ini</h4>
                    <p class="text-sm text-slate-600 mt-0.5">Ajak keluarga dan kerabat untuk bersama mendukung program keummatan.</p>
                </div>
                <div class="flex items-center gap-3 flex-wrap w-full md:w-auto">
                    <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(shareUrlWithBuster)}" target="_blank" class="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold px-5 py-3 rounded-2xl text-sm shadow-md hover:shadow-lg transition-all active:scale-95">
                        <span class="material-symbols-outlined text-lg">share</span> Share ke WhatsApp
                    </a>
                    <a href="${donateUrl}" class="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-[#F7941D] hover:bg-[#e08416] text-white font-bold px-5 py-3 rounded-2xl text-sm shadow-md hover:shadow-lg transition-all active:scale-95">
                        <span class="material-symbols-outlined text-lg">favorite</span> Salurkan Donasi
                    </a>
                </div>
            </div>

        </article>

    </main>

    <!-- Footer -->
    <footer id="kontak" class="bg-[#293040] text-white w-full px-4 sm:px-6 lg:px-8 py-12 mt-auto">
        <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
            <div class="space-y-4 md:col-span-1">
                <div class="text-2xl font-bold text-white font-headline">WIZ Babel</div>
                <p class="text-sm text-slate-300 leading-relaxed">© <span class="footer-year">2026</span> Wahdah Inspirasi Zakat Bangka Belitung. Amanah &amp; Profesional.</p>
                <p class="text-xs text-slate-400">Jl. Mentok No. 45, Pangkalpinang, Bangka Belitung</p>
                <div class="pt-2">
                    <p class="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">Ikuti Kami</p>
                    <div class="flex items-center gap-3 flex-wrap">
                        <a href="https://www.instagram.com/wahdahinspirasizakatbabel?igsh=dDB6bmsxbWIwbzh0" target="_blank" rel="noopener noreferrer" title="Instagram WIZ Babel" class="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-[#E1306C] transition-all">
                            <svg class="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </a>
                        <a href="https://www.tiktok.com/@wizbangkabelitunglitung?is_from_webapp=1&sender_device=pc" target="_blank" rel="noopener noreferrer" title="TikTok WIZ Babel" class="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-[#010101] transition-all">
                            <svg class="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg>
                        </a>
                        <a href="https://www.facebook.com/share/1CMQ9zBSob/" target="_blank" rel="noopener noreferrer" title="Facebook WIZ Babel" class="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-[#1877F2] transition-all">
                            <svg class="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                        <a href="https://whatsapp.com/channel/0029VbCkB2uA89MnYdae7D1J" target="_blank" rel="noopener noreferrer" title="Saluran WhatsApp WIZ Babel" class="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-[#25D366] transition-all">
                            <svg class="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                        </a>
                    </div>
                </div>
            </div>

            <div class="space-y-4">
                <h4 class="font-bold text-[#8ef9ab]">Tautan Cepat</h4>
                <ul class="space-y-2 text-sm text-slate-300">
                    <li><a class="hover:text-white transition-colors" href="${origin}/program.html">Program Pemberdayaan</a></li>
                    <li><a class="hover:text-white transition-colors" href="${origin}/program.html">Zakat Fitrah &amp; Maal</a></li>
                    <li><a class="hover:text-white transition-colors" href="${origin}/index.html#kalkulator-zakat">Kalkulator Zakat</a></li>
                </ul>
            </div>
            <div class="space-y-4">
                <h4 class="font-bold text-[#8ef9ab]">Informasi</h4>
                <ul class="space-y-2 text-sm text-slate-300">
                    <li><a class="hover:text-white transition-colors" href="${origin}/laporan.html">Laporan Publik Realtime</a></li>
                    <li><a class="hover:text-white transition-colors" href="${origin}/index.html#tentang-kami">Tentang WIZ Babel</a></li>
                    <li><a class="hover:text-white transition-colors flex items-center gap-1 font-semibold text-[#8ef9ab]" href="${origin}/affiliate.html"><span class="material-symbols-outlined text-sm">handshake</span> Portal Mitra Penghimpunan</a></li>
                    <li><a class="hover:text-white transition-colors flex items-center gap-1 font-semibold text-[#8ef9ab]" href="${origin}/admin.html"><span class="material-symbols-outlined text-sm">lock</span> Portal Admin</a></li>
                </ul>
            </div>
            <div class="space-y-4">
                <h4 class="font-bold text-[#8ef9ab]">Bantuan &amp; Kontak</h4>
                <ul class="space-y-2 text-sm text-slate-300">
                    <li><a class="hover:text-white transition-colors" href="https://wa.me/6282380830808" target="_blank">WhatsApp: +62 823-8083-0808</a></li>
                    <li><span>Email: wiz.babel@gmail.com</span></li>
                </ul>
            </div>
        </div>
    </footer>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
    return res.status(200).send(html);
};
