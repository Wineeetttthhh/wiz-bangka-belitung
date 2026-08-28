import type { APIRoute } from 'astro';
import { MASTER_PROGRAMS } from '../../lib/programs-data';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');

    if (slug) {
        const found = MASTER_PROGRAMS.find((p) => p.slug === slug);
        if (found) {
            return new Response(JSON.stringify({ success: true, data: found }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        return new Response(JSON.stringify({ success: false, message: 'Program not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ success: true, data: MASTER_PROGRAMS }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
};
