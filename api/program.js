/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Dynamic Program Reader & Social Media Open Graph (OG) Generator
 * Endpoint: /program/:slug  or  /api/program?name=:name&ref=:ref
 * ============================================================
 * Menghasilkan kartu preview Open Graph (OG) kaya foto resolusi tinggi
 * untuk WhatsApp Chat, WhatsApp Story, Facebook, Twitter/X, Telegram,
 * dan mengatribusikan kode referral mitra selama 30 hari via Cookie.
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// Default Specific Programs Metadata with curated high-res cover images
const SPECIFIC_PROGRAMS_METADATA = {
    'pembangunan-markaz': {
        title: 'Pembangunan Markaz',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 2.004.000.000',
        description: 'Dukung pembangunan pusat kegiatan dakwah, kaderisasi da\'i, dan pembinaan umat di pelosok Bangka Belitung untuk mencetak generasi Rabbani yang kokoh dan berakhlak mulia.',
        imageUrl: 'https://images.unsplash.com/photo-1542665952-14513db15293?q=80&w=1200&auto=format&fit=crop'
    },
    'pengadaan-perbaikan-kendaraan': {
        title: 'Pengadaan & Perbaikan Kendaraan',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 5.000.000',
        description: 'Fasilitasi mobilitas para dai dalam menyebarkan dakwah ke pelosok Bangka Belitung dengan armada kendaraan operasional yang layak dan memadai.',
        imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1200&auto=format&fit=crop'
    },
    'santunan-mualaf': {
        title: 'Santunan Mualaf',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 12.000.000',
        description: 'Berikan dukungan moral dan materil bagi para mualaf agar semakin teguh dalam memeluk dan mengamalkan ajaran Islam di Bangka Belitung.',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop'
    },
    'tahfidz': {
        title: 'Tahfidz Al-Qur\'an',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 15.000.000',
        description: 'Bantu pembinaan dan fasilitas para santri penghafal Al-Qur\'an untuk mencetak generasi penjaga wahyu di Bangka Belitung.',
        imageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=1200&auto=format&fit=crop'
    },
    'tebar-sembako': {
        title: 'Tebar Sembako Nusantara',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 25.000.000',
        description: 'Salurkan paket sembako bergizi untuk lansia, janda dhuafa, dan keluarga pra-sejahtera di pelosok Bangka Belitung.',
        imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=1200&auto=format&fit=crop'
    },
    'sedekah-jumat': {
        title: 'Sedekah Jumat Berkah',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 10.000.000',
        description: 'Raih keutamaan hari Jumat dengan berbagi makanan siap santap dan sedekah produktif bagi dhuafa.',
        imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200&auto=format&fit=crop'
    },
    'santunan-yatim': {
        title: 'Santunan Anak Yatim',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 30.000.000',
        description: 'Hadirkan senyum dan masa depan cerah untuk anak-anak yatim binaan di Bangka Belitung dengan santunan rutin dan pendidikan.',
        imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200&auto=format&fit=crop'
    },
    'tebar-iftar': {
        title: 'Tebar Iftar Ramadan',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 50.000.000',
        description: 'Berbagi paket buka puasa berkah untuk ribuan santri, dhuafa, dan pejuang nafkah di bulan suci Ramadan.',
        imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb9?q=80&w=1200&auto=format&fit=crop'
    },
    'beasiswa-pendidikan-juara': {
        title: 'Beasiswa Pendidikan Juara',
        pillar: 'Pendidikan & Beasiswa',
        target: 'Rp 40.000.000',
        description: 'Dukung biaya SPP dan perlengkapan sekolah bagi siswa berprestasi dari keluarga kurang mampu.',
        imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop'
    },
    'beasiswa-tahfidz-dhuafa': {
        title: 'Beasiswa Tahfidz & Dhuafa',
        pillar: 'Pendidikan & Beasiswa',
        target: 'Rp 35.000.000',
        description: 'Bantuan biaya studi dan living cost santri penghafal Qur\'an di pesantren dan perguruan tinggi.',
        imageUrl: 'https://images.unsplash.com/photo-1585036156171-384164a8c675?q=80&w=1200&auto=format&fit=crop'
    },
    'bantuan-kesehatan-dhuafa': {
        title: 'Bantuan Kesehatan Dhuafa',
        pillar: 'Kesehatan Masyarakat',
        target: 'Rp 20.000.000',
        description: 'Layanan berobat gratis dan bantuan pengobatan bagi pasien dhuafa dan lansia kritis di Bangka Belitung.',
        imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200&auto=format&fit=crop'
    },
    'modal-usaha-mandiri': {
        title: 'Modal Usaha Mandiri',
        pillar: 'Ekonomi & Pemberdayaan',
        target: 'Rp 30.000.000',
        description: 'Bantuan modal usaha tanpa riba dan pendampingan bisnis untuk mengangkat mustahik menjadi muzakki.',
        imageUrl: 'https://images.unsplash.com/photo-1556742049-0a670fc80782?q=80&w=1200&auto=format&fit=crop'
    }
};

