/**
 * fetchNews — Server-side Supabase fetch helper
 * Always bypasses cache to ensure fresh data from Supabase.
 * Used by SSR pages and API endpoints.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kmpwdqremvltgglmoxgx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttcHdkcXJlbXZsdGdnbG1veGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMjEyMTksImV4cCI6MjEwMzU5NzIxOX0.MhNqr36yvqRAgiVsLil608P-DyYBLJ6WBWxXMbfvbH8';

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
 * Fetch all news from Supabase — no cache, always fresh.
 * @param includeDrafts Set to true to include draft articles
 */
export async function fetchAllNews(includeDrafts: boolean = false): Promise<NewsItem[]> {
    try {
        const filterStatus = includeDrafts ? '' : '&status=eq.published';
        const url = `${SUPABASE_URL}/rest/v1/news?order=created_at.desc&select=id,title,category,content,image_url,gallery,event_date,status,author,created_at,updated_at${filterStatus}`;
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
 * Fetch a single news item by ID or Slug — no cache, always fresh.
 */
export async function fetchNewsById(idOrSlug: string): Promise<NewsItem | null> {
    try {
        const encoded = encodeURIComponent(idOrSlug);
        // Try direct lookup by id or slug
        const url = `${SUPABASE_URL}/rest/v1/news?or=(id.eq.${encoded},slug.eq.${encoded})&select=id,title,category,content,image_url,gallery,event_date,status,author,created_at,updated_at&limit=1`;
        const res = await fetch(url, {
            method: 'GET',
            headers: BASE_HEADERS,
            cache: 'no-store'
        });
        if (res.ok) {
            const rows: SupabaseNewsRow[] = await res.json();
            if (Array.isArray(rows) && rows.length > 0) {
                return mapRow(rows[0]);
            }
        }

        // Fallback: try by id only if or filter failed
        const fallbackUrl = `${SUPABASE_URL}/rest/v1/news?id=eq.${encoded}&select=id,title,category,content,image_url,gallery,event_date,status,author,created_at,updated_at&limit=1`;
        const fbRes = await fetch(fallbackUrl, {
            method: 'GET',
            headers: BASE_HEADERS,
            cache: 'no-store'
        });
        if (fbRes.ok) {
            const fbRows: SupabaseNewsRow[] = await fbRes.json();
            if (Array.isArray(fbRows) && fbRows.length > 0) {
                return mapRow(fbRows[0]);
            }
        }

        return null;
    } catch (_) {
        return null;
    }
}
