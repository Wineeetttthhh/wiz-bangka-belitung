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

import fs from 'fs';
import path from 'path';
import { processToOgJpeg } from './og-image.js';

// Supabase Configuration
const SUPABASE_RAW_URL = process.env.SUPABASE_URL || 'https://ccmulazswlmjyfjdtlti.supabase.co';
const SUPABASE_URL = SUPABASE_RAW_URL.endsWith('/rest/v1') ? SUPABASE_RAW_URL : `${SUPABASE_RAW_URL.replace(/\/$/, '')}/rest/v1`;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'sb_publishable_hEmZHHQyc0EeHXQI2caacQ_InnfPXa5';

// In-memory cache for ultra-fast serverless execution
let cachedNewsMap = new Map();
let cachedNewsAll = null;
let cachedNewsTime = 0;
const CACHE_TTL_MS = 5000; // 5s for fast fresh updates

async function fetchWithTimeout(url, options = {}, timeoutMs = 1200) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const resp = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeout);
        return resp;
    } catch (e) {
        return null;
    }
}

async function supabaseGetNews(newsId) {
    if (newsId && cachedNewsMap.has(newsId) && (Date.now() - cachedNewsTime < CACHE_TTL_MS)) {
        return [cachedNewsMap.get(newsId)];
    }
    if (!newsId && cachedNewsAll && (Date.now() - cachedNewsTime < CACHE_TTL_MS)) {
        return cachedNewsAll;
    }

    try {
        let url = `${SUPABASE_URL}/news?select=id,slug,title,category,content,image_url,gallery,event_date,status,author,created_at,updated_at&order=created_at.desc`;
        if (newsId) {
            url += `&id=eq.${encodeURIComponent(newsId)}`;
        }
        const res = await fetchWithTimeout(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Accept': 'application/json'
            }
        }, 1200);
        if (!res || !res.ok) return null;
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

