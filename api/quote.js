/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Dynamic Daily Quote & Flyer Open Graph (OG) Generator & SSR Page
 * Endpoint: /quote/:id  or  /flyer/:id  or  /api/quote?id=:id&ref=:ref
 * Direct Image: /flyer-image/:id.jpg  or  /api/quote?id=:id&img=1
 * ============================================================
 * Menghasilkan kartu preview Open Graph (OG) kaya flyer poster resolusi tinggi
 * untuk WhatsApp Chat, Status WhatsApp, Facebook, Telegram, LinkedIn, dan Instagram,
 * serta mengatribusikan kode referral mitra selama 30 hari via Cookie.
 * ============================================================
 */

import fs from 'fs';
import path from 'path';

const SUPABASE_RAW_URL = process.env.SUPABASE_URL || 'https://kmpwdqremvltgglmoxgx.supabase.co';
const SUPABASE_URL = SUPABASE_RAW_URL.endsWith('/rest/v1') ? SUPABASE_RAW_URL : `${SUPABASE_RAW_URL.replace(/\/$/, '')}/rest/v1`;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttcHdkcXJlbXZsdGdnbG1veGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMjEyMTksImV4cCI6MjEwMzU5NzIxOX0.MhNqr36yvqRAgiVsLil608P-DyYBLJ6WBWxXMbfvbH8';

const DEFAULT_QUOTES = [
    {
        id: 'quote-1',
        text: 'Sedekah itu tidak akan mengurangi harta. Tidak ada orang yang memberi maaf kepada orang lain melainkan Allah akan menambah kemuliaannya.',
        source: 'HR. Muslim no. 2588',
        category: 'Sedekah & Keberkahan',
        imageUrl: 'assets/images/foto-utama-wiz.jpg',
        date: '2026-08-20',
        status: 'active'
    },
    {
        id: 'quote-2',
        text: 'Tidak ada suatu hari pun ketika seorang hamba memasuki waktu pagi melainkan turun dua malaikat. Salah satunya berdoa: Ya Allah, berikanlah ganti bagi orang yang berinfak.',
        source: 'HR. Bukhari no. 1442 & Muslim no. 1010',
        category: 'Infak Subuh',
        imageUrl: 'assets/images/sedekah-beras-dhuafa.jpg',
        date: '2026-08-19',
        status: 'active'
    },
    {
        id: 'quote-3',
        text: 'Bentengilah hartamu dengan zakat, obatilah orang-orang sakit di antaramu dengan sedekah, dan hadapilah berbagai cobaan dengan doa.',
        source: 'HR. Abu Dawud & At-Thabrani',
        category: 'Zakat & Penyucian Jiwa',
        imageUrl: 'assets/images/sedekah-beras-dai.jpg',
        date: '2026-08-18',
        status: 'active'
    }
];

