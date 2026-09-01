/**
 * WIZ Bangka Belitung - 2-Page Dynamic Tri-Fold Brochure Generator
 * High-Resolution (2500x1768) PNG Capture with Calibrated Absolute Coordinates
 */

(function(window) {
    'use strict';

    const BASE_WIDTH = 2500;
    const BASE_HEIGHT = 1768;

    // Calibrated coordinates matching Canva A4 Tri-Fold Master Template (2500 x 1768 px)
    const DEFAULT_POSITIONS = {
        // Halaman Luar - QR Code box in white card (Left panel)
        qrTop: 68.8,
        qrLeft: 3.5,
        qrWidth: 12.0,
        // Halaman Luar - WhatsApp confirmation box in white card (Left panel)
        waTop: 85.2,
        waLeft: 16.8,
        waWidth: 11.8,
        // Halaman Dalam - Hubungi Kami contact box (Center panel)
        innerWaTop: 82.2,
        innerWaLeft: 39.5,
        innerWaWidth: 21.0
    };

    const WizBrochure = {
        pos: { ...DEFAULT_POSITIONS },

        initPositions: function() {
            try {
                const saved = localStorage.getItem('wiz_brochure_pos');
                if (saved) {
                    this.pos = { ...DEFAULT_POSITIONS, ...JSON.parse(saved) };
                }
            } catch(e) {
                this.pos = { ...DEFAULT_POSITIONS };
            }
        },

        savePositions: function(newPos) {
            this.pos = { ...this.pos, ...newPos };
            try {
                localStorage.setItem('wiz_brochure_pos', JSON.stringify(this.pos));
            } catch(e) {}
        },

        resetPositions: function() {
            this.pos = { ...DEFAULT_POSITIONS };
            try {
                localStorage.removeItem('wiz_brochure_pos');
            } catch(e) {}
        },

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

        // Render Halaman Luar (Canvas 1)
        renderLuarHtml: function(mitra, idPrefix = 'luar', customPos = null) {
            const pos = customPos || this.pos;
            const name = mitra.name || 'Mitra Kebaikan WIZ';
            const phone = this.formatPhone(mitra.phone);

            return `
            <div id="${idPrefix}-canvas-container" class="wiz-brochure-canvas relative w-full overflow-hidden select-none bg-slate-100" style="aspect-ratio: 2500 / 1768;">
                <!-- Master Background Image (2500 x 1768 px) -->
                <img src="/images/brosur-master-luar.png" onerror="this.onerror=null; this.src='/assets/images/brosur-master-luar.png';" class="w-full h-full object-cover block pointer-events-none" alt="Brosur WIZ Luar">

                <!-- ELEMEN 1: QR CODE SAJA (Tepat di dalam kotak QR placeholder bawaan template) -->
                <div id="${idPrefix}-qr-box" class="absolute flex items-center justify-center p-[0.4%] bg-white rounded-lg select-none" 
                     style="top: ${pos.qrTop}%; left: ${pos.qrLeft}%; width: ${pos.qrWidth}%; aspect-ratio: 1 / 1;">
                    <div id="${idPrefix}-qrcode-target" class="w-full h-full flex items-center justify-center [&>img]:w-full [&>img]:h-full [&>canvas]:w-full [&>canvas]:h-full"></div>
                </div>

                <!-- ELEMEN 2: NOMOR WA & NAMA MITRA (Tepat di dalam kotak Konfirmasi Donasi) -->
                <div id="${idPrefix}-wa-box" class="absolute flex flex-col items-center justify-center text-center select-none"
                     style="top: ${pos.waTop}%; left: ${pos.waLeft}%; width: ${pos.waWidth}%;">
                    <span class="font-mono font-black text-slate-900 text-[clamp(8px,1vw,16px)] tracking-tight block leading-tight">${phone}</span>
                    <span class="font-bold text-slate-600 text-[clamp(6px,0.72vw,11px)] truncate max-w-full block leading-tight mt-0.5" title="${name}">(${name})</span>
                </div>

            </div>`;
        },

        // Render Halaman Dalam (Canvas 2)
        renderDalamHtml: function(mitra, idPrefix = 'dalam', customPos = null) {
            const pos = customPos || this.pos;
            const name = mitra.name || 'Mitra Kebaikan WIZ';
            const phone = this.formatPhone(mitra.phone);

            return `
            <div id="${idPrefix}-canvas-container" class="wiz-brochure-canvas relative w-full overflow-hidden select-none bg-slate-100" style="aspect-ratio: 2500 / 1768;">
                <!-- Master Background Image (2500 x 1768 px) -->
                <img src="/images/brosur-master-dalam.png" onerror="this.onerror=null; this.src='/assets/images/brosur-master-dalam.png';" class="w-full h-full object-cover block pointer-events-none" alt="Brosur WIZ Dalam">

                <!-- ELEMEN KONTAK PADA PANEL TENGAH (Area Hubungi Kami) -->
                <div id="${idPrefix}-inner-wa-box" class="absolute text-center select-none flex flex-col items-center justify-center"
                     style="top: ${pos.innerWaTop}%; left: ${pos.innerWaLeft}%; width: ${pos.innerWaWidth}%;">
                    <div class="bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-emerald-600/30 shadow-xs w-full max-w-[240px]">
                        <span class="text-[clamp(6px,0.7vw,11px)] font-bold text-slate-500 block uppercase tracking-wider">Layanan Jemput &amp; Konsultasi:</span>
                        <span class="text-[clamp(8px,1.05vw,16px)] font-black text-[#006834] font-mono tracking-tight block">${phone}</span>
                        <span class="text-[clamp(6px,0.75vw,12px)] font-extrabold text-slate-700 block truncate" title="${name}">Mitra: ${name}</span>
                    </div>
                </div>

            </div>`;
        },

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

        openModal: async function(mitraData) {
            this.initPositions();

            const mitra = mitraData || {
                name: 'Mitra Kebaikan WIZ',
                code: 'WIZ-001',
                phone: '08117811900',
                cabang: 'Pangkalpinang'
            };

            await this.ensureLibraries();

            let modalEl = document.getElementById('wiz-brochure-modal');
            if (!modalEl) {
                modalEl = document.createElement('div');
                modalEl.id = 'wiz-brochure-modal';
                modalEl.className = 'fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 md:p-6 overflow-y-auto opacity-0 pointer-events-none transition-opacity duration-300';
                modalEl.onclick = (e) => {
                    if (e.target === modalEl) WizBrochure.closeModal();
                };
                document.body.appendChild(modalEl);
            }

            const code = (mitra.code || mitra.id || 'WIZ').toUpperCase();
            const referralUrl = `https://www.wizbangkabelitung.or.id/donasi?ref=${encodeURIComponent(code)}`;

            modalEl.innerHTML = `
            <div class="my-auto bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden transform scale-95 transition-transform duration-300">
                
                <!-- Modal Header -->
                <div class="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
                            <span class="material-symbols-outlined text-xl sm:text-2xl text-emerald-700">menu_book</span>
                        </div>
                        <div>
                            <h3 class="text-sm sm:text-base md:text-lg font-black text-slate-900 leading-tight">Generator Brosur Digital Relawan (2 Halaman)</h3>
                            <p class="text-[11px] sm:text-xs text-slate-500 mt-0.5">Brosur Tri-Fold Personal: <strong class="text-emerald-700">${mitra.name}</strong> (Kode: <span class="font-mono font-bold">${code}</span>)</p>
                        </div>
                    </div>
                    <button type="button" onclick="WizBrochure.closeModal()" class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer" title="Tutup Modal">
                        <span class="material-symbols-outlined text-lg sm:text-xl">close</span>
                    </button>
                </div>

                <!-- Modal Sub-Header Tabs & Quick Actions -->
                <div class="px-3 py-2 sm:px-6 sm:py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <!-- Page Selector Tabs -->
                    <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                        <button type="button" id="tab-btn-luar" onclick="WizBrochure.switchTab('luar')" class="px-3 py-1.5 rounded-lg transition-all bg-emerald-700 text-white font-extrabold shadow-xs cursor-pointer">
                            📄 Halaman Luar (Depan &amp; QR)
                        </button>
                        <button type="button" id="tab-btn-dalam" onclick="WizBrochure.switchTab('dalam')" class="px-3 py-1.5 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-semibold cursor-pointer">
                            📖 Halaman Dalam (Program)
                        </button>
                    </div>

                    <!-- Right Controls: Toggle Calibration & Download Action -->
                    <div class="flex items-center gap-2">
                        <!-- Toggle Calibration Sliders Button -->
                        <button type="button" onclick="WizBrochure.toggleCalibrationPanel()" class="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-300 transition-all cursor-pointer" title="Kalibrasi Posisi QR &amp; WA">
                            <span class="material-symbols-outlined text-sm sm:text-base text-emerald-700">tune</span>
                            <span class="hidden sm:inline">Kalibrasi Posisi</span>
                        </button>

                        <!-- Download High-Res Action Button -->
                        <button type="button" id="btn-download-brochure" onclick="WizBrochure.executeDownload()" class="bg-[#006834] hover:bg-[#005228] text-white px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-900/20 transition-all cursor-pointer active:scale-95">
                            <span class="material-symbols-outlined text-base sm:text-lg">download</span>
                            <span>Download (PNG High-Res)</span>
                        </button>
                    </div>
                </div>

                <!-- Collapsible Real-Time Slider Tuning Panel -->
                <div id="wiz-calibration-panel" class="hidden px-4 py-3 sm:px-6 bg-slate-900 text-white border-b border-slate-800 shrink-0 transition-all">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-amber-400 text-sm">tune</span>
                            <span class="text-xs font-bold text-amber-400 uppercase tracking-wider">Live Position Sliders (Tuning Real-Time)</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="WizBrochure.handleResetDefaults()" class="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer">
                                Reset Default
                            </button>
                            <button type="button" onclick="WizBrochure.handleSaveCustomPos()" class="text-[11px] px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer">
                                Simpan Posisi
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                        <div class="bg-slate-800/80 p-2 rounded-lg border border-slate-700 space-y-1">
                            <div class="flex justify-between font-mono text-[11px]">
                                <span class="text-slate-300 font-bold">QR Top (%)</span>
                                <span id="val-qr-top" class="text-emerald-400 font-bold">${this.pos.qrTop}%</span>
                            </div>
                            <input type="range" id="slider-qr-top" min="50" max="90" step="0.2" value="${this.pos.qrTop}" 
                                   oninput="WizBrochure.updateLivePos('qrTop', this.value)" class="w-full accent-emerald-500 cursor-pointer">
                        </div>

                        <div class="bg-slate-800/80 p-2 rounded-lg border border-slate-700 space-y-1">
                            <div class="flex justify-between font-mono text-[11px]">
                                <span class="text-slate-300 font-bold">QR Left (%)</span>
                                <span id="val-qr-left" class="text-emerald-400 font-bold">${this.pos.qrLeft}%</span>
                            </div>
                            <input type="range" id="slider-qr-left" min="0" max="25" step="0.2" value="${this.pos.qrLeft}" 
                                   oninput="WizBrochure.updateLivePos('qrLeft', this.value)" class="w-full accent-emerald-500 cursor-pointer">
                        </div>

                        <div class="bg-slate-800/80 p-2 rounded-lg border border-slate-700 space-y-1">
                            <div class="flex justify-between font-mono text-[11px]">
                                <span class="text-slate-300 font-bold">WA Top (%)</span>
                                <span id="val-wa-top" class="text-emerald-400 font-bold">${this.pos.waTop}%</span>
                            </div>
                            <input type="range" id="slider-wa-top" min="65" max="98" step="0.2" value="${this.pos.waTop}" 
                                   oninput="WizBrochure.updateLivePos('waTop', this.value)" class="w-full accent-emerald-500 cursor-pointer">
                        </div>

                        <div class="bg-slate-800/80 p-2 rounded-lg border border-slate-700 space-y-1">
                            <div class="flex justify-between font-mono text-[11px]">
                                <span class="text-slate-300 font-bold">WA Left (%)</span>
                                <span id="val-wa-left" class="text-emerald-400 font-bold">${this.pos.waLeft}%</span>
                            </div>
                            <input type="range" id="slider-wa-left" min="5" max="35" step="0.2" value="${this.pos.waLeft}" 
                                   oninput="WizBrochure.updateLivePos('waLeft', this.value)" class="w-full accent-emerald-500 cursor-pointer">
                        </div>
                    </div>
                </div>

                <!-- Modal Body: Scrollable Canvas Preview Container -->
                <div class="p-3 sm:p-5 overflow-y-auto flex-1 bg-slate-100/70 flex flex-col items-center justify-start min-h-[300px]">
                    
                    <!-- Canvas Preview Wrapper (Page 1: Luar) -->
                    <div id="preview-page-luar" class="w-full max-w-4xl rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-slate-300 bg-white">
                        ${this.renderLuarHtml(mitra, 'modal-luar')}
                    </div>

                    <!-- Canvas Preview Wrapper (Page 2: Dalam) -->
                    <div id="preview-page-dalam" class="w-full max-w-4xl rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-slate-300 bg-white hidden">
                        ${this.renderDalamHtml(mitra, 'modal-dalam')}
                    </div>

                </div>

                <!-- Modal Footer Info -->
                <div class="px-4 py-2.5 sm:px-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2 shrink-0">
                    <span class="flex items-center gap-1 font-medium">
                        <span class="material-symbols-outlined text-sm text-emerald-600">qr_code_2</span>
                        <span class="truncate max-w-[280px] sm:max-w-md">Ref: <strong class="font-mono text-slate-800">${referralUrl}</strong></span>
                    </span>
                    <button type="button" onclick="WizBrochure.closeModal()" class="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-xs cursor-pointer">
                        Tutup
                    </button>
                </div>

            </div>`;

            // Inject QR code into preview target
            this.injectQrCode('modal-luar-qrcode-target', referralUrl);

            this.activeMitra = mitra;

            // Show modal
            modalEl.classList.remove('pointer-events-none', 'opacity-0');
            modalEl.classList.add('opacity-100');
            const dialogBox = modalEl.firstElementChild;
            if (dialogBox) {
                dialogBox.classList.remove('scale-95');
                dialogBox.classList.add('scale-100');
            }
        },

        toggleCalibrationPanel: function() {
            const panel = document.getElementById('wiz-calibration-panel');
            if (panel) {
                panel.classList.toggle('hidden');
            }
        },

        updateLivePos: function(prop, val) {
            const numVal = parseFloat(val);
            this.pos[prop] = numVal;

            const labelMap = {
                qrTop: 'val-qr-top',
                qrLeft: 'val-qr-left',
                waTop: 'val-wa-top',
                waLeft: 'val-wa-left'
            };
            const labelEl = document.getElementById(labelMap[prop]);
            if (labelEl) labelEl.textContent = `${numVal.toFixed(1)}%`;

            const qrBox = document.getElementById('modal-luar-qr-box');
            const waBox = document.getElementById('modal-luar-wa-box');

            if (prop === 'qrTop' && qrBox) qrBox.style.top = `${numVal}%`;
            if (prop === 'qrLeft' && qrBox) qrBox.style.left = `${numVal}%`;
            if (prop === 'waTop' && waBox) waBox.style.top = `${numVal}%`;
            if (prop === 'waLeft' && waBox) waBox.style.left = `${numVal}%`;
        },

        handleSaveCustomPos: function() {
            this.savePositions(this.pos);
            alert(`✅ Posisi Berhasil Disimpan!\n\n• QR Top: ${this.pos.qrTop}%\n• QR Left: ${this.pos.qrLeft}%\n• WA Top: ${this.pos.waTop}%\n• WA Left: ${this.pos.waLeft}%\n\nPengaturan ini akan otomatis digunakan saat mengekspor gambar resolusi tinggi.`);
        },

        handleResetDefaults: function() {
            this.resetPositions();
            ['qrTop', 'qrLeft', 'waTop', 'waLeft'].forEach(p => {
                const slider = document.getElementById(`slider-${p.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`);
                if (slider) slider.value = this.pos[p];
                this.updateLivePos(p, this.pos[p]);
            });
            alert('🔄 Posisi telah dipulihkan ke nilai default.');
        },

        switchTab: function(tabName) {
            const pageLuar = document.getElementById('preview-page-luar');
            const pageDalam = document.getElementById('preview-page-dalam');
            const btnLuar = document.getElementById('tab-btn-luar');
            const btnDalam = document.getElementById('tab-btn-dalam');

            if (tabName === 'dalam') {
                if (pageLuar) pageLuar.classList.add('hidden');
                if (pageDalam) pageDalam.classList.remove('hidden');

                if (btnLuar) {
                    btnLuar.className = 'px-3 py-1.5 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-semibold cursor-pointer';
                }
                if (btnDalam) {
                    btnDalam.className = 'px-3 py-1.5 rounded-lg transition-all bg-emerald-700 text-white font-extrabold shadow-xs cursor-pointer';
                }
            } else {
                if (pageDalam) pageDalam.classList.add('hidden');
                if (pageLuar) pageLuar.classList.remove('hidden');

                if (btnDalam) {
                    btnDalam.className = 'px-3 py-1.5 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-semibold cursor-pointer';
                }
                if (btnLuar) {
                    btnLuar.className = 'px-3 py-1.5 rounded-lg transition-all bg-emerald-700 text-white font-extrabold shadow-xs cursor-pointer';
                }
            }
        },

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
        },

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

                // 1. RENDER & DOWNLOAD HALAMAN LUAR
                stage.innerHTML = this.renderLuarHtml(mitra, 'render-luar', this.pos);
                this.injectQrCode('render-luar-qrcode-target', referralUrl);
                
                await new Promise(r => setTimeout(r, 450));

                const luarNode = document.getElementById('render-luar-canvas-container');
                const canvasLuar = await window.html2canvas(luarNode, {
                    scale: 1,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: null,
                    logging: false,
                    width: 2500,
                    height: 1768
                });

                await downloadCanvasAsPng(canvasLuar, `WIZ_Brosur_Luar_${cleanMitraName}_${code}.png`);

                // 2. RENDER & DOWNLOAD HALAMAN DALAM
                stage.innerHTML = this.renderDalamHtml(mitra, 'render-dalam', this.pos);
                await new Promise(r => setTimeout(r, 350));

                const dalamNode = document.getElementById('render-dalam-canvas-container');
                const canvasDalam = await window.html2canvas(dalamNode, {
                    scale: 1,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: null,
                    logging: false,
                    width: 2500,
                    height: 1768
                });

                await downloadCanvasAsPng(canvasDalam, `WIZ_Brosur_Dalam_${cleanMitraName}_${code}.png`);

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