export default async function handler(req, res) {
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

    let allNews = [];
    let article = null;

    // 1. FAST-PATH: Check canonical-store.json first (0ms synchronous disk read)
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

    // 2. Fetch from Supabase PostgreSQL if not found in canonical store
    if (!article) {
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

    const firstGalleryImg = (Array.isArray(gallery) && gallery.length > 0 && typeof gallery[0] === 'string') ? gallery[0].trim() : '';
    const primaryImg = rawImg || firstGalleryImg || 'assets/images/foto-utama-wiz.jpg';

    // ─── 1. SERVE OPTIMIZED 1200x630 JPEG DIRECTLY IF REQUESTED ─────────────────
    if (isImageRequest) {
        const jpegBuf = await processToOgJpeg(primaryImg);
        if (jpegBuf && jpegBuf.length > 0) {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Length', String(jpegBuf.length));
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400, immutable');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            return res.status(200).end(jpegBuf);
        }

        const defaultPath = path.join(process.cwd(), 'assets', 'images', 'foto-utama-wiz.jpg');
        if (fs.existsSync(defaultPath)) {
            const fileBuf = fs.readFileSync(defaultPath);
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Length', String(fileBuf.length));
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
            return res.status(200).end(fileBuf);
        }

        return res.status(404).send('Image not found');
    }

    // ─── 2. DEDICATED HIGH-SPEED OG IMAGE URL (WHATSAPP STANDARD 1200x630 < 300KB) ───
    let directOgImage = `${origin}/api/og-image?type=news&id=${encodeURIComponent(article.id)}`;
    if (primaryImg && !primaryImg.startsWith('data:image/')) {
        directOgImage += `&src=${encodeURIComponent(primaryImg)}`;
    }
    const ogImageUrl = directOgImage;

    const refCode = (urlObj.searchParams.get('ref') || urlObj.searchParams.get('affiliate') || urlObj.searchParams.get('perantara') || '').trim();
    const excerpt = rawContent.slice(0, 180).replace(/\r?\n|\r/g, ' ') + (rawContent.length > 180 ? '...' : '');

    const canonicalUrlObj = new URL(`${origin}/berita/${encodeURIComponent(article.id)}`);
    if (refCode) canonicalUrlObj.searchParams.set('ref', refCode);
    const canonicalUrl = canonicalUrlObj.toString();

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
    <meta property="og:type" content="article"/>
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
            const ref = ('${escapeHtml(refCode)}' || urlParams.get('ref') || urlParams.get('affiliate') || urlParams.get('perantara') || '').trim();
            if (ref) {
                try {
                    const cleanRef = ref.toUpperCase();
                    const d = new Date();
                    d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
                    document.cookie = "wiz_ref=" + encodeURIComponent(cleanRef) + ";expires=" + d.toUTCString() + ";path=/;max-age=2592000;SameSite=Lax";
                    sessionStorage.setItem('wiz_active_ref_id', cleanRef);
                    localStorage.setItem('wiz_ref_code', cleanRef);
                    localStorage.setItem('wiz_ref_exp', String(Date.now() + 30 * 24 * 60 * 60 * 1000));
                } catch(e) {}
            }
        })();
    </script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        .font-headline { font-family: 'Plus Jakarta Sans', sans-serif; }
        .content-body p { margin-bottom: 1.25rem; line-height: 1.8; color: #334155; }
        .content-body h2, .content-body h3 { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; color: #0f172a; margin-top: 2rem; margin-bottom: 0.75rem; }
    </style>
</head>
<body class="bg-[#F8FAF9] text-slate-800 min-h-screen flex flex-col antialiased">
    <!-- Top Bar Navigation -->
    <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="${portalUrl}" class="flex items-center gap-2 text-slate-700 hover:text-primary transition-colors font-bold text-sm">
                <span class="material-symbols-outlined text-lg">arrow_back</span>
                <span>Kembali ke Berita</span>
            </a>
            <a href="${origin}" class="flex items-center gap-2">
                <img src="${origin}/assets/images/logo-wiz-babel.png" alt="WIZ Babel" class="h-8 w-auto object-contain"/>
            </a>
            <a href="${donateUrl}" class="bg-secondary hover:bg-amber-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">favorite</span>
                <span>Donasi</span>
            </a>
        </div>
    </header>

    <!-- Main Content Container -->
    <main class="max-w-3xl mx-auto px-4 py-6 sm:py-10 flex-grow w-full">
        <!-- Article Header -->
        <div class="mb-6 space-y-3">
            <div class="flex items-center gap-2 flex-wrap text-xs">
                <span class="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold tracking-wide uppercase">
                    ${escapeHtml(category)}
                </span>
                <span class="text-slate-400">•</span>
                <span class="text-slate-500 font-medium">${escapeHtml(formattedDate)}</span>
                <span class="text-slate-400">•</span>
                <span class="text-slate-500 font-medium">Oleh ${escapeHtml(author)}</span>
            </div>
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight font-headline">
                ${escapeHtml(title)}
            </h1>
        </div>

        <!-- Featured Image -->
        <div class="aspect-video w-full rounded-2xl overflow-hidden shadow-md mb-8 bg-slate-100 border border-slate-200 relative">
            <img src="${primaryImg.startsWith('http') || primaryImg.startsWith('data:') ? primaryImg : `${origin}/${primaryImg.replace(/^\//, '')}`}" alt="${escapeHtml(title)}" class="w-full h-full object-cover"/>
        </div>

        <!-- Article Content -->
        <article class="content-body text-base text-slate-700 leading-relaxed space-y-4 mb-10">
            ${rawContent.split(/\r?\n\r?\n|\n/).map(para => {
                const trimmed = para.trim();
                if (!trimmed) return '';
                if (trimmed.startsWith('### ')) {
                    return `<h3 class="text-xl font-bold text-slate-900 mt-6 mb-2">${escapeHtml(trimmed.replace(/^###\s*/, ''))}</h3>`;
                }
                if (trimmed.startsWith('## ')) {
                    return `<h2 class="text-2xl font-bold text-slate-900 mt-8 mb-3">${escapeHtml(trimmed.replace(/^##\s*/, ''))}</h2>`;
                }
                return `<p>${escapeHtml(trimmed)}</p>`;
            }).filter(Boolean).join('\n')}
        </article>

        <!-- Action Card (Donation Call to Action) -->
        <div class="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white shadow-xl mb-12 relative overflow-hidden">
            <div class="relative z-10 space-y-4">
                <span class="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                    Mari Bersamai Kebaikan
                </span>
                <h3 class="text-xl sm:text-2xl font-bold font-headline">Dukung Program Kebaikan WIZ Bangka Belitung</h3>
                <p class="text-emerald-100/90 text-sm leading-relaxed max-w-xl">
                    Salurkan zakat, infak, dan sedekah Anda untuk mendukung lebih banyak kegiatan dakwah, santunan yatim, dan kemaslahatan ummat di Kepulauan Bangka Belitung.
                </p>
                <div class="pt-2 flex flex-wrap gap-3">
                    <a href="${donateUrl}" class="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm transition-all shadow-md flex items-center gap-2">
                        <span class="material-symbols-outlined">volunteer_activism</span>
                        <span>Donasi Sekarang</span>
                    </a>
                    <a href="${portalUrl}" class="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors flex items-center gap-1.5">
                        <span>Lihat Berita Lainnya</span>
                        <span class="material-symbols-outlined text-sm">arrow_forward</span>
                    </a>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-inverse-surface text-white py-8 border-t border-slate-700/50 mt-auto">
        <div class="max-w-4xl mx-auto px-4 text-center space-y-2">
            <p class="text-xs text-slate-400">© <span class="footer-year">2026</span> Wahdah Inspirasi Zakat (WIZ) Bangka Belitung. Amanah &amp; Profesional.</p>
        </div>
    </footer>
</body>
</html>`;

    // Set 30-Day Referral Cookie if refCode is present
    if (refCode) {
        res.setHeader('Set-Cookie', `wiz_ref=${encodeURIComponent(refCode)}; Path=/; Max-Age=2592000; SameSite=Lax`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
};
