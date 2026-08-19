/**
 * ============================================================
 * WIZ BANGKA BELITUNG - UNIFIED DEV SERVER & AUTO PUSH
 * ============================================================
 * Menjalankan Web Server Lokal (Live Reload) & Auto-Push Watcher (GitHub/Vercel)
 * secara bersamaan.
 * ============================================================
 */

console.log('========================================================');
console.log('   🚀 MEMULAI WIZ DEV SERVER & AUTO-PUSH WATCHER...');
console.log('========================================================\n');

// 1. Jalankan Local Web Server (Port 3000 dengan Live Reload)
require('./server.js');

// 2. Jalankan Auto Push Watcher (Git add + commit + push)
require('./auto-push.js');
