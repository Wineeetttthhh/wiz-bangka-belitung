import type { APIRoute } from 'astro';
import { MASTER_QUOTES } from '../../lib/quotes-data';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
        const found = MASTER_QUOTES.find((q) => q.id === id);
        if (found) {
            return new Response(JSON.stringify({ success: true, data: found }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        return new Response(JSON.stringify({ success: false, message: 'Quote not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ success: true, data: MASTER_QUOTES }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
};
