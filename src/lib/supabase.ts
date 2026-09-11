import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = typeof process !== 'undefined' && process.env?.SUPABASE_URL 
    ? process.env.SUPABASE_URL 
    : 'https://dbyqvtfqgutqiuglcsmd.supabase.co';

const SUPABASE_ANON_KEY = typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY 
    ? process.env.SUPABASE_ANON_KEY 
    : 'sb_publishable__d2nTNNx6bCo2wyfJNNJ-w_ISKmXmkx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});
