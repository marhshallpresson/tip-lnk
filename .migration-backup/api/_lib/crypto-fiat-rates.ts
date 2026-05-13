import axios from 'axios'

const COINPAPRIKA_BASE_URL = process.env.COINPAPRIKA_API_BASE_URL || 'https://api.coinpaprika.com/v1'
const COINPAPRIKA_API_KEY = process.env.COINPAPRIKA_API_KEY

const SYMBOL_TO_COIN_ID: Record<string, string> = {
  BTC: 'btc-bitcoin',
  ETH: 'eth-ethereum',
  SOL: 'sol-solana',
  USDC: 'usdc-usd-coin',
  USDT: 'usdt-tether',
  JUP: 'jup-jupiter',
  BONK: 'bonk-bonk',
}

const client = axios.create({
  baseURL: COINPAPRIKA_BASE_URL,
  timeout: 5000,
  headers: COINPAPRIKA_API_KEY ? { Authorization: COINPAPRIKA_API_KEY } : undefined,
})

const toPositiveNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export const resolveCoinPaprikaId = async (asset: string) => {
  const normalized = String(asset || 'USDC').trim()
  if (!normalized) return SYMBOL_TO_COIN_ID.USDC
  if (normalized.includes('-')) return normalized

  const symbol = normalized.toUpperCase()
  if (SYMBOL_TO_COIN_ID[symbol]) return SYMBOL_TO_COIN_ID[symbol]
  return searchCoinPaprikaId(symbol, asset)
}

const searchCoinPaprikaId = async (symbol: string, originalAsset: string) => {
  const search = await client.get('/search', {
    params: {
      q: symbol,
      c: 'currencies',
      modifier: 'symbol_search',
      limit: 10,
    },
  })

  const currencies = Array.isArray(search.data?.currencies) ? search.data.currencies : []
  const exact = currencies
    .filter((coin: any) => coin?.is_active !== false)
    .find((coin: any) => String(coin?.symbol || '').toUpperCase() === symbol)

  if (!exact?.id) {
    throw new Error(`Unsupported crypto asset: ${originalAsset}`)
  }

  return String(exact.id)
}

export async function getCryptoFiatQuote(options: {
  amount: number
  asset?: string
  quoteCurrency?: string
}) {
  const amount = toPositiveNumber(options.amount)
  if (!amount) throw new Error('Amount must be positive')

  const quoteCurrency = String(options.quoteCurrency || 'NGN').trim().toUpperCase()
  const coinId = await resolveCoinPaprikaId(options.asset || 'USDC')
  let response
  try {
    response = await client.get(`/tickers/${encodeURIComponent(coinId)}`, {
      params: { quotes: `${quoteCurrency},USD` },
    })
  } catch (error: any) {
    const symbol = String(options.asset || 'USDC').trim().toUpperCase()
    if (error?.response?.status === 404 && !String(options.asset || '').includes('-')) {
      const searchedCoinId = await searchCoinPaprikaId(symbol, options.asset || 'USDC')
      if (searchedCoinId !== coinId) {
        response = await client.get(`/tickers/${encodeURIComponent(searchedCoinId)}`, {
          params: { quotes: `${quoteCurrency},USD` },
        })
      } else {
        throw error
      }
    } else {
      throw error
    }
  }

  const quote = response.data?.quotes?.[quoteCurrency]
  const usdQuote = response.data?.quotes?.USD
  const rate = toPositiveNumber(quote?.price)
  const resolvedCoinId = String(response.data?.id || coinId)
  if (!rate) {
    throw new Error(`No ${quoteCurrency} quote available for ${resolvedCoinId}`)
  }

  return {
    provider: 'coinpaprika',
    coinId: resolvedCoinId,
    asset: response.data?.symbol || options.asset || 'USDC',
    quoteCurrency,
    rate,
    amount,
    convertedAmount: Number((amount * rate).toFixed(2)),
    usdRate: toPositiveNumber(usdQuote?.price),
    lastUpdated: response.data?.last_updated || quote?.last_updated || null,
  }
}
