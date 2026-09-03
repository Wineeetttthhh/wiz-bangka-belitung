-- ========================================================
-- WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
-- Supabase Cloud Database Schema & Full Setup Script
-- ========================================================

-- 1. Table: Donations
CREATE TABLE IF NOT EXISTS public.donations (
    id TEXT PRIMARY KEY,
    donor_name TEXT NOT NULL,
    donor_phone TEXT,
    donor_email TEXT,
    wilayah TEXT DEFAULT '-',
    donation_type TEXT DEFAULT 'Infak Terikat',
    program_utama TEXT DEFAULT '-',
    program_spesifik TEXT DEFAULT '-',
    program TEXT NOT NULL DEFAULT '-',
    category TEXT DEFAULT '-',
    amount NUMERIC NOT NULL,
    alokasi_operasional NUMERIC DEFAULT 0,
    alokasi_program NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'Bank Transfer',
    referral_id TEXT,
    referral_code TEXT,
    referral_name TEXT,
    referral_fee NUMERIC DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    tanggal_transaksi TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration safety for existing donations table
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS tanggal_transaksi TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Table: News / Berita
CREATE TABLE IF NOT EXISTS public.news (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Kegiatan & Penyaluran',
    content TEXT NOT NULL,
    image_url TEXT,
    gallery JSONB DEFAULT '[]'::jsonb,
    event_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'published',
    author TEXT DEFAULT 'Super Admin 1 (WIZ Babel)',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 3. Table: Referrals / Affiliators
CREATE TABLE IF NOT EXISTS public.referrals (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    bank_name TEXT,
    account_number TEXT,
    account_holder TEXT,
    cabang TEXT DEFAULT 'Pangkalpinang', -- 'Pangkalpinang' | 'Sungailiat' | 'Wilayah'
    default_rate NUMERIC DEFAULT 6,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 4. Table: Referral Payouts
CREATE TABLE IF NOT EXISTS public.referral_payouts (
    id TEXT PRIMARY KEY,
    referral_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    fee_percentage NUMERIC DEFAULT 6,
    reference_donation_ids JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Table: Disbursements
CREATE TABLE IF NOT EXISTS public.disbursements (
    id TEXT PRIMARY KEY,
    wilayah TEXT DEFAULT 'Pangkalpinang',
    program TEXT NOT NULL,
    disbursement_category TEXT DEFAULT 'program_execution',
    source_type TEXT DEFAULT 'program_spesifik',
    target_type TEXT DEFAULT 'specific',
    amount NUMERIC NOT NULL,
    amount_from_program NUMERIC DEFAULT 0,
    amount_from_subsidi NUMERIC DEFAULT 0,
    subsidi_details JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    tanggal_penyaluran TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    disbursed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    recorded_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration safety for existing disbursements table
ALTER TABLE public.disbursements ADD COLUMN IF NOT EXISTS tanggal_penyaluran TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.disbursements ADD COLUMN IF NOT EXISTS subsidi_details JSONB DEFAULT '[]'::jsonb;

-- 6. Table: Site Settings & Master State
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Table: Allocation Rules
CREATE TABLE IF NOT EXISTS public.allocation_rules (
    wilayah TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Table: Branch Configuration
CREATE TABLE IF NOT EXISTS public.branch_config (
    wilayah_id TEXT PRIMARY KEY,
    wilayah_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    fund_sharing JSONB DEFAULT '{"pusat":10,"wilayah":90}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Table: Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    user_name TEXT DEFAULT 'Admin',
    details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Table: Custom Quotes
CREATE TABLE IF NOT EXISTS public.custom_quotes (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT DEFAULT 'sedekah',
    image_url TEXT,
    author TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Table: Photo Bank
CREATE TABLE IF NOT EXISTS public.photo_bank (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Kegiatan',
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Table: KPI Mitra & Frequency Multiplier (6% Fix + 7% Pool)
CREATE TABLE IF NOT EXISTS public.kpi_mitra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mitra_id TEXT NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
    periode_bulan VARCHAR(7) NOT NULL, -- format 'YYYY-MM'
    qty_rapat INT NOT NULL DEFAULT 0,
    qty_admin INT NOT NULL DEFAULT 0,
    qty_desain INT NOT NULL DEFAULT 0,
    qty_video INT NOT NULL DEFAULT 0,
    qty_lapangan INT NOT NULL DEFAULT 0,
    keterangan_lainnya TEXT,
    poin_lainnya INT NOT NULL DEFAULT 0,
    total_poin INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT kpi_mitra_unique_mitra_periode UNIQUE (mitra_id, periode_bulan)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_mitra ENABLE ROW LEVEL SECURITY;

-- Create Open Access Policies for Public & Admin
CREATE POLICY "Public full access donations" ON public.donations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access news" ON public.news FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access referrals" ON public.referrals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access referral_payouts" ON public.referral_payouts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access disbursements" ON public.disbursements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access allocation_rules" ON public.allocation_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access branch_config" ON public.branch_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access custom_quotes" ON public.custom_quotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access photo_bank" ON public.photo_bank FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access kpi_mitra" ON public.kpi_mitra FOR ALL USING (true) WITH CHECK (true);
