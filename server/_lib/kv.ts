import { Redis } from '@upstash/redis';

// Initialize Upstash Redis for the Live Tip Feed and Caching
// Relies on UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the environment
export const redis = Redis.fromEnv();

export const FEED_KEY = 'tiplnk:live_feed';

export async function addTipToFeed(tip: {
    signature: string;
    amount: number;
    tokenSymbol: string;
    sender?: string;
    recipient: string;
    valueUsd?: number;
}) {
    try {
        const entry = JSON.stringify({
            ...tip,
            timestamp: Date.now()
        });
        
        // Prepend to the feed list
        await redis.lpush(FEED_KEY, entry);
        // Keep only the latest 50 tips
        await redis.ltrim(FEED_KEY, 0, 49);
        
        console.log(`[KV] Tip added to live feed: ${tip.signature}`);
    } catch (err: any) {
        console.warn(`[KV] Failed to add tip to feed: ${err.message}`);
    }
}

export async function getLiveFeed() {
    try {
        const feed = await redis.lrange(FEED_KEY, 0, 49);
        // Upstash Redis usually parses JSON automatically if stored correctly, 
        // but we ensure it's parsed just in case.
        return feed.map(item => typeof item === 'string' ? JSON.parse(item) : item);
    } catch (err: any) {
        console.warn(`[KV] Failed to fetch live feed: ${err.message}`);
        return [];
    }
}
