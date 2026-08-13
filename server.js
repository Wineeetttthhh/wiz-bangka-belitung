/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Localhost Web Server (Zero-Dependency Node.js Server)
 * ============================================================
 * 
 * Cara menjalankan:
 * 1. Klik 2x file `start-localhost.bat` (di Windows)
 *    ATAU
 * 2. Buka terminal dan jalankan: `node server.js`
 * 
 * Buka browser dan akses: http://localhost:3000
 * ============================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

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

const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
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

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`\n========================================================`);
    console.log(`  SERVER LOCALHOST WIZ BANGKA BELITUNG BERJALAN!`);
    console.log(`  --------------------------------------------------`);
    console.log(`  Akses di Browser: http://localhost:${PORT}`);
    console.log(`  Halaman Utama:    http://localhost:${PORT}/index.html`);
    console.log(`  Halaman Admin:    http://localhost:${PORT}/admin.html`);
    console.log(`  Halaman Donasi:   http://localhost:${PORT}/donasi.html`);
    console.log(`  --------------------------------------------------`);
    console.log(`  Tekan Ctrl + C di terminal untuk menghentikan server.`);
    console.log(`========================================================\n`);
});
