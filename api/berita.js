/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Dynamic News Reader & Social Media Open Graph Generator
 * Endpoint: /berita/:id  or  /api/berita?id=:id
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

async function supabaseGetNews(newsId) {
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
        return Array.isArray(data) ? data : null;
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
    if (filePathOrDataUrl.startsWith('data:image/png')) return 'image/png';
    if (filePathOrDataUrl.startsWith('data:image/webp')) return 'image/webp';
    if (filePathOrDataUrl.startsWith('data:image/gif')) return 'image/gif';
    if (filePathOrDataUrl.endsWith('.png')) return 'image/png';
    if (filePathOrDataUrl.endsWith('.webp')) return 'image/webp';
    if (filePathOrDataUrl.endsWith('.gif')) return 'image/gif';
    if (filePathOrDataUrl.endsWith('.svg')) return 'image/svg+xml';
    return 'image/jpeg';
}

module.exports = async function handler(req, res) {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'www.wizbangkabelitung.or.id'}`);
    let newsId = urlObj.searchParams.get('id') || urlObj.searchParams.get('newsId');
    const isImageRequest = urlObj.searchParams.get('img') === '1' || urlObj.searchParams.get('image') === '1';

    // Parse ID from path /berita/[id] if applicable
    if (!newsId) {
        const parts = urlObj.pathname.split('/').filter(Boolean);
        const beritaIndex = parts.indexOf('berita');
        if (beritaIndex !== -1 && parts[beritaIndex + 1]) {
            newsId = decodeURIComponent(parts[beritaIndex + 1]);
        }
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'www.wizbangkabelitung.or.id';
    const origin = `${proto}://${host}`;

    // 1. Fetch news from Supabase PostgreSQL
    let allNews = [];
    let article = null;
    try {
        const fetched = await supabaseGetNews(newsId);
        if (Array.isArray(fetched) && fetched.length > 0) {
            if (newsId) {
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
        if (newsId) {
            const cleanId = String(newsId).trim().toLowerCase();
            article = canonList.find(n => n && (String(n.id) === String(newsId) || String(n.id).toLowerCase() === cleanId));
            
            // Fuzzy search by title keyword if direct ID match not found
            if (!article) {
                article = canonList.find(n => {
                    const titleLower = String(n.title || '').toLowerCase();
                    return cleanId.split(/[-_\s]+/).some(word => word.length > 3 && titleLower.includes(word));
                });
            }
        }
        if (!article && allNews.length === 0) {
            allNews = canonList;
        }
    }

    // 3. If no specific newsId was passed in URL (e.g. visiting /berita), default to latest news
    if (!article && !newsId && allNews.length > 0) {
        article = allNews[0];
    }

    // 4. Default fallback article if still not found
    if (!article) {
        article = {
            id: newsId || 'wiz-berita-default',
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

    // ─── Serve Binary Image directly if requested (?img=1) ─────────────────────
    if (isImageRequest) {
        const imgVal = rawImg || 'assets/images/foto-utama-wiz.jpg';
        if (imgVal.startsWith('data:image/')) {
            const mime = getMimeType(imgVal);
            const base64Data = imgVal.split(',')[1] || '';
            const buffer = Buffer.from(base64Data, 'base64');
            res.setHeader('Content-Type', mime);
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
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
                res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
                return res.status(200).end(fileBuf);
            } else {
                const defaultPath = path.join(process.cwd(), 'assets', 'images', 'foto-utama-wiz.jpg');
                if (fs.existsSync(defaultPath)) {
                    const fileBuf = fs.readFileSync(defaultPath);
                    res.setHeader('Content-Type', 'image/jpeg');
                    res.setHeader('Cache-Control', 'public, max-age=86400');
                    return res.status(200).end(fileBuf);
                }
            }
        }
    }

    // ─── Resolve absolute Open Graph Image URL ──────────────────────────────
    let absoluteImgUrl = '';
    if (rawImg.startsWith('data:image/')) {
        // WhatsApp / FB crawler cannot read data URLs. We serve it via ?img=1 endpoint!
        absoluteImgUrl = `${origin}/api/berita?id=${encodeURIComponent(article.id)}&img=1`;
    } else if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
        absoluteImgUrl = rawImg;
    } else if (rawImg) {
        const cleanPath = rawImg.startsWith('/') ? rawImg.slice(1) : rawImg;
        absoluteImgUrl = `${origin}/${cleanPath}`;
    } else {
        absoluteImgUrl = `${origin}/assets/images/foto-utama-wiz.jpg`;
    }

    const refCode = urlObj.searchParams.get('ref') || urlObj.searchParams.get('affiliate') || urlObj.searchParams.get('perantara') || '';
    const excerpt = rawContent.slice(0, 180).replace(/\r?\n|\r/g, ' ') + (rawContent.length > 180 ? '...' : '');
    const canonicalUrl = `${origin}/berita/${encodeURIComponent(article.id)}${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;
    const donateUrl = `${origin}/donasi.html${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;
    const portalUrl = `${origin}/index.html?newsId=${encodeURIComponent(article.id)}${refCode ? '&ref=' + encodeURIComponent(refCode) : ''}#berita`;
    const formattedDate = formatDateIndo(eventDate);

    // Full responsive HTML with Social Media Open Graph Cards & 30-day Affiliate Engine
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
    <meta property="og:image" content="${absoluteImgUrl}"/>
    <meta property="og:image:secure_url" content="${absoluteImgUrl}"/>
    <meta property="og:image:alt" content="${escapeHtml(title)}"/>
    <meta property="og:image:type" content="${getMimeType(rawImg)}"/>
    <meta property="og:image:width" content="1200"/>
    <meta property="og:image:height" content="630"/>

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
<body class="bg-slate-50 text-slate-800 font-sans antialiased min-h-screen flex flex-col selection:bg-primary selection:text-white">

    <!-- Top Navigation Bar -->
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="${origin}" class="flex items-center gap-3 group">
                <img src="${origin}/assets/images/logo-wiz-babel.png" alt="Logo WIZ Babel" class="h-10 w-auto object-contain group-hover:scale-105 transition-transform" onerror="this.src='${origin}/assets/images/logo-wiz-babel.png'"/>
                <div>
                    <span class="block font-headline font-bold text-base md:text-lg text-primary leading-tight">WIZ BANGKA BELITUNG</span>
                    <span class="block text-[11px] text-slate-500 font-medium leading-none">Wahdah Inspirasi Zakat</span>
                </div>
            </a>
            <div class="flex items-center gap-2">
                <a href="${origin}/index.html#berita" class="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-primary px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <span class="material-symbols-outlined text-base">arrow_back</span> Berita Lainnya
                </a>
                <a href="${donateUrl}" class="inline-flex items-center gap-1.5 bg-secondary hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-sm hover:shadow-md transition-all active:scale-95">
                    <span class="material-symbols-outlined text-base">favorite</span> Donasi Sekarang
                </a>
            </div>
        </div>
    </header>

    <!-- Main Content Container -->
    <main class="flex-1 max-w-4xl w-full mx-auto px-4 py-6 md:py-10">
        
        <!-- Breadcrumb & Category -->
        <nav class="flex items-center gap-2 text-xs md:text-sm text-slate-500 mb-4 flex-wrap">
            <a href="${origin}" class="hover:text-primary">Beranda</a>
            <span>/</span>
            <a href="${origin}/index.html#berita" class="hover:text-primary">Berita & Kegiatan</a>
            <span>/</span>
            <span class="text-primary font-semibold truncate max-w-xs">${escapeHtml(category)}</span>
        </nav>

        <!-- Article Card -->
        <article class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            
            <!-- Article Header -->
            <div class="p-6 md:p-10 border-b border-slate-100">
                <div class="flex items-center gap-2 mb-3 flex-wrap">
                    <span class="bg-primary/10 text-primary font-bold text-xs px-3 py-1 rounded-full border border-primary/20">
                        ${escapeHtml(category)}
                    </span>
                    <span class="text-xs text-slate-500 flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm text-slate-400">calendar_today</span>
                        ${escapeHtml(formattedDate)}
                    </span>
                    <span class="text-xs text-slate-500 flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm text-slate-400">person</span>
                        Oleh: <strong>${escapeHtml(author)}</strong>
                    </span>
                </div>

                <h1 class="font-headline font-extrabold text-2xl md:text-4xl text-slate-900 leading-tight tracking-tight">
                    ${escapeHtml(title)}
                </h1>
            </div>

            <!-- Featured Cover Photo -->
            <div class="relative bg-slate-900 aspect-[16/9] w-full overflow-hidden">
                <img src="${absoluteImgUrl}" alt="${escapeHtml(title)}" class="w-full h-full object-cover"/>
            </div>

            <!-- Article Body -->
            <div class="p-6 md:p-10 space-y-6 text-slate-700 text-base md:text-lg leading-relaxed font-normal">
                ${rawContent.split(/\r?\n\r?\n/).filter(Boolean).map(p => `
                    <p class="whitespace-pre-line leading-relaxed">${escapeHtml(p)}</p>
                `).join('')}
            </div>

            <!-- Multi-Photo Gallery if exists -->
            ${gallery.length > 0 ? `
            <div class="p-6 md:p-10 bg-slate-50/70 border-t border-slate-200">
                <h3 class="font-headline font-bold text-lg md:text-xl text-slate-900 mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary">collections</span> Galeri Foto Dokumentasi
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    ${gallery.map((img, i) => `
                        <div class="relative rounded-2xl overflow-hidden shadow-xs border border-slate-200 aspect-[4/3] bg-slate-200 group">
                            <img src="${img.startsWith('http') || img.startsWith('/') ? img : `${origin}/${img}`}" alt="Dokumentasi ${i+1}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <!-- Social Share Bar & Call to Action -->
            <div class="p-6 md:p-10 bg-gradient-to-br from-primary/5 via-emerald-50/50 to-primary/5 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h4 class="font-headline font-bold text-slate-900 text-lg">Bagikan Berita Kebaikan Ini</h4>
                    <p class="text-sm text-slate-600 mt-0.5">Ajak keluarga dan kerabat untuk bersama mendukung program keummatan.</p>
                </div>
                <div class="flex items-center gap-3 flex-wrap w-full md:w-auto">
                    <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('*' + title + '*\n\n' + canonicalUrl)}" target="_blank" class="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold px-5 py-3 rounded-2xl text-sm shadow-md hover:shadow-lg transition-all active:scale-95">
                        <span class="material-symbols-outlined text-lg">share</span> Share ke WhatsApp
                    </a>
                    <a href="${donateUrl}" class="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold px-5 py-3 rounded-2xl text-sm shadow-md hover:shadow-lg transition-all active:scale-95">
                        <span class="material-symbols-outlined text-lg">volunteer_activism</span> Salurkan Donasi
                    </a>
                </div>
            </div>

        </article>

        <!-- Back to Portal Button -->
        <div class="mt-8 text-center">
            <a href="${portalUrl}" class="inline-flex items-center gap-2 text-primary font-bold hover:underline text-sm md:text-base">
                <span class="material-symbols-outlined">arrow_back</span> Kembali ke Berita di Website Utama WIZ Babel
            </a>
        </div>

    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 mt-12 py-8 text-center text-xs text-slate-500">
        <div class="max-w-4xl mx-auto px-4 space-y-2">
            <p class="font-semibold text-slate-700">© 2026 Wahdah Inspirasi Zakat (WIZ) Kepulauan Bangka Belitung</p>
            <p>Jl. RE. Martadinata, Kel. Opas Indah, Kec. Taman Sari, Kota Pangkalpinang | Hotline: 0852-6701-4475</p>
        </div>
    </footer>

    <!-- Affiliate Tracker Script (30-day Cookie Attribution) -->
    <script>
        (function() {
            const urlParams = new URLSearchParams(window.location.search);
            const ref = urlParams.get('ref') || urlParams.get('affiliate') || urlParams.get('perantara');
            if (ref) {
                try {
                    localStorage.setItem('wiz_referral_code', ref.trim());
                    localStorage.setItem('wiz_referral_timestamp', Date.now().toString());
                    document.cookie = "wiz_ref=" + encodeURIComponent(ref.trim()) + "; path=/; max-age=" + (30*86400);
                } catch(e) {}
            }
        })();
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).send(html);
};
