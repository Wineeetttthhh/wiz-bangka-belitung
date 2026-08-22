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
const SUPABASE_URL = 'https://ffiltrlzdbwhhhxzmzuo.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_GiA1BOjbW2psTU36149xuA_E26wGBI3';

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

    // 3. If no specific newsId was passed in URL, default to latest news
    if (!article && !cleanNewsId && allNews.length > 0) {
        article = allNews[0];
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

    // ─── 2. RESOLVE DIRECT ABSOLUTE OPEN GRAPH IMAGE URL ───────────────────────
    let absoluteImgUrl = '';
    let secureImgUrl = '';

    if (rawImg.startsWith('data:image/')) {
        const directUrl = `${origin}/berita-image/${encodeURIComponent(article.id)}.jpg`;
        absoluteImgUrl = directUrl;
        secureImgUrl = directUrl;
    } else if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
        absoluteImgUrl = rawImg;
        secureImgUrl = rawImg.replace(/^http:\/\//i, 'https://');
    } else if (rawImg) {
        const cleanPath = rawImg.replace(/^\//, '');
        const directUrl = `${origin}/${cleanPath}`;
        absoluteImgUrl = directUrl;
        secureImgUrl = directUrl;
    } else {
        const defaultUrl = `${origin}/assets/images/foto-utama-wiz.jpg`;
        absoluteImgUrl = defaultUrl;
        secureImgUrl = defaultUrl;
    }

    const refCode = (urlObj.searchParams.get('ref') || urlObj.searchParams.get('affiliate') || urlObj.searchParams.get('perantara') || '').trim();
    const excerpt = rawContent.slice(0, 180).replace(/\r?\n|\r/g, ' ') + (rawContent.length > 180 ? '...' : '');
    const canonicalUrl = `${origin}/berita/${encodeURIComponent(article.id)}${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;
    const donateUrl = `${origin}/donasi.html${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;
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
    <meta property="og:image" content="${absoluteImgUrl}"/>
    <meta property="og:image:secure_url" content="${secureImgUrl}"/>
    <meta property="og:image:alt" content="${escapeHtml(title)}"/>
    <meta property="og:image:type" content="${mimeType}"/>
    <meta property="og:image:width" content="1200"/>
    <meta property="og:image:height" content="630"/>
    <link rel="image_src" href="${absoluteImgUrl}"/>
    <meta name="thumbnail" content="${absoluteImgUrl}"/>
    <meta itemprop="image" content="${absoluteImgUrl}"/>

    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:site" content="@wizbangkabelitung"/>
    <meta name="twitter:title" content="${escapeHtml(title)}"/>
    <meta name="twitter:description" content="${escapeHtml(excerpt)}"/>
    <meta name="twitter:image" content="${absoluteImgUrl}"/>

    <!-- Google Fonts & Tailwind -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet"/>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#0369a1',
                        'primary-dark': '#075985',
                        secondary: '#10b981',
                        accent: '#f59e0b',
                        surface: '#ffffff',
                        background: '#f8fafc'
                    },
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                        headline: ['Outfit', 'sans-serif']
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-slate-50 text-slate-800 font-sans min-h-screen flex flex-col antialiased selection:bg-primary selection:text-white">

    <!-- Referral / Mitra Attribution Handler -->
    <script>
        (function() {
            const urlParams = new URLSearchParams(window.location.search);
            const ref = urlParams.get('ref') || urlParams.get('affiliate') || urlParams.get('perantara');
            if (ref) {
                try {
                    sessionStorage.setItem('wiz_active_ref_id', ref);
                    localStorage.setItem('wiz_affiliate_ref', ref);
                    localStorage.setItem('wiz_affiliate_exp', Date.now() + (30 * 24 * 60 * 60 * 1000));
                } catch(e) {}
            }
        })();
    </script>

    <!-- Header Navigation -->
    <header class="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 shadow-xs">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
            <a href="${origin}/index.html" class="flex items-center gap-2.5 sm:gap-3 group">
                <img src="${origin}/assets/images/logo-wiz-babel.png" alt="WIZ Bangka Belitung" class="h-9 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105"/>
                <div class="leading-tight">
                    <span class="block font-headline font-bold text-sm sm:text-base text-slate-900">Wahdah Inspirasi Zakat</span>
                    <span class="block text-[11px] sm:text-xs text-primary font-bold tracking-wider uppercase">Bangka Belitung</span>
                </div>
            </a>
            <div class="flex items-center gap-2 sm:gap-3">
                <a href="${portalUrl}" class="hidden sm:inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-primary transition-colors px-3 py-2 rounded-xl hover:bg-slate-50">
                    <span class="material-symbols-outlined text-lg">newspaper</span> Semua Berita
                </a>
                <a href="${donateUrl}" class="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm px-4 py-2 sm:px-5 sm:py-2.5 rounded-full shadow-md hover:shadow-lg transition-all active:scale-95">
                    <span class="material-symbols-outlined text-sm sm:text-base">favorite</span>
                    <span>Donasi Sekarang</span>
                </a>
            </div>
        </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-grow w-full">

        <!-- Breadcrumbs -->
        <nav class="flex items-center gap-2 text-xs text-slate-500 mb-6 flex-wrap">
            <a href="${origin}/index.html" class="hover:text-primary transition-colors">Beranda</a>
            <span class="text-slate-300">/</span>
            <a href="${portalUrl}" class="hover:text-primary transition-colors">Berita &amp; Kegiatan</a>
            <span class="text-slate-300">/</span>
            <span class="text-slate-900 font-semibold truncate max-w-xs">${escapeHtml(title)}</span>
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
                    <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('*' + title + '*\n\n' + excerpt + '\n\n' + canonicalUrl)}" target="_blank" class="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold px-5 py-3 rounded-2xl text-sm shadow-md hover:shadow-lg transition-all active:scale-95">
                        <span class="material-symbols-outlined text-lg">share</span> Share ke WhatsApp
                    </a>
                    <a href="${donateUrl}" class="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold px-5 py-3 rounded-2xl text-sm shadow-md hover:shadow-lg transition-all active:scale-95">
                        <span class="material-symbols-outlined text-lg">volunteer_activism</span> Salurkan Donasi
                    </a>
                </div>
            </div>

        </article>

    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 space-y-2">
        <p class="font-semibold text-slate-700">&copy; 2026 Wahdah Inspirasi Zakat (WIZ) Bangka Belitung</p>
        <p>Lembaga Amil Zakat Nasional — Amanah, Profesional, &amp; Transparan</p>
        <p><a href="${origin}/index.html" class="text-primary hover:underline">wizbangkabelitung.or.id</a></p>
    </footer>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
    return res.status(200).send(html);
};
