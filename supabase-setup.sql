-- ========================================================
-- WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
-- Supabase Cloud Database Schema & Full Setup Script
-- ========================================================
-- Jalankan script SQL ini di Supabase Dashboard:
-- (Buka Dashboard Supabase → Pilih Menu SQL Editor di kiri `>_` → Klik "New Query" → Paste script ini → Klik "RUN")

-- ─── 1. Table: Donations ─────────────────────────────────
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
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─── 2. Table: News / Berita ─────────────────────────────
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

-- ─── 3. Table: Referrals / Affiliators ────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    bank_name TEXT,
    account_number TEXT,
    account_holder TEXT,
    default_rate NUMERIC DEFAULT 6,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- ─── 4. Table: Referral Payouts ───────────────────────────
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

-- ─── 5. Table: Disbursements ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.disbursements (
    id TEXT PRIMARY KEY,
    wilayah TEXT DEFAULT 'Pangkalpinang',
    program TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    disbursed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    recorded_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─── 6. Table: Site Settings & Master State ───────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ─── 7. Table: Allocation Rules ───────────────────────────
CREATE TABLE IF NOT EXISTS public.allocation_rules (
    wilayah TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ═════════════════════════════════════════════════════════
-- ENABLE ROW LEVEL SECURITY (RLS) & PUBLIC POLICIES
-- ═════════════════════════════════════════════════════════
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent conflicts
DROP POLICY IF EXISTS "donations_all" ON public.donations;
DROP POLICY IF EXISTS "news_all" ON public.news;
DROP POLICY IF EXISTS "referrals_all" ON public.referrals;
DROP POLICY IF EXISTS "referral_payouts_all" ON public.referral_payouts;
DROP POLICY IF EXISTS "disbursements_all" ON public.disbursements;
DROP POLICY IF EXISTS "site_settings_all" ON public.site_settings;
DROP POLICY IF EXISTS "allocation_rules_all" ON public.allocation_rules;

-- Create full CRUD policies for web app
CREATE POLICY "donations_all" ON public.donations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "news_all" ON public.news FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "referrals_all" ON public.referrals FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "referral_payouts_all" ON public.referral_payouts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "disbursements_all" ON public.disbursements FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "site_settings_all" ON public.site_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allocation_rules_all" ON public.allocation_rules FOR ALL TO anon USING (true) WITH CHECK (true);
