const SUPABASE_URL = 'https://ffiltrlzdbwhhhxzmzuo.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_GiA1BOjbW2psTU36149xuA_E26wGBI3';

async function check() {
    console.log('Fetching master_bundle...');
    const res = await fetch(`${SUPABASE_URL}/site_settings?key=eq.master_bundle&select=*`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Accept': 'application/json'
        }
    });
    console.log('master_bundle status:', res.status);
    const data = await res.json();
    console.log('master_bundle data exists:', Array.isArray(data) && data.length > 0);
    if (data[0] && data[0].value) {
        console.log('Quotes in master_bundle:', (data[0].value.quotes || []).length);
        console.log('Quotes IDs:', (data[0].value.quotes || []).map(q => q.id));
    }

    // Check if there is a separate 'quotes' table in Supabase
    try {
        const qRes = await fetch(`${SUPABASE_URL}/quotes?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Accept': 'application/json'
            }
        });
        console.log('quotes table status:', qRes.status);
        if (qRes.ok) {
            const qData = await qRes.json();
            console.log('quotes table rows:', qData.length);
        }
    } catch(e) {
        console.log('quotes table error:', e.message);
    }
}

check();
