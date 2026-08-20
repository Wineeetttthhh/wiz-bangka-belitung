/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Dynamic News Reader & Social Media Open Graph Generator
 * Endpoint: /berita/:id  or  /api/berita?id=:id
 * ============================================================
 * Menghasilkan kartu preview Open Graph (OG) kaya foto
 * untuk WhatsApp Chat, WhatsApp Story, Facebook, Twitter/X,
 * Telegram, dan LinkedIn.
 * 
 * JAMINAN KONSISTENSI FOTO & JUDUL:
 * 1. Mengambil data realtime dari Firebase Firestore master bundle & collection.
 * 2. Fallback cerdas ke canonical-store.json lokal.
 * 3. Melayani binary foto langsung (endpoint ?img=1) jika foto disimpan base64,
 *    sehingga crawler WhatsApp/Facebook dapat membaca foto asli 100%.
 * 4. Tidak pernah menukar foto kegiatan dengan kegiatan lain jika ID spesifik dicari.
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// Firebase Firestore Config (matches firebase-client.js & sync.js)
const FIREBASE_PROJECT_ID = 'wiz-bangka-belitung';
const FIREBASE_API_KEY    = 'AIzaSyAl8RQSk7Jnb7r4GCclAGbcZc2X-yKRhmQ';
const FIREBASE_BASE_URL   = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// ─── Firebase Firestore Deserialization ─────────────────────────────────────
function fromFsValue(v) {
    if (!v) return null;
    if ('nullValue' in v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFsValue);
    if ('mapValue' in v) return fromFsFields(v.mapValue.fields || {});
    return null;
}

function fromFsFields(fields) {
    const obj = {};
    for (const [k, v] of Object.entries(fields || {})) {
        obj[k] = fromFsValue(v);
    }
    return obj;
}

