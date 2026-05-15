import axios from 'axios';

/**
 * Professional Price Utility
 * Fetches prices from Jupiter V3 API or Birdeye server-side.
 */
export async function getPrice(ids: string) {
  try {
    const JUP_API_KEY = process.env.JUPITER_API_KEY;
    const response = await axios.get(`https://api.jup.ag/price/v2?ids=${ids}`, {
      headers: JUP_API_KEY ? { 'x-api-key': JUP_API_KEY } : {}
    });
    return response.data.data;
  } catch (err) {
    console.error('🛡️ Jupiter Price Fault, trying Birdeye...', err);
    return getBirdeyePrice(ids.split(',')[0]); // Use first ID for Birdeye fallback
  }
}

/**
 * Birdeye Price Fetcher (Task 3.1)
 */
export async function getBirdeyePrice(mint: string) {
    try {
        const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
        if (!BIRDEYE_API_KEY) return null;

        const res = await axios.get(`https://public-api.birdeye.so/public/price?address=${mint}`, {
            headers: { 'X-API-KEY': BIRDEYE_API_KEY }
        });

        const price = res.data?.data?.value;
        if (price) {
            return {
                [mint]: { price }
            };
        }
        return null;
    } catch (e) {
        console.warn('🛡️ Birdeye Price Fault:', e);
        return null;
    }
}

/**
 * Get SOL Price Helper
 */
export async function getSolPrice(): Promise<number> {
    const prices = await getPrice('So11111111111111111111111111111111111111112');
    return prices?.['So11111111111111111111111111111111111111112']?.price || 150;
}

