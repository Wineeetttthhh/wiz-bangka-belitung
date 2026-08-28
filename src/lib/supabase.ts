import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = typeof process !== 'undefined' && process.env?.SUPABASE_URL 
    ? process.env.SUPABASE_URL 
    : 'https://ccmulazswlmjyfjdtlti.supabase.co';

const SUPABASE_ANON_KEY = typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY 
    ? process.env.SUPABASE_ANON_KEY 
    : 'sb_publishable_hEmZHHQyc0EeHXQI2caacQ_InnfPXa5';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});
