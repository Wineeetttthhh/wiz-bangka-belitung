-- ========================================================
-- WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
-- Supabase Cloud Database Schema & RLS Setup Script
-- ========================================================

-- 1. Table: Donations
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_name TEXT NOT NULL,
    donor_phone TEXT,
    donor_email TEXT,
    program_title TEXT NOT NULL,
    donation_type TEXT DEFAULT 'umum',
    amount NUMERIC NOT NULL,
    payment_method TEXT DEFAULT 'transfer',
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table: Contact Messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_name TEXT NOT NULL,
    sender_phone TEXT,
    sender_email TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table: Zakat Calculations
CREATE TABLE IF NOT EXISTS public.zakat_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    zakat_type TEXT NOT NULL,
    total_wealth NUMERIC NOT NULL,
    zakat_due NUMERIC NOT NULL,
    is_nisab_met BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zakat_records ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow Public Anonymous Insert for Web Submissions)
CREATE POLICY "Allow public insert to donations" 
ON public.donations FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Allow public insert to contact_messages" 
ON public.contact_messages FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Allow public insert to zakat_records" 
ON public.zakat_records FOR INSERT 
TO anon 
WITH CHECK (true);

-- Allow public read access to donations for live transparency (optional)
CREATE POLICY "Allow public select donations" 
ON public.donations FOR SELECT 
TO anon 
USING (true);
