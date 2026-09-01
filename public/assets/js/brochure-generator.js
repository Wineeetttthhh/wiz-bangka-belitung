/**
 * WIZ Bangka Belitung - 2-Page Dynamic Tri-Fold Brochure Generator
 * High-Resolution (2500x1768) PNG Capture for Mitra Volunteers & Admin Printing
 */

(function(window) {
    'use strict';

    const BASE_WIDTH = 2500;
    const BASE_HEIGHT = 1768;
    const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT; // ~1.414

    const WizBrochure = {
        // CDN dependency loader
        ensureLibraries: async function() {
            const loadScript = (src, id) => {
                return new Promise((resolve, reject) => {
                    if (document.getElementById(id)) {
                        return resolve();
                    }
                    const script = document.createElement('script');
                    script.id = id;
                    script.src = src;
                    script.crossOrigin = 'anonymous';
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
                    document.head.appendChild(script);
                });
            };

            const promises = [];
            if (typeof window.html2canvas === 'undefined') {
                promises.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'lib-html2canvas'));
            }
            if (typeof window.QRCode === 'undefined') {
                promises.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js', 'lib-qrcodejs'));
            }

            return Promise.all(promises);
        },

        // Helper to format phone for clean display (e.g. 0812-3456-7890)
        formatPhone: function(phone) {
            if (!phone) return '0811-7811-900';
            const clean = String(phone).replace(/\D/g, '');
            if (clean.length >= 10) {
                if (clean.startsWith('62')) {
                    return '0' + clean.slice(2, 5) + '-' + clean.slice(5, 9) + '-' + clean.slice(9);
                }
                return clean.slice(0, 4) + '-' + clean.slice(4, 8) + '-' + clean.slice(8);
            }
            return phone;
        },

        // Render Halaman Luar (Canvas 1) HTML Structure
        renderLuarHtml: function(mitra, idPrefix = 'luar') {
            const name = mitra.name || 'Mitra Kebaikan WIZ';
            const code = (mitra.code || mitra.id || 'WIZ').toUpperCase();
            const phone = this.formatPhone(mitra.phone);
            const referralUrl = `https://www.wizbangkabelitung.or.id/donasi?ref=${encodeURIComponent(code)}`;

            return `
            <div id="${idPrefix}-canvas-container" class="wiz-brochure-canvas relative w-full overflow-hidden select-none bg-slate-100" style="aspect-ratio: 2500 / 1768;">
                <!-- Master Background Image -->
                <img src="/images/brosur-master-luar.png" onerror="this.onerror=null; this.src='/assets/images/brosur-master-luar.png';" class="w-full h-full object-cover block pointer-events-none" alt="Brosur WIZ Luar">

                <!-- PANEL KIRI (Flap Luar - Dynamic Overlay Area) -->
                <div class="absolute top-0 left-0 w-[33.33%] h-full flex flex-col items-center pointer-events-none">
                    
                    <!-- 1. Teks Instruksi Google Lens (Di atas QR Code) -->
                    <div class="absolute top-[48.8%] left-[6%] w-[88%] text-center">
                        <p class="text-[clamp(9px,1.1vw,18px)] font-medium text-slate-800 leading-snug tracking-tight">
                            Scan menggunakan <strong class="font-black text-[#006834]">Google Lens</strong><br>atau Kamera HP Anda
                        </p>
                    </div>

                    <!-- 2. QR Code Box (Dinamis URL Referral) -->
                    <div class="absolute top-[54.5%] left-[22.5%] w-[55%] aspect-square bg-white p-[3%] rounded-2xl shadow-lg border-2 border-emerald-600/30 flex items-center justify-center pointer-events-auto">
                        <div id="${idPrefix}-qrcode-target" class="w-full h-full flex items-center justify-center [&>img]:w-full [&>img]:h-full [&>canvas]:w-full [&>canvas]:h-full"></div>
                    </div>

                    <!-- 3. Teks CTA di bawah QR Code -->
                    <div class="absolute top-[81.5%] left-[6%] w-[88%] text-center">
                        <p class="text-[clamp(10px,1.25vw,22px)] font-black text-[#006834] uppercase tracking-wide drop-shadow-xs">
                            "Satu Scan, Jutaan Kebaikan"
                        </p>
                    </div>

                    <!-- 4. Kontak Konfirmasi Donasi (Nomor WhatsApp & Nama Relawan) -->
                    <div class="absolute top-[88.2%] left-[10%] w-[80%] flex flex-col items-center justify-center text-center">
                        <div class="bg-white/95 backdrop-blur-xs px-3 py-1 rounded-xl border border-emerald-600/30 shadow-xs w-full max-w-[260px]">
                            <span class="text-[clamp(7px,0.75vw,12px)] font-bold text-slate-500 block uppercase tracking-wider">Konfirmasi / Info Donasi:</span>
                            <span class="text-[clamp(9px,1.15vw,19px)] font-black text-slate-900 font-mono tracking-tight block text-[#006834]">${phone}</span>
                            <span class="text-[clamp(7px,0.85vw,13px)] font-extrabold text-slate-700 block truncate" title="${name}">(${name})</span>
                        </div>
                    </div>

                </div>
            </div>`;
        },

        // Render Halaman Dalam (Canvas 2) HTML Structure
        renderDalamHtml: function(mitra, idPrefix = 'dalam') {
            const name = mitra.name || 'Mitra Kebaikan WIZ';
            const phone = this.formatPhone(mitra.phone);

            return `
            <div id="${idPrefix}-canvas-container" class="wiz-brochure-canvas relative w-full overflow-hidden select-none bg-slate-100" style="aspect-ratio: 2500 / 1768;">
                <!-- Master Background Image -->
                <img src="/images/brosur-master-dalam.png" onerror="this.onerror=null; this.src='/assets/images/brosur-master-dalam.png';" class="w-full h-full object-cover block pointer-events-none" alt="Brosur WIZ Dalam">

                <!-- PANEL TENGAH (Area Hubungi Kami / Layanan Jemput Donasi) -->
                <div class="absolute top-0 left-[33.33%] w-[33.33%] h-full flex flex-col items-center pointer-events-none">
                    
                    <!-- Dynamic WhatsApp Contact Overlay on Center Panel -->
                    <div class="absolute top-[87.5%] left-[8%] w-[84%] flex flex-col items-center justify-center text-center">
                        <div class="bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-emerald-600/30 shadow-xs w-full max-w-[260px]">
                            <span class="text-[clamp(7px,0.75vw,12px)] font-bold text-slate-500 block uppercase tracking-wider">Layanan Jemput &amp; Konsultasi:</span>
                            <span class="text-[clamp(9px,1.15vw,19px)] font-black text-[#006834] font-mono tracking-tight block">${phone}</span>
                            <span class="text-[clamp(7px,0.85vw,13px)] font-extrabold text-slate-700 block truncate" title="${name}">Mitra: ${name}</span>
                        </div>
                    </div>

                </div>
            </div>`;
        },

        // Inject QR Code into rendered target element
        injectQrCode: function(targetElId, text) {
            const target = document.getElementById(targetElId);
            if (!target) return;
            target.innerHTML = '';

            if (window.QRCode) {
                try {
                    new window.QRCode(target, {
                        text: text,
                        width: 320,
                        height: 320,
                        colorDark: "#005228",
                        colorLight: "#ffffff",
                        correctLevel: window.QRCode.CorrectLevel.H
                    });
                } catch(e) {
                    target.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(text)}&color=005228" class="w-full h-full object-contain" alt="QR Code">`;
                }
            } else {
                target.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(text)}&color=005228" class="w-full h-full object-contain" alt="QR Code">`;
            }
        },

        // Open Dialog Modal with Live Preview and Export Controls
        openModal: async function(mitraData) {
            const mitra = mitraData || {
                name: 'Mitra Kebaikan WIZ',
                code: 'WIZ-001',
                phone: '08117811900',
                cabang: 'Pangkalpinang'
            };

            await this.ensureLibraries();

            // Check or create modal container
            let modalEl = document.getElementById('wiz-brochure-modal');
            if (!modalEl) {
                modalEl = document.createElement('div');
                modalEl.id = 'wiz-brochure-modal';
                modalEl.className = 'fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto opacity-0 pointer-events-none transition-opacity duration-300';
                document.body.appendChild(modalEl);
            }

            const code = (mitra.code || mitra.id || 'WIZ').toUpperCase();
            const referralUrl = `https://www.wizbangkabelitung.or.id/donasi?ref=${encodeURIComponent(code)}`;

            modalEl.innerHTML = `
            <div class="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden transform scale-95 transition-transform duration-300">
                
                <!-- Modal Header -->
                <div class="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
                            <span class="material-symbols-outlined text-2xl text-emerald-700">menu_book</span>
                        </div>
                        <div>
                            <h3 class="text-base sm:text-lg font-black text-slate-900 leading-tight">Generator Brosur Digital Relawan (2 Halaman)</h3>
                            <p class="text-xs text-slate-500 mt-0.5">Brosur Tri-Fold Personal: <strong class="text-emerald-700">${mitra.name}</strong> (Kode: <span class="font-mono font-bold">${code}</span>)</p>
                        </div>
                    </div>
                    <button type="button" onclick="WizBrochure.closeModal()" class="w-9 h-9 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer" title="Tutup Modal">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <!-- Modal Sub-Header Tabs & Quick Actions -->
                <div class="px-5 py-2.5 sm:px-6 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                    <!-- Page Selector Tabs -->
                    <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                        <button type="button" id="tab-btn-luar" onclick="WizBrochure.switchTab('luar')" class="px-3.5 py-1.5 rounded-lg transition-all bg-emerald-700 text-white font-extrabold shadow-xs cursor-pointer">
                            📄 Halaman Luar (Depan &amp; QR)
                        </button>
                        <button type="button" id="tab-btn-dalam" onclick="WizBrochure.switchTab('dalam')" class="px-3.5 py-1.5 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-semibold cursor-pointer">
                            📖 Halaman Dalam (Program)
                        </button>
                    </div>

                    <!-- Download High-Res Action Button -->
                    <button type="button" id="btn-download-brochure" onclick="WizBrochure.executeDownload()" class="bg-[#006834] hover:bg-[#005228] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-md shadow-emerald-900/20 transition-all cursor-pointer active:scale-95">
                        <span class="material-symbols-outlined text-lg">download</span>
                        <span>Download 2 Halaman (PNG High-Res)</span>
                    </button>
                </div>

                <!-- Modal Body: Interactive Canvas Preview Container -->
                <div class="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/70 flex flex-col items-center justify-center">
                    
                    <!-- Notification Banner -->
                    <div class="w-full max-w-4xl mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-3">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-emerald-700 text-base shrink-0">verified</span>
                            <span>QR Code &amp; Kontak WhatsApp telah disematkan otomatis. Siap dicetak fisik atau dibagikan ke calon donatur.</span>
                        </div>
                        <span class="font-mono text-[11px] bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded font-bold shrink-0">2500 x 1768 px</span>
                    </div>

                    <!-- Canvas Preview Wrapper (Page 1: Luar) -->
                    <div id="preview-page-luar" class="w-full max-w-4xl rounded-2xl overflow-hidden shadow-xl border border-slate-300 bg-white">
                        ${this.renderLuarHtml(mitra, 'modal-luar')}
                    </div>

                    <!-- Canvas Preview Wrapper (Page 2: Dalam) -->
                    <div id="preview-page-dalam" class="w-full max-w-4xl rounded-2xl overflow-hidden shadow-xl border border-slate-300 bg-white hidden">
                        ${this.renderDalamHtml(mitra, 'modal-dalam')}
                    </div>

                </div>

                <!-- Modal Footer Info -->
                <div class="px-5 py-3 sm:px-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2 shrink-0">
                    <span class="flex items-center gap-1.5 font-medium">
                        <span class="material-symbols-outlined text-sm text-emerald-600">qr_code_2</span>
                        <span>Tautan Referral: <strong class="font-mono text-slate-800">${referralUrl}</strong></span>
                    </span>
                    <span class="text-slate-400">Wahdah Inspirasi Zakat Bangka Belitung</span>
                </div>

            </div>`;

            // Inject QR code into preview target
            this.injectQrCode('modal-luar-qrcode-target', referralUrl);

            // Store current active mitra for download handler
            this.activeMitra = mitra;

            // Show modal smoothly
            modalEl.classList.remove('pointer-events-none', 'opacity-0');
            modalEl.classList.add('opacity-100');
            const dialogBox = modalEl.firstElementChild;
            if (dialogBox) {
                dialogBox.classList.remove('scale-95');
                dialogBox.classList.add('scale-100');
            }
            document.body.style.overflow = 'hidden';
        },

        // Switch between Halaman Luar and Halaman Dalam in preview
        switchTab: function(tabName) {
            const pageLuar = document.getElementById('preview-page-luar');
            const pageDalam = document.getElementById('preview-page-dalam');
            const btnLuar = document.getElementById('tab-btn-luar');
            const btnDalam = document.getElementById('tab-btn-dalam');

            if (tabName === 'dalam') {
                if (pageLuar) pageLuar.classList.add('hidden');
                if (pageDalam) pageDalam.classList.remove('hidden');

                if (btnLuar) {
                    btnLuar.className = 'px-3.5 py-1.5 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-semibold cursor-pointer';
                }
                if (btnDalam) {
                    btnDalam.className = 'px-3.5 py-1.5 rounded-lg transition-all bg-emerald-700 text-white font-extrabold shadow-xs cursor-pointer';
                }
            } else {
                if (pageDalam) pageDalam.classList.add('hidden');
                if (pageLuar) pageLuar.classList.remove('hidden');

                if (btnDalam) {
                    btnDalam.className = 'px-3.5 py-1.5 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-semibold cursor-pointer';
                }
                if (btnLuar) {
                    btnLuar.className = 'px-3.5 py-1.5 rounded-lg transition-all bg-emerald-700 text-white font-extrabold shadow-xs cursor-pointer';
                }
            }
        },

        // Close Modal
        closeModal: function() {
            const modalEl = document.getElementById('wiz-brochure-modal');
            if (!modalEl) return;
            const dialogBox = modalEl.firstElementChild;
            if (dialogBox) {
                dialogBox.classList.remove('scale-100');
                dialogBox.classList.add('scale-95');
            }
            modalEl.classList.remove('opacity-100');
            modalEl.classList.add('opacity-0', 'pointer-events-none');
            document.body.style.overflow = '';
        },

        // Execute High-Resolution Capture and Download 2 PNG files
        executeDownload: async function() {
            if (!this.activeMitra) return;
            const mitra = this.activeMitra;
            const btn = document.getElementById('btn-download-brochure');
            const originalBtnHtml = btn ? btn.innerHTML : '';

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="material-symbols-outlined text-lg animate-spin">sync</span><span>Memproses Render High-Res (2 Halaman)...</span>`;
            }

            try {
                await this.ensureLibraries();

                // Create hidden render stage container at exact 2500 x 1768 px
                const stage = document.createElement('div');
                stage.id = 'wiz-offscreen-render-stage';
                stage.style.position = 'fixed';
                stage.style.left = '-99999px';
                stage.style.top = '0';
                stage.style.width = '2500px';
                stage.style.height = '1768px';
                stage.style.overflow = 'hidden';
                stage.style.zIndex = '-100';
                document.body.appendChild(stage);

                const cleanMitraName = (mitra.name || 'Mitra').replace(/[^a-zA-Z0-9_-]/g, '_');
                const code = (mitra.code || mitra.id || 'WIZ').toUpperCase();
                const referralUrl = `https://www.wizbangkabelitung.or.id/donasi?ref=${encodeURIComponent(code)}`;

                const downloadCanvasAsPng = (canvas, filename) => {
                    return new Promise((resolve) => {
                        const link = document.createElement('a');
                        link.download = filename;
                        link.href = canvas.toDataURL('image/png', 1.0);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        setTimeout(resolve, 600);
                    });
                };

                // ── 1. RENDER & DOWNLOAD HALAMAN LUAR ─────────────────────────────
                stage.innerHTML = this.renderLuarHtml(mitra, 'render-luar');
                this.injectQrCode('render-luar-qrcode-target', referralUrl);
                
                // Allow images and fonts to paint
                await new Promise(r => setTimeout(r, 400));

                const luarNode = document.getElementById('render-luar-canvas-container');
                const canvasLuar = await window.html2canvas(luarNode, {
                    scale: 1, // Render stage is already full 2500x1768
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: null,
                    logging: false,
                    width: 2500,
                    height: 1768
                });

                await downloadCanvasAsPng(canvasLuar, `WIZ_Brosur_Luar_${cleanMitraName}_${code}.png`);

                // ── 2. RENDER & DOWNLOAD HALAMAN DALAM ────────────────────────────
                stage.innerHTML = this.renderDalamHtml(mitra, 'render-dalam');
                await new Promise(r => setTimeout(r, 300));

                const dalamNode = document.getElementById('render-dalam-canvas-container');
                const canvasDalam = await window.html2canvas(dalamNode, {
                    scale: 1, // Render stage is already full 2500x1768
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: null,
                    logging: false,
                    width: 2500,
                    height: 1768
                });

                await downloadCanvasAsPng(canvasDalam, `WIZ_Brosur_Dalam_${cleanMitraName}_${code}.png`);

                // Clean up stage
                stage.remove();

                alert(`✅ Berhasil Mengunduh 2 Halaman Brosur!\n\n1. WIZ_Brosur_Luar_${cleanMitraName}_${code}.png\n2. WIZ_Brosur_Dalam_${cleanMitraName}_${code}.png\n\nResolusi: 2500 x 1768 px (High-Res Siap Cetak).`);

            } catch(err) {
                console.error('[Brochure Generator Error]', err);
                alert('⚠️ Terjadi kendala saat merender brosur: ' + err.message);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalBtnHtml;
                }
            }
        }
    };

    window.WizBrochure = WizBrochure;

})(window);
