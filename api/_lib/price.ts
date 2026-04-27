import axios from 'axios';

/**
 * Professional Price Utility
 * Fetches prices from Jupiter V3 API server-side.
 */
export async function getPrice(ids: string) {
  try {
    const JUP_API_KEY = process.env.JUPITER_API_KEY;
    const response = await axios.get(`https://api.jup.ag/price/v3?ids=${ids}`, {
      headers: JUP_API_KEY ? { 'x-api-key': JUP_API_KEY } : {}
    });
    return response.data.data;
  } catch (err) {
    console.error('🛡️ Price Utility Fault:', err);
    return null;
  }
}

/**
 * Get SOL Price Helper
 */
export async function getSolPrice(): Promise<number> {
    const prices = await getPrice('So11111111111111111111111111111111111111112');
    return prices?.['So11111111111111111111111111111111111111112']?.price || 125;
}
