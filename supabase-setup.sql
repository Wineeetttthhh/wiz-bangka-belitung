-- ========================================================
-- WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
-- Supabase Cloud Database Schema & RLS Setup Script
-- ========================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ─── 1. Table: Donations ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_name TEXT NOT NULL,
    donor_phone TEXT,
    donor_email TEXT,
    -- Wilayah operasional: 'Pangkalpinang' | 'Sungailiat'
    wilayah TEXT DEFAULT '-',
    -- Jenis donasi: Zakat | Infak Umum | Infak Terikat | Sedekah
    donation_type TEXT DEFAULT 'Infak Terikat',
    -- Program Utama (5 Berkah) — relevan untuk Infak Terikat
    program_utama TEXT DEFAULT '-',
    -- Program Spesifik — relevan untuk Infak Terikat
    program_spesifik TEXT DEFAULT '-',
    -- Legacy: program dipertahankan untuk kompatibilitas
    program TEXT NOT NULL DEFAULT '-',
    category TEXT DEFAULT '-',
    amount NUMERIC NOT NULL,
    -- Alokasi internal (khusus Infak Terikat: 12.5% dari amount)
    alokasi_operasional NUMERIC DEFAULT 0,
    -- Alokasi Program internal (khusus Infak Terikat: 87.5% dari amount)
    alokasi_program NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'Bank Transfer',
    notes TEXT,
    status TEXT DEFAULT 'pending',
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by TEXT,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─── ALTER: Tambah kolom baru jika tabel sudah ada ───────
-- (Jalankan bagian ini jika tabel donations sudah dibuat sebelumnya)
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS wilayah TEXT DEFAULT '-';
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS program_utama TEXT DEFAULT '-';
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS program_spesifik TEXT DEFAULT '-';
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS alokasi_operasional NUMERIC DEFAULT 0;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS alokasi_program NUMERIC DEFAULT 0;

-- ─── 2. Table: News / Berita ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.news (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Kegiatan & Event',
    content TEXT NOT NULL,
    image_url TEXT,
    gallery JSONB DEFAULT '[]'::jsonb,
    event_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'draft',
    author TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- ─── 3. Table: Disbursements (Penyaluran Dana) ──────────
CREATE TABLE IF NOT EXISTS public.disbursements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    disbursed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    recorded_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- ─── 4. Table: Activity Log ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    actor TEXT DEFAULT 'Sistem',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─── 5. Table: Contact Messages ──────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_name TEXT NOT NULL,
    sender_phone TEXT,
    sender_email TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─── 6. Table: Zakat Calculations ────────────────────────
CREATE TABLE IF NOT EXISTS public.zakat_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    zakat_type TEXT NOT NULL,
    total_wealth NUMERIC NOT NULL,
    zakat_due NUMERIC NOT NULL,
    is_nisab_met BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─── 7. Table: Site Images ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_images (
    key TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    label TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ─── 8. Table: Admin Users ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'amil', -- 'super_admin' (Admin 1) or 'amil'
    status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─── 9. Table: Allocation Rules ───────────────────────────
CREATE TABLE IF NOT EXISTS public.allocation_rules (
    wilayah TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);


-- ═════════════════════════════════════════════════════════
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ═════════════════════════════════════════════════════════
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zakat_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_rules ENABLE ROW LEVEL SECURITY;


-- ═════════════════════════════════════════════════════════
-- RLS POLICIES — Full CRUD for anon key
-- ═════════════════════════════════════════════════════════
CREATE POLICY "donations_select" ON public.donations FOR SELECT TO anon USING (true);
CREATE POLICY "donations_insert" ON public.donations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "donations_update" ON public.donations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "donations_delete" ON public.donations FOR DELETE TO anon USING (true);

CREATE POLICY "news_select" ON public.news FOR SELECT TO anon USING (true);
CREATE POLICY "news_insert" ON public.news FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "news_update" ON public.news FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "news_delete" ON public.news FOR DELETE TO anon USING (true);

CREATE POLICY "disbursements_select" ON public.disbursements FOR SELECT TO anon USING (true);
CREATE POLICY "disbursements_insert" ON public.disbursements FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "disbursements_update" ON public.disbursements FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "disbursements_delete" ON public.disbursements FOR DELETE TO anon USING (true);

CREATE POLICY "activity_log_select" ON public.activity_log FOR SELECT TO anon USING (true);
CREATE POLICY "activity_log_insert" ON public.activity_log FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "contact_messages_select" ON public.contact_messages FOR SELECT TO anon USING (true);
CREATE POLICY "contact_messages_insert" ON public.contact_messages FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "zakat_records_select" ON public.zakat_records FOR SELECT TO anon USING (true);
CREATE POLICY "zakat_records_insert" ON public.zakat_records FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "site_images_select" ON public.site_images FOR SELECT TO anon USING (true);
CREATE POLICY "site_images_insert" ON public.site_images FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "site_images_update" ON public.site_images FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "site_images_delete" ON public.site_images FOR DELETE TO anon USING (true);

CREATE POLICY "admin_users_select" ON public.admin_users FOR SELECT TO anon USING (true);
CREATE POLICY "admin_users_insert" ON public.admin_users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "admin_users_update" ON public.admin_users FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_users_delete" ON public.admin_users FOR DELETE TO anon USING (true);

CREATE POLICY "allocation_rules_select" ON public.allocation_rules FOR SELECT TO anon USING (true);
CREATE POLICY "allocation_rules_insert" ON public.allocation_rules FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "allocation_rules_update" ON public.allocation_rules FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allocation_rules_delete" ON public.allocation_rules FOR DELETE TO anon USING (true);