// In-memory cache for ultra-fast serverless execution (< 15ms)
let cachedQuotes = null;
let cachedQuotesTime = 0;
const CACHE_TTL_MS = 20000; // 20s

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getMimeType(dataUriOrPath = '') {
    if (!dataUriOrPath) return 'image/jpeg';
    const s = String(dataUriOrPath).toLowerCase();
    if (s.startsWith('data:image/png') || s.endsWith('.png')) return 'image/png';
    if (s.startsWith('data:image/webp') || s.endsWith('.webp')) return 'image/webp';
    if (s.startsWith('data:image/gif') || s.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
}

async function getLiveQuotes() {
    if (cachedQuotes && (Date.now() - cachedQuotesTime < CACHE_TTL_MS)) {
        return cachedQuotes;
    }

    try {
        const res = await fetch(`${SUPABASE_URL}/site_settings?key=in.(quotes,master_bundle)&select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Accept': 'application/json'
            }
        });
        if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list) && list.length > 0) {
                const quotesDoc = list.find(d => d.key === 'quotes');
                if (quotesDoc && quotesDoc.value && Array.isArray(quotesDoc.value) && quotesDoc.value.length > 0) {
                    cachedQuotes = quotesDoc.value;
                    cachedQuotesTime = Date.now();
                    return cachedQuotes;
                }
                const mbDoc = list.find(d => d.key === 'master_bundle');
                if (mbDoc && mbDoc.value && Array.isArray(mbDoc.value.quotes) && mbDoc.value.quotes.length > 0) {
                    cachedQuotes = mbDoc.value.quotes;
                    cachedQuotesTime = Date.now();
                    return cachedQuotes;
                }
            }
        }
    } catch(e) {
        console.warn('[Quote API] Supabase fetch error:', e.message);
    }

    // Fallback to canonical-store.json
    try {
        const canonicalPath = path.join(process.cwd(), 'assets', 'data', 'canonical-store.json');
        if (fs.existsSync(canonicalPath)) {
            const cData = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
            if (cData && Array.isArray(cData.quotes) && cData.quotes.length > 0) {
                cachedQuotes = cData.quotes;
                cachedQuotesTime = Date.now();
                return cachedQuotes;
            }
        }
    } catch (e) {}

    cachedQuotes = DEFAULT_QUOTES;
    cachedQuotesTime = Date.now();
    return DEFAULT_QUOTES;
}

export default async function handler(req, res) {
    const origin = 'https://www.wizbangkabelitung.or.id';
    const urlObj = new URL(req.url, `http://${req.headers.host || 'www.wizbangkabelitung.or.id'}`);
    
    // Support query param ?id=... or req.query.id
    let quoteId = (req.query && req.query.id) || urlObj.searchParams.get('id');
    const refCode = ((req.query && (req.query.ref || req.query.affiliate || req.query.perantara)) || 
                     urlObj.searchParams.get('ref') || urlObj.searchParams.get('affiliate') || urlObj.searchParams.get('perantara') || '').trim();

    // Parse from path /flyer/[id], /quote/[id], /flyer-image/[id], /quote-image/[id] if applicable
    if (!quoteId) {
        const parts = urlObj.pathname.split('/').filter(Boolean);
        const qIdx = parts.findIndex(p => p === 'quote' || p === 'flyer' || p === 'flyer-image' || p === 'quote-image' || p === 'flyer-img' || p === 'quote-img');
        if (qIdx !== -1 && parts[qIdx + 1]) {
            quoteId = decodeURIComponent(parts[qIdx + 1]);
        }
    }

    // Check if direct binary image is requested via ?img=1 or path
    const isImageRequest = urlObj.searchParams.get('img') === '1' || 
                           urlObj.searchParams.has('img') ||
                           urlObj.pathname.includes('flyer-image') || 
                           urlObj.pathname.includes('quote-image') ||
                           urlObj.pathname.includes('flyer-img') || 
                           urlObj.pathname.includes('quote-img');

    // Clean quoteId: strip extension (.jpg, .png, etc.)
    const cleanId = String(quoteId || '').replace(/\.(jpe?g|png|webp|gif)$/i, '').trim();

    // Load fresh quotes (with memory cache for speed)
    const allQuotes = await getLiveQuotes();

    // Find requested quote
    let quote = null;
    if (cleanId && cleanId !== 'latest' && cleanId !== 'today') {
        quote = allQuotes.find(q => {
            if (!q || !q.id) return false;
            const qStr = String(q.id).trim();
            const qClean = qStr.replace(/\.(jpe?g|png|webp|gif)$/i, '');
            return qStr.toLowerCase() === cleanId.toLowerCase() || 
                   qClean.toLowerCase() === cleanId.toLowerCase();
        });
    }

    if (!quote) {
        // Pick first active quote, or newest quote
        quote = allQuotes.find(q => q.status === 'active') || allQuotes[0] || DEFAULT_QUOTES[0];
    }

    const rawImg = (quote.imageUrl || '').trim();
    const mimeType = getMimeType(rawImg);

    // ─── 1. DIRECT BINARY IMAGE ENDPOINT (< 2s instant serve for WhatsApp crawler) ───
    if (isImageRequest) {
        const defaultImgPath = path.join(process.cwd(), 'assets', 'images', 'foto-utama-wiz.jpg');

        if (rawImg.startsWith('data:image/')) {
            // Decode Base64 JPEG/PNG buffer directly
            try {
                const base64Data = rawImg.split(',')[1] || '';
                const buffer = Buffer.from(base64Data, 'base64');
                res.setHeader('Content-Type', mimeType);
                res.setHeader('Content-Length', buffer.length);
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
                return res.status(200).end(buffer);
            } catch (err) {
                console.error('[Quote Image API] Base64 decode error:', err);
            }
        } else if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
            // Direct fetch & stream to avoid 302 redirect for crawlers
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
            // Local physical file from public assets
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

        // Final fallback: serve default banner image
        if (fs.existsSync(defaultImgPath)) {
            const fileBuf = fs.readFileSync(defaultImgPath);
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Length', fileBuf.length);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
            return res.status(200).end(fileBuf);
        }

        return res.status(404).send('Image not found');
    }

    // ─── 2. DEDICATED OG IMAGE URL (always via /api/og-image for WhatsApp crawler) ─
    // Single clean endpoint serving binary JPEG <300KB with proper caching
    const ogImageUrl = `${origin}/api/og-image?type=quote&id=${encodeURIComponent(quote.id)}`;

    // Page body image (higher quality, can be base64 or direct URL)
    let pageImgSrc = rawImg || `${origin}/assets/images/foto-utama-wiz.jpg`;
    if (pageImgSrc && !pageImgSrc.startsWith('http') && !pageImgSrc.startsWith('data:image')) {
        pageImgSrc = `${origin}/${pageImgSrc.replace(/^\//, '')}`;
    }

    const routeBase = urlObj.pathname.startsWith('/quote') ? 'quote' : 'flyer';
    const canonicalUrl = `${origin}/${routeBase}/${encodeURIComponent(quote.id)}${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;
    const donateUrl = `${origin}/donasi.html${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;

    // Meta Title & Description
    const ogTitle = (quote.source && quote.source.trim() && quote.source !== '-' && quote.source !== '.') ? quote.source.trim() : 'Inspirasi WIZ';
    const pageTitle = `${ogTitle} • Wahdah Inspirasi Zakat Bangka Belitung`;
    const quoteBody = (quote.text || '').trim();
    const ogDesc = quoteBody && quoteBody !== '-' && quoteBody !== '.' 
        ? `"${quoteBody}" — Mari raih keberkahan dengan berinfak melalui WIZ Bangka Belitung.` 
        : 'Mari raih keberkahan dengan berinfak melalui WIZ Bangka Belitung.';

    // Set 30-Day Referral Cookie if refCode is present (max-age 2,592,000s = 30 days)
    if (refCode) {
        res.setHeader('Set-Cookie', `wiz_ref=${encodeURIComponent(refCode)}; Path=/; Max-Age=2592000; SameSite=Lax`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');

    // ─── 3. RENDER FULL SSR HTML WITH STRICT OPEN GRAPH TAGS ───────────────────
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(ogDesc)}">
    <link rel="icon" href="${origin}/assets/images/logo-wiz-babel.png" type="image/png">

    <!-- Open Graph / WhatsApp / Facebook / Telegram / Instagram / LinkedIn -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Wahdah Inspirasi Zakat (WIZ) Bangka Belitung">
    <meta property="og:locale" content="id_ID">
    <meta property="og:title" content="${escapeHtml(ogTitle)}">
    <meta property="og:description" content="${escapeHtml(ogDesc)}">
    <meta property="og:image" content="${ogImageUrl}">
    <meta property="og:image:secure_url" content="${ogImageUrl}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${escapeHtml(ogTitle)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <link rel="image_src" href="${ogImageUrl}">
    <meta name="thumbnail" content="${ogImageUrl}">
    <meta itemprop="image" content="${ogImageUrl}">

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@wizbangkabelitung">
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
    <meta name="twitter:description" content="${escapeHtml(ogDesc)}">
    <meta name="twitter:image" content="${ogImageUrl}">

    <!-- Google Fonts & Tailwind -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#0369a1',
                        'primary-dark': '#075985',
                        secondary: '#10b981',
                        accent: '#f59e0b'
                    },
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                        headline: ['Outfit', 'sans-serif']
                    }
                }
            }
        }
    </script>

    <script>
        // Store refCode in LocalStorage & SessionStorage for 30 days
        (function() {
            const ref = '${escapeHtml(refCode)}';
            if (ref) {
                try {
                    sessionStorage.setItem('wiz_active_ref_id', ref);
                    localStorage.setItem('wiz_affiliate_ref', ref);
                    localStorage.setItem('wiz_affiliate_exp', String(Date.now() + 30 * 24 * 60 * 60 * 1000));
                } catch(e) {}
            }
        })();
    </script>
</head>
<body class="bg-slate-50 text-slate-900 font-sans min-h-screen flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900">
    <!-- Header -->
    <header class="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
            <a href="${origin}/index.html" class="flex items-center group py-1.5 shrink-0 max-w-[160px]">
                <img src="${origin}/assets/images/logo-wiz-babel.png" alt="WIZ Babel" class="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105 block">
            </a>
            <div class="flex items-center gap-3 shrink-0">
                <a href="${origin}/program.html${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}" class="hidden sm:inline-flex text-xs sm:text-sm font-semibold text-slate-600 hover:text-emerald-600 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap">Katalog Program</a>
                <a href="${origin}/berita" class="hidden sm:inline-flex text-xs sm:text-sm font-semibold text-slate-600 hover:text-emerald-600 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap">Berita</a>
                <a href="${escapeHtml(donateUrl)}" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <span class="material-symbols-outlined text-sm">favorite</span> Donasi Sekarang
                </a>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-3xl mx-auto px-4 py-8 flex-grow space-y-6 w-full">
        <!-- Quote Flyer Card -->
        <article class="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200">
            <!-- Flyer Image -->
            <div class="relative bg-slate-900 flex items-center justify-center overflow-hidden">
                <img src="${escapeHtml(pageImgSrc)}" alt="${escapeHtml(quote.source || 'Flyer WIZ')}" class="w-full h-auto max-h-[600px] object-contain mx-auto" onerror="this.src='${origin}/assets/images/foto-utama-wiz.jpg'">
                <span class="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold px-3.5 py-1 rounded-full shadow-md">
                    ${escapeHtml(quote.category || 'Inspirasi Harian')}
                </span>
            </div>

            <!-- Quote Text Details -->
            <div class="p-6 sm:p-8 space-y-4">
                ${quote.text && quote.text.trim() ? `
                <blockquote class="text-base sm:text-lg text-slate-800 font-medium italic leading-relaxed">
                    "${escapeHtml(quote.text)}"
                </blockquote>` : ''}

                <div class="flex items-center gap-2 text-emerald-800 font-bold text-sm sm:text-base border-t border-slate-100 pt-4">
                    <span class="material-symbols-outlined text-lg">menu_book</span>
                    <span>${escapeHtml(quote.source || 'Wahdah Inspirasi Zakat')}</span>
                </div>

                <!-- Action Buttons -->
                <div class="pt-4 flex flex-col sm:flex-row gap-3">
                    <a href="${escapeHtml(donateUrl)}" class="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm py-3.5 px-6 rounded-2xl shadow-md hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-base">favorite</span>
                        <span>Salurkan Infaq Sekarang</span>
                    </a>
                    <button type="button" onclick="shareWhatsApp()" class="flex-1 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white font-bold text-sm py-3.5 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.044c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
                        <span>Bagikan Inspirasi ke WA</span>
                    </button>
                </div>
            </div>
        </article>

    </main>

    <!-- Footer -->
    <footer class="bg-slate-900 text-slate-400 py-8 px-4 text-center text-xs space-y-2 border-t border-slate-800">
        <p class="font-bold text-slate-300">© 2026 Wahdah Inspirasi Zakat (WIZ) Bangka Belitung</p>
        <p>Lembaga Amil Zakat Nasional — Amanah, Profesional, &amp; Transparan</p>
        <p><a href="${origin}/index.html" class="text-emerald-400 hover:underline">wizbangkabelitung.or.id</a></p>
    </footer>

    <script>
        function shareWhatsApp() {
            const shareUrl = '${canonicalUrl}';
            const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(shareUrl);
            window.open(url, '_blank');
        }
    </script>
</body>
</html>`;

    res.status(200).send(html);
};
