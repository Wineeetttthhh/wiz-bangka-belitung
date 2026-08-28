import type { APIRoute } from 'astro';
import { MASTER_NEWS } from '../../lib/news-data';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
        const found = MASTER_NEWS.find((n) => n.id === id);
        if (found) {
            return new Response(JSON.stringify({ success: true, data: found }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        return new Response(JSON.stringify({ success: false, message: 'News not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ success: true, data: MASTER_NEWS }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
};