async function firebaseGet(docPath) {
    try {
        const url = `${FIREBASE_BASE_URL}/${docPath}?key=${FIREBASE_API_KEY}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s fast timeout for bots
        const res = await fetch(url, { 
            headers: { Accept: 'application/json' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) return null;
        const doc = await res.json();
        if (!doc || !doc.fields) return null;
        return fromFsFields(doc.fields);
    } catch (e) {
        return null;
    }
}

// ─── Canonical Seed Data Fallback ───────────────────────────────────────────
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

// ─── Main Request Handler ───────────────────────────────────────────────────
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

    // 1. Fetch all news from Firebase Master Bundle
    let allNews = [];
    try {
        const masterBundle = await firebaseGet('system_state/master_bundle');
        if (masterBundle && Array.isArray(masterBundle.news) && masterBundle.news.length > 0) {
            allNews = masterBundle.news;
        }
    } catch(e) {}

    // 2. If article still not found, check single news document in Firebase collection
    let article = null;
    if (newsId) {
        const cleanId = String(newsId).trim().toLowerCase();
        article = allNews.find(n => n && (String(n.id) === String(newsId) || String(n.id).toLowerCase() === cleanId));
        
        if (!article) {
            try {
                const singleDoc = await firebaseGet(`news/${newsId}`);
                if (singleDoc && singleDoc.title) {
                    article = { ...singleDoc, id: singleDoc.id || newsId };
                }
            } catch(e) {}
        }
    }

    // 3. Fallback: check canonical-store.json
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

    // 4. If no specific newsId was passed in URL (e.g. visiting /berita), default to latest news
    if (!article && !newsId && allNews.length > 0) {
        article = allNews[0];
    }

    // 5. If specific newsId was provided BUT definitely not found anywhere:
    // DO NOT show a random unrelated activity photo. Show neutral official WIZ branding.
    if (!article && newsId) {
        article = {
            id: newsId,
            title: 'Berita & Kegiatan Penyaluran - WIZ Bangka Belitung',
            category: 'Dokumentasi & Penyaluran',
            content: 'Dokumentasi kegiatan penyaluran dan pemberdayaan ummat oleh Wahdah Inspirasi Zakat (WIZ) Bangka Belitung. Silakan kunjungi website utama untuk melihat berita dan laporan kegiatan terbaru.',
            imageUrl: 'assets/images/foto-utama-wiz.jpg',
            gallery: [],
            author: 'Admin WIZ Babel',
            createdAt: new Date().toISOString(),
            isFallback: true
        };
    } else if (!article) {
        article = {
            id: 'wiz-default',
            title: 'WIZ Bangka Belitung - Berita & Kegiatan Penyaluran',
            category: 'Pemberdayaan Ummat',
            content: 'Wahdah Inspirasi Zakat (WIZ) Bangka Belitung - Lembaga Amil Zakat Terpercaya. Melayani Zakat, Infak, Sedekah & Wakaf untuk kemaslahatan ummat di Bangka Belitung.',
            imageUrl: 'assets/images/foto-utama-wiz.jpg',
            gallery: [],
            author: 'Admin WIZ Babel',
            createdAt: new Date().toISOString()
        };
    }

    // ─── IMAGE SERVING ROUTE (?img=1) ───────────────────────────────────────
    // Serves the actual binary JPEG/PNG for WhatsApp/FB crawlers if base64 is used
    if (isImageRequest) {
        const imgVal = (article.imageUrl || '').trim();
        
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
            // Local file in assets/images/
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
    const rawImg = (article.imageUrl || '').trim();

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
    const title = article.title || 'Berita WIZ Bangka Belitung';
    const rawContent = article.content || '';
    const excerpt = rawContent.slice(0, 180).replace(/\r?\n|\r/g, ' ') + (rawContent.length > 180 ? '...' : '');
    const canonicalUrl = `${origin}/berita/${encodeURIComponent(article.id)}${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;
    const donateUrl = `${origin}/donasi.html${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;
    const portalUrl = `${origin}/index.html?newsId=${encodeURIComponent(article.id)}${refCode ? '&ref=' + encodeURIComponent(refCode) : ''}#berita`;
    const formattedDate = formatDateIndo(article.eventDate || article.createdAt);
    const category = article.category || 'Kegiatan & Penyaluran';
    const author = article.author || 'Admin WIZ Babel';
    const gallery = Array.isArray(article.gallery) ? article.gallery.filter(Boolean) : [];

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
    <meta property="og:image:type" content="image/jpeg"/>
    <meta property="og:image:width" content="1200"/>
    <meta property="og:image:height" content="630"/>
    <meta property="og:image:alt" content="${escapeHtml(title)}"/>
    <meta property="article:published_time" content="${article.createdAt || new Date().toISOString()}"/>
    <meta property="article:author" content="${escapeHtml(author)}"/>
    <meta property="article:section" content="${escapeHtml(category)}"/>

    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:site" content="@wizbangka"/>
    <meta name="twitter:creator" content="@wizbangka"/>
    <meta name="twitter:url" content="${canonicalUrl}"/>
    <meta name="twitter:title" content="${escapeHtml(title)}"/>
    <meta name="twitter:description" content="${escapeHtml(excerpt)}"/>
    <meta name="twitter:image" content="${absoluteImgUrl}"/>
    <meta name="twitter:image:alt" content="${escapeHtml(title)}"/>

    <!-- Schema.org JSON-LD Structured Data for Search Bots & Crawlers -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": ${JSON.stringify(title)},
      "image": [${JSON.stringify(absoluteImgUrl)}],
      "datePublished": ${JSON.stringify(article.createdAt || new Date().toISOString())},
      "dateModified": ${JSON.stringify(article.updatedAt || article.createdAt || new Date().toISOString())},
      "author": [{
          "@type": "Organization",
          "name": ${JSON.stringify(author)},
          "url": ${JSON.stringify(origin)}
      }],
      "publisher": {
          "@type": "Organization",
          "name": "Wahdah Inspirasi Zakat Bangka Belitung",
          "logo": {
              "@type": "ImageObject",
              "url": ${JSON.stringify(origin + '/assets/images/logo-wiz-babel.png')}
          }
      },
      "description": ${JSON.stringify(excerpt)},
      "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": ${JSON.stringify(canonicalUrl)}
      }
    }
    </script>

    <!-- Google Fonts & Tailwind -->
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#006834',
                        'primary-dark': '#005228',
                        'primary-light': '#e9ffe9',
                        accent: '#fd9923',
                    },
                    fontFamily: {
                        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
                        body: ['Inter', 'sans-serif'],
                    }
                }
            }
        }
    </script>

    <!-- Client-side 30-Day Referral Tracking -->
    <script>
        (function() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const ref = urlParams.get('ref') || urlParams.get('affiliate') || urlParams.get('perantara') || '${escapeHtml(refCode)}';
                if (ref && ref.trim()) {
                    const cleanRef = ref.trim();
                    const expMs = Date.now() + (30 * 24 * 60 * 60 * 1000);
                    sessionStorage.setItem('wiz_active_ref_id', cleanRef);
                    localStorage.setItem('wiz_ref_code', cleanRef);
                    localStorage.setItem('wiz_ref_exp', String(expMs));
                    document.cookie = 'wiz_ref=' + encodeURIComponent(cleanRef) + '; path=/; max-age=2592000; SameSite=Lax';
                }
            } catch(e) {}
        })();
    </script>
