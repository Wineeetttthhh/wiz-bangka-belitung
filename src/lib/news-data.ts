import type { NewsItem } from './types';

/**
 * MASTER_NEWS is intentionally empty.
 * All news data is fetched live from Supabase via fetch-news.ts
 * on every server-side request. No static/mock data is used.
 */
export const MASTER_NEWS: NewsItem[] = [];
