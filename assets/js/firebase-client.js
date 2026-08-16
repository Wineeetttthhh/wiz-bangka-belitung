/**
 * ============================================================
 * WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
 * Firebase Firestore REST Client — Cross-Device Sync
 * ============================================================
 * Menggantikan Supabase. Sinkronisasi data antar perangkat
 * menggunakan Firebase Firestore REST API.
 * API surface kompatibel dengan supabase-client.js sebelumnya.
 * ============================================================
 */

const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyAl8RQSk7Jnb7r4GCclAGbcZc2X-yKRhmQ',
    projectId: 'wiz-bangka-belitung'
};

(function () {
    'use strict';

    const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;
    const KEY = FIREBASE_CONFIG.apiKey;

    // ─── Firestore Type Serialization ───────────────────────
    function toFsValue(v) {
        if (v === null || v === undefined) return { nullValue: null };
        if (typeof v === 'boolean') return { booleanValue: v };
        if (typeof v === 'number') {
            return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
        }
        if (typeof v === 'string') return { stringValue: v };
        if (Array.isArray(v)) {
            return { arrayValue: { values: v.map(toFsValue) } };
        }
        if (typeof v === 'object') {
            return { mapValue: { fields: toFsFields(v) } };
        }
        return { stringValue: String(v) };
    }

    function toFsFields(obj) {
        const fields = {};
        for (const [k, v] of Object.entries(obj)) {
            if (k === 'id') continue; // id stored as document name, not field
            fields[k] = toFsValue(v);
        }
        return fields;
    }

    function fromFsValue(v) {
        if (!v) return null;
        if ('nullValue' in v) return null;
        if ('stringValue' in v) return v.stringValue;
        if ('integerValue' in v) return Number(v.integerValue);
        if ('doubleValue' in v) return v.doubleValue;
        if ('booleanValue' in v) return v.booleanValue;
        if ('timestampValue' in v) return v.timestampValue;
        if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFsValue);
        if ('mapValue' in v) return fromFsFields(v.mapValue.fields || {});
        return null;
    }

    function fromFsFields(fields) {
        const obj = {};
        for (const [k, v] of Object.entries(fields || {})) {
            obj[k] = fromFsValue(v);
        }
        return obj;
    }

    function docToObj(doc) {
        if (!doc || !doc.name) return null;
        const parts = doc.name.split('/');
        const id = parts[parts.length - 1];
        return { id, ...fromFsFields(doc.fields || {}) };
    }

    // ─── REST Helpers ────────────────────────────────────────
    function isConfigured() {
        return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
    }

    async function restGet(path) {
        const res = await fetch(`${BASE_URL}/${path}?key=${KEY}`, {
            headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) return { data: null, error: await res.text() };
        return { data: await res.json(), error: null };
    }

    async function restPatch(path, body) {
        const res = await fetch(`${BASE_URL}/${path}?key=${KEY}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) return { data: null, error: await res.text() };
        return { data: await res.json(), error: null };
    }

    async function restDelete(path) {
        const res = await fetch(`${BASE_URL}/${path}?key=${KEY}`, { method: 'DELETE' });
        return { data: null, error: res.ok ? null : await res.text() };
    }

    // ─── Public API ──────────────────────────────────────────

    /**
     * Ambil semua dokumen dari koleksi.
     * @returns {Promise<{data: Array, error: any}>}
     */
    async function select(collection) {
        try {
            const { data, error } = await restGet(`${collection}?pageSize=500`);
            if (error) return { data: null, error };
            const docs = (data.documents || []).map(docToObj).filter(Boolean);
            return { data: docs, error: null };
        } catch (e) {
            return { data: null, error: e.message };
        }
    }

    /**
     * Simpan atau perbarui dokumen dengan ID tertentu (upsert by ID).
     * Jika data mengandung field `id`, field itu digunakan sebagai doc ID.
     */
    async function set(collection, id, data) {
        try {
            const { id: _id, ...rest } = (data || {});
            const { data: doc, error } = await restPatch(`${collection}/${id}`, {
                fields: toFsFields(rest)
            });
            if (error) return { data: null, error };
            return { data: docToObj(doc), error: null };
        } catch (e) {
            return { data: null, error: e.message };
        }
    }

    /**
     * Insert — alias untuk set, menggunakan data.id sebagai doc ID.
     * Kompatibel dengan API Supabase: insert(collection, data)
     */
    async function insert(collection, data) {
        const id = data.id || String(Date.now());
        return set(collection, id, data);
    }

    /**
     * Update — merge partial data ke dokumen yang sudah ada.
     * Kompatibel: update(collection, id, partialData)
     */
    async function update(collection, id, partialData) {
        try {
            // Ambil dokumen lama dulu, merge, simpan kembali
            const { data: existing } = await restGet(`${collection}/${id}`);
            const old = existing ? fromFsFields(existing.fields || {}) : {};
            const merged = { ...old, ...partialData };
            const { id: _id, ...rest } = merged;
            const { data: doc, error } = await restPatch(`${collection}/${id}`, {
                fields: toFsFields(rest)
            });
            if (error) return { data: null, error };
            return { data: docToObj(doc), error: null };
        } catch (e) {
            return { data: null, error: e.message };
        }
    }

    /**
     * Hapus dokumen.
     * Kompatibel: remove(collection, id)
     */
    async function remove(collection, id) {
        try {
            return await restDelete(`${collection}/${id}`);
        } catch (e) {
            return { data: null, error: e.message };
        }
    }

    /**
     * Upsert — insert atau update dokumen. Untuk site_images pakai data.key sebagai ID.
     */
    async function upsert(collection, data) {
        const id = data.key || data.id || String(Date.now());
        return set(collection, id, data);
    }

    // ─── Expose ───────────────────────────────────────────────
    window.wizFirebase = {
        isConfigured,
        select,
        insert,
        update,
        remove,
        set,
        upsert
    };

    console.log('[WIZ Firebase] Client initialized. Project:', FIREBASE_CONFIG.projectId);
})();
