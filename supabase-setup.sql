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
    disbursement_category TEXT DEFAULT 'program_execution', -- 'operasional_infak_umum', 'operasional_infak_terikat_lembaga', 'hak_mitra_ujrah', 'dana_saving', 'program_execution'
    source_type TEXT DEFAULT 'program_spesifik',
    target_type TEXT DEFAULT 'specific',
    amount NUMERIC NOT NULL,
    amount_from_program NUMERIC DEFAULT 0,
    amount_from_subsidi NUMERIC DEFAULT 0,
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

-- ─── 8. Table: Branch Configuration (Pengaturan Wilayah Cabang) ─────
CREATE TABLE IF NOT EXISTS public.branch_config (
    wilayah_id TEXT PRIMARY KEY,
    wilayah_name TEXT NOT NULL,
    operasional_infak_umum_pct NUMERIC(5, 2) NOT NULL DEFAULT 13.00,
    dana_saving_pct NUMERIC(5, 2) NOT NULL DEFAULT 2.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed Default Branches (Pangkalpinang & Sungailiat)
INSERT INTO public.branch_config (wilayah_id, wilayah_name, operasional_infak_umum_pct, dana_saving_pct, is_active)
VALUES 
    ('Pangkalpinang', 'WIZ Cabang Pangkalpinang', 13.00, 2.00, true),
    ('Sungailiat', 'WIZ Cabang Sungailiat (Bangka)', 14.00, 10.00, true)
ON CONFLICT (wilayah_id) DO UPDATE SET
    operasional_infak_umum_pct = EXCLUDED.operasional_infak_umum_pct,
    dana_saving_pct = EXCLUDED.dana_saving_pct,
    updated_at = timezone('utc'::text, now());

-- ─── 9. Table: Programs (Manajemen Status Eksekusi Program) ──────────
CREATE TABLE IF NOT EXISTS public.programs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT DEFAULT '-',
    pillar TEXT DEFAULT 'Berkah Peduli',
    wilayah TEXT DEFAULT 'Pangkalpinang',
    target_amount NUMERIC DEFAULT 50000000,
    status TEXT DEFAULT 'published', -- 'draft', 'published', 'executed', 'running', 'completed'
    is_executed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.programs 
    ADD COLUMN IF NOT EXISTS is_executed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';

-- ═════════════════════════════════════════════════════════
-- POSTGRESQL FUNCTIONS & FINANCIAL VALIDATION TRIGGERS
-- ═════════════════════════════════════════════════════════

-- ─── Helper RPC: Get Branch Financial Limit & Status ─────────────
CREATE OR REPLACE FUNCTION public.get_branch_financial_limit(
    p_wilayah TEXT DEFAULT 'Pangkalpinang',
    p_check_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_month TIMESTAMP WITH TIME ZONE;
    v_end_month TIMESTAMP WITH TIME ZONE;
    v_op_pct NUMERIC := 13.00;
    v_saving_pct NUMERIC := 2.00;
    v_total_infak_umum NUMERIC := 0;
    v_total_disbursed_op NUMERIC := 0;
    v_total_disbursed_saving NUMERIC := 0;
    v_op_limit NUMERIC := 0;
    v_op_remaining NUMERIC := 0;
    v_saving_limit NUMERIC := 0;
    v_saving_remaining NUMERIC := 0;
BEGIN
    v_start_month := date_trunc('month', p_check_date);
    v_end_month := v_start_month + interval '1 month';

    -- Ambil persentase cabang
    SELECT operasional_infak_umum_pct, dana_saving_pct
    INTO v_op_pct, v_saving_pct
    FROM public.branch_config
    WHERE wilayah_id = p_wilayah;

    IF v_op_pct IS NULL THEN
        IF p_wilayah = 'Sungailiat' THEN
            v_op_pct := 14.00;
            v_saving_pct := 10.00;
        ELSE
            v_op_pct := 13.00;
            v_saving_pct := 2.00;
        END IF;
    END IF;

    -- Total Infak Umum bulan berjalan
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_infak_umum
    FROM public.donations
    WHERE status = 'verified'
      AND (wilayah = p_wilayah OR (wilayah IS NULL AND p_wilayah = 'Pangkalpinang'))
      AND (
          donation_type = 'Infak Umum' 
          OR program_spesifik IS NULL 
          OR program_spesifik = '-' 
          OR program_spesifik = '' 
          OR LOWER(program_spesifik) IN ('infak umum', 'sedekah umum', 'umum', 'infak', 'sedekah')
      )
      AND created_at >= v_start_month 
      AND created_at < v_end_month;

    -- Total Operasional Infak Umum yang sudah ditarik
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_disbursed_op
    FROM public.disbursements
    WHERE (wilayah = p_wilayah OR (wilayah IS NULL AND p_wilayah = 'Pangkalpinang'))
      AND (
          disbursement_category = 'operasional_infak_umum' 
          OR LOWER(program) LIKE '%operasional%umum%'
          OR (LOWER(program) LIKE '%operasional%' AND LOWER(program) NOT LIKE '%terikat%' AND LOWER(program) NOT LIKE '%mitra%')
      )
      AND disbursed_at >= v_start_month 
      AND disbursed_at < v_end_month;

    -- Total Dana Saving yang sudah ditarik
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_disbursed_saving
    FROM public.disbursements
    WHERE (wilayah = p_wilayah OR (wilayah IS NULL AND p_wilayah = 'Pangkalpinang'))
      AND (
          disbursement_category = 'dana_saving' 
          OR LOWER(program) LIKE '%saving%'
          OR LOWER(program) LIKE '%cadangan%'
      )
      AND disbursed_at >= v_start_month 
      AND disbursed_at < v_end_month;

    v_op_limit := ROUND(v_total_infak_umum * (v_op_pct / 100.0));
    v_op_remaining := GREATEST(0, v_op_limit - v_total_disbursed_op);

    v_saving_limit := ROUND(v_total_infak_umum * (v_saving_pct / 100.0));
    v_saving_remaining := GREATEST(0, v_saving_limit - v_total_disbursed_saving);

    RETURN jsonb_build_object(
        'wilayah', p_wilayah,
        'bulan', to_char(v_start_month, 'YYYY-MM'),
        'total_infak_umum_masuk', v_total_infak_umum,
        'operasional_pct', v_op_pct,
        'operasional_limit', v_op_limit,
        'operasional_terpakai', v_total_disbursed_op,
        'operasional_sisa', v_op_remaining,
        'saving_pct', v_saving_pct,
        'saving_limit', v_saving_limit,
        'saving_terpakai', v_total_disbursed_saving,
        'saving_sisa', v_saving_remaining
    );
END;
$$;

-- ─── Master PostgreSQL Trigger Function: Strict Financial Engine ─
CREATE OR REPLACE FUNCTION public.fn_validate_disbursement_strict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wilayah TEXT;
    v_disb_date TIMESTAMP WITH TIME ZONE;
    v_start_month TIMESTAMP WITH TIME ZONE;
    v_end_month TIMESTAMP WITH TIME ZONE;
    v_op_pct NUMERIC := 13.00;
    v_total_infak_umum NUMERIC := 0;
    v_already_disbursed NUMERIC := 0;
    v_op_limit NUMERIC := 0;
    v_remaining_limit NUMERIC := 0;
    v_prog_status TEXT := 'published';
    v_is_executed BOOLEAN := false;
BEGIN
    v_wilayah := COALESCE(NULLIF(TRIM(NEW.wilayah), ''), 'Pangkalpinang');
    NEW.wilayah := v_wilayah;
    v_disb_date := COALESCE(NEW.disbursed_at, timezone('utc'::text, now()));
    v_start_month := date_trunc('month', v_disb_date);
    v_end_month := v_start_month + interval '1 month';

    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Jumlah nominal pengeluaran wajib lebih besar dari 0 (Diminta: Rp %).', COALESCE(NEW.amount, 0);
    END IF;

    -- ────────────────────────────────────────────────────────────
    -- 1. OPERASIONAL INFAK UMUM (DINAMIS & MULTI-WILAYAH)
    -- ────────────────────────────────────────────────────────────
    IF NEW.disbursement_category = 'operasional_infak_umum' 
       OR LOWER(NEW.program) LIKE '%operasional%umum%'
       OR (LOWER(NEW.program) LIKE '%operasional%' AND LOWER(NEW.program) NOT LIKE '%terikat%' AND LOWER(NEW.program) NOT LIKE '%mitra%') THEN
       
        NEW.disbursement_category := 'operasional_infak_umum';

        SELECT operasional_infak_umum_pct INTO v_op_pct
        FROM public.branch_config
        WHERE wilayah_id = v_wilayah;

        IF v_op_pct IS NULL THEN
            IF v_wilayah = 'Sungailiat' THEN v_op_pct := 14.00;
            ELSE v_op_pct := 13.00;
            END IF;
        END IF;

        SELECT COALESCE(SUM(amount), 0) INTO v_total_infak_umum
        FROM public.donations
        WHERE status = 'verified'
          AND (wilayah = v_wilayah OR (wilayah IS NULL AND v_wilayah = 'Pangkalpinang'))
          AND (
              donation_type = 'Infak Umum' 
              OR program_spesifik IS NULL 
              OR program_spesifik = '-' 
              OR program_spesifik = '' 
              OR LOWER(program_spesifik) IN ('infak umum', 'sedekah umum', 'umum', 'infak', 'sedekah')
          )
          AND created_at >= v_start_month 
          AND created_at < v_end_month;

        SELECT COALESCE(SUM(amount), 0) INTO v_already_disbursed
        FROM public.disbursements
        WHERE (wilayah = v_wilayah OR (wilayah IS NULL AND v_wilayah = 'Pangkalpinang'))
          AND (
              disbursement_category = 'operasional_infak_umum' 
              OR LOWER(program) LIKE '%operasional%umum%'
              OR (LOWER(program) LIKE '%operasional%' AND LOWER(program) NOT LIKE '%terikat%' AND LOWER(program) NOT LIKE '%mitra%')
          )
          AND disbursed_at >= v_start_month 
          AND disbursed_at < v_end_month
          AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND id <> OLD.id));

        v_op_limit := ROUND(v_total_infak_umum * (v_op_pct / 100.0));
        v_remaining_limit := GREATEST(0, v_op_limit - v_already_disbursed);

        -- Eksekusi Pemblokiran Presisi Database Hingga 1 Rupiah
        IF NEW.amount > v_remaining_limit THEN
            RAISE EXCEPTION 'Nominal melebihi sisa batas operasional Infak Umum wilayah % bulan ini. Total Infak: Rp %, Limit: Rp %, Sudah Ditarik: Rp %, Sisa: Rp %, Diminta: Rp %',
                v_wilayah, v_total_infak_umum, v_op_limit, v_already_disbursed, v_remaining_limit, NEW.amount;
        END IF;

        RETURN NEW;
    END IF;

    -- ────────────────────────────────────────────────────────────
    -- 2. OPERASIONAL INFAK TERIKAT (EVENT-TRIGGERED & EXCEPTION)
    -- ────────────────────────────────────────────────────────────
    -- 2A. Hak Mitra (Ujrah Fundraiser) -> TIDAK DIKUNCI / SELALU LIQUID
    IF NEW.disbursement_category = 'hak_mitra_ujrah' OR LOWER(NEW.program) LIKE '%ujrah%' OR LOWER(NEW.program) LIKE '%hak mitra%' THEN
        NEW.disbursement_category := 'hak_mitra_ujrah';
        RETURN NEW;
    END IF;

    -- 2B. Operasional Lembaga (Infak Terikat) -> TERKUNCI HINGGA PROGRAM DIEKSEKUSI
    IF NEW.disbursement_category = 'operasional_infak_terikat_lembaga' OR LOWER(NEW.program) LIKE '%operasional%terikat%' THEN
        NEW.disbursement_category := 'operasional_infak_terikat_lembaga';

        SELECT status, is_executed INTO v_prog_status, v_is_executed
        FROM public.programs
        WHERE LOWER(TRIM(title)) = LOWER(TRIM(NEW.program))
           OR LOWER(TRIM(id)) = LOWER(TRIM(NEW.program))
        LIMIT 1;

        IF FOUND THEN
            IF NOT (v_is_executed = true OR LOWER(v_prog_status) IN ('executed', 'running', 'in_progress', 'completed')) THEN
                RAISE EXCEPTION 'Operasional Lembaga untuk Infak Terikat hanya dapat ditarik saat program dieksekusi. Hak Mitra tetap dapat dicairkan.';
            END IF;
        ELSE
            IF NOT (LOWER(COALESCE(NEW.description, '')) LIKE '%dieksekusi%' OR LOWER(COALESCE(NEW.description, '')) LIKE '%berjalan%' OR LOWER(COALESCE(NEW.description, '')) LIKE '%penyaluran%') THEN
                RAISE EXCEPTION 'Operasional Lembaga untuk Infak Terikat hanya dapat ditarik saat program dieksekusi. Hak Mitra tetap dapat dicairkan.';
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

