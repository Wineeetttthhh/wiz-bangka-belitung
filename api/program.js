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

import fs from 'fs';
import path from 'path';
import { processToOgJpeg } from './og-image.js';

const SUPABASE_RAW_URL = process.env.SUPABASE_URL || 'https://kmpwdqremvltgglmoxgx.supabase.co';
const SUPABASE_URL = SUPABASE_RAW_URL.endsWith('/rest/v1') ? SUPABASE_RAW_URL : `${SUPABASE_RAW_URL.replace(/\/$/, '')}/rest/v1`;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttcHdkcXJlbXZsdGdnbG1veGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMjEyMTksImV4cCI6MjEwMzU5NzIxOX0.MhNqr36yvqRAgiVsLil608P-DyYBLJ6WBWxXMbfvbH8';

const DEFAULT_FALLBACK_IMAGE = 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg';

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
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'pengadaan-perbaikan-kendaraan': {
        title: 'Pengadaan & Perbaikan Kendaraan',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 5.000.000',
        description: 'Fasilitasi mobilitas para dai dalam menyebarkan dakwah ke pelosok Bangka Belitung dengan armada kendaraan operasional yang layak dan memadai.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'pengadaan-dan-perbaikan-kendaraan': {
        title: 'Pengadaan & Perbaikan Kendaraan',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 5.000.000',
        description: 'Fasilitasi mobilitas para dai dalam menyebarkan dakwah ke pelosok Bangka Belitung dengan armada kendaraan operasional yang layak dan memadai.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'keberangkatan-dan-kepulangan-dai': {
        title: 'Keberangkatan & Kepulangan Dai',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 30.000.000',
        description: 'Dukungan akomodasi, transportasi, dan kafalah bagi para da\'i yang bertugas di provinsi Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/keberangkatan-kepulangan-dai.jpg'
    },
    'keberangkatan-kepulangan-dai': {
        title: 'Keberangkatan & Kepulangan Dai',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 30.000.000',
        description: 'Dukungan akomodasi, transportasi, dan kafalah bagi para da\'i yang bertugas di provinsi Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/keberangkatan-kepulangan-dai.jpg'
    },
    'santunan-mualaf': {
        title: 'Santunan Mualaf',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 12.000.000',
        description: 'Berikan dukungan moral dan materil bagi para mualaf agar semakin teguh dalam memeluk dan mengamalkan ajaran Islam di Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'tahfidz': {
        title: 'Tahfidz Weekend',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 15.000.000',
        location: 'Masjid Kemas Adil (Jl. Ahmad Yani)',
        beneficiaries: 'Penghafal Al-Qur\'an & Santri Tahfidz',
        description: 'Dukung para penghafal Al-Qur\'an dalam menjaga kalamullah dengan sedekah. Lokasi pelaksanaan di Masjid Kemas Adil (Jl. Ahmad Yani).',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/tahfidz.png'
    },
    'tahfidz-weekend': {
        title: 'Tahfidz Weekend',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 15.000.000',
        location: 'Masjid Kemas Adil (Jl. Ahmad Yani)',
        beneficiaries: 'Penghafal Al-Qur\'an & Santri Tahfidz',
        description: 'Dukung para penghafal Al-Qur\'an dalam menjaga kalamullah dengan sedekah. Lokasi pelaksanaan di Masjid Kemas Adil (Jl. Ahmad Yani).',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/tahfidz.png'
    },
    'pelatihan-public-speaking': {
        title: 'Pelatihan Public Speaking',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 4.000.000',
        description: 'Tingkatkan kapasitas komunikasi, retorika, dan dakwah para da\'i muda serta relawan dakwah di Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'tabligh-akbar-dzulhijjah': {
        title: 'Tabligh Akbar Dzulhijjah',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 10.000.000',
        description: 'Syiar dakwah akbar menyambut bulan haji dan qurban untuk mempererat ukhuwah Islamiyah masyarakat Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'pelatihan-guru-dirosa': {
        title: 'Pelatihan Guru Dirosa',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 6.000.000',
        description: 'Pelatihan metode Dirosa (Pendidikan Al-Qur\'an Orang Dewasa) untuk mencetak guru-guru ngaji yang kompeten.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'pelatihan-penyelenggaraan-jenazah': {
        title: 'Pelatihan Penyelenggaraan Jenazah',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 5.000.000',
        description: 'Edukasi fardhu kifayah tata cara memandikan, mengafani, menyalatkan, dan menguburkan jenazah sesuai sunnah.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'pelatihan-relawan-media-dakwah': {
        title: 'Pelatihan Relawan Media Dakwah',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 5.000.000',
        description: 'Pelatihan konten kreatif, fotografi, videografi, dan jurnalistik dakwah digital bagi generasi muda.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'lomba-desain-poster-dakwah': {
        title: 'Lomba Desain Poster Dakwah',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 3.000.000',
        description: 'Wadah kreativitas visual pemuda muslim dalam menyebarkan pesan kebaikan dan nilai-nilai Islam.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'kantor-dpw-wi-babel-dan-wiz': {
        title: 'Kantor DPW WI Babel & WIZ',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 150.000.000',
        description: 'Pengadaan dan renovasi pusat pelayanan administrasi ummat, dakwah terpadu, dan kantor Laznas WIZ Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'pengadaan-celengan-besar': {
        title: 'Pengadaan Celengan Sedekah Subuh',
        pillar: 'Dakwah & Pembinaan',
        target: 'Rp 5.000.000',
        description: 'Penyediaan sarana infak harian di masjid, perkantoran, dan pertokoan untuk menggalakkan gerakan gemar sedekah.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },

    // ── 2. Sosial & Kemanusiaan (Berkah Peduli) ──
    'pray-for-ntt': {
        title: 'Pray For NTT',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 50.000.000',
        location: 'Nusa Tenggara Timur (NTT)',
        beneficiaries: 'Warga & Penyintas Bencana NTT',
        description: 'Salurkan kepedulian dan bantuan darurat bencana untuk saudara-saudara kita terdampak bencana di Nusa Tenggara Timur (NTT).',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/pray-for-ntt.jpg'
    },
    'tebar-sembako': {
        title: 'Tebar Sembako Dhuafa',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 25.000.000',
        description: 'Penyaluran paket bahan pangan pokok untuk keluarga dhuafa, janda lansia, dan yatim di pelosok Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/tebar-sembako.png'
    },
    'tebar-sembako-dhuafa': {
        title: 'Tebar Sembako Dhuafa',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 25.000.000',
        description: 'Penyaluran paket bahan pangan pokok untuk keluarga dhuafa, janda lansia, dan yatim di pelosok Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/tebar-sembako.png'
    },
    'sedekah-beras-dhuafa': {
        title: 'Sedekah Beras Dhuafa',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 20.000.000',
        description: 'Bantuan beras premium secara berkala untuk mencukupi kebutuhan pokok para mustahik dan santri pondok pesantren.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/sedekah-beras-dhuafa.png'
    },
    'sedekah-beras-dai': {
        title: 'Sedekah Beras Dai',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 20.000.000',
        description: 'Bantuan paket beras untuk para dai dan guru ngaji yang berjuang membina ummat di pelosok desa.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/sedekah-beras-dai.jpg'
    },
    'sedekah-beras-dai-koba': {
        title: 'Sedekah Beras Dai Koba',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 20.000.000',
        description: 'Bantuan paket beras untuk para dai dan asatidz di wilayah Koba dan sekitarnya.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/sedekah-beras-dai-koba.jpg'
    },
    'sedekah-jumat': {
        title: 'Sedekah Jumat (Sedulang Berkah)',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 10.000.000',
        description: 'Berbagi paket makanan siap santap dan sedekah jumat berkah untuk jamaah masjid, musafir, dan pekerja harian.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'sedekah-jumat-sedulang-berkah': {
        title: 'Sedekah Jumat (Sedulang Berkah)',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 10.000.000',
        description: 'Berbagi paket makanan siap santap dan sedekah jumat berkah untuk jamaah masjid, musafir, dan pekerja harian.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'santunan-yatim': {
        title: 'Santunan Anak Yatim',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 30.000.000',
        description: 'Hadirkan senyum dan masa depan cerah untuk anak-anak yatim binaan di Bangka Belitung dengan santunan rutin dan perlengkapan sekolah.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/santunan-yatim.png'
    },
    'santunan-anak-yatim': {
        title: 'Santunan Anak Yatim',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 30.000.000',
        description: 'Hadirkan senyum dan masa depan cerah untuk anak-anak yatim binaan di Bangka Belitung dengan santunan rutin dan perlengkapan sekolah.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/santunan-yatim.png'
    },
    'tebar-iftar': {
        title: 'Tebar Iftar Ramadan',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 50.000.000',
        description: 'Berbagi paket buka puasa berkah untuk ribuan santri, dhuafa, dan pejuang nafkah di bulan suci Ramadan.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/tebar-iftar-nusantara.png'
    },
    'tebar-iftar-nusantara': {
        title: 'Tebar Iftar Ramadan',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 50.000.000',
        description: 'Berbagi paket buka puasa berkah untuk ribuan santri, dhuafa, dan pejuang nafkah di bulan suci Ramadan.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/tebar-iftar-nusantara.png'
    },
    'tebar-quran-nusantara': {
        title: 'Tebar Qur\'an Nusantara',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 20.000.000',
        description: 'Distribusi mushaf Al-Qur\'an standar Madinah untuk TPQ, rumah tahfidz, dan masjid di pelosok desa binaan.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'bahagiakan-guru-ngaji': {
        title: 'Bahagiakan Guru Ngaji',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 15.000.000',
        description: 'Apresiasi dan kafalah bulanan bagi para ustadz dan guru ngaji sukarela yang ikhlas mengajarkan Al-Qur\'an.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'sedekah-air': {
        title: 'Sedekah Air Bersih',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 18.000.000',
        description: 'Penyediaan sumur bor, instalasi tandon, dan pipanisasi air bersih untuk daerah krisis kekeringan.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },
    'sedekah-air-bersih': {
        title: 'Sedekah Air Bersih',
        pillar: 'Sosial & Kemanusiaan',
        target: 'Rp 18.000.000',
        description: 'Penyediaan sumur bor, instalasi tandon, dan pipanisasi air bersih untuk daerah krisis kekeringan.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/default-program-wiz.jpg'
    },

    // ── 3. Pendidikan & Beasiswa (Berkah Juara) ──
    'beasiswa-pendidikan-juara': {
        title: 'Beasiswa Pendidikan Juara',
        pillar: 'Pendidikan & Beasiswa',
        target: 'Rp 40.000.000',
        description: 'Dukung biaya SPP dan perlengkapan sekolah bagi siswa berprestasi dari keluarga kurang mampu.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/beasiswa-pendidikan-juara.png'
    },
    'beasiswa-tahfidz': {
        title: 'Beasiswa Tahfidz & Dhuafa',
        pillar: 'Pendidikan & Beasiswa',
        target: 'Rp 35.000.000',
        description: 'Bantuan biaya studi dan living cost santri penghafal Qur\'an di pesantren dan perguruan tinggi.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/tahfidz.png'
    },
    'beasiswa-tahfidz-dhuafa': {
        title: 'Beasiswa Tahfidz & Dhuafa',
        pillar: 'Pendidikan & Beasiswa',
        target: 'Rp 35.000.000',
        description: 'Bantuan biaya studi dan living cost santri penghafal Qur\'an di pesantren dan perguruan tinggi.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/tahfidz.png'
    },
    'perlengkapan-belajar-yatim': {
        title: 'Perlengkapan Belajar Yatim',
        pillar: 'Pendidikan & Beasiswa',
        target: 'Rp 12.000.000',
        description: 'Bantuan tas, seragam, sepatu, dan buku pelajaran untuk anak-anak yatim dhuafa menyambut tahun ajaran baru.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/perlengkapan-belajar-yatim.png'
    },

    // ── 4. Kesehatan Masyarakat (Berkah Sehat) ──
    'bantuan-pengobatan': {
        title: 'Bantuan Pengobatan & Kesehatan',
        pillar: 'Kesehatan Masyarakat',
        target: 'Rp 20.000.000',
        description: 'Layanan berobat gratis dan bantuan pengobatan bagi pasien dhuafa dan lansia kritis di Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/layanan-pengobatan-gratis.png'
    },
    'layanan-pengobatan-gratis': {
        title: 'Layanan Pengobatan Gratis',
        pillar: 'Kesehatan Masyarakat',
        target: 'Rp 20.000.000',
        description: 'Layanan berobat gratis dan bantuan pengobatan bagi pasien dhuafa dan lansia kritis di Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/layanan-pengobatan-gratis.png'
    },
    'bantuan-kesehatan-dhuafa': {
        title: 'Bantuan Kesehatan Dhuafa',
        pillar: 'Kesehatan Masyarakat',
        target: 'Rp 20.000.000',
        description: 'Layanan berobat gratis dan bantuan pengobatan bagi pasien dhuafa dan lansia kritis di Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/layanan-pengobatan-gratis.png'
    },
    'bantuan-pasien-kritis-dhuafa': {
        title: 'Bantuan Pasien Kritis Dhuafa',
        pillar: 'Kesehatan Masyarakat',
        target: 'Rp 20.000.000',
        description: 'Bantuan biaya tebus obat dan rawat inap bagi pasien dhuafa kurang mampu yang tidak tercover penuh oleh asuransi.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/layanan-pengobatan-gratis.png'
    },
    'ambulance-gratis-ummat': {
        title: 'Ambulance Gratis Ummat',
        pillar: 'Kesehatan Masyarakat',
        target: 'Rp 30.000.000',
        description: 'Operasional layanan antar jemput pasien dhuafa dan jenazah gratis 24 jam di wilayah Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/ambulance-gratis-ummat.png'
    },
    'ambulans-gratis-peduli': {
        title: 'Ambulans Gratis Peduli',
        pillar: 'Kesehatan Masyarakat',
        target: 'Rp 30.000.000',
        description: 'Operasional layanan antar jemput pasien dhuafa dan jenazah gratis 24 jam di wilayah Bangka Belitung.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/ambulance-gratis-ummat.png'
    },
    'khitanan-massal-dhuafa': {
        title: 'Khitanan Massal Dhuafa',
        pillar: 'Kesehatan Masyarakat',
        target: 'Rp 15.000.000',
        description: 'Program khitanan massal gratis medis profesional dan santunan bingkisan untuk anak-anak dhuafa.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/khitanan-massal-dhuafa.png'
    },
    'khitanan-massal': {
        title: 'Khitanan Massal Dhuafa',
        pillar: 'Kesehatan Masyarakat',
        target: 'Rp 15.000.000',
        description: 'Program khitanan massal gratis medis profesional dan santunan bingkisan untuk anak-anak dhuafa.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/khitanan-massal-dhuafa.png'
    },

    // ── 5. Ekonomi & Pemberdayaan (Berkah Mandiri) ──
    'modal-usaha-mandiri': {
        title: 'Modal Usaha Mandiri',
        pillar: 'Ekonomi & Pemberdayaan',
        target: 'Rp 30.000.000',
        description: 'Bantuan modal usaha tanpa riba dan pendampingan bisnis untuk mengangkat mustahik menjadi muzakki.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/modal-usaha-dhuafa.png'
    },
    'modal-usaha-dhuafa': {
        title: 'Modal Usaha Dhuafa',
        pillar: 'Ekonomi & Pemberdayaan',
        target: 'Rp 25.000.000',
        description: 'Bantuan permodalan produktif dan alat kerja bagi pelaku usaha mikro pra-sejahtera agar mandiri.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/modal-usaha-dhuafa.png'
    },
    'gerobak-berkah-umkm': {
        title: 'Gerobak Berkah UMKM',
        pillar: 'Ekonomi & Pemberdayaan',
        target: 'Rp 15.000.000',
        description: 'Pengadaan gerobak usaha dan peralatan jualan bagi para kepala keluarga dhuafa untuk mandiri berpenghasilan.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/modal-usaha-dhuafa.png'
    },
    'pelatihan-keterampilan-wirausaha': {
        title: 'Pelatihan Keterampilan Wirausaha',
        pillar: 'Ekonomi & Pemberdayaan',
        target: 'Rp 10.000.000',
        description: 'Bimbingan teknis kewirausahaan, manajemen keuangan usaha kecil, dan pemasaran digital untuk UMKM dhuafa.',
        imageUrl: 'https://www.wizbangkabelitung.or.id/assets/images/pelatihan-keterampilan-wirausaha.png'
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
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${SUPABASE_URL}/site_settings?key=in.(master_bundle,site_images,specific_prog_imgs)&select=*`, {
            signal: controller.signal,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Accept': 'application/json'
            }
        });
        clearTimeout(timeout);
        if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list) && list.length > 0) {
                const mbRow = list.find(r => r.key === 'master_bundle');
                const siRow = list.find(r => r.key === 'site_images');
                const spiRow = list.find(r => r.key === 'specific_prog_imgs');

                let mergedBundle = (mbRow && mbRow.value) ? { ...mbRow.value } : {};
                if (!mergedBundle.site_images) mergedBundle.site_images = {};
                if (siRow && siRow.value) {
                    Object.assign(mergedBundle.site_images, siRow.value);
                }
                if (!mergedBundle.specific_prog_imgs) mergedBundle.specific_prog_imgs = {};
                if (spiRow && spiRow.value) {
                    Object.assign(mergedBundle.specific_prog_imgs, spiRow.value);
                }

                cachedCloudBundle = mergedBundle;
                cachedCloudBundleTime = Date.now();
                return cachedCloudBundle;
            }
        }
    } catch(e) {
        console.warn('[Program API] Supabase fetch error:', e.message);
    }
    return null;
}

export default async function handler(req, res) {
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
        // Check cloudBundle programs collection
        if (cloudBundle && Array.isArray(cloudBundle.programs)) {
            const foundProg = cloudBundle.programs.find(p => p && (slugify(p.title) === querySlug || p.slug === querySlug || p.id === querySlug || p.title.toLowerCase() === cleanProgQuery.toLowerCase()));
            if (foundProg && foundProg.status !== 'deleted') {
                const curatedImg = (SPECIFIC_PROGRAMS_METADATA[slugify(foundProg.title)] && SPECIFIC_PROGRAMS_METADATA[slugify(foundProg.title)].imageUrl) || (SPECIFIC_PROGRAMS_METADATA[querySlug] && SPECIFIC_PROGRAMS_METADATA[querySlug].imageUrl);
                selectedProgram = {
                    title: foundProg.title,
                    pillar: foundProg.pillar,
                    target: foundProg.target || 'Rp 50.000.000',
                    location: foundProg.location || 'Kepulauan Bangka Belitung',
                    beneficiaries: foundProg.beneficiaries || '',
                    description: foundProg.description || `Salurkan kepedulian dan donasi terbaik Anda untuk program ${foundProg.title} bersama WIZ Babel.`,
                    imageUrl: (specificImgsMap[foundProg.title] && !specificImgsMap[foundProg.title].includes("default-program-wiz") ? specificImgsMap[foundProg.title] : null) || curatedImg || (foundProg.imageUrl && !foundProg.imageUrl.includes('default-program-wiz') ? foundProg.imageUrl : null) || DEFAULT_FALLBACK_IMAGE
                };
            }
        }

        // Check cloudBundle custom programs map
        if (!selectedProgram) {
            const customProgMap = (cloudBundle && cloudBundle.custom_specific_programs) ? cloudBundle.custom_specific_programs : {};
            for (const [pKey, pArr] of Object.entries(customProgMap)) {
                if (Array.isArray(pArr)) {
                    for (const itemTitle of pArr) {
                        if (slugify(itemTitle) === querySlug || itemTitle.toLowerCase() === cleanProgQuery.toLowerCase()) {
                            const curatedImg = (SPECIFIC_PROGRAMS_METADATA[slugify(itemTitle)] && SPECIFIC_PROGRAMS_METADATA[slugify(itemTitle)].imageUrl) || (SPECIFIC_PROGRAMS_METADATA[querySlug] && SPECIFIC_PROGRAMS_METADATA[querySlug].imageUrl);
                            selectedProgram = {
                                title: itemTitle,
                                pillar: pKey,
                                target: 'Rp 15.000.000',
                                description: `Salurkan infak dan sedekah terbaik Anda untuk program ${itemTitle} Wahdah Inspirasi Zakat (WIZ) Bangka Belitung.`,
                                imageUrl: specificImgsMap[itemTitle] || curatedImg || DEFAULT_FALLBACK_IMAGE
                            };
                            break;
                        }
                    }
                    if (selectedProgram) break;
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

const PROGRAM_IMAGE_MAP = {
    'pray-for-ntt':                                 'assets/images/pray-for-ntt.jpg',
    'sedekah-beras-dhuafa':                         'assets/images/sedekah-beras-dhuafa.png',
    'sedekah-beras-dai':                            'assets/images/sedekah-beras-dai.jpg',
    'sedekah-beras-dai-koba':                       'assets/images/sedekah-beras-dai-koba.jpg',
    'beasiswa-pendidikan-juara':                    'assets/images/beasiswa-pendidikan-juara.png',
    'beasiswa-tahfidz':                             'assets/images/tahfidz.png',
    'beasiswa-tahfidz-dhuafa':                      'assets/images/tahfidz.png',
    'tebar-iftar':                                  'assets/images/tebar-iftar-nusantara.png',
    'tebar-iftar-nusantara':                        'assets/images/tebar-iftar-nusantara.png',
    'santunan-yatim':                               'assets/images/santunan-yatim.png',
    'santunan-anak-yatim':                          'assets/images/santunan-yatim.png',
    'tebar-sembako':                                'assets/images/tebar-sembako.png',
    'tebar-sembako-dhuafa':                         'assets/images/tebar-sembako.png',
    'perlengkapan-belajar-yatim':                   'assets/images/perlengkapan-belajar-yatim.png',
    'wiz-berkah-juara-perlengkapan-belajar-yatim':  'assets/images/perlengkapan-belajar-yatim.png',
    'modal-usaha-dhuafa':                           'assets/images/modal-usaha-dhuafa.png',
    'modal-usaha-mandiri':                          'assets/images/modal-usaha-dhuafa.png',
    'gerobak-berkah-umkm':                          'assets/images/modal-usaha-dhuafa.png',
    'pelatihan-keterampilan-wirausaha':             'assets/images/pelatihan-keterampilan-wirausaha.png',
    'bantuan-pengobatan':                           'assets/images/layanan-pengobatan-gratis.png',
    'bantuan-kesehatan-dhuafa':                     'assets/images/layanan-pengobatan-gratis.png',
    'bantuan-pasien-kritis-dhuafa':                 'assets/images/layanan-pengobatan-gratis.png',
    'layanan-pengobatan-gratis':                    'assets/images/layanan-pengobatan-gratis.png',
    'ambulance-gratis-ummat':                       'assets/images/ambulance-gratis-ummat.png',
    'ambulans-gratis-peduli':                       'assets/images/ambulance-gratis-ummat.png',
    'khitanan-massal-dhuafa':                       'assets/images/khitanan-massal-dhuafa.png',
    'khitanan-massal':                              'assets/images/khitanan-massal.jpg',
    'keberangkatan-kepulangan-dai':                 'assets/images/keberangkatan-kepulangan-dai.jpg',
    'keberangkatan-dan-kepulangan-dai':             'assets/images/keberangkatan-kepulangan-dai.jpg',
};

    // 4. Dynamic Image Override (from Supabase admin upload, query param, or metadata)
    const imgQuery = urlObj.searchParams.get('img');
    if (imgQuery && (imgQuery.startsWith('http://') || imgQuery.startsWith('https://') || imgQuery.startsWith('assets/'))) {
        selectedProgram.imageUrl = imgQuery.trim();
    } else {
        const checkSlug = slugify(selectedProgram.title);
        const querySlug = slugify(cleanProgQuery);
        // A. Curated metadata specific images & PROGRAM_IMAGE_MAP
        if (PROGRAM_IMAGE_MAP[checkSlug]) {
            selectedProgram.imageUrl = PROGRAM_IMAGE_MAP[checkSlug];
        } else if (PROGRAM_IMAGE_MAP[querySlug]) {
            selectedProgram.imageUrl = PROGRAM_IMAGE_MAP[querySlug];
        } else if (SPECIFIC_PROGRAMS_METADATA[checkSlug] && SPECIFIC_PROGRAMS_METADATA[checkSlug].imageUrl && !SPECIFIC_PROGRAMS_METADATA[checkSlug].imageUrl.includes('default-program-wiz')) {
            selectedProgram.imageUrl = SPECIFIC_PROGRAMS_METADATA[checkSlug].imageUrl;
        } else if (SPECIFIC_PROGRAMS_METADATA[querySlug] && SPECIFIC_PROGRAMS_METADATA[querySlug].imageUrl && !SPECIFIC_PROGRAMS_METADATA[querySlug].imageUrl.includes('default-program-wiz')) {
            selectedProgram.imageUrl = SPECIFIC_PROGRAMS_METADATA[querySlug].imageUrl;
        }
        // B. specificImgsMap (Highest priority: live admin custom upload from Supabase)
        for (const [title, imgUrl] of Object.entries(specificImgsMap)) {
            if (imgUrl && !imgUrl.includes('default-program-wiz') && (slugify(title) === checkSlug || slugify(title) === querySlug || title.toLowerCase() === selectedProgram.title.toLowerCase())) {
                selectedProgram.imageUrl = imgUrl;
                break;
            }
        }
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

    // Direct Image Resolution for WhatsApp, Facebook, and Twitter (< 50ms response)
    let directOgImage = `${origin}/program-image/${encodeURIComponent(canonicalSlug)}.jpg`;
    if (selectedProgram.imageUrl && selectedProgram.imageUrl.startsWith('https://')) {
        directOgImage = selectedProgram.imageUrl;
    } else if (PROGRAM_IMAGE_MAP[canonicalSlug]) {
        directOgImage = `${origin}/${PROGRAM_IMAGE_MAP[canonicalSlug].replace(/^\//, '')}`;
    }
    const ogImageUrl = directOgImage;
    const ogImageSecureUrl = directOgImage;

    // Determine actual page image source for HTML body display
    let pageImgSrc = rawImg;
    if (pageImgSrc && !pageImgSrc.startsWith('http') && !pageImgSrc.startsWith('data:image')) {
        pageImgSrc = `${origin}/${pageImgSrc.replace(/^\//, '')}`;
    }

    const canonicalUrlObj = new URL(`${origin}/program/${canonicalSlug}`);
    if (refCode) canonicalUrlObj.searchParams.set('ref', refCode);
    const canonicalUrl = canonicalUrlObj.toString();

    const donateUrlObj = new URL(`${origin}/donasi.html`);
    donateUrlObj.searchParams.set('type', 'Infak Terikat');
    donateUrlObj.searchParams.set('program', title);
    if (refCode) donateUrlObj.searchParams.set('ref', refCode);
    const donateUrl = donateUrlObj.toString();

    // ─── Related Programs List (Pilihan Program Kebaikan Lainnya) ───
    const RELATED_PROGRAM_CANDIDATES = [
        { 
            slug: 'pray-for-ntt', 
            title: 'Pray For NTT', 
            pillar: 'Sosial & Kemanusiaan', 
            target: 'Rp 50.000.000', 
            img: specificImgsMap['Pray For NTT'] || 'assets/images/pray-for-ntt.jpg' 
        },
        { 
            slug: 'sedekah-beras-dhuafa', 
            title: 'Sedekah Beras Dhuafa', 
            pillar: 'Sosial & Kemanusiaan', 
            target: 'Rp 15.000.000', 
            img: specificImgsMap['Sedekah Beras Dhuafa'] || 'assets/images/sedekah-beras-dhuafa.png' 
        },
        { 
            slug: 'beasiswa-pendidikan-juara', 
            title: 'Beasiswa Pendidikan Juara', 
            pillar: 'Pendidikan & Beasiswa', 
            target: 'Rp 25.000.000', 
            img: specificImgsMap['Beasiswa Pendidikan Juara'] || 'assets/images/beasiswa-pendidikan-juara.png' 
        },
        { 
            slug: 'tebar-iftar', 
            title: 'Tebar Ifthar Nusantara', 
            pillar: 'Sosial & Kemanusiaan', 
            target: 'Rp 30.000.000', 
            img: specificImgsMap['Tebar Iftar'] || 'assets/images/tebar-iftar-nusantara.png' 
        },
        { 
            slug: 'santunan-yatim', 
            title: 'Santunan Anak Yatim', 
            pillar: 'Sosial & Kemanusiaan', 
            target: 'Rp 10.000.000', 
            img: specificImgsMap['Santunan Yatim'] || 'assets/images/santunan-yatim.png' 
        },
        { 
            slug: 'tebar-sembako', 
            title: 'Tebar Sembako Dhuafa', 
            pillar: 'Sosial & Kemanusiaan', 
            target: 'Rp 25.000.000', 
            img: specificImgsMap['Tebar Sembako'] || 'assets/images/tebar-sembako.png' 
        },
        { 
            slug: 'bantuan-pengobatan', 
            title: 'Bantuan Pengobatan & Kesehatan', 
            pillar: 'Kesehatan Masyarakat', 
            target: 'Rp 20.000.000', 
            img: specificImgsMap['Bantuan Pengobatan'] || 'assets/images/layanan-pengobatan-gratis.png' 
        },
        { 
            slug: 'modal-usaha-dhuafa', 
            title: 'Modal Usaha Dhuafa', 
            pillar: 'Ekonomi & Pemberdayaan', 
            target: 'Rp 25.000.000', 
            img: specificImgsMap['Modal Usaha Dhuafa'] || 'assets/images/modal-usaha-dhuafa.png' 
        },
        { 
            slug: 'pelatihan-keterampilan-wirausaha', 
            title: 'Pelatihan Keterampilan Wirausaha', 
            pillar: 'Ekonomi & Pemberdayaan', 
            target: 'Rp 10.000.000', 
            img: specificImgsMap['Pelatihan Keterampilan Wirausaha'] || 'assets/images/pelatihan-keterampilan-wirausaha.png' 
        },
        { 
            slug: 'ambulance-gratis-ummat', 
            title: 'Ambulance Gratis Ummat', 
            pillar: 'Kesehatan Masyarakat', 
            target: 'Rp 30.000.000', 
            img: specificImgsMap['Ambulance Gratis Ummat'] || 'assets/images/ambulance-gratis-ummat.png' 
        }
    ];

    const relatedPrograms = RELATED_PROGRAM_CANDIDATES
        .filter(c => c.slug !== canonicalSlug && slugify(c.title) !== canonicalSlug)
        .slice(0, 4);

    const catalogUrl = `${origin}/program.html${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;

    const relatedCardsHtml = relatedPrograms.map(item => {
        const itemProgUrl = `${origin}/program/${item.slug}${refCode ? '?ref=' + encodeURIComponent(refCode) : ''}`;
        const itemDonateUrl = `${origin}/donasi.html?type=Infak%20Terikat&program=${encodeURIComponent(item.title)}${refCode ? '&ref=' + encodeURIComponent(refCode) : ''}`;
        let itemImgSrc = item.img || 'assets/images/foto-utama-wiz.jpg';
        if (!itemImgSrc.startsWith('http') && !itemImgSrc.startsWith('data:image')) {
            itemImgSrc = `${origin}/${itemImgSrc.replace(/^\//, '')}`;
        }

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
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400');

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} — WIZ Bangka Belitung</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="icon" href="${origin}/assets/images/tahfidz.png" type="image/png">

    <!-- Open Graph / WhatsApp / Facebook / Instagram / Telegram / LinkedIn -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Wahdah Inspirasi Zakat (WIZ) Bangka Belitung">
    <meta property="og:locale" content="id_ID">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(ogImageSecureUrl)}">
    <meta property="og:image:alt" content="${escapeHtml(title)}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <link rel="image_src" href="${ogImageUrl}">
    <meta name="thumbnail" content="${ogImageUrl}">
    <meta itemprop="image" content="${ogImageUrl}">

    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@wizbangkabelitung">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${ogImageUrl}">

    <!-- Google Fonts & Tailwind -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>

    <script>
        // Store refCode in Cookie, LocalStorage & SessionStorage for 40 days (Pasca-Klik)
        (function() {
            const urlParams = new URLSearchParams(window.location.search);
            const ref = ('${escapeHtml(refCode)}' || urlParams.get('ref') || urlParams.get('affiliate') || urlParams.get('perantara') || '').trim();
            if (ref) {
                try {
                    const cleanRef = ref.toUpperCase();
                    const d = new Date();
                    d.setTime(d.getTime() + (40 * 24 * 60 * 60 * 1000));
                    document.cookie = "wiz_ref=" + encodeURIComponent(cleanRef) + ";expires=" + d.toUTCString() + ";path=/;max-age=3456000;SameSite=Lax";
                    sessionStorage.setItem('wiz_active_ref_id', cleanRef);
                    localStorage.setItem('wiz_ref_code', cleanRef);
                    localStorage.setItem('wiz_ref_exp', String(Date.now() + 40 * 24 * 60 * 60 * 1000));
                    localStorage.setItem('wiz_affiliate_ref', cleanRef);
                    localStorage.setItem('wiz_affiliate_exp', String(Date.now() + 40 * 24 * 60 * 60 * 1000));
                } catch(e) {}
            }
        })();
    </script>
</head>
<body class="bg-slate-50 text-slate-900 font-sans min-h-screen flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900">
    <!-- TopNavBar -->
    <nav class="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200/60 shadow-sm w-full">
        <div class="flex justify-between items-center w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto h-20 sm:h-24 gap-4">
            <a href="${origin}/index.html" class="flex items-center group py-2 shrink-0 max-w-xs">
                <img src="${origin}/assets/images/tahfidz.png" alt="WIZ Babel" loading="eager" class="object-contain transition-transform group-hover:scale-105 h-12 sm:h-14 w-auto max-w-[160px] block"/>
            </a>
            
            <div class="hidden lg:flex gap-6 xl:gap-8 items-center text-sm font-semibold text-slate-600">
                <a class="hover:text-[#006834] transition-all border-b-2 border-transparent pb-1 whitespace-nowrap" href="${origin}/index.html">Beranda</a>
                <a class="hover:text-[#006834] transition-all border-b-2 border-transparent pb-1 whitespace-nowrap" href="${origin}/index.html#tentang-kami">Tentang Kami</a>
                <a class="text-[#006834] font-bold transition-all border-b-2 border-[#006834] pb-1 whitespace-nowrap" href="${origin}/program.html">Program</a>
                <a class="hover:text-[#006834] transition-all border-b-2 border-transparent pb-1 whitespace-nowrap" href="${origin}/laporan.html">Laporan Transparansi</a>
                <a class="hover:text-[#006834] transition-all border-b-2 border-transparent pb-1 whitespace-nowrap" href="${origin}/berita">Berita &amp; Kegiatan</a>
                <a class="hover:text-[#006834] transition-all border-b-2 border-transparent pb-1 whitespace-nowrap" href="${origin}/index.html#kontak">Kontak</a>
            </div>

            <div class="flex items-center gap-3 shrink-0">
                <a href="${escapeHtml(donateUrl)}" class="hidden sm:inline-flex bg-[#F7941D] hover:bg-[#e08416] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-95 transition-all shadow-sm items-center gap-1.5 whitespace-nowrap shrink-0">
                    <span class="material-symbols-outlined text-[18px]">favorite</span>
                    <span>Donasi Sekarang</span>
                </a>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-3xl mx-auto px-4 py-8 flex-grow space-y-8 w-full">
        <!-- Main Hero Program Card -->
        <div class="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200">
            <div class="relative w-full bg-slate-900 overflow-hidden" style="max-height:420px; min-height:220px;">
                <img src="${escapeHtml(pageImgSrc)}" alt="${escapeHtml(title)}" class="w-full h-auto block" style="max-height:420px; object-fit:contain; background:#0f172a;">
                <span class="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold px-3.5 py-1 rounded-full shadow backdrop-blur-xs">
                    ${escapeHtml(pillar)}
                </span>
            </div>

            <div class="p-6 sm:p-8 space-y-6">
                <div>
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight mb-2">
                        ${escapeHtml(title)}
                    </h1>
                    
                    <div class="flex flex-wrap items-center gap-2 mb-3">
                        <div class="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-semibold">
                            <span class="material-symbols-outlined text-sm text-emerald-700">pin_drop</span>
                            <span>Lokasi: ${escapeHtml(selectedProgram.location || 'Kepulauan Bangka Belitung')}</span>
                        </div>
                        ${selectedProgram.beneficiaries ? `
                        <div class="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-xl text-xs font-semibold">
                            <span class="material-symbols-outlined text-sm text-blue-700">group</span>
                            <span>Target: ${escapeHtml(selectedProgram.beneficiaries)}</span>
                        </div>` : ''}
                    </div>

                    <p class="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
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

    <!-- Floating WhatsApp Share Guidance Toast -->
    <div id="wa-share-toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-[92%] bg-slate-900/95 text-white text-xs font-semibold px-4 py-3.5 rounded-2xl shadow-2xl border border-emerald-500/40 backdrop-blur-md transition-all duration-300 transform translate-y-12 opacity-0 pointer-events-none flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-lg animate-pulse">timer</span>
        </div>
        <p class="leading-snug text-slate-200">
            Tunggu <strong class="text-emerald-300">1–2 detik</strong> di layar WhatsApp agar kartu foto program muncul besar sebelum kirim ✨
        </p>
    </div>

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
                            <svg class="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg>
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

    <script>
        function handleShareClick() {
            const toast = document.getElementById('wa-share-toast');
            if (toast) {
                toast.classList.remove('translate-y-12', 'opacity-0', 'pointer-events-none');
                toast.classList.add('translate-y-0', 'opacity-100');
                setTimeout(() => {
                    toast.classList.remove('translate-y-0', 'opacity-100');
                    toast.classList.add('translate-y-12', 'opacity-0', 'pointer-events-none');
                }, 4000);
            }
            const shareUrlObj = new URL('${canonicalUrl}');
            const waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(shareUrlObj.toString());
            setTimeout(() => {
                window.open(waUrl, '_blank');
            }, 300);
        }
    </script>
</body>
</html>`;

    res.status(200).send(html);
};
