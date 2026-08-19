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
    url: 'https://yexodimaeekaghbejdxt.supabase.co',
    anonKey: 'sb_publishable_GiA1BOjbW2psTU36149xuA_E26wGBI3'
};

(function () {
    'use strict';

    function isConfigured() {
        return SUPABASE_CONFIG.url &&
            SUPABASE_CONFIG.anonKey &&
            !SUPABASE_CONFIG.url.includes('YOUR_SUPABASE') &&
            SUPABASE_CONFIG.anonKey.startsWith('eyJ');
    }

    function endpoint(table) {
        return `${SUPABASE_CONFIG.url.replace(/\/$/, '')}/rest/v1/${table}`;
    }

    function headers(extra) {
        return {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
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
                headers: headers({ 'Accept': 'application/json' })
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
        saveDonation: (data) => insert('donations', data),
        saveReferral: (data) => upsert('referrals', data),
        saveReferralPayout: (data) => upsert('referral_payouts', data),
        saveContactMessage: (data) => insert('contact_messages', data),
        saveZakatRecord: (data) => insert('zakat_records', data)
    };

})();
