/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Localhost Web Server with Live-Reload & Dynamic Styles
 * ============================================================
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const TAILWIND_TAG = `
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link rel="stylesheet" href="/assets/css/styles.css">
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: '#006834',
          'primary-container': '#008444',
          'on-primary': '#ffffff',
          surface: '#ffffff',
          'on-surface': '#0f172a',
          'on-surface-variant': '#475569',
          'surface-container-lowest': '#ffffff',
          'surface-container-low': '#f8fafc',
          'surface-container': '#f1f5f9',
          'outline-variant': '#cbd5e1'
        }
      }
    }
  }
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
        if (
            normalized.includes('.git') ||
            normalized.includes('.gemini') ||
            normalized.includes('node_modules') ||
            normalized.includes('scratch') ||
            normalized.includes('dist') ||
            normalized.includes('.vercel') ||
            normalized.endsWith('.log')
        ) return;
        notifyClients();
    });
} catch (e) {}

    let reqUrl = req.url.split('?')[0];
    try { reqUrl = decodeURIComponent(reqUrl); } catch(e) {}

    // Serverless API Router (/api/*)
    if (reqUrl.startsWith('/api/')) {
        const apiName = reqUrl.replace('/api/', '').replace(/\.js$/, '');
        const apiFilePath = path.join(__dirname, 'api', `${apiName}.js`);

        if (fs.existsSync(apiFilePath)) {
            try {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                    try {
                        if (body && (req.headers['content-type'] || '').includes('application/json')) {
                            try { req.body = JSON.parse(body); } catch (_) { req.body = body; }
                        } else {
                            req.body = body;
                        }

                        res.status = function(code) { this.statusCode = code; return this; };
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

                        const fileUrl = pathToFileURL(apiFilePath).href + '?t=' + Date.now();
                        const mod = await import(fileUrl);
                        const handler = mod.default || mod.GET || mod.POST || mod.handler;
                        if (typeof handler === 'function') {
                            await handler(req, res);
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ status: 'ok' }));
                        }
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
            'Connection': 'keep-alive'
        });
        res.write('data: connected\n\n');
        sseClients.add(res);

        req.on('close', () => {
            sseClients.delete(res);
        });
        return;
    }

    if (reqUrl === '/') reqUrl = '/index.html';

    let filePath = path.join(__dirname, reqUrl);

    if (reqUrl.startsWith('/_astro/')) {
        const tryDistAstro = path.join(__dirname, 'dist', reqUrl);
        if (fs.existsSync(tryDistAstro)) {
            filePath = tryDistAstro;
        }
    } else if (reqUrl === '/donasi' || reqUrl === '/donasi/' || reqUrl === '/donasi.html') {
        filePath = path.join(__dirname, 'donasi.html');
    } else if (reqUrl === '/admin' || reqUrl === '/admin/' || reqUrl === '/admin.html') {
        filePath = path.join(__dirname, 'admin.html');
    } else if (reqUrl === '/berita' || reqUrl === '/berita/' || reqUrl === '/berita.html') {
        filePath = path.join(__dirname, 'berita.html');
    } else if (reqUrl === '/program' || reqUrl === '/program/' || reqUrl === '/program.html') {
        filePath = path.join(__dirname, 'program.html');
    } else if (reqUrl === '/laporan' || reqUrl === '/laporan/' || reqUrl === '/laporan.html') {
        filePath = path.join(__dirname, 'laporan.html');
    } else if (reqUrl === '/affiliate' || reqUrl === '/affiliate/' || reqUrl === '/affiliate.html') {
        filePath = path.join(__dirname, 'affiliate.html');
    } else if (!path.extname(reqUrl)) {
        const tryHtml = path.join(__dirname, reqUrl + '.html');
        if (fs.existsSync(tryHtml)) {
            filePath = tryHtml;
        }
    }

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
                // Inject Tailwind CSS and styles
                let injected = content;
                if (injected.includes('<head>')) {
                    injected = injected.replace('<head>', `<head>\n${TAILWIND_TAG}`);
                }
                // Inject live reload script before </body>
                if (injected.includes('</body>')) {
                    injected = injected.replace('</body>', `${LIVE_RELOAD_SCRIPT}\n</body>`);
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

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
========================================================
  SERVER LOCALHOST WIZ BANGKA BELITUNG BERJALAN!
  --------------------------------------------------
  Akses di Browser: http://localhost:${PORT}
  Live-Reload:      Aktif ⚡ (Otomatis Refresh Lokal)
  Halaman Utama:    http://localhost:${PORT}/index.html
  Halaman Admin:    http://localhost:${PORT}/admin.html
  Halaman Donasi:   http://localhost:${PORT}/donasi.html
  --------------------------------------------------
========================================================
`);
});
