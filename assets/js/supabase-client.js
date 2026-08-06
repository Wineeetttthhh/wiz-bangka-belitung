/**
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Supabase Client Integration Helper
 * 
 * To enable Supabase Cloud Database sync:
 * Fill in your SUPABASE_URL and SUPABASE_ANON_KEY below from your Supabase Dashboard (Settings -> API).
 */

const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL',       // Example: 'https://xyzcompany.supabase.co'
    anonKey: 'YOUR_SUPABASE_ANON_KEY' // Example: 'eyJhY... (your anon key)'
};

/**
 * Generic REST poster for Supabase RLS Endpoints
 */
async function postToSupabase(tableName, payload) {
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.url.includes('YOUR_SUPABASE')) {
        console.info(`[WIZ Supabase Helper] ${tableName} saved locally. (Set SUPABASE_URL & ANON_KEY in assets/js/supabase-client.js to sync with Supabase Cloud).`);
        return { success: true, localOnly: true };
    }

    try {
        const endpoint = `${SUPABASE_CONFIG.url.replace(/\/$/, '')}/rest/v1/${tableName}`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            return { success: true, cloud: true };
        } else {
            const err = await response.text();
            console.warn(`[WIZ Supabase Helper] API Error:`, err);
            return { success: false, error: err };
        }
    } catch (e) {
        console.error(`[WIZ Supabase Helper] Network Error:`, e);
        return { success: false, error: e.message };
    }
}

/**
 * Public helper methods for WIZ App
 */
window.wizSupabase = {
    saveDonation: (donationData) => postToSupabase('donations', donationData),
    saveContactMessage: (msgData) => postToSupabase('contact_messages', msgData),
    saveZakatRecord: (zakatData) => postToSupabase('zakat_records', zakatData)
};
