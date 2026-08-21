/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Dynamic Daily Quote & Flyer Open Graph (OG) Generator & SSR Page
 * Endpoint: /quote/:id  or  /api/quote?id=:id&ref=:ref
 * ============================================================
 * Menghasilkan kartu preview Open Graph (OG) kaya flyer poster resolusi tinggi
 * untuk WhatsApp Chat, Status WhatsApp, Facebook, Telegram, dan Instagram,
 * serta mengatribusikan kode referral mitra selama 30 hari via Cookie.
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_QUOTES = [
    {
        id: 'quote-1',
        text: 'Sedekah itu tidak akan mengurangi harta. Tidak ada orang yang memberi maaf kepada orang lain melainkan Allah akan menambah kemuliaannya.',
        source: 'HR. Muslim no. 2588',
        category: 'Sedekah & Keberkahan',
        imageUrl: 'https://images.unsplash.com/photo-1542665952-14513db15293?q=80&w=1200&auto=format&fit=crop',
        date: '2026-08-20',
        status: 'active'
    },
    {
        id: 'quote-2',
        text: 'Tidak ada suatu hari pun ketika seorang hamba memasuki waktu pagi melainkan turun dua malaikat. Salah satunya berdoa: Ya Allah, berikanlah ganti bagi orang yang berinfak.',
        source: 'HR. Bukhari no. 1442 & Muslim no. 1010',
        category: 'Infak Subuh',
        imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=1200&auto=format&fit=crop',
        date: '2026-08-21',
        status: 'active'
    },
    {
        id: 'quote-3',
        text: 'Bentengilah hartamu dengan zakat, obatilah orang-orang sakitmu dengan sedekah, dan persiapkanlah doa untuk menghadapi bencana.',
        source: 'HR. Ath-Thabarani',
        category: 'Zakat & Penyucian Jiwa',
        imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200&auto=format&fit=crop',
        date: '2026-08-19',
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

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'www.wizbangkabelitung.or.id';
    const origin = `${proto}://${host}`;

    // Load Quotes from canonical-store.json
    let allQuotes = [...DEFAULT_QUOTES];
    try {
        const canonicalPath = path.join(__dirname, '..', 'assets', 'data', 'canonical-store.json');
        if (fs.existsSync(canonicalPath)) {
            const cData = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
            if (cData && Array.isArray(cData.quotes) && cData.quotes.length > 0) {
                allQuotes = cData.quotes;
            }
        }
    } catch (e) {}

    // Find requested quote
    let quote = null;
    if (quoteId && quoteId !== 'latest' && quoteId !== 'today') {
        quote = allQuotes.find(q => String(q.id).toLowerCase() === String(quoteId).toLowerCase() || String(q.id) === String(quoteId));
    }
    if (!quote) {
        quote = allQuotes.find(q => q.status === 'active') || allQuotes[0] || DEFAULT_QUOTES[0];
    }

    // Determine high-res public image URL (Crawler-friendly, non-base64)
    let imageUrl = quote.imageUrl || 'assets/images/foto-utama-wiz.jpg';
    if (!imageUrl || imageUrl.startsWith('data:image') || imageUrl.startsWith('blob:')) {
        imageUrl = 'https://images.unsplash.com/photo-1542665952-14513db15293?q=80&w=1200&auto=format&fit=crop';
    } else if (!imageUrl.startsWith('http')) {
        imageUrl = `${origin}/${imageUrl.replace(/^\//, '')}`;
    }

    const canonicalUrl = `${origin}/flyer/${quote.id}${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;
    const donateUrl = `${origin}/donasi.html${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;
    const programUrl = `${origin}/program.html${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;

    // Set 30-Day Referral Cookie if refCode is present (max-age 2,592,000s = 30 days)
    if (refCode) {
        res.setHeader('Set-Cookie', `wiz_ref=${encodeURIComponent(refCode)}; Path=/; Max-Age=2592000; SameSite=Lax`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');

    const metaTitle = quote.source ? `${quote.source} • Quote & Inspirasi WIZ` : 'Quote & Inspirasi Dakwah — WIZ Bangka Belitung';
    const metaDesc = `"${quote.text}" — Baca selengkapnya & salurkan infak terbaik melalui Laznas Wahdah Inspirasi Zakat (WIZ) Bangka Belitung.`;

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(metaTitle)}</title>
    <meta name="description" content="${escapeHtml(metaDesc)}">
    <link rel="icon" href="${origin}/assets/images/logo-wiz-babel.png" type="image/png">

    <!-- Open Graph / WhatsApp / Facebook / Telegram / Instagram -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="WIZ Bangka Belitung">
    <meta property="og:title" content="${escapeHtml(quote.source || quote.category || 'Quote & Inspirasi Harian')}">
    <meta property="og:description" content="${escapeHtml(metaDesc)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="1200">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(quote.source || 'Quote & Inspirasi Harian')}">
    <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">

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
    <header class="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div class="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="${origin}/index.html" class="flex items-center gap-2.5">
                <img src="${origin}/assets/images/logo-wiz-babel.png" alt="WIZ Babel" class="h-9 w-auto object-contain">
                <span class="font-extrabold text-sm text-slate-900">WIZ Bangka Belitung</span>
            </a>
            <div class="flex items-center gap-2">
                <a href="${origin}/program.html${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}" class="text-xs font-semibold text-slate-600 hover:text-emerald-600 px-3 py-1.5 rounded-lg hidden sm:inline-block">Katalog Program</a>
                <a href="${escapeHtml(donateUrl)}" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-full shadow transition-all flex items-center gap-1">
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
            <div class="relative w-full bg-slate-900 overflow-hidden flex items-center justify-center group">
                <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(quote.source || 'Flyer Quote')}" class="w-full h-auto max-h-[600px] object-contain transition-transform duration-500">
                <span class="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold px-3.5 py-1 rounded-full shadow backdrop-blur-xs">
                    ${escapeHtml(quote.category || 'Quote Dakwah')}
                </span>
                <a href="${escapeHtml(imageUrl)}" download="Flyer-WIZ-${escapeHtml(quote.id)}.jpg" target="_blank" class="absolute bottom-4 right-4 bg-black/70 hover:bg-black text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow backdrop-blur-xs flex items-center gap-1.5 transition-colors">
                    <span class="material-symbols-outlined text-sm">download</span> Unduh Flyer
                </a>
            </div>

            <!-- Quote Text & Source -->
            <div class="p-6 sm:p-8 space-y-6">
                <div class="relative bg-emerald-50/60 border border-emerald-100 rounded-3xl p-6 sm:p-8">
                    <span class="material-symbols-outlined text-4xl text-emerald-300 absolute top-4 left-4 opacity-50 select-none">format_quote</span>
                    <div class="relative z-10 space-y-4">
                        <blockquote class="text-base sm:text-xl font-medium text-slate-800 italic leading-relaxed pt-2">
                            "${escapeHtml(quote.text)}"
                        </blockquote>
                        <div class="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-emerald-200/50">
                            <span class="font-extrabold text-xs sm:text-sm text-emerald-800 flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-base">menu_book</span>
                                ${escapeHtml(quote.source || 'Wahdah Inspirasi Zakat')}
                            </span>
                            <span class="text-xs text-slate-500 font-medium">
                                ${escapeHtml(quote.date || 'Inspirasi Harian')}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Call to Action Box: Donasi Sekarang -->
                <div class="bg-gradient-to-r from-emerald-950 via-emerald-900 to-primary text-white rounded-3xl p-6 sm:p-7 shadow-lg space-y-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-2xl text-amber-400">volunteer_activism</span>
                        </div>
                        <div>
                            <h3 class="text-base sm:text-lg font-extrabold leading-tight">Salurkan Kebaikan Hari Ini</h3>
                            <p class="text-xs text-emerald-100/90">Wujudkan hikmah kutipan di atas dengan berbagi kepada sesama melalui Laznas WIZ Bangka Belitung.</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <a href="${escapeHtml(donateUrl)}&amount=10000" class="bg-white/15 hover:bg-white/25 text-white font-bold text-xs py-2.5 rounded-xl text-center border border-white/20 transition-all">Rp 10.000</a>
                        <a href="${escapeHtml(donateUrl)}&amount=50000" class="bg-white/15 hover:bg-white/25 text-white font-bold text-xs py-2.5 rounded-xl text-center border border-white/20 transition-all">Rp 50.000</a>
                        <a href="${escapeHtml(donateUrl)}&amount=100000" class="bg-white/15 hover:bg-white/25 text-white font-bold text-xs py-2.5 rounded-xl text-center border border-white/20 transition-all">Rp 100.000</a>
                        <a href="${escapeHtml(donateUrl)}&amount=500000" class="bg-white/15 hover:bg-white/25 text-white font-bold text-xs py-2.5 rounded-xl text-center border border-white/20 transition-all">Rp 500.000</a>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-3 pt-2">
                        <a href="${escapeHtml(donateUrl)}" class="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm py-3.5 rounded-2xl text-center shadow-lg transition-all flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined text-lg">favorite</span> Donasi Bebas Nominal
                        </a>
                        <a href="${escapeHtml(programUrl)}" class="bg-white/10 hover:bg-white/20 text-white font-bold text-xs py-3.5 px-5 rounded-2xl text-center border border-white/20 transition-all flex items-center justify-center gap-1.5">
                            <span class="material-symbols-outlined text-sm">grid_view</span> Lihat Program
                        </a>
                    </div>
                </div>

                <!-- Social Share Bar -->
                <div class="border-t border-slate-100 pt-6 space-y-3">
                    <span class="text-xs font-bold text-slate-500 block uppercase tracking-wider">Bagikan Inspirasi Ini:</span>
                    <div class="flex flex-wrap gap-2.5">
                        <button onclick="shareQuoteWA()" class="bg-[#25D366] hover:bg-[#1ebd5a] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer">
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.044c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
                            <span>WhatsApp</span>
                        </button>
                        <button onclick="shareQuoteTelegram()" class="bg-[#0088cc] hover:bg-[#0077b5] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer">
                            <span class="material-symbols-outlined text-sm">send</span>
                            <span>Telegram</span>
                        </button>
                        <button onclick="copyQuoteLink()" class="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer">
                            <span class="material-symbols-outlined text-sm">content_copy</span>
                            <span>Salin Tautan</span>
                        </button>
                    </div>
                </div>
            </div>
        </article>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>&copy; ${new Date().getFullYear()} Laznas Wahdah Inspirasi Zakat (WIZ) Bangka Belitung. Amanah, Profesional, dan Terpercaya.</p>
    </footer>

    <script>
        const quoteUrl = '${escapeHtml(canonicalUrl)}';
        const quoteTitle = '${escapeHtml(quote.source ? quote.source : 'Quote & Inspirasi Harian WIZ')}';
        const quoteBody = '${escapeHtml(quote.text ? '"' + quote.text + '"' : '')}';
        const quoteText = \`\${quoteTitle}\\n\\n\${quoteBody}\\n\\nBaca selengkapnya & salurkan infak terbaik melalui tautan berikut:\\n\${quoteUrl}\`;

        function shareQuoteWA() {
            const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(quoteText);
            window.open(url, '_blank');
        }

        function shareQuoteTelegram() {
            const url = 'https://t.me/share/url?url=' + encodeURIComponent(quoteUrl) + '&text=' + encodeURIComponent(quoteText);
            window.open(url, '_blank');
        }

        function copyQuoteLink() {
            navigator.clipboard.writeText(quoteUrl).then(() => {
                alert('✅ Link Quote & Flyer berhasil disalin ke clipboard:\n' + quoteUrl);
            });
        }
    </script>
</body>
</html>`;

    res.send(html);
};
