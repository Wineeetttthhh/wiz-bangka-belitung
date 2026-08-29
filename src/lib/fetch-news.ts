/**
 * fetchNews — Server-side Supabase fetch helper
 * Always bypasses cache to ensure fresh data from Supabase.
 * Used by SSR pages and API endpoints.
 */

const SUPABASE_URL = 'https://otrkikmrloaonabylgxi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hc0jJ9VUJYSEglP9hQvWFw_MbzT2rAh';

const BASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache'
};

export interface SupabaseNewsRow {
    id: string;
    title: string;
    category: string | null;
    content: string | null;
    image_url: string | null;
    gallery: string[] | null;
    event_date: string | null;
    status: string | null;
    author: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface NewsItem {
    id: string;
    title: string;
    category: string;
    content: string;
    imageUrl: string;
    image_url: string;
    gallery: string[];
    eventDate: string;
    event_date: string;
    status: string;
    author: string;
    createdAt: string;
    created_at: string;
    updatedAt: string;
    updated_at: string;
}

function mapRow(row: SupabaseNewsRow): NewsItem {
    const img = (row.image_url || (Array.isArray(row.gallery) && row.gallery.length > 0 ? row.gallery[0] : '') || '').trim();
    return {
        id: String(row.id),
        title: row.title || '',
        category: row.category || 'Kegiatan & Penyaluran',
        content: row.content || '',
        imageUrl: img,
        image_url: img,
        gallery: Array.isArray(row.gallery) ? row.gallery.filter(Boolean) : [],
        eventDate: row.event_date || row.created_at,
        event_date: row.event_date || row.created_at,
        status: row.status || 'published',
        author: row.author || 'Admin WIZ Babel',
        createdAt: row.created_at,
        created_at: row.created_at,
        updatedAt: row.updated_at || row.created_at,
        updated_at: row.updated_at || row.created_at,
    };
}

/**
 * Fetch all published news from Supabase — no cache, always fresh.
 */
export async function fetchAllNews(): Promise<NewsItem[]> {
    try {
        const url = `${SUPABASE_URL}/rest/v1/news?status=eq.published&order=created_at.desc&select=id,title,category,content,image_url,gallery,event_date,status,author,created_at,updated_at`;
        const res = await fetch(url, {
            method: 'GET',
            headers: BASE_HEADERS,
            cache: 'no-store'
        });
        if (!res.ok) return [];
        const rows: SupabaseNewsRow[] = await res.json();
        if (!Array.isArray(rows)) return [];
        return rows.map(mapRow);
    } catch (_) {
        return [];
    }
}

/**
 * Fetch a single news item by ID — no cache, always fresh.
 */
export async function fetchNewsById(id: string): Promise<NewsItem | null> {
    try {
        const url = `${SUPABASE_URL}/rest/v1/news?id=eq.${encodeURIComponent(id)}&select=id,title,category,content,image_url,gallery,event_date,status,author,created_at,updated_at&limit=1`;
        const res = await fetch(url, {
            method: 'GET',
            headers: BASE_HEADERS,
            cache: 'no-store'
        });
        if (!res.ok) return null;
        const rows: SupabaseNewsRow[] = await res.json();
        if (!Array.isArray(rows) || rows.length === 0) return null;
        return mapRow(rows[0]);
    } catch (_) {
        return null;
    }
}
