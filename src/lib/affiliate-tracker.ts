/**
 * WIZ Bangka Belitung - 40-Day Affiliate Referral Engine
 */

export const AFFILIATE_CONFIG = {
    DAYS: 40,
    STORAGE_KEY: 'wiz_ref_code',
    EXP_KEY: 'wiz_ref_exp',
    COOKIE_KEY: 'wiz_ref'
};

export function recordAffiliateRef(refCode: string): void {
    if (!refCode || typeof window === 'undefined') return;
    try {
        const cleanRef = String(refCode).trim();
        if (!cleanRef) return;
        const expiryMs = Date.now() + (AFFILIATE_CONFIG.DAYS * 24 * 60 * 60 * 1000);

        sessionStorage.setItem('wiz_active_ref_id', cleanRef);
        localStorage.setItem(AFFILIATE_CONFIG.STORAGE_KEY, cleanRef);
        localStorage.setItem(AFFILIATE_CONFIG.EXP_KEY, String(expiryMs));
        document.cookie = `${AFFILIATE_CONFIG.COOKIE_KEY}=${encodeURIComponent(cleanRef)}; path=/; max-age=3456000; SameSite=Lax`;
        console.log('[WIZ Referral] Registered affiliate code:', cleanRef);
    } catch (e) {
        console.warn('[WIZ Referral] Error saving affiliate ref:', e);
    }
}

export function getActiveAffiliate(): string {
    if (typeof window === 'undefined') return '';
    try {
        // 1. URL Query Param
        const urlParams = new URLSearchParams(window.location.search);
        const urlRef = urlParams.get('ref') || urlParams.get('affiliate') || urlParams.get('mitra');
        if (urlRef) {
            recordAffiliateRef(urlRef);
            return urlRef.trim();
        }

        // 2. Session Storage
        const sessRef = sessionStorage.getItem('wiz_active_ref_id');
        if (sessRef) return sessRef.trim();

        // 3. LocalStorage
        const storedRef = localStorage.getItem(AFFILIATE_CONFIG.STORAGE_KEY);
        const storedExp = Number(localStorage.getItem(AFFILIATE_CONFIG.EXP_KEY)) || 0;
        if (storedRef && Date.now() < storedExp) {
            sessionStorage.setItem('wiz_active_ref_id', storedRef.trim());
            return storedRef.trim();
        }

        // 4. Cookie Fallback
        const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${AFFILIATE_CONFIG.COOKIE_KEY}=([^;]+)`));
        if (match && match[1]) {
            const cookieRef = decodeURIComponent(match[1]).trim();
            if (cookieRef) {
                sessionStorage.setItem('wiz_active_ref_id', cookieRef);
                return cookieRef;
            }
        }
    } catch (e) {}
    return '';
}

export function formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(amount);
}
