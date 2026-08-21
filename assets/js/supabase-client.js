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
    url: 'https://ffiltrlzdbwhhhxzmzuo.supabase.co',
    anonKey: 'sb_publishable_GiA1BOjbW2psTU36149xuA_E26wGBI3'
};

(function () {
    'use strict';

    function isConfigured() {
        return SUPABASE_CONFIG.url &&
            SUPABASE_CONFIG.anonKey &&
            !SUPABASE_CONFIG.url.includes('YOUR_SUPABASE') &&
            (SUPABASE_CONFIG.anonKey.startsWith('eyJ') || SUPABASE_CONFIG.anonKey.startsWith('sb_publishable_'));
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

    // ─── Public API ──────────────────────────────────────
    window.wizSupabase = {
        isConfigured,
        select,
        insert,
        update,
        upsert,
        remove,

        // Helpers for entities
        saveDonation: async (data) => {
            if (!data) return { data: null, error: 'No data' };
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(data.id || ''));
            const payload = {
                donor_name: String(data.donor_name || data.donorName || 'Hamba Allah'),
                donor_phone: String(data.donor_phone || data.donorPhone || '-'),
                donor_email: String(data.donor_email || data.donorEmail || ''),
                wilayah: String(data.wilayah || 'Pangkalpinang'),
                donation_type: String(data.donation_type || data.type || 'Infak Terikat'),
                program_utama: String(data.program_utama || data.programUtama || data.category || '-'),
                program_spesifik: String(data.program_spesifik || data.programSpesifik || data.program || '-'),
                program_title: String(data.program_title || data.programSpesifik || data.program || data.programUtama || 'Umum'),
                amount: Number(data.amount) || 0,
                alokasi_operasional: Number(data.alokasi_operasional !== undefined ? data.alokasi_operasional : (data.alokasiOperasional || 0)),
                alokasi_program: Number(data.alokasi_program !== undefined ? data.alokasi_program : (data.alokasiProgram || 0)),
                payment_method: String(data.payment_method || data.method || 'Transfer Bank'),
                referral_id: data.referral_id !== undefined ? data.referral_id : (data.referralId || null),
                referral_code: data.referral_code !== undefined ? data.referral_code : (data.referralCode || data.referralId || null),
                referral_fee: Number(data.referral_fee !== undefined ? data.referral_fee : (data.referralFee || 0)),
                notes: String(data.notes || '-'),
                status: String(data.status || 'pending'),
                created_at: data.created_at || data.createdAt || new Date().toISOString()
            };
            if (isValidUUID) {
                payload.id = data.id;
            }
            return await upsert('donations', payload);
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
        saveDisbursement: (data) => upsert('disbursements', data),
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
        saveReferralPayout: (data) => upsert('referral_payouts', data),
        saveContactMessage: (data) => insert('contact_messages', data),
        saveZakatRecord: (data) => insert('zakat_records', data)
    };

})();