function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/[-\s]+/g, '-');
}

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
    let progQuery = urlObj.searchParams.get('program') || urlObj.searchParams.get('name') || urlObj.searchParams.get('slug') || urlObj.searchParams.get('id');
    const refCode = (urlObj.searchParams.get('ref') || urlObj.searchParams.get('affiliate') || urlObj.searchParams.get('perantara') || '').trim();

    // Parse from path /program/[slug] if applicable
    if (!progQuery) {
        const parts = urlObj.pathname.split('/').filter(Boolean);
        const progIdx = parts.indexOf('program');
        if (progIdx !== -1 && parts[progIdx + 1]) {
            progQuery = decodeURIComponent(parts[progIdx + 1]);
        }
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'www.wizbangkabelitung.or.id';
    const origin = `${proto}://${host}`;

    // Find program metadata
    let selectedProgram = null;
    if (progQuery) {
        const querySlug = slugify(progQuery);
        if (SPECIFIC_PROGRAMS_METADATA[querySlug]) {
            selectedProgram = SPECIFIC_PROGRAMS_METADATA[querySlug];
        } else {
            // Fuzzy search by title words
            for (const [key, prog] of Object.entries(SPECIFIC_PROGRAMS_METADATA)) {
                if (key.includes(querySlug) || querySlug.includes(key) || slugify(prog.title).includes(querySlug)) {
                    selectedProgram = prog;
                    break;
                }
            }
        }
    }

    // Default if not found or broad program visit
    if (!selectedProgram) {
        selectedProgram = {
            title: progQuery ? decodeURIComponent(progQuery) : 'Katalog Program Kebaikan & ZIS',
            pillar: 'Wahdah Inspirasi Zakat',
            target: 'Transparan & Berkelanjutan',
            description: 'Salurkan Zakat, Infak, dan Sedekah Anda melalui program terverifikasi Wahdah Inspirasi Zakat (WIZ) Bangka Belitung untuk kemaslahatan ummat.',
            imageUrl: 'https://images.unsplash.com/photo-1542665952-14513db15293?q=80&w=1200&auto=format&fit=crop'
        };
    }

    const title = selectedProgram.title;
    const pillar = selectedProgram.pillar;
    const description = selectedProgram.description;
    const rawImg = selectedProgram.imageUrl;
    const imageUrl = rawImg.startsWith('http') ? rawImg : `${origin}/${rawImg.replace(/^\//, '')}`;

    const canonicalSlug = slugify(title);
    const canonicalUrl = `${origin}/program.html?program=${encodeURIComponent(title)}${refCode ? '&ref=' + encodeURIComponent(refCode) : ''}`;
    const donateUrl = `${origin}/donasi.html?program=${encodeURIComponent(title)}${refCode ? '&ref=' + encodeURIComponent(refCode) : ''}`;

    // Set 30-Day Referral Cookie if refCode is present (max-age 2,592,000s)
    if (refCode) {
        res.setHeader('Set-Cookie', `wiz_ref=${encodeURIComponent(refCode)}; Path=/; Max-Age=2592000; SameSite=Lax`);
    }

    // Return Rich SSR HTML with OpenGraph tags for WhatsApp, Facebook, Twitter, Telegram
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} — WIZ Bangka Belitung</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="icon" href="${origin}/assets/images/logo-wiz-babel.png" type="image/png">

    <!-- Open Graph / WhatsApp / Facebook / Telegram / Instagram -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="WIZ Bangka Belitung">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:alt" content="${escapeHtml(title)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">

    <!-- Google Fonts & Tailwind -->
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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
<body class="bg-slate-50 text-slate-900 font-sans min-h-screen flex flex-col antialiased">
    <!-- Header -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div class="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="${origin}/index.html" class="flex items-center gap-2.5">
                <img src="${origin}/assets/images/logo-wiz-babel.png" alt="WIZ Babel" class="h-9 w-auto object-contain">
                <span class="font-extrabold text-sm text-slate-900">WIZ Babel</span>
            </a>
            <div class="flex items-center gap-2">
                <a href="${origin}/program.html" class="text-xs font-semibold text-slate-600 hover:text-emerald-600 px-3 py-1.5 rounded-lg">Katalog Program</a>
                <a href="${escapeHtml(donateUrl)}" class="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-full shadow transition-all flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">favorite</span> Donasi
                </a>
            </div>
        </div>
    </header>

    <!-- Main Hero Card -->
    <main class="max-w-3xl mx-auto px-4 py-8 flex-grow space-y-6 w-full">
        <div class="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200">
            <div class="relative aspect-video w-full bg-slate-900 overflow-hidden">
                <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" class="w-full h-full object-cover">
                <span class="absolute top-4 left-4 bg-emerald-600/90 text-white text-xs font-bold px-3.5 py-1 rounded-full shadow backdrop-blur-xs">
                    ${escapeHtml(pillar)}
                </span>
            </div>

            <div class="p-6 sm:p-8 space-y-6">
                <div>
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight mb-2">
                        ${escapeHtml(title)}
                    </h1>
                    <p class="text-slate-600 text-sm sm:text-base leading-relaxed">
                        ${escapeHtml(description)}
                    </p>
                </div>

                <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <span class="text-xs text-slate-500 font-semibold block">Target Program:</span>
                        <span class="text-lg font-extrabold text-emerald-800">${escapeHtml(selectedProgram.target)}</span>
                    </div>
                    <div class="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-emerald-600 text-base">verified</span>
                        <span>Program Resmi Terverifikasi WIZ Babel</span>
                    </div>
                </div>

                <div class="space-y-3 pt-2">
                    <a href="${escapeHtml(donateUrl)}" class="w-full bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-extrabold text-base py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-center">
                        <span class="material-symbols-outlined">favorite</span>
                        <span>Donasi Sekarang Untuk Program Ini</span>
                    </a>

                    <button onclick="handleShareClick()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                        <span class="material-symbols-outlined text-base">share</span>
                        <span>Bagikan Program Ini ke WhatsApp / Sosmed</span>
                    </button>
                </div>
            </div>
        </div>
    </main>

    <footer class="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        &copy; 2026 Wahdah Inspirasi Zakat (WIZ) Bangka Belitung. All rights reserved.
    </footer>

    <script>
        function handleShareClick() {
            const shareTitle = 'Bantu Program: ${escapeHtml(title)}';
            const shareText = '${escapeHtml(title)}\\n\\n${escapeHtml(description)}\\n\\nMari berdonasi bersama WIZ Bangka Belitung melalui tautan resmi:\\n${escapeHtml(canonicalUrl)}';
            
            if (navigator.share) {
                navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: '${escapeHtml(canonicalUrl)}'
                }).catch(() => {});
            } else {
                const waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(shareText);
                window.open(waUrl, '_blank');
            }
        }
    </script>
</body>
</html>`;

    res.status(200).send(html);
};
