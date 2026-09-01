import type { APIRoute } from 'astro';
import { fetchAllNews, fetchNewsById } from '../../lib/fetch-news';

// SSR — never prerender, always fetch live from Supabase
export const prerender = false;

const NO_CACHE_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, s-maxage=0, must-revalidate',
    'CDN-Cache-Control': 'no-store',
    'Vercel-CDN-Cache-Control': 'no-store',
};

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
        const found = await fetchNewsById(id);
        if (found) {
            return new Response(JSON.stringify({ success: true, data: found }), {
                status: 200,
                headers: NO_CACHE_HEADERS
            });
        }
        return new Response(JSON.stringify({ success: false, message: 'News not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
    }

    const includeDrafts = url.searchParams.get('include_drafts') === '1' || url.searchParams.get('all') === '1' || url.searchParams.get('status') === 'all';
    const allNews = await fetchAllNews(includeDrafts);
    return new Response(JSON.stringify({ success: true, data: allNews }), {
        status: 200,
        headers: NO_CACHE_HEADERS
    });
};
