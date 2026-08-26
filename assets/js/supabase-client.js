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
    url: 'https://ccmulazswlmjyfjdtlti.supabase.co',
    anonKey: 'sb_publishable_hEmZHHQyc0EeHXQI2caacQ_InnfPXa5'
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

        if (options.filter) params.push(options.filter);      // e.g. 'status=eq.published'
        if (options.order) params.push(`order=${options.order}`); // e.g. 'created_at.desc'
        if (options.limit) params.push(`limit=${options.limit}`);
        if (options.offset) params.push(`offset=${options.offset}`);

        if (params.length > 0) url += '?' + params.join('&');

        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: headers({ 'Accept': 'application/json' }),
                cache: 'no-store'
            });
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
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(data.id || ''));
            
            const rawProg = data.program_title || data.programSpesifik || data.program || data.programUtama || data.type || 'Infak Umum';
            const wilayahStr = (data.wilayah && data.wilayah !== '-') ? ` [${data.wilayah}]` : '';
            const programTitleFormatted = rawProg.includes('[') ? rawProg : `${rawProg}${wilayahStr}`;

            const extraMeta = [];
            if (data.wilayah && data.wilayah !== '-') extraMeta.push(`Wilayah: ${data.wilayah}`);
            if (data.program_utama || data.programUtama) extraMeta.push(`Kategori: ${data.program_utama || data.programUtama}`);
            if (data.program_spesifik || data.programSpesifik) extraMeta.push(`Program: ${data.program_spesifik || data.programSpesifik}`);
            if (data.referral_id || data.referralId || data.referral_code || data.referralCode) {
                const refCode = data.referral_code || data.referralCode || data.referral_id || data.referralId;
                const refRate = data.referral_rate !== undefined ? data.referral_rate : (data.referralRate !== undefined ? data.referralRate : 6);
                const refFee = data.referral_fee !== undefined ? data.referral_fee : (data.referralFee !== undefined ? data.referralFee : 0);
                extraMeta.push(`Mitra: ${refCode} (${refRate}% - Rp ${refFee})`);
            }
            if (data.isRecurringDonor || data.is_recurring_donor) extraMeta.push('Donatur Tetap Mitra');

            const baseNotes = String(data.notes || '').replace(/\[Meta:[^\]]*\]/g, '').trim();
            const metaTag = extraMeta.length > 0 ? ` [Meta: ${extraMeta.join(' | ')}]` : '';
            const finalNotes = baseNotes ? (baseNotes === '-' ? metaTag.trim() : `${baseNotes}${metaTag}`) : (metaTag.trim() || '-');

            const payload = {
                id: String(data.id || generateUUID()),
                donor_name: String(data.donor_name || data.donorName || 'Hamba Allah'),
                donor_phone: String(data.donor_phone || data.donorPhone || '-'),
                donor_email: String(data.donor_email || data.donorEmail || ''),
                wilayah: String(data.wilayah || 'Pangkalpinang'),
                program: String(data.programSpesifik || data.program || data.program_spesifik || '-'),
                program_spesifik: String(data.programSpesifik || data.program || data.program_spesifik || '-'),
                program_utama: String(data.programUtama || data.category || data.program_utama || '-'),
                program_title: programTitleFormatted,
                category: String(data.programUtama || data.category || data.program_utama || '-'),
                type: String(data.type || data.donation_type || 'Infak Terikat'),
                donation_type: String(data.type || data.donation_type || 'Infak Terikat'),
                amount: Number(data.amount) || 0,
                alokasi_operasional: Number(data.alokasiOperasional || data.alokasi_operasional || 0),
                alokasi_program: Number(data.alokasiProgram || data.alokasi_program || 0),
                payment_method: String(data.payment_method || data.method || 'Transfer Bank'),
                method: String(data.method || data.payment_method || 'Transfer Bank'),
                notes: finalNotes,
                status: String(data.status || 'pending'),
                referral_id: data.referralId || data.referral_id || null,
                referral_code: data.referralCode || data.referral_code || data.referralId || data.referral_id || null,
                referral_name: data.referralName || data.referral_name || null,
                referral_rate: data.referralRate !== undefined ? Number(data.referralRate) : (data.referral_rate !== undefined ? Number(data.referral_rate) : 6),
                referral_fee: data.referralFee !== undefined ? Number(data.referralFee) : (data.referral_fee !== undefined ? Number(data.referral_fee) : 0),
                additional_bonus: Number(data.additionalBonus || data.additional_bonus || 0),
                is_recurring_donor: Boolean(data.isRecurringDonor || data.is_recurring_donor || false),
                created_at: data.created_at || data.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            return await upsert('donations', payload);
        },
        getAllDonations: async () => {
            const res = await select('donations', {
                order: 'created_at.desc'
            });
            return res;
        },
        getRecentVerifiedDonations: async (limit = 10) => {
            const res = await select('donations', {
                filter: 'status=eq.verified',
                order: 'created_at.desc',
                limit: limit
            });
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
            const res = await select('news', { filter, order: 'event_date.desc' });
            if (res.error || !Array.isArray(res.data)) return res;
            const mapped = res.data.map(n => ({
                id: n.id,
                title: n.title,
                category: n.category,
                content: n.content,
                imageUrl: n.image_url,
                gallery: Array.isArray(n.gallery) ? n.gallery : [],
                eventDate: n.event_date,
                status: n.status || 'published',
                author: n.author,
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
                disbursed_at: disb.disbursed_at || disb.disbursedAt || new Date().toISOString(),
                recorded_by: String(disb.recorded_by || disb.recordedBy || 'Admin'),
                created_at: disb.created_at || disb.createdAt || new Date().toISOString()
            };
            return await upsert('disbursements', payload);
        },
        getDisbursements: async () => {
            const res = await select('disbursements', { order: 'disbursed_at.desc' });
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
                    description: cleanDesc,
                    disbursedAt: d.disbursed_at,
                    recordedBy: d.recorded_by || 'Admin',
                    createdAt: d.created_at
                };
            });
            return { data: mapped, error: null };
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
