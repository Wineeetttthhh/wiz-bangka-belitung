/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Dynamic Daily Quote & Flyer Open Graph (OG) Generator & SSR Page
 * Endpoint: /quote/:id  or  /flyer/:id  or  /api/quote?id=:id&ref=:ref
 * ============================================================
 * Menghasilkan kartu preview Open Graph (OG) kaya flyer poster resolusi tinggi
 * untuk WhatsApp Chat, Status WhatsApp, Facebook, Telegram, dan Instagram,
 * serta mengatribusikan kode referral mitra selama 30 hari via Cookie.
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ffiltrlzdbwhhhxzmzuo.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_GiA1BOjbW2psTU36149xuA_E26wGBI3';

const DEFAULT_QUOTES = [
    {
        id: 'quote-1',
        text: 'Sedekah itu tidak akan mengurangi harta. Tidak ada orang yang memberi maaf kepada orang lain melainkan Allah akan menambah kemuliaannya.',
        source: 'HR. Muslim no. 2588',
        category: 'Sedekah & Keberkahan',
        imageUrl: 'assets/images/foto-utama-wiz.jpg',
        date: '2026-08-20',
        status: 'active'
    }
];

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getMimeType(dataUriOrPath = '') {
    if (dataUriOrPath.startsWith('data:image/png')) return 'image/png';
    if (dataUriOrPath.startsWith('data:image/webp')) return 'image/webp';
    if (dataUriOrPath.startsWith('data:image/gif')) return 'image/gif';
    if (dataUriOrPath.endsWith('.png')) return 'image/png';
    if (dataUriOrPath.endsWith('.webp')) return 'image/webp';
    if (dataUriOrPath.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
}

async function getLiveQuotes() {
    try {
        const res = await fetch(`${SUPABASE_URL}/site_settings?key=eq.master_bundle&select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Accept': 'application/json'
            }
        });
        if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list) && list.length > 0 && list[0].value && Array.isArray(list[0].value.quotes) && list[0].value.quotes.length > 0) {
                return list[0].value.quotes;
            }
        }
    } catch(e) {
        console.warn('[Quote API] Supabase fetch error:', e.message);
    }

    // Fallback to canonical-store.json
    try {
        const canonicalPath = path.join(__dirname, '..', 'assets', 'data', 'canonical-store.json');
        if (fs.existsSync(canonicalPath)) {
            const cData = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
            if (cData && Array.isArray(cData.quotes) && cData.quotes.length > 0) {
                return cData.quotes;
            }
        }
    } catch (e) {}

    return DEFAULT_QUOTES;
}

module.exports = async function handler(req, res) {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'www.wizbangkabelitung.or.id'}`);
    let quoteId = urlObj.searchParams.get('id');
    const refCode = (urlObj.searchParams.get('ref') || urlObj.searchParams.get('affiliate') || urlObj.searchParams.get('perantara') || '').trim();

    // Parse from path /flyer/[id] or /quote/[id] if applicable
    if (!quoteId) {
        const parts = urlObj.pathname.split('/').filter(Boolean);
        const qIdx = parts.findIndex(p => p === 'quote' || p === 'flyer');
        if (qIdx !== -1 && parts[qIdx + 1]) {
            quoteId = decodeURIComponent(parts[qIdx + 1]);
        }
    }

    const host = req.headers.host || 'www.wizbangkabelitung.or.id';
    const origin = 'https://www.wizbangkabelitung.or.id';

    // Load fresh quotes from Supabase Cloud
    const allQuotes = await getLiveQuotes();

    // Find requested quote
    let quote = null;
    const cleanId = String(quoteId || '').trim();

    if (cleanId && cleanId !== 'latest' && cleanId !== 'today') {
        quote = allQuotes.find(q => String(q.id).toLowerCase() === cleanId.toLowerCase() || String(q.id) === cleanId);
    }
    if (!quote) {
        // Pick first active quote, or newest quote
        quote = allQuotes.find(q => q.status === 'active') || allQuotes[0] || DEFAULT_QUOTES[0];
    }

    const rawImg = (quote.imageUrl || '').trim();

    // ─── Direct Image Endpoint (?img=1) for WhatsApp / FB Open Graph Crawler ─
    if (urlObj.searchParams.get('img') === '1' || urlObj.searchParams.has('img')) {
        const imgVal = rawImg || 'assets/images/foto-utama-wiz.jpg';
        if (imgVal.startsWith('data:image/')) {
            const mime = getMimeType(imgVal);
            const base64Data = imgVal.split(',')[1] || '';
            const buffer = Buffer.from(base64Data, 'base64');
            res.setHeader('Content-Type', mime);
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400');
            return res.status(200).end(buffer);
        } else if (imgVal.startsWith('http://') || imgVal.startsWith('https://')) {
            res.writeHead(302, { Location: imgVal });
            return res.end();
        } else {
            const cleanPath = imgVal.startsWith('/') ? imgVal.slice(1) : imgVal;
            const fullPath = path.join(process.cwd(), cleanPath || 'assets/images/foto-utama-wiz.jpg');
            if (fs.existsSync(fullPath)) {
                const mime = getMimeType(cleanPath);
                const fileBuf = fs.readFileSync(fullPath);
                res.setHeader('Content-Type', mime);
                res.setHeader('Content-Length', fileBuf.length);
                res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400');
                return res.status(200).end(fileBuf);
            } else {
                const defaultPath = path.join(process.cwd(), 'assets', 'images', 'foto-utama-wiz.jpg');
                if (fs.existsSync(defaultPath)) {
                    const fileBuf = fs.readFileSync(defaultPath);
                    res.setHeader('Content-Type', 'image/jpeg');
                    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
                    return res.status(200).end(fileBuf);
                }
            }
        }
    }

    // Determine actual page image source (Supports high-res base64 or URL)
    let pageImgSrc = rawImg || 'assets/images/foto-utama-wiz.jpg';
    if (pageImgSrc && !pageImgSrc.startsWith('http') && !pageImgSrc.startsWith('data:image')) {
        pageImgSrc = `${origin}/${pageImgSrc.replace(/^\//, '')}`;
    }

    // ─── Resolve absolute Open Graph Image URL ──────────────────────────────
    let ogImageUrl = '';
    if (rawImg.startsWith('data:image/')) {
        // WhatsApp / FB crawler cannot read data URLs. We serve direct binary image via ?img=1 endpoint!
        ogImageUrl = `${origin}/api/quote?id=${encodeURIComponent(quote.id)}&img=1`;
    } else if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
        ogImageUrl = rawImg;
    } else if (rawImg) {
        const cleanPath = rawImg.startsWith('/') ? rawImg.slice(1) : rawImg;
        ogImageUrl = `${origin}/${cleanPath}`;
    } else {
        ogImageUrl = `${origin}/assets/images/foto-utama-wiz.jpg`;
    }

    const canonicalUrl = `${origin}/flyer/${encodeURIComponent(quote.id)}${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;
    const donateUrl = `${origin}/donasi.html${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;
    const programUrl = `${origin}/program.html${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;

    // Set 30-Day Referral Cookie if refCode is present (max-age 2,592,000s = 30 days)
    if (refCode) {
        res.setHeader('Set-Cookie', `wiz_ref=${encodeURIComponent(refCode)}; Path=/; Max-Age=2592000; SameSite=Lax`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');

    const metaTitle = quote.source ? `${quote.source} • Inspirasi WIZ` : 'Inspirasi WIZ — Wahdah Inspirasi Zakat';
    const metaDesc = quote.text ? `"${quote.text}" — Mari raih keberkahan dengan berinfak melalui WIZ Bangka Belitung.` : 'Mari raih keberkahan dengan berinfak melalui WIZ Bangka Belitung.';
    const mimeType = getMimeType(rawImg);

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(metaTitle)}</title>
    <meta name="description" content="${escapeHtml(metaDesc)}">
    <link rel="icon" href="${origin}/assets/images/logo-wiz-babel.png" type="image/png">

    <!-- Open Graph / WhatsApp / Facebook / Telegram / Instagram -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="WIZ Bangka Belitung">
    <meta property="og:title" content="${escapeHtml(quote.source || quote.category || 'Inspirasi WIZ')}">
    <meta property="og:description" content="${escapeHtml(metaDesc)}">
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(ogImageUrl)}">
    <meta property="og:image:type" content="${escapeHtml(mimeType)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <link rel="image_src" href="${escapeHtml(ogImageUrl)}">
    <meta name="thumbnail" content="${escapeHtml(ogImageUrl)}">
    <meta itemprop="image" content="${escapeHtml(ogImageUrl)}">

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(quote.source || 'Inspirasi WIZ')}">
    <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
    <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}">

    <!-- Google Fonts & Tailwind -->
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>

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
            <a href="${origin}/index.html" class="flex items-center gap-2.5 shrink-0 max-w-xs group">
                <img src="${origin}/assets/images/logo-wiz-babel.png" alt="WIZ Babel" class="h-9 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105">
                <span class="font-extrabold text-sm sm:text-base text-slate-900 leading-tight whitespace-nowrap">WIZ Bangka Belitung</span>
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
                <blockquote class="text-base sm:text-lg text-slate-800 font-medium italic leading-relaxed">
                    "${escapeHtml(quote.text)}"
                </blockquote>

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

        <!-- Referral / Mitra Attribution Banner -->
        ${refCode ? `
        <div class="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 border border-emerald-700/50 shadow-md">
            <div class="space-y-0.5">
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">Jalur Kebaikan Sahabat Mitra</span>
                <p class="text-xs text-white/90 font-medium">Anda terhubung melalui Mitra WIZ: <strong class="text-emerald-300 font-bold">${escapeHtml(refCode)}</strong></p>
            </div>
            <a href="${origin}/affiliate.html" class="shrink-0 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors border border-white/20">
                Info Kemitraan
            </a>
        </div>` : ''}
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
            const quoteText = '*${escapeHtml(quote.source || 'Quote & Inspirasi Harian')}*\\n\\n"${escapeHtml(quote.text)}"\\n\\n' + shareUrl;
            const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(quoteText);
            window.open(url, '_blank');
        }
    </script>
</body>
</html>`;

    res.status(200).send(html);
};