-- ─── Attach Trigger to Disbursements Table ───────────────────────
DROP TRIGGER IF EXISTS trg_validate_disbursement_strict ON public.disbursements;
CREATE TRIGGER trg_validate_disbursement_strict
BEFORE INSERT OR UPDATE ON public.disbursements
FOR EACH ROW
EXECUTE FUNCTION public.fn_validate_disbursement_strict();

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
ALTER TABLE public.branch_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent conflicts
DROP POLICY IF EXISTS "donations_all" ON public.donations;
DROP POLICY IF EXISTS "news_all" ON public.news;
DROP POLICY IF EXISTS "referrals_all" ON public.referrals;
DROP POLICY IF EXISTS "referral_payouts_all" ON public.referral_payouts;
DROP POLICY IF EXISTS "disbursements_all" ON public.disbursements;
DROP POLICY IF EXISTS "site_settings_all" ON public.site_settings;
DROP POLICY IF EXISTS "allocation_rules_all" ON public.allocation_rules;
DROP POLICY IF EXISTS "branch_config_all" ON public.branch_config;
DROP POLICY IF EXISTS "programs_all" ON public.programs;

-- Create full CRUD policies for web app
CREATE POLICY "donations_all" ON public.donations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "news_all" ON public.news FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "referrals_all" ON public.referrals FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "referral_payouts_all" ON public.referral_payouts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "disbursements_all" ON public.disbursements FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "site_settings_all" ON public.site_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allocation_rules_all" ON public.allocation_rules FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "branch_config_all" ON public.branch_config FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "programs_all" ON public.programs FOR ALL TO anon USING (true) WITH CHECK (true);

