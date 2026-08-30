import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = typeof process !== 'undefined' && process.env?.SUPABASE_URL 
    ? process.env.SUPABASE_URL 
    : 'https://kmpwdqremvltgglmoxgx.supabase.co';

const SUPABASE_ANON_KEY = typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY 
    ? process.env.SUPABASE_ANON_KEY 
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttcHdkcXJlbXZsdGdnbG1veGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMjEyMTksImV4cCI6MjEwMzU5NzIxOX0.MhNqr36yvqRAgiVsLil608P-DyYBLJ6WBWxXMbfvbH8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});
