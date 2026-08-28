import type { DisbursalItem } from './types';

export const MASTER_DISBURSALS: DisbursalItem[] = [
    {
        id: '1',
        programTitle: 'Tebar Iftar & Buka Puasa Berkah Nusantara',
        pillar: 'Sosial & Kemanusiaan',
        amount: 25000000,
        amountFormatted: 'Rp 25.000.000',
        beneficiariesCount: 450,
        location: 'Koba & Pelosok Bangka Tengah',
        date: '26 Maret 2026',
        description: 'Penyaluran 450 porsi makanan buka puasa sehat dan takjil bergizi untuk santri tahfidz dan keluarga dhuafa di 5 musholla pelosok.',
        imageUrl: '/assets/images/tebar-iftar-3.jpg'
    },
    {
        id: '2',
        programTitle: 'Khitanan Massal Berkah Anak Sholeh Dhuafa',
        pillar: 'Kesehatan',
        amount: 15000000,
        amountFormatted: 'Rp 15.000.000',
        beneficiariesCount: 50,
        location: 'Kota Pangkalpinang',
        date: '19 Maret 2026',
        description: 'Pelaksanaan tindakan medis sirkumsisi modern, paket bingkisan busana muslim, dan uang santunan tunai untuk 50 anak yatim dhuafa.',
        imageUrl: '/assets/images/khitanan-massal-dhuafa.jpg'
    },
    {
        id: '3',
        programTitle: 'Beasiswa Santri Tahfidz Quran',
        pillar: 'Pendidikan',
        amount: 18000000,
        amountFormatted: 'Rp 18.000.000',
        beneficiariesCount: 30,
        location: 'Pesantren Tahfidz Bangka',
        date: '12 Maret 2026',
        description: 'Penyaluran beasiswa SPP bulanan, pengadaan mushaf standar Madinah, dan kafalah santri mukim penghafal Al-Qur\'an.',
        imageUrl: '/assets/images/beasiswa-tahfidz.jpg'
    },
    {
        id: '4',
        programTitle: 'Sedekah Beras untuk Keluarga Dhuafa',
        pillar: 'Sosial & Kemanusiaan',
        amount: 12500000,
        amountFormatted: 'Rp 12.500.000',
        beneficiariesCount: 125,
        location: 'Sungailiat, Bangka Induk',
        date: '05 Maret 2026',
        description: 'Distribusi 125 karung beras 10kg premium bagi janda lansia dan buruh harian lepas prasejahtera.',
        imageUrl: '/assets/images/sedekah-beras-dhuafa.jpg'
    },
    {
        id: '5',
        programTitle: 'Kafalah & Transportasi Dai Pelosok',
        pillar: 'Dakwah & Pembinaan',
        amount: 10000000,
        amountFormatted: 'Rp 10.000.000',
        beneficiariesCount: 8,
        location: 'Pulau Lepar & Selat Nasik',
        date: '28 Februari 2026',
        description: 'Penyaluran tunjangan kafalah da\'i dan bantuan tiket kapal motor operasional dakwah pulau terluar.',
        imageUrl: '/assets/images/keberangkatan-kepulangan-dai.jpg'
    }
];
