import { dev } from 'astro';

async function start() {
    console.log('[Astro] Starting Astro Dev Server programmatically...');
    try {
        const server = await dev({
            root: '.',
            server: {
                port: 4321,
                host: true
            }
        });
        console.log(`[Astro] Server online at: http://localhost:${server.address.port}`);
    } catch (err) {
        console.error('[Astro] Failed to start server:', err);
    }
}

start();
