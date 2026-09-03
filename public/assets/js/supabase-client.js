/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Supabase Client — Full CRUD REST API Helper
 * ============================================================
 *
 * Set your Supabase credentials below.
 * All CRUD operations go through REST API (no JS SDK needed).
 * Falls back gracefully when not configured.
 * ============================================================
 */

const SUPABASE_CONFIG = {
    url: 'https://kmpwdqremvltgglmoxgx.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttcHdkcXJlbXZsdGdnbG1veGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMjEyMTksImV4cCI6MjEwMzU5NzIxOX0.MhNqr36yvqRAgiVsLil608P-DyYBLJ6WBWxXMbfvbH8'
};

(function () {
    'use strict';

    function isConfigured() {
        return SUPABASE_CONFIG.url &&
            SUPABASE_CONFIG.anonKey &&
            !SUPABASE_CONFIG.url.includes('YOUR_SUPABASE') &&
            (SUPABASE_CONFIG.anonKey.startsWith('eyJ') || SUPABASE_CONFIG.anonKey.startsWith('sb_publishable_'));
    }

    function generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function endpoint(table) {
        return `${SUPABASE_CONFIG.url.replace(/\/$/, '')}/rest/v1/${table}`;
    }

    function headers(extra) {
        return {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            ...extra
        };
    }

    // ─── SELECT ──────────────────────────────────────────
    async function select(table, options = {}) {
        if (!isConfigured()) return { data: null, error: 'Not configured' };

        let url = endpoint(table);
        const params = [];

        if (options.select) {
            params.push(`select=${options.select}`);
        } else if (table === 'news') {
            params.push('select=id,title,category,content,image_url,gallery,event_date,status,author,created_at,updated_at');
        }
        if (options.filter) params.push(options.filter);      // e.g. 'status=eq.published'
        if (options.order) params.push(`order=${options.order}`); // e.g. 'created_at.desc'
        if (options.limit) params.push(`limit=${options.limit}`);
        if (options.offset) params.push(`offset=${options.offset}`);

        if (params.length > 0) url += '?' + params.join('&');

        try {
            const fetchOpts = {
                method: 'GET',
                headers: headers({ 'Accept': 'application/json' }),
                cache: 'no-store'
            };
            if (options.signal) fetchOpts.signal = options.signal;
            const res = await fetch(url, fetchOpts);
            if (!res.ok) {
                const err = await res.text();
                return { data: null, error: err };
            }
            const data = await res.json();
            return { data, error: null };
        } catch (e) {
            return { data: null, error: e.message };
        }
    }

    // ─── INSERT ──────────────────────────────────────────
    async function insert(table, payload) {
        if (!isConfigured()) return { data: null, error: 'Not configured' };

        try {
            const res = await fetch(endpoint(table), {
                method: 'POST',
                headers: headers({ 'Prefer': 'return=representation' }),
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.text();
                return { data: null, error: err };
            }
            const data = await res.json();
            return { data: Array.isArray(data) ? data[0] : data, error: null };
        } catch (e) {
            return { data: null, error: e.message };
        }
    }

    // ─── UPDATE ──────────────────────────────────────────
    async function update(table, id, payload) {
        if (!isConfigured()) return { data: null, error: 'Not configured' };

        try {
            const res = await fetch(`${endpoint(table)}?id=eq.${id}`, {
                method: 'PATCH',
                headers: headers({ 'Prefer': 'return=representation' }),
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.text();
                return { data: null, error: err };
            }
            const data = await res.json();
            return { data: Array.isArray(data) ? data[0] : data, error: null };
        } catch (e) {
            return { data: null, error: e.message };
        }
    }

    // ─── DELETE ──────────────────────────────────────────
    async function remove(table, id) {
        if (!isConfigured()) return { data: null, error: 'Not configured' };

        try {
            const res = await fetch(`${endpoint(table)}?id=eq.${id}`, {
                method: 'DELETE',
                headers: headers({ 'Prefer': 'return=minimal' })
            });
            if (!res.ok) {
                const err = await res.text();
                return { error: err };
            }
            return { error: null };
        } catch (e) {
            return { error: e.message };
        }
    }

    // ─── UPSERT ──────────────────────────────────────────
    async function upsert(table, payload) {
        if (!isConfigured()) return { data: null, error: 'Not configured' };

        try {
            const res = await fetch(endpoint(table), {
                method: 'POST',
                headers: headers({ 'Prefer': 'resolution=merge-duplicates,return=representation' }),
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.text();
                return { data: null, error: err };
            }
            const data = await res.json();
            return { data: Array.isArray(data) ? data[0] : data, error: null };
        } catch (e) {
            return { data: null, error: e.message };
        }
    }

    // ─── RPC (Remote Procedure Call) ─────────────────────
    async function rpc(functionName, params = {}) {
        if (!isConfigured()) return { data: null, error: 'Not configured' };

        try {
            const url = `${SUPABASE_CONFIG.url.replace(/\/$/, '')}/rest/v1/rpc/${functionName}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify(params)
            });
            if (!res.ok) {
                const err = await res.text();
                return { data: null, error: err };
            }
            const data = await res.json();
            return { data: data, error: null };
        } catch (e) {
            return { data: null, error: e.message };
        }
    }

    // ─── Public API ──────────────────────────────────────
    window.wizSupabase = {
        isConfigured,
        select,
        insert,
        update,
        upsert,
        remove,
        rpc,
        delete: remove,

        getBranchFinancialLimit: async (wilayah = 'Pangkalpinang', checkDate = null) => {
            return await rpc('get_branch_financial_limit', {
                p_wilayah: wilayah,
                p_check_date: checkDate || new Date().toISOString()
            });
        },

        // Helpers for entities
        saveDonation: async (data) => {
            if (!data) return { data: null, error: 'No data' };
            
            const rawProg = data.program_spesifik || data.programSpesifik || data.program || data.program_title || data.programUtama || data.type || 'Infak Umum';
            const progUtama = data.program_utama || data.programUtama || data.category || '-';

            const extraMeta = [];
            if (data.wilayah && data.wilayah !== '-') extraMeta.push(`Wilayah: ${data.wilayah}`);
            if (progUtama && progUtama !== '-') extraMeta.push(`Kategori: ${progUtama}`);
            if (rawProg && rawProg !== '-') extraMeta.push(`Program: ${rawProg}`);
            if (data.referral_id || data.referralId || data.referral_code || data.referralCode) {
                const refCode = data.referral_code || data.referralCode || data.referral_id || data.referralId;
                const refRate = data.referral_rate !== undefined ? data.referral_rate : (data.referralRate !== undefined ? data.referralRate : 6);
                const refFee = data.referral_fee !== undefined ? data.referral_fee : (data.referralFee !== undefined ? data.referralFee : 0);
                const addBonus = Number(data.additional_bonus || data.additionalBonus || 0);
                extraMeta.push(`Mitra: ${refCode} (${refRate}% - Rp ${refFee}${addBonus > 0 ? ' + Bonus Rp ' + addBonus : ''})`);
            }
            if (data.isRecurringDonor || data.is_recurring_donor) extraMeta.push('Donatur Tetap Mitra');

            const baseNotes = String(data.notes || '').replace(/\[Meta:[^\]]*\]/g, '').trim();
            const metaTag = extraMeta.length > 0 ? ` [Meta: ${extraMeta.join(' | ')}]` : '';
            const finalNotes = baseNotes ? (baseNotes === '-' ? metaTag.trim() : `${baseNotes}${metaTag}`) : (metaTag.trim() || '-');

            const donationType = data.donation_type || data.type || 'Infak Terikat';
            const payMethod = data.payment_method || data.method || 'Transfer Bank';
            const statusVal = data.status || 'pending';
            const verifiedAtVal = data.verified_at || data.verifiedAt || (statusVal === 'verified' ? new Date().toISOString() : null);
            const verifiedByVal = data.verified_by || data.verifiedBy || (statusVal === 'verified' ? 'Admin' : null);

            const tanggalTransaksiVal = data.tanggal_transaksi || data.tanggalTransaksi || data.created_at || data.createdAt || new Date().toISOString();

            const payload = {
                id: String(data.id || generateUUID()),
                donor_name: String(data.donor_name || data.donorName || 'Hamba Allah'),
                donor_phone: String(data.donor_phone || data.donorPhone || '-'),
                donor_email: String(data.donor_email || data.donorEmail || ''),
                wilayah: String(data.wilayah || 'Pangkalpinang'),
                donation_type: String(donationType),
                program_utama: String(progUtama),
                program_spesifik: String(rawProg),
                program: String(rawProg),
                category: String(progUtama),
                amount: Number(data.amount) || 0,
                alokasi_operasional: Number(data.alokasi_operasional !== undefined ? data.alokasi_operasional : (data.alokasiOperasional || 0)),
                alokasi_program: Number(data.alokasi_program !== undefined ? data.alokasi_program : (data.alokasiProgram || 0)),
                payment_method: String(payMethod),
                referral_id: data.referralId || data.referral_id || null,
                referral_code: data.referralCode || data.referral_code || data.referralId || data.referral_id || null,
                referral_name: data.referralName || data.referral_name || null,
                referral_fee: data.referralFee !== undefined ? Number(data.referralFee) : (data.referral_fee !== undefined ? Number(data.referral_fee) : 0),
                notes: finalNotes,
                status: String(statusVal),
                tanggal_transaksi: tanggalTransaksiVal,
                verified_at: verifiedAtVal,
                verified_by: verifiedByVal,
                created_at: tanggalTransaksiVal || data.created_at || data.createdAt || new Date().toISOString()
            };
            let res = await upsert('donations', payload);
            if (res.error && (String(res.error).includes('tanggal_transaksi') || (res.error.message && String(res.error.message).includes('tanggal_transaksi')))) {
                delete payload.tanggal_transaksi;
                res = await upsert('donations', payload);
            }
            return res;
        },
        getAllDonations: async () => {
            let res = await select('donations', {
                order: 'tanggal_transaksi.desc.nullslast,created_at.desc'
            });
            if (res.error && (String(res.error).includes('does not exist') || (res.error.message && String(res.error.message).includes('does not exist')))) {
                res = await select('donations', { order: 'created_at.desc' });
            }
            return res;
        },
        getRecentVerifiedDonations: async (limit = 10) => {
            let res = await select('donations', {
                filter: 'status=eq.verified',
                order: 'tanggal_transaksi.desc.nullslast,created_at.desc',
                limit: limit
            });
            if (res.error && (String(res.error).includes('does not exist') || (res.error.message && String(res.error.message).includes('does not exist')))) {
                res = await select('donations', {
                    filter: 'status=eq.verified',
                    order: 'created_at.desc',
                    limit: limit
                });
            }
            if (res.error || !Array.isArray(res.data)) return res;
            const mapped = res.data.map(d => ({
                id: d.id,
                donorName: d.donor_name || 'Hamba Allah',
                donorPhone: d.donor_phone,
                wilayah: d.wilayah || 'Pangkalpinang',
                type: d.donation_type,
                program: d.program_title || d.program || 'Infak Umum',
                programSpesifik: d.program_spesifik || d.program_title,
                amount: Number(d.amount) || 0,
                method: d.payment_method,
                status: 'verified',
                tanggalTransaksi: d.tanggal_transaksi || d.created_at,
                tanggal_transaksi: d.tanggal_transaksi || d.created_at,
                createdAt: d.created_at
            }));
            return { data: mapped, error: null };
        },
        saveReferral: async (data) => {
            if (!data) return { data: null, error: 'No data' };
            const rawNotes = data.notes || '';
            const pinPart = data.pin ? ` [PIN:${data.pin}]` : '';
            const notesWithPin = rawNotes.includes('[PIN:') ? rawNotes : (rawNotes + pinPart);

            const mapped = {
                id: String(data.id || data.code),
                code: String(data.code || data.id),
                name: String(data.name || 'Affiliator'),
                phone: String(data.phone || '-'),
                bank_name: String(data.bank_name || data.bankName || '-'),
                account_number: String(data.account_number || data.accountNumber || '-'),
                account_holder: String(data.account_holder || data.accountHolder || data.name || '-'),
                default_rate: Number(data.default_rate !== undefined ? data.default_rate : (data.defaultRate !== undefined ? data.defaultRate : 6)),
                status: String(data.status || 'active'),
                notes: notesWithPin,
                created_at: data.created_at || data.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            return await upsert('referrals', mapped);
        },
        getReferrals: async () => {
            const res = await select('referrals');
            if (res.error || !Array.isArray(res.data)) return res;
            const mappedList = res.data.map(r => {
                let pinVal = '1234';
                if (r.notes && r.notes.includes('[PIN:')) {
                    const m = r.notes.match(/\[PIN:([^\]]+)\]/);
                    if (m) pinVal = m[1];
                } else if (r.phone) {
                    pinVal = r.phone.replace(/\D/g, '').slice(-4) || '1234';
                }
                return {
                    id: r.id,
                    code: r.code || r.id,
                    name: r.name,
                    phone: r.phone,
                    bankName: r.bank_name,
                    accountNumber: r.account_number,
                    accountHolder: r.account_holder,
                    defaultRate: Number(r.default_rate) || 6,
                    status: r.status || 'active',
                    notes: r.notes ? r.notes.replace(/\s*\[PIN:[^\]]+\]/, '').trim() : '',
                    pin: pinVal,
                    createdAt: r.created_at,
                    updatedAt: r.updated_at
                };
            });
            return { data: mappedList, error: null };
        },
        saveKpiMitra: async (data) => {
            if (!data || (!data.mitra_id && !data.mitraId) || (!data.periode_bulan && !data.periodeBulan)) {
                return { data: null, error: 'Mitra ID dan Periode Bulan wajib diisi' };
            }
            const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
            const mId = String(data.mitra_id || data.mitraId).trim();
            const pMonth = String(data.periode_bulan || data.periodeBulan).trim();

            const payload = {
                id: (data.id && isUUID(data.id)) ? data.id : generateUUID(),
                mitra_id: mId,
                mitraId: mId,
                periode_bulan: pMonth,
                periodeBulan: pMonth,
                qty_rapat: Number(data.qty_rapat !== undefined ? data.qty_rapat : (data.qtyRapat || 0)),
                qtyRapat: Number(data.qty_rapat !== undefined ? data.qty_rapat : (data.qtyRapat || 0)),
                qty_admin: Number(data.qty_admin !== undefined ? data.qty_admin : (data.qtyAdmin || 0)),
                qtyAdmin: Number(data.qty_admin !== undefined ? data.qty_admin : (data.qtyAdmin || 0)),
                qty_desain: Number(data.qty_desain !== undefined ? data.qty_desain : (data.qtyDesain || 0)),
                qtyDesain: Number(data.qty_desain !== undefined ? data.qty_desain : (data.qtyDesain || 0)),
                qty_video: Number(data.qty_video !== undefined ? data.qty_video : (data.qtyVideo || 0)),
                qtyVideo: Number(data.qty_video !== undefined ? data.qty_video : (data.qtyVideo || 0)),
                qty_lapangan: Number(data.qty_lapangan !== undefined ? data.qty_lapangan : (data.qtyLapangan || 0)),
                qtyLapangan: Number(data.qty_lapangan !== undefined ? data.qty_lapangan : (data.qtyLapangan || 0)),
                keterangan_lainnya: data.keterangan_lainnya !== undefined ? (data.keterangan_lainnya || '') : (data.keteranganLainnya || ''),
                keteranganLainnya: data.keterangan_lainnya !== undefined ? (data.keterangan_lainnya || '') : (data.keteranganLainnya || ''),
                poin_lainnya: Number(data.poin_lainnya !== undefined ? data.poin_lainnya : (data.poinLainnya || 0)),
                poinLainnya: Number(data.poin_lainnya !== undefined ? data.poin_lainnya : (data.poinLainnya || 0)),
                total_poin: Number(data.total_poin !== undefined ? data.total_poin : (data.totalPoin || 0)),
                totalPoin: Number(data.total_poin !== undefined ? data.total_poin : (data.totalPoin || 0)),
                created_at: data.created_at || data.createdAt || new Date().toISOString(),
                createdAt: data.created_at || data.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            let tableRes = null;
            try {
                const dbPayload = {
                    id: payload.id,
                    mitra_id: payload.mitra_id,
                    periode_bulan: payload.periode_bulan,
                    qty_rapat: payload.qty_rapat,
                    qty_admin: payload.qty_admin,
                    qty_desain: payload.qty_desain,
                    qty_video: payload.qty_video,
                    qty_lapangan: payload.qty_lapangan,
                    keterangan_lainnya: payload.keterangan_lainnya,
                    poin_lainnya: payload.poin_lainnya,
                    total_poin: payload.total_poin,
                    updated_at: payload.updated_at
                };
                tableRes = await upsert('kpi_mitra', dbPayload, 'mitra_id,periode_bulan');
            } catch(e) {
                console.warn('[saveKpiMitra table upsert exception]', e);
            }

            // Persistence Guarantee: Always sync into Supabase site_settings (key: 'kpi_mitra' and master_bundle)
            try {
                const ssRes = await select('site_settings', { filter: 'key=in.(kpi_mitra,master_bundle)' });
                let existingList = [];
                let mbDoc = null;
                if (ssRes && Array.isArray(ssRes.data)) {
                    const kpiDoc = ssRes.data.find(d => d.key === 'kpi_mitra');
                    mbDoc = ssRes.data.find(d => d.key === 'master_bundle');
                    if (kpiDoc && Array.isArray(kpiDoc.value)) {
                        existingList = kpiDoc.value;
                    } else if (mbDoc && mbDoc.value && Array.isArray(mbDoc.value.kpi_mitra)) {
                        existingList = mbDoc.value.kpi_mitra;
                    }
                }

                const cleanMid = payload.mitra_id.toLowerCase();
                const idx = existingList.findIndex(k => 
                    String(k.mitra_id || k.mitraId).toLowerCase() === cleanMid &&
                    String(k.periode_bulan || k.periodeBulan) === payload.periode_bulan
                );

                if (idx !== -1) {
                    existingList[idx] = { ...existingList[idx], ...payload };
                } else {
                    existingList.push(payload);
                }

                await upsert('site_settings', {
                    key: 'kpi_mitra',
                    value: existingList,
                    updated_at: new Date().toISOString()
                });

                if (mbDoc && mbDoc.value && typeof mbDoc.value === 'object') {
                    mbDoc.value.kpi_mitra = existingList;
                    await upsert('site_settings', {
                        key: 'master_bundle',
                        value: mbDoc.value,
                        updated_at: new Date().toISOString()
                    });
                }
            } catch(errSs) {
                console.warn('[saveKpiMitra site_settings sync exception]', errSs);
            }

            if (tableRes && tableRes.data) {
                return { data: { ...payload, ...tableRes.data }, error: null };
            }
            return { data: payload, error: null };
        },
        getKpiMitra: async (periodeBulan = null) => {
            let list = null;
            try {
                const opts = { order: 'created_at.desc' };
                if (periodeBulan && periodeBulan !== 'Semua') {
                    opts.filter = `periode_bulan=eq.${periodeBulan}`;
                }
                const res = await select('kpi_mitra', opts);
                if (res && !res.error && Array.isArray(res.data) && res.data.length > 0) {
                    list = res.data;
                }
            } catch(e) {}

            if (!list || list.length === 0) {
                try {
                    const ssRes = await select('site_settings', { filter: 'key=in.(kpi_mitra,master_bundle)' });
                    if (ssRes && Array.isArray(ssRes.data)) {
                        const kpiDoc = ssRes.data.find(d => d.key === 'kpi_mitra');
                        const mbDoc = ssRes.data.find(d => d.key === 'master_bundle');
                        if (kpiDoc && Array.isArray(kpiDoc.value)) {
                            list = kpiDoc.value;
                        } else if (mbDoc && mbDoc.value && Array.isArray(mbDoc.value.kpi_mitra)) {
                            list = mbDoc.value.kpi_mitra;
                        }
                    }
                } catch(e) {}
            }

            if (!list) list = [];

            if (periodeBulan && periodeBulan !== 'Semua') {
                list = list.filter(k => String(k.periode_bulan || k.periodeBulan) === String(periodeBulan));
            }

            const mapped = list.map(k => ({
                id: k.id,
                mitraId: k.mitra_id || k.mitraId,
                mitra_id: k.mitra_id || k.mitraId,
                periodeBulan: k.periode_bulan || k.periodeBulan,
                periode_bulan: k.periode_bulan || k.periodeBulan,
                qtyRapat: Number(k.qty_rapat !== undefined ? k.qty_rapat : (k.qtyRapat || 0)),
                qty_rapat: Number(k.qty_rapat !== undefined ? k.qty_rapat : (k.qtyRapat || 0)),
                qtyAdmin: Number(k.qty_admin !== undefined ? k.qty_admin : (k.qtyAdmin || 0)),
                qty_admin: Number(k.qty_admin !== undefined ? k.qty_admin : (k.qtyAdmin || 0)),
                qtyDesain: Number(k.qty_desain !== undefined ? k.qty_desain : (k.qtyDesain || 0)),
                qty_desain: Number(k.qty_desain !== undefined ? k.qty_desain : (k.qtyDesain || 0)),
                qtyVideo: Number(k.qty_video !== undefined ? k.qty_video : (k.qtyVideo || 0)),
                qty_video: Number(k.qty_video !== undefined ? k.qty_video : (k.qtyVideo || 0)),
                qtyLapangan: Number(k.qty_lapangan !== undefined ? k.qty_lapangan : (k.qtyLapangan || 0)),
                qty_lapangan: Number(k.qty_lapangan !== undefined ? k.qty_lapangan : (k.qtyLapangan || 0)),
                keteranganLainnya: k.keterangan_lainnya || k.keteranganLainnya || '',
                keterangan_lainnya: k.keterangan_lainnya || k.keteranganLainnya || '',
                poinLainnya: Number(k.poin_lainnya !== undefined ? k.poin_lainnya : (k.poinLainnya || 0)),
                poin_lainnya: Number(k.poin_lainnya !== undefined ? k.poin_lainnya : (k.poinLainnya || 0)),
                totalPoin: Number(k.total_poin !== undefined ? k.total_poin : (k.totalPoin || 0)),
                total_poin: Number(k.total_poin !== undefined ? k.total_poin : (k.totalPoin || 0)),
                createdAt: k.created_at || k.createdAt,
                updatedAt: k.updated_at || k.updatedAt
            }));
            return { data: mapped, error: null };
        },
        deleteKpiMitra: async (id) => {
            return await remove('kpi_mitra', id);
        },
        saveSiteSettings: async (settings) => {
            if (!settings) return { data: null, error: 'No data' };
            const res1 = await upsert('site_settings', {
                key: 'site_settings',
                value: settings,
                updated_at: new Date().toISOString()
            });
            return res1;
        },
        getSiteSettings: async () => {
            const res = await select('site_settings', { filter: 'key=eq.site_settings' });
            if (res.data && res.data.length > 0 && res.data[0].value) {
                return { data: res.data[0].value, error: null };
            }
            const resMaster = await select('site_settings', { filter: 'key=eq.master_bundle' });
            if (resMaster.data && resMaster.data.length > 0 && resMaster.data[0].value && resMaster.data[0].value.site_settings) {
                return { data: resMaster.data[0].value.site_settings, error: null };
            }
            return res;
        },
        saveSpecificProgImages: async (imgMap) => {
            if (!imgMap) return { data: null, error: 'No data' };
            return await upsert('site_settings', {
                key: 'specific_prog_imgs',
                value: imgMap,
                updated_at: new Date().toISOString()
            });
        },
        getSpecificProgImages: async () => {
            const res = await select('site_settings', { filter: 'key=eq.specific_prog_imgs' });
            if (res.data && res.data.length > 0 && res.data[0].value) {
                return { data: res.data[0].value, error: null };
            }
            return { data: {}, error: null };
        },
        saveSiteImages: async (imgMap) => {
            if (!imgMap) return { data: null, error: 'No data' };
            return await upsert('site_settings', {
                key: 'site_images',
                value: imgMap,
                updated_at: new Date().toISOString()
            });
        },
        getSiteImages: async () => {
            const res = await select('site_settings', { filter: 'key=eq.site_images' });
            if (res.data && res.data.length > 0 && res.data[0].value) {
                return { data: res.data[0].value, error: null };
            }
            return { data: {}, error: null };
        },
        saveNews: async (article) => {
            if (!article) return { data: null, error: 'No data' };
            const payload = {
                id: String(article.id),
                title: String(article.title || '').trim(),
                category: String(article.category || 'Kegiatan & Event'),
                content: String(article.content || '').trim(),
                image_url: String(article.imageUrl || article.image_url || ''),
                gallery: Array.isArray(article.gallery) ? article.gallery : [],
                event_date: article.eventDate || article.event_date || new Date().toISOString(),
                status: String(article.status || 'published'),
                author: String(article.author || 'Admin WIZ Babel'),
                created_at: article.createdAt || article.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            return await upsert('news', payload);
        },
        getNews: async (onlyPublished = false) => {
            const filter = onlyPublished ? 'status=eq.published' : undefined;
            const res = await select('news', { 
                select: 'id,slug,title,category,content,image_url,imageUrl,gallery,event_date,status,author,created_at,updated_at',
                filter, 
                order: 'event_date.desc' 
            });
            if (res.error || !Array.isArray(res.data)) return res;
            const mapped = res.data.map(n => ({
                id: n.id,
                title: n.title,
                category: n.category || 'Kegiatan & Penyaluran',
                content: n.content || '',
                imageUrl: n.image_url || n.imageUrl || '',
                gallery: Array.isArray(n.gallery) ? n.gallery : [],
                eventDate: n.event_date || n.eventDate || n.created_at,
                status: n.status || 'published',
                author: n.author || 'Admin WIZ Babel',
                createdAt: n.created_at,
                updatedAt: n.updated_at
            }));
            return { data: mapped, error: null };
        },
        saveDisbursement: async (disb) => {
            if (!disb) return { data: null, error: 'No data' };
            const sType = disb.source_type || disb.sourceType || 'program_spesifik';
            const tType = disb.target_type || disb.targetType || 'specific';
            const fromProg = (disb.amount_from_program !== undefined) ? disb.amount_from_program : (disb.amountFromProgram !== undefined ? disb.amountFromProgram : Number(disb.amount) || 0);
            const fromSub = (disb.amount_from_subsidi !== undefined) ? disb.amount_from_subsidi : (disb.amountFromSubsidi !== undefined ? disb.amountFromSubsidi : 0);
            const disbCat = disb.disbursement_category || disb.disbursementCategory || (
                (disb.program && disb.program.toLowerCase().includes('operasional') && (disb.program.toLowerCase().includes('umum') || (!disb.program.toLowerCase().includes('terikat') && !disb.program.toLowerCase().includes('mitra')))) ? 'operasional_infak_umum' :
                (disb.program && (disb.program.toLowerCase().includes('ujrah') || disb.program.toLowerCase().includes('mitra'))) ? 'hak_mitra_ujrah' :
                (disb.program && disb.program.toLowerCase().includes('operasional') && disb.program.toLowerCase().includes('terikat')) ? 'operasional_infak_terikat_lembaga' :
                (disb.program && (disb.program.toLowerCase().includes('saving') || disb.program.toLowerCase().includes('cadangan'))) ? 'dana_saving' :
                'program_execution'
            );

            let cleanDesc = String(disb.description || '').replace(/\s*\[Meta:[^\]]+\]/, '').trim();
            const fullDesc = `${cleanDesc} [Meta: source=${sType}|target=${tType}|fromProg=${fromProg}|fromSub=${fromSub}|cat=${disbCat}]`;

            const payload = {
                id: String(disb.id || ('disb-' + Date.now())),
                wilayah: String(disb.wilayah || 'Pangkalpinang'),
                program: String(disb.program || 'Infak Umum'),
                disbursement_category: disbCat,
                source_type: sType,
                target_type: tType,
                amount: Number(disb.amount) || 0,
                amount_from_program: fromProg,
                amount_from_subsidi: fromSub,
                description: fullDesc,
                tanggal_penyaluran: disb.tanggal_penyaluran || disb.tanggalPenyaluran || disb.disbursed_at || disb.disbursedAt || new Date().toISOString(),
                subsidi_details: disb.subsidi_details || disb.subsidiDetails || [],
                disbursed_at: disb.disbursed_at || disb.disbursedAt || new Date().toISOString(),
                recorded_by: String(disb.recorded_by || disb.recordedBy || 'Admin'),
                created_at: disb.created_at || disb.createdAt || new Date().toISOString()
            };
            let res = await upsert('disbursements', payload);
            if (res.error && (String(res.error).includes('tanggal_penyaluran') || String(res.error).includes('subsidi_details') || (res.error.message && (String(res.error.message).includes('tanggal_penyaluran') || String(res.error.message).includes('subsidi_details'))))) {
                delete payload.tanggal_penyaluran;
                delete payload.subsidi_details;
                delete payload.amount_from_program;
                delete payload.amount_from_subsidi;
                res = await upsert('disbursements', payload);
            }
            return res;
        },
        getDisbursements: async () => {
            let res = await select('disbursements', { order: 'tanggal_penyaluran.desc.nullslast,disbursed_at.desc' });
            if (res.error && (String(res.error).includes('does not exist') || (res.error.message && String(res.error.message).includes('does not exist')))) {
                res = await select('disbursements', { order: 'disbursed_at.desc' });
            }
            if (res.error || !Array.isArray(res.data)) return res;
            const mapped = res.data.map(d => {
                let sType = d.source_type || 'program_spesifik';
                let tType = d.target_type || 'specific';
                let fromProg = d.amount_from_program !== undefined ? Number(d.amount_from_program) : (Number(d.amount) || 0);
                let fromSub = d.amount_from_subsidi !== undefined ? Number(d.amount_from_subsidi) : 0;
                let disbCat = d.disbursement_category || 'program_execution';
                let cleanDesc = d.description || '';

                if (cleanDesc.includes('[Meta:')) {
                    const m = cleanDesc.match(/\[Meta:([^\]]+)\]/);
                    if (m) {
                        const parts = m[1].split('|');
                        parts.forEach(p => {
                            const [k, v] = p.split('=').map(s => s.trim());
                            if (k === 'source') sType = v;
                            if (k === 'target') tType = v;
                            if (k === 'fromProg') fromProg = Number(v) || fromProg;
                            if (k === 'fromSub') fromSub = Number(v) || fromSub;
                            if (k === 'cat') disbCat = v;
                        });
                        cleanDesc = cleanDesc.replace(/\s*\[Meta:[^\]]+\]/, '').trim();
                    }
                } else if (d.program && (d.program.toLowerCase().includes('global') || d.program.toLowerCase().includes('alih fungsi'))) {
                    sType = 'infak_umum';
                    tType = 'global';
                }

                return {
                    id: d.id,
                    wilayah: d.wilayah || 'Pangkalpinang',
                    sourceType: sType,
                    targetType: tType,
                    disbursementCategory: disbCat,
                    program: d.program,
                    amount: Number(d.amount) || 0,
                    amountFromProgram: fromProg,
                    amountFromSubsidi: fromSub,
                    subsidiDetails: d.subsidi_details || [],
                    subsidi_details: d.subsidi_details || [],
                    description: cleanDesc,
                    tanggalPenyaluran: d.tanggal_penyaluran || d.disbursed_at,
                    tanggal_penyaluran: d.tanggal_penyaluran || d.disbursed_at,
                    disbursedAt: d.disbursed_at,
                    recordedBy: d.recorded_by || 'Admin',
                    createdAt: d.created_at
                };
            });
            return { data: mapped, error: null };
        },
        getPublicTransparencyFeed: async (limit = 10) => {
            const [donRes, disbRes] = await Promise.all([
                select('donations', {
                    filter: 'status=eq.verified',
                    order: 'tanggal_transaksi.desc.nullslast,created_at.desc',
                    limit
                }).catch(() => ({ data: [], error: true })),
                select('disbursements', {
                    order: 'tanggal_penyaluran.desc.nullslast,disbursed_at.desc',
                    limit
                }).catch(() => ({ data: [], error: true }))
            ]);
            return {
                donations: Array.isArray(donRes.data) ? donRes.data : [],
                disbursements: Array.isArray(disbRes.data) ? disbRes.data : []
            };
        },
        saveReferralPayout: (data) => upsert('referral_payouts', data),
        saveContactMessage: (data) => insert('contact_messages', data),
        saveZakatRecord: (data) => insert('zakat_records', data),
        saveQuotes: async (quotesList) => {
            if (!Array.isArray(quotesList)) return { data: null, error: 'Invalid quotes array' };
            return await upsert('site_settings', {
                key: 'quotes',
                value: quotesList,
                updated_at: new Date().toISOString()
            });
        },
        getQuotes: async () => {
            const res = await select('site_settings', { filter: 'key=eq.quotes' });
            if (res.data && res.data.length > 0 && Array.isArray(res.data[0].value)) {
                return { data: res.data[0].value, error: null };
            }
            const resMaster = await select('site_settings', { filter: 'key=eq.master_bundle' });
            if (resMaster.data && resMaster.data.length > 0 && resMaster.data[0].value && Array.isArray(resMaster.data[0].value.quotes)) {
                return { data: resMaster.data[0].value.quotes, error: null };
            }
            return { data: [], error: null };
        }
    };

})();
