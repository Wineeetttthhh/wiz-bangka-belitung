import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4321;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
    let reqUrl = (req.url || '/').split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';

    let filePath = path.join(DIST_DIR, reqUrl);

    // If file doesn't exist, try appending /index.html or .html (clean URLs)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const tryIndex = path.join(filePath, 'index.html');
        const tryHtml = `${filePath}.html`;

        if (fs.existsSync(tryIndex)) {
            filePath = tryIndex;
        } else if (fs.existsSync(tryHtml)) {
            filePath = tryHtml;
        }
    }

    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 - Halaman Tidak Ditemukan</h1><p><a href="/">Kembali ke Beranda</a></p>');
    }
});

server.listen(PORT, () => {
    console.log(`🚀 WIZ Babel Astro Server running on http://localhost:${PORT}`);
});
