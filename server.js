/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Localhost Web Server with Live-Reload & SSE
 * ============================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const WATCH_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

// SSE Clients for Live Reload
const sseClients = new Set();

// Live Reload Script injected into local HTML responses
const LIVE_RELOAD_SCRIPT = `
<!-- Live Reload Script injected by WIZ Server -->
<script>
(function() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const es = new EventSource('/__livereload');
        es.onmessage = function(e) {
            if (e.data === 'reload') {
                console.log('[WIZ LiveReload] File changed, reloading...');
                window.location.reload();
            }
        };
        es.onerror = function() {
            setTimeout(() => new EventSource('/__livereload'), 3000);
        };
    }
})();
</script>
`;

// File watcher for Live Reload
let watchDebounce = null;
function notifyClients() {
    clearTimeout(watchDebounce);
    watchDebounce = setTimeout(() => {
        if (sseClients.size > 0) {
            console.log(`[LiveReload] 🔄 Refreshed ${sseClients.size} local browser tab(s)`);
            for (const client of sseClients) {
                client.write(`data: reload\n\n`);
            }
        }
    }, 300);
}

try {
    fs.watch(WATCH_DIR, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const normalized = filename.replace(/\\/g, '/');
        if (normalized.includes('.git') || normalized.includes('.gemini') || normalized.includes('node_modules')) return;
        notifyClients();
    });
} catch (e) {
    // fs.watch fallback if recursive is not supported
}

const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];

    // Dynamic Specific Program Open Graph Route (/program/:slug or /program?name=...)
    if (reqUrl.startsWith('/program/') || (reqUrl === '/program' && req.url.includes('?'))) {
        const apiFilePath = path.join(__dirname, 'api', 'program.js');
        if (fs.existsSync(apiFilePath)) {
            try {
                res.status = function(code) { this.statusCode = code; return this; };
                res.send = function(content) {
                    if (!this.getHeader('Content-Type')) {
                        this.setHeader('Content-Type', 'text/html; charset=utf-8');
                    }
                    this.writeHead(this.statusCode || 200);
                    this.end(content);
                    return this;
                };
                delete require.cache[require.resolve(apiFilePath)];
                const handler = require(apiFilePath);
                handler(req, res);
                return;
            } catch (err) {
                console.error('[Program Dev Router Error]', err);
            }
        }
    }

    // Dynamic Quote & Inspirasi / Flyer Open Graph Route (/quote/:id, /flyer/:id, etc.)
    if (reqUrl.startsWith('/quote') || reqUrl.startsWith('/flyer')) {
        const apiFilePath = path.join(__dirname, 'api', 'quote.js');
        if (fs.existsSync(apiFilePath)) {
            try {
                res.status = function(code) { this.statusCode = code; return this; };
                res.send = function(content) {
                    if (!this.getHeader('Content-Type')) {
                        this.setHeader('Content-Type', 'text/html; charset=utf-8');
                    }
                    this.writeHead(this.statusCode || 200);
                    this.end(content);
                    return this;
                };
                delete require.cache[require.resolve(apiFilePath)];
                const handler = require(apiFilePath);
                handler(req, res);
                return;
            } catch (err) {
                console.error('[Quote Dev Router Error]', err);
            }
        }
    }

    // Dynamic News / Berita Open Graph Route (/berita/:id)
    if (reqUrl.startsWith('/berita')) {
        const apiFilePath = path.join(__dirname, 'api', 'berita.js');
        if (fs.existsSync(apiFilePath)) {
            try {
                res.status = function(code) { this.statusCode = code; return this; };
                res.send = function(content) {
                    if (!this.getHeader('Content-Type')) {
                        this.setHeader('Content-Type', 'text/html; charset=utf-8');
                    }
                    this.writeHead(this.statusCode || 200);
                    this.end(content);
                    return this;
                };
                delete require.cache[require.resolve(apiFilePath)];
                const handler = require(apiFilePath);
                handler(req, res);
                return;
            } catch (err) {
                console.error('[Berita Dev Router Error]', err);
            }
        }
    }

    // Serverless API Router (/api/sync, etc.)
    if (reqUrl.startsWith('/api/')) {
        const apiName = reqUrl.replace('/api/', '').replace(/\.js$/, '');
        const apiFilePath = path.join(__dirname, 'api', `${apiName}.js`);

        if (fs.existsSync(apiFilePath)) {
            try {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                    req.body = body;
                    // Parse query parameters
                    try {
                        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
                        req.query = Object.fromEntries(parsedUrl.searchParams.entries());
                    } catch (e) {
                        req.query = {};
                    }

                    // Custom res helper for express/serverless style
                    res.status = function(code) {
                        this.statusCode = code;
                        return this;
                    };
                    res.json = function(data) {
                        this.writeHead(this.statusCode || 200, {
                            'Content-Type': 'application/json; charset=utf-8',
                            'Access-Control-Allow-Origin': '*'
                        });
                        this.end(JSON.stringify(data));
                        return this;
                    };
                    res.send = function(content) {
                        if (!this.getHeader('Content-Type')) {
                            this.setHeader('Content-Type', 'text/html; charset=utf-8');
                        }
                        this.writeHead(this.statusCode || 200);
                        this.end(content);
                        return this;
                    };

                    try {
                        delete require.cache[require.resolve(apiFilePath)];
                        const handler = require(apiFilePath);
                        await handler(req, res);
                    } catch (err) {
                        console.error('[Dev API Error]', err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'error', message: err.message }));
                    }
                });
                return;
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: e.message }));
                return;
            }
        }
    }

    // SSE Endpoint for Live Reload
    if (reqUrl === '/__livereload') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        res.write('retry: 1000\n\n');
        sseClients.add(res);

        req.on('close', () => {
            sseClients.delete(res);
        });
        return;
    }

    if (reqUrl === '/') reqUrl = '/index.html';

    const filePath = path.join(__dirname, reqUrl);

    // Prevent path traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404 - Halaman Tidak Ditemukan</h1><p><a href="/">Kembali ke Beranda WIZ Babel</a></p>');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        if (ext === '.html') {
            fs.readFile(filePath, 'utf8', (readErr, content) => {
                if (readErr) {
                    res.writeHead(500);
                    res.end('Internal Server Error');
                    return;
                }
                // Inject live reload script before </body>
                let injected = content;
                if (content.includes('</body>')) {
                    injected = content.replace('</body>', `${LIVE_RELOAD_SCRIPT}\n</body>`);
                } else {
                    injected += LIVE_RELOAD_SCRIPT;
                }
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(injected);
            });
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(res);
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n========================================================`);
    console.log(`  SERVER LOCALHOST WIZ BANGKA BELITUNG BERJALAN!`);
    console.log(`  --------------------------------------------------`);
    console.log(`  Akses di Browser: http://localhost:${PORT}`);
    console.log(`  Live-Reload:      Aktif ⚡ (Otomatis Refresh Lokal)`);
    console.log(`  Halaman Utama:    http://localhost:${PORT}/index.html`);
    console.log(`  Halaman Admin:    http://localhost:${PORT}/admin.html`);
    console.log(`  Halaman Donasi:   http://localhost:${PORT}/donasi.html`);
    console.log(`  --------------------------------------------------`);
    console.log(`========================================================\n`);
});
