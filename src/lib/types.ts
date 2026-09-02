export type PillarType = 
    | 'Dakwah & Pembinaan'
    | 'Pendidikan'
    | 'Sosial & Kemanusiaan'
    | 'Kesehatan'
    | 'Pemberdayaan Ekonomi & Bencana';

export interface ProgramItem {
    id: string;
    slug: string;
    title: string;
    judul?: string;
    pillar: PillarType;
    category: string;
    target: number;
    targetFormatted: string;
    collected: number;
    collectedFormatted: string;
    donorsCount: number;
    daysLeft: number;
    description: string;
    deskripsi_singkat?: string;
    fullDescription?: string;
    imageUrl: string;
    image_url?: string;
    location?: string;
    beneficiaries?: string;
    featured?: boolean;
    urgent?: boolean;
    active?: boolean;
}

export interface NewsItem {
    id: string;
    slug: string;
    title: string;
    category: string;
    date: string;
    author: string;
    readTime: string;
    imageUrl: string;
    summary: string;
    content: string;
    tags?: string[];
    views?: number;
}

export interface QuoteItem {
    id: string;
    title: string;
    quoteText: string;
    source: string;
    category: string;
    imageUrl: string;
    date: string;
}

export interface DisbursalItem {
    id: string;
    programTitle: string;
    pillar: PillarType;
    amount: number;
    amountFormatted: string;
    beneficiariesCount: number;
    location: string;
    date: string;
    description: string;
    imageUrl?: string;
}

export interface DonorItem {
    id: string;
    name: string;
    amount: number;
    amountFormatted: string;
    programSlug: string;
    programTitle: string;
    date: string;
    isAnonymous: boolean;
    doa?: string;
}

export interface BankAccount {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    logoUrl?: string;
    badge?: string;
}
