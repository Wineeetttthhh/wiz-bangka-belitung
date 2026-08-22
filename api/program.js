/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Dynamic Program Reader & Social Media Open Graph (OG) Generator
 * Endpoint: /program/:slug  or  /api/program?name=:name&ref=:ref
 * Direct Image: /program-image/:slug.jpg or /api/program?slug=:slug&img=1
 * ============================================================
 * Menghasilkan kartu preview Open Graph (OG) kaya foto resolusi tinggi 1200x630
 * untuk WhatsApp Chat, WhatsApp Story, Facebook, Twitter/X, Telegram,
 * dan mengatribusikan kode referral mitra selama 30 hari via Cookie.
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ffiltrlzdbwhhhxzmzuo.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_GiA1BOjbW2psTU36149xuA_E26wGBI3';

const DEFAULT_FALLBACK_IMAGE = 'https://www.wizbangkabelitung.or.id/assets/images/foto-utama-wiz.jpg';

// In-memory cache for ultra-fast serverless execution
let cachedCloudBundle = null;
let cachedCloudBundleTime = 0;
const CACHE_TTL_MS = 20000; // 20s

// Curated Specific Programs Metadata with high-res 1200x630 cover photos
const SPECIFIC_PROGRAMS_METADATA = {
    // ── 1. Dakwah & Pembinaan (Berkah Hidayah) ──
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
    'pengadaan-dan-perbaikan-kendaraan': {
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
    'pelatihan-public-speaking': {
        title: 'Pelatihan Public Speaking',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 4.000.000',
        description: 'Tingkatkan kapasitas komunikasi, retorika, dan dakwah para da\'i muda serta relawan dakwah di Bangka Belitung.',
        imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=1200&auto=format&fit=crop'
    },
    'tabligh-akbar-dzulhijjah': {
        title: 'Tabligh Akbar Dzulhijjah',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 10.000.000',
        description: 'Syiar dakwah akbar menyambut bulan haji dan qurban untuk mempererat ukhuwah Islamiyah masyarakat Bangka Belitung.',
        imageUrl: 'https://images.unsplash.com/photo-1542665952-14513db15293?q=80&w=1200&auto=format&fit=crop'
    },
    'pelatihan-guru-dirosa': {
        title: 'Pelatihan Guru Dirosa',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 6.000.000',
        description: 'Pelatihan metode Dirosa (Pendidikan Al-Qur\'an Orang Dewasa) untuk mencetak guru-guru ngaji yang kompeten.',
        imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop'
    },
    'pelatihan-penyelenggaraan-jenazah': {
        title: 'Pelatihan Penyelenggaraan Jenazah',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 5.000.000',
        description: 'Edukasi fardhu kifayah tata cara memandikan, mengafani, menyalatkan, dan menguburkan jenazah sesuai sunnah.',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop'
    },
    'pelatihan-relawan-media-dakwah': {
        title: 'Pelatihan Relawan Media Dakwah',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 5.000.000',
        description: 'Pelatihan konten kreatif, fotografi, videografi, dan jurnalistik dakwah digital bagi generasi muda.',
        imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop'
    },
    'lomba-desain-poster-dakwah': {
        title: 'Lomba Desain Poster Dakwah',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 3.000.000',
        description: 'Wadah kreativitas visual pemuda muslim dalam menyebarkan pesan kebaikan dan nilai-nilai Islam.',
        imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop'
    },
    'kantor-dpw-wi-babel-dan-wiz': {
        title: 'Kantor DPW WI Babel & WIZ',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 150.000.000',
        description: 'Pengadaan dan renovasi pusat pelayanan administrasi ummat, dakwah terpadu, dan kantor Laznas WIZ Bangka Belitung.',
        imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop'
    },
    'pengadaan-celengan-besar': {
        title: 'Pengadaan Celengan Sedekah Subuh',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 5.000.000',
        description: 'Penyediaan sarana infak harian di masjid, perkantoran, dan pertokoan untuk menggalakkan gerakan gemar sedekah.',
        imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=1200&auto=format&fit=crop'
    },

    // ── 2. Sosial & Kemanusiaan (Berkah Peduli) ──
    'tebar-sembako': {
        title: 'Tebar Sembako Dhuafa',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 25.000.000',
        description: 'Penyaluran paket bahan pangan pokok untuk keluarga dhuafa, janda lansia, dan yatim di pelosok Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/sedekah-beras-dhuafa.jpg'
    },
    'sedekah-beras-dhuafa': {
        title: 'Sedekah Beras Dhuafa',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 20.000.000',
        description: 'Bantuan beras premium secara berkala untuk mencukupi kebutuhan pokok para mustahik dan santri pondok pesantren.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/sedekah-beras-dhuafa.jpg'
    },
    'sedekah-jumat-sedulang-berkah': {
        title: 'Sedekah Jumat (Sedulang Berkah)',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 10.000.000',
        description: 'Berbagi paket makanan siap santap dan sedekah jumat berkah untuk jamaah masjid, musafir, dan pekerja harian.',
        imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=1200&auto=format&fit=crop'
    },
    'santunan-yatim': {
        title: 'Santunan Anak Yatim',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 30.000.000',
        description: 'Hadirkan senyum dan masa depan cerah untuk anak-anak yatim binaan di Bangka Belitung dengan santunan rutin dan perlengkapan sekolah.',
        imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200&auto=format&fit=crop'
    },
    'santunan-anak-yatim': {
        title: 'Santunan Anak Yatim',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 30.000.000',
        description: 'Hadirkan senyum dan masa depan cerah untuk anak-anak yatim binaan di Bangka Belitung dengan santunan rutin dan perlengkapan sekolah.',
        imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200&auto=format&fit=crop'
    },
    'tebar-iftar': {
        title: 'Tebar Iftar Ramadan',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 50.000.000',
        description: 'Berbagi paket buka puasa berkah untuk ribuan santri, dhuafa, dan pejuang nafkah di bulan suci Ramadan.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/tebar-iftar.jpg'
    },
    'tebar-iftar-nusantara': {
        title: 'Tebar Iftar Ramadan',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 50.000.000',
        description: 'Berbagi paket buka puasa berkah untuk ribuan santri, dhuafa, dan pejuang nafkah di bulan suci Ramadan.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/tebar-iftar.jpg'
    },
    'tebar-quran-nusantara': {
        title: 'Tebar Qur\'an Nusantara',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 20.000.000',
        description: 'Distribusi mushaf Al-Qur\'an standar Madinah untuk TPQ, rumah tahfidz, dan masjid di pelosok desa binaan.',
        imageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=1200&auto=format&fit=crop'
    },
    'bahagiakan-guru-ngaji': {
        title: 'Bahagiakan Guru Ngaji',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 15.000.000',
        description: 'Apresiasi dan kafalah bulanan bagi para ustadz dan guru ngaji sukarela yang ikhlas mengajarkan Al-Qur\'an.',
        imageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=1200&auto=format&fit=crop'
    },
    'sedekah-air': {
        title: 'Sedekah Air Bersih',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 18.000.000',
        description: 'Penyediaan sumur bor, instalasi tandon, dan pipanisasi air bersih untuk daerah krisis kekeringan.',
        imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?q=80&w=1200&auto=format&fit=crop'
    },
    'sedekah-air-bersih': {
        title: 'Sedekah Air Bersih',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 18.000.000',
        description: 'Penyediaan sumur bor, instalasi tandon, dan pipanisasi air bersih untuk daerah krisis kekeringan.',
        imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?q=80&w=1200&auto=format&fit=crop'
    },

    // ── 3. Pendidikan & Beasiswa (Berkah Juara) ──
    'beasiswa-pendidikan-juara': {
        title: 'Beasiswa Pendidikan Juara',
        pillar: 'Pendidikan & Beasiswa',
        target: 'Rp 40.000.000',
        description: 'Dukung biaya SPP dan perlengkapan sekolah bagi siswa berprestasi dari keluarga kurang mampu.',
        imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop'
    },
    'beasiswa-tahfidz': {
        title: 'Beasiswa Tahfidz & Dhuafa',
        pillar: 'Pendidikan & Beasiswa',
        target: 'Rp 35.000.000',
        description: 'Bantuan biaya studi dan living cost santri penghafal Qur\'an di pesantren dan perguruan tinggi.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/beasiswa-tahfidz.jpg'
    },
    'beasiswa-tahfidz-dhuafa': {
        title: 'Beasiswa Tahfidz & Dhuafa',
        pillar: 'Pendidikan & Beasiswa',
        target: 'Rp 35.000.000',
        description: 'Bantuan biaya studi dan living cost santri penghafal Qur\'an di pesantren dan perguruan tinggi.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/beasiswa-tahfidz.jpg'
    },
    'perlengkapan-belajar-yatim': {
        title: 'Perlengkapan Belajar Yatim',
        pillar: 'Pendidikan & Beasiswa',
        target: 'Rp 12.000.000',
        description: 'Bantuan tas, seragam, sepatu, dan buku pelajaran untuk anak-anak yatim dhuafa menyambut tahun ajaran baru.',
        imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop'
    },

    // ── 4. Kesehatan Masyarakat (Berkah Sehat) ──
    'bantuan-kesehatan-dhuafa': {
        title: 'Bantuan Kesehatan Dhuafa',
        pillar: 'Kesehatan Masyarakat',
        target: 'Rp 20.000.000',
        description: 'Layanan berobat gratis dan bantuan pengobatan bagi pasien dhuafa dan lansia kritis di Bangka Belitung.',
        imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200&auto=format&fit=crop'
    },
    'bantuan-pasien-kritis-dhuafa': {
        title: 'Bantuan Pasien Kritis Dhuafa',
        pillar: 'Kesehatan Masyarakat',
        target: 'Rp 20.000.000',
        description: 'Bantuan biaya tebus obat dan rawat inap bagi pasien dhuafa kurang mampu yang tidak tercover penuh oleh asuransi.',
        imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200&auto=format&fit=crop'
    },
    'ambulans-gratis-peduli': {
        title: 'Ambulans Gratis Peduli',
        pillar: 'Kesehatan Masyarakat',
        target: 'Rp 30.000.000',
        description: 'Operasional layanan antar jemput pasien dhuafa dan jenazah gratis 24 jam di wilayah Bangka Belitung.',
        imageUrl: 'https://images.unsplash.com/photo-1587745416684-47b883828d6b?q=80&w=1200&auto=format&fit=crop'
    },
    'khitanan-massal-dhuafa': {
        title: 'Khitanan Massal Dhuafa',
        pillar: 'Kesehatan Masyarakat',
        target: 'Rp 15.000.000',
        description: 'Program khitanan massal gratis medis profesional dan santunan bingkisan untuk anak-anak dhuafa.',
        imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=1200&auto=format&fit=crop'
    },

    // ── 5. Ekonomi & Pemberdayaan (Berkah Mandiri) ──
    'modal-usaha-mandiri': {
        title: 'Modal Usaha Mandiri',
        pillar: 'Ekonomi & Pemberdayaan',
        target: 'Rp 30.000.000',
        description: 'Bantuan modal usaha tanpa riba dan pendampingan bisnis untuk mengangkat mustahik menjadi muzakki.',
        imageUrl: 'https://images.unsplash.com/photo-1556742049-0a670fc80782?q=80&w=1200&auto=format&fit=crop'
    },
    'modal-usaha-dhuafa': {
        title: 'Modal Usaha Dhuafa',
        pillar: 'Ekonomi & Pemberdayaan',
        target: 'Rp 25.000.000',
        description: 'Bantuan permodalan produktif dan alat kerja bagi pelaku usaha mikro pra-sejahtera agar mandiri.',
        imageUrl: 'https://images.unsplash.com/photo-1556742049-0a670fc80782?q=80&w=1200&auto=format&fit=crop'
    },
    'gerobak-berkah-umkm': {
        title: 'Gerobak Berkah UMKM',
        pillar: 'Ekonomi & Pemberdayaan',
        target: 'Rp 15.000.000',
        description: 'Pengadaan gerobak usaha dan peralatan jualan bagi para kepala keluarga dhuafa untuk mandiri berpenghasilan.',
        imageUrl: 'https://images.unsplash.com/photo-1556742049-0a670fc80782?q=80&w=1200&auto=format&fit=crop'
    },
    'pelatihan-keterampilan-wirausaha': {
        title: 'Pelatihan Keterampilan Wirausaha',
        pillar: 'Ekonomi & Pemberdayaan',
        target: 'Rp 10.000.000',
        description: 'Bimbingan teknis kewirausahaan, manajemen keuangan usaha kecil, dan pemasaran digital untuk UMKM dhuafa.',
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

function getMimeType(filePathOrDataUrl) {
    if (!filePathOrDataUrl) return 'image/jpeg';
    const s = String(filePathOrDataUrl).toLowerCase();
    if (s.startsWith('data:image/png') || s.endsWith('.png')) return 'image/png';
    if (s.startsWith('data:image/webp') || s.endsWith('.webp')) return 'image/webp';
    if (s.startsWith('data:image/gif') || s.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
}

async function getLiveCloudMetadata() {
    if (cachedCloudBundle && (Date.now() - cachedCloudBundleTime < CACHE_TTL_MS)) {
        return cachedCloudBundle;
    }

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
            if (Array.isArray(list) && list.length > 0 && list[0].value) {
                cachedCloudBundle = list[0].value;
                cachedCloudBundleTime = Date.now();
                return cachedCloudBundle;
            }
        }
    } catch(e) {
        console.warn('[Program API] Supabase fetch error:', e.message);
    }
    return null;
}

module.exports = async function handler(req, res) {
    const origin = 'https://www.wizbangkabelitung.or.id';
    const urlObj = new URL(req.url, `http://${req.headers.host || 'www.wizbangkabelitung.or.id'}`);
    let progQuery = (req.query && (req.query.slug || req.query.program || req.query.name || req.query.id)) ||
                    urlObj.searchParams.get('program') || urlObj.searchParams.get('name') || urlObj.searchParams.get('slug') || urlObj.searchParams.get('id');
    const refCode = ((req.query && (req.query.ref || req.query.affiliate || req.query.perantara)) ||
                     urlObj.searchParams.get('ref') || urlObj.searchParams.get('affiliate') || urlObj.searchParams.get('perantara') || '').trim();

    const isImageRequest = urlObj.searchParams.get('img') === '1' || 
                           urlObj.searchParams.has('img') ||
                           urlObj.pathname.includes('program-image') || 
                           urlObj.pathname.includes('program-img');

    // Parse from path /program/[slug] or /program-image/[slug] if applicable
    if (!progQuery) {
        const parts = urlObj.pathname.split('/').filter(Boolean);
        const progIdx = parts.findIndex(p => p === 'program' || p === 'program-image' || p === 'program-img');
        if (progIdx !== -1 && parts[progIdx + 1]) {
            progQuery = decodeURIComponent(parts[progIdx + 1]);
        }
    }

    const cleanProgQuery = String(progQuery || '').replace(/\.(jpe?g|png|webp|gif)$/i, '').trim();

    // 1. Fetch Cloud Master Bundle for custom overrides
    const cloudBundle = await getLiveCloudMetadata();
    const specificImgsMap = (cloudBundle && cloudBundle.specific_prog_imgs) ? cloudBundle.specific_prog_imgs : {};

    // 2. Find program metadata
    let selectedProgram = null;
    if (cleanProgQuery) {
        const querySlug = slugify(cleanProgQuery);
        if (SPECIFIC_PROGRAMS_METADATA[querySlug]) {
            selectedProgram = { ...SPECIFIC_PROGRAMS_METADATA[querySlug] };
        } else {
            // Fuzzy search by title or slug match
            for (const [key, prog] of Object.entries(SPECIFIC_PROGRAMS_METADATA)) {
                if (key === querySlug || key.includes(querySlug) || querySlug.includes(key) || slugify(prog.title) === querySlug || slugify(prog.title).includes(querySlug)) {
                    selectedProgram = { ...prog };
                    break;
                }
            }
        }
    }

    // 3. Fallback if not found
    if (!selectedProgram) {
        const fallbackTitle = cleanProgQuery ? decodeURIComponent(cleanProgQuery).replace(/-/g, ' ') : 'Katalog Program Kebaikan & ZIS';
        selectedProgram = {
            title: fallbackTitle,
            pillar: 'Wahdah Inspirasi Zakat',
            target: 'Transparan & Berkelanjutan',
            description: `Salurkan Zakat, Infak, dan Sedekah Anda melalui program ${fallbackTitle} Wahdah Inspirasi Zakat (WIZ) Bangka Belitung untuk kemaslahatan ummat.`,
            imageUrl: DEFAULT_FALLBACK_IMAGE
        };
    }

    // 4. Dynamic Image Override (from Supabase admin upload, query param, or metadata)
    const imgQuery = urlObj.searchParams.get('img');
    if (imgQuery && (imgQuery.startsWith('http://') || imgQuery.startsWith('https://') || imgQuery.startsWith('assets/'))) {
        selectedProgram.imageUrl = imgQuery.trim();
    } else if (specificImgsMap[selectedProgram.title]) {
        selectedProgram.imageUrl = specificImgsMap[selectedProgram.title];
    }

    const title = selectedProgram.title;
    const pillar = selectedProgram.pillar;
    const description = selectedProgram.description;
    const rawImg = selectedProgram.imageUrl || DEFAULT_FALLBACK_IMAGE;
    const mimeType = getMimeType(rawImg);
    const canonicalSlug = slugify(title);

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
                console.error('[Program Image API] Base64 decode error:', err);
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

    // ─── 2. DEDICATED OG IMAGE URL (always via /api/og-image for WhatsApp crawler) ─
    // Single stable endpoint returning binary JPEG <300KB with 1hr cache
    const ogImageUrl = `${origin}/api/og-image?type=program&id=${encodeURIComponent(canonicalSlug)}`;
    const ogImageSecureUrl = ogImageUrl;

    // Determine actual page image source for HTML body display
    let pageImgSrc = rawImg;
    if (pageImgSrc && !pageImgSrc.startsWith('http') && !pageImgSrc.startsWith('data:image')) {
        pageImgSrc = `${origin}/${pageImgSrc.replace(/^\//, '')}`;
    }

    let canonicalUrl = `${origin}/program/${canonicalSlug}`;
    const params = [];
    if (refCode) params.push(`ref=${encodeURIComponent(refCode)}`);
    if (params.length > 0) canonicalUrl += `?${params.join('&')}`;

    const donateUrl = `${origin}/donasi.html?program=${encodeURIComponent(title)}${refCode ? '&ref=' + encodeURIComponent(refCode) : ''}`;

    // ─── Related Programs List (Pilihan Program Kebaikan Lainnya) ───
    const RELATED_PROGRAM_CANDIDATES = [
        { slug: 'sedekah-beras-dhuafa', title: 'Sedekah Beras Dhuafa', pillar: 'Sosial & Kemanusiaan', target: 'Rp 15.000.000', img: 'assets/images/sedekah-beras-dhuafa.jpg' },
        { slug: 'beasiswa-pendidikan-juara', title: 'Beasiswa Pendidikan Juara', pillar: 'Pendidikan & Beasiswa', target: 'Rp 25.000.000', img: 'assets/images/beasiswa-tahfidz.jpg' },
        { slug: 'pembangunan-markaz', title: 'Pembangunan Markaz Dakwah', pillar: 'Dakwah & Pembinaan', target: 'Rp 2.004.000.000', img: 'assets/images/foto-utama-wiz.jpg' },
        { slug: 'bantuan-kesehatan-dhuafa', title: 'Bantuan Kesehatan Dhuafa', pillar: 'Kesehatan Masyarakat', target: 'Rp 20.000.000', img: 'assets/images/sedekah-beras-dhuafa.jpg' },
        { slug: 'santunan-yatim', title: 'Santunan Anak Yatim', pillar: 'Sosial & Kemanusiaan', target: 'Rp 10.000.000', img: 'assets/images/foto-utama-wiz.jpg' },
        { slug: 'sedekah-air', title: 'Sedekah Air Bersih', pillar: 'Sosial & Kemanusiaan', target: 'Rp 15.000.000', img: 'assets/images/foto-utama-wiz.jpg' },
        { slug: 'perlengkapan-belajar-yatim', title: 'Perlengkapan Belajar Yatim', pillar: 'Pendidikan & Beasiswa', target: 'Rp 12.000.000', img: 'assets/images/beasiswa-tahfidz.jpg' }
    ];

    const relatedPrograms = RELATED_PROGRAM_CANDIDATES
        .filter(c => c.slug !== canonicalSlug && slugify(c.title) !== canonicalSlug)
        .slice(0, 4);

    const catalogUrl = `${origin}/program.html${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;

    const relatedCardsHtml = relatedPrograms.map(item => {
        const itemProgUrl = `${origin}/program/${item.slug}${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;
        const itemDonateUrl = `${origin}/donasi.html?program=${encodeURIComponent(item.title)}${refCode ? '&ref=' + encodeURIComponent(refCode) : ''}`;
        const itemImgSrc = item.img.startsWith('http') ? item.img : `${origin}/${item.img.replace(/^\//, '')}`;

        return `
        <div class="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
                <div class="relative aspect-video w-full bg-slate-900 overflow-hidden">
                    <img src="${escapeHtml(itemImgSrc)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover">
                    <span class="absolute top-2 left-2 bg-emerald-700/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                        ${escapeHtml(item.pillar)}
                    </span>
                </div>
                <div class="p-4 space-y-1.5">
                    <h3 class="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                        ${escapeHtml(item.title)}
                    </h3>
                    <p class="text-xs text-slate-500 font-medium">
                        Target: <strong class="text-emerald-700 font-bold">${escapeHtml(item.target)}</strong>
                    </p>
                </div>
            </div>
            <div class="p-4 pt-0 grid grid-cols-2 gap-2">
                <a href="${escapeHtml(itemProgUrl)}" class="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 px-2 rounded-xl text-center transition-colors">
                    Detail Program
                </a>
                <a href="${escapeHtml(itemDonateUrl)}" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-2 rounded-xl text-center transition-colors shadow-xs">
                    Donasi Cepat
                </a>
            </div>
        </div>`;
    }).join('');

    // Set 30-Day Referral Cookie if refCode is present (max-age 2,592,000s = 30 days)
    if (refCode) {
        res.setHeader('Set-Cookie', `wiz_ref=${encodeURIComponent(refCode)}; Path=/; Max-Age=2592000; SameSite=Lax`);
    }

    // Return Rich SSR HTML with OpenGraph tags for WhatsApp, Facebook, Twitter, Telegram
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');

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
    <meta property="og:site_name" content="Wahdah Inspirasi Zakat (WIZ) Bangka Belitung">
    <meta property="og:locale" content="id_ID">
    <meta property="og:title" content="${escapeHtml(title)} — WIZ Bangka Belitung">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(ogImageSecureUrl)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:alt" content="${escapeHtml(title)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <link rel="image_src" href="${ogImageUrl}">
    <meta name="thumbnail" content="${ogImageUrl}">
    <meta itemprop="image" content="${ogImageUrl}">

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@wizbangkabelitung">
    <meta name="twitter:title" content="${escapeHtml(title)} — WIZ Bangka Belitung">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${ogImageUrl}">

    <!-- Google Fonts & Tailwind -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
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
<body class="bg-slate-50 text-slate-900 font-sans min-h-screen flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900">
    <!-- Header -->
    <header class="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
            <a href="${origin}/index.html" class="flex items-center group py-1.5 shrink-0 max-w-[160px]">
                <img src="${origin}/assets/images/logo-wiz-babel.png" alt="WIZ Babel" class="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105 block">
            </a>
            <div class="flex items-center gap-3 shrink-0">
                <a href="${origin}/program.html" class="hidden sm:inline-flex text-xs sm:text-sm font-semibold text-slate-600 hover:text-emerald-600 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap">Katalog Program</a>
                <a href="${origin}/berita" class="hidden sm:inline-flex text-xs sm:text-sm font-semibold text-slate-600 hover:text-emerald-600 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap">Berita</a>
                <a href="${escapeHtml(donateUrl)}" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <span class="material-symbols-outlined text-sm">favorite</span> Donasi Sekarang
                </a>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-3xl mx-auto px-4 py-8 flex-grow space-y-8 w-full">
        <!-- Main Hero Program Card -->
        <div class="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200">
            <div class="relative aspect-video w-full bg-slate-900 overflow-hidden">
                <img src="${escapeHtml(pageImgSrc)}" alt="${escapeHtml(title)}" class="w-full h-full object-cover">
                <span class="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold px-3.5 py-1 rounded-full shadow backdrop-blur-xs">
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

                <div class="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <span class="text-xs text-slate-500 font-semibold block">Target Program:</span>
                        <span class="text-lg font-extrabold text-emerald-800">${escapeHtml(selectedProgram.target)}</span>
                    </div>
                    <div class="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <span class="material-symbols-outlined text-emerald-600 text-base">verified</span>
                        <span>Program Resmi Terverifikasi WIZ Babel</span>
                    </div>
                </div>

                <div class="space-y-3 pt-2">
                    <a href="${escapeHtml(donateUrl)}" class="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-base py-3.5 rounded-2xl shadow-md hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-center">
                        <span class="material-symbols-outlined">volunteer_activism</span>
                        <span>Tunaikan Donasi Untuk Program Ini</span>
                    </a>

                    <button type="button" onclick="handleShareClick()" class="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer">
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.044c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
                        <span>Bagikan Program Ini ke WhatsApp</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Other Programs Section (Pilihan Program Kebaikan Lainnya) -->
        <section class="space-y-4 pt-2">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <span class="material-symbols-outlined text-emerald-600 text-xl sm:text-2xl">category</span>
                        <span>Pilihan Program Kebaikan Lainnya</span>
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">Salurkan juga kebaikan Anda untuk berbagai program kemaslahatan ummat lainnya.</p>
                </div>
                <a href="${catalogUrl}" class="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl transition-colors shrink-0">
                    <span>Semua Program</span>
                    <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ${relatedCardsHtml}
            </div>

            <div class="pt-2 text-center">
                <a href="${catalogUrl}" class="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 text-slate-800 hover:text-emerald-700 font-bold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all">
                    <span class="material-symbols-outlined text-lg text-emerald-600">explore</span>
                    <span>Jelajahi Seluruh Katalog Program Donasi WIZ Babel</span>
                    <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        &copy; 2026 Wahdah Inspirasi Zakat (WIZ) Bangka Belitung. All rights reserved.
    </footer>

    <script>
        function handleShareClick() {
            const waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent('${canonicalUrl}');
            window.open(waUrl, '_blank');
        }
    </script>
</body>
</html>`;

    res.status(200).send(html);
};