</head>
<body class="bg-[#f8fafc] text-slate-800 font-body antialiased min-h-screen flex flex-col">

    <!-- Header Navigation -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="${origin}/index.html${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}" class="flex items-center gap-2.5 group">
                <img src="${origin}/assets/images/logo-wiz-babel.png" alt="WIZ Bangka Belitung" class="h-10 w-auto object-contain transition-transform group-hover:scale-105" onerror="this.src='${origin}/assets/images/foto-utama-wiz.jpg'"/>
                <div class="flex flex-col">
                    <span class="font-bold text-base text-primary leading-tight font-sans">WIZ Bangka Belitung</span>
                    <span class="text-[11px] text-slate-500 font-medium">Wahdah Inspirasi Zakat</span>
                </div>
            </a>
            <div class="flex items-center gap-2">
                <a href="${origin}/index.html#berita" class="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-primary px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <span class="material-symbols-outlined text-[16px]">arrow_back</span>
                    <span>Semua Berita</span>
                </a>
                <a href="${donateUrl}" class="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs">
                    <span class="material-symbols-outlined text-[16px]">volunteer_activism</span>
                    <span>Donasi Sekarang</span>
                </a>
            </div>
        </div>
    </header>

    <!-- Main Article Content -->
    <main class="flex-1 max-w-3xl w-full mx-auto px-4 py-6 md:py-10 space-y-6">
        
        <!-- Category & Date Meta -->
        <div class="flex flex-wrap items-center gap-2.5">
            <span class="bg-primary-light text-primary border border-primary/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">${escapeHtml(category)}</span>
            <span class="text-xs text-slate-500 font-medium flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px] text-slate-400">calendar_today</span>
                ${escapeHtml(formattedDate)}
            </span>
            <span class="text-xs text-slate-400">•</span>
            <span class="text-xs text-slate-500 font-medium flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px] text-slate-400">person</span>
                ${escapeHtml(author)}
            </span>
        </div>

        <!-- Article Title -->
        <h1 class="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight font-sans">
            ${escapeHtml(title)}
        </h1>

        <!-- Main Featured Image -->
        <div class="rounded-2xl overflow-hidden shadow-md border border-slate-200 aspect-video relative bg-slate-100">
            <img src="${rawImg.startsWith('data:image/') ? rawImg : absoluteImgUrl}" alt="${escapeHtml(title)}" class="w-full h-full object-cover" onerror="this.src='${origin}/assets/images/foto-utama-wiz.jpg'"/>
        </div>

        <!-- Share Bar (WhatsApp Story / Chat, FB, Twitter) -->
        <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[18px] text-primary">share</span>
                Bagikan Berita Ini:
            </span>
            <div class="flex items-center gap-2">
                <a href="https://api.whatsapp.com/send?text=*${encodeURIComponent(title)}*%0A%0A${encodeURIComponent(canonicalUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebd5a] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs">
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.044c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
                    <span>WhatsApp</span>
                </a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 bg-[#1877F2] hover:bg-[#1464cc] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs">
                    <span>Facebook</span>
                </a>
                <button onclick="navigator.clipboard.writeText('${canonicalUrl}'); alert('Tautan berita berhasil disalin!');" class="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer">
                    <span class="material-symbols-outlined text-[15px]">link</span>
                    <span>Salin Link</span>
                </button>
            </div>
        </div>

        <!-- Article Body Text -->
        <div class="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <div class="text-slate-800 text-base md:text-lg leading-relaxed whitespace-pre-line font-normal">
                ${escapeHtml(article.content)}
            </div>
        </div>

        <!-- Multi-photo Gallery (if available) -->
        ${gallery.length > 0 ? `
        <div class="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">collections</span>
                Galeri Dokumentasi Kegiatan (${gallery.length} Foto)
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${gallery.map(img => `
                <div class="rounded-xl overflow-hidden aspect-video bg-slate-100 border border-slate-200 group">
                    <img src="${img.startsWith('data:image/') ? img : (img.startsWith('http') ? img : `${origin}/${img.startsWith('/') ? img.slice(1) : img}`)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Dokumentasi WIZ Babel" onerror="this.src='${origin}/assets/images/foto-utama-wiz.jpg'"/>
                </div>`).join('')}
            </div>
        </div>` : ''}

        <!-- ═══ QUICK CALL TO ACTION DONATION WIDGET ═══ -->
        <div class="bg-gradient-to-br from-emerald-900 via-primary to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-500/30 space-y-5">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-emerald-700/50 pb-5">
                <div class="space-y-1">
                    <span class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                        <span class="material-symbols-outlined text-sm">volunteer_activism</span>
                        Tebar Manfaat &amp; Raih Berkah
                    </span>
                    <h3 class="text-xl sm:text-2xl font-bold font-sans">Tersentuh dengan Kisah Kebaikan Ini?</h3>
                    <p class="text-xs sm:text-sm text-emerald-100/90 max-w-xl">Salurkan infak dan sedekah terbaik Anda sekarang untuk mendukung program penyaluran dan pemberdayaan ummat berkelanjutan di Bangka Belitung.</p>
                </div>
                <div class="shrink-0">
                    <a href="${donateUrl}" class="bg-accent hover:bg-[#e08418] text-white font-extrabold text-sm px-6 py-3.5 rounded-2xl transition-all shadow-lg flex items-center gap-2 hover:scale-105">
                        <span class="material-symbols-outlined text-base">favorite</span>
                        <span>Donasi Sekarang</span>
                    </a>
                </div>
            </div>

            <!-- Quick Nominal Fast Links -->
            <div class="flex flex-wrap items-center gap-2 pt-1">
                <span class="text-xs text-emerald-200 font-semibold mr-1">Donasi Cepat:</span>
                <a href="${donateUrl}${donateUrl.includes('?') ? '&' : '?'}amount=25000" class="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 transition-all">Rp 25.000</a>
                <a href="${donateUrl}${donateUrl.includes('?') ? '&' : '?'}amount=50000" class="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 transition-all">Rp 50.000</a>
                <a href="${donateUrl}${donateUrl.includes('?') ? '&' : '?'}amount=100000" class="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 transition-all">Rp 100.000</a>
                <a href="${donateUrl}${donateUrl.includes('?') ? '&' : '?'}amount=250000" class="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 transition-all">Rp 250.000</a>
            </div>
        </div>

        <!-- Back to Home / Portal Web -->
        <div class="text-center pt-2">
            <a href="${portalUrl}" class="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                <span class="material-symbols-outlined text-base">arrow_back</span>
                <span>Lihat Berita Lainnya di Portal Web WIZ Bangka Belitung</span>
            </a>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500">
        <p>© ${new Date().getFullYear()} Wahdah Inspirasi Zakat (WIZ) Bangka Belitung. All rights reserved.</p>
    </footer>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).send(html);
};
