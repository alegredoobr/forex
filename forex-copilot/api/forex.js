// GET /api/forex  ->  { symbol, interval, candles[], lastCandleTime, fetchedAt }
import { fetchCandles, ProviderError } from '../lib/twelvedata.js';

const SYMBOL = 'EUR/USD';
const INTERVAL = '15min';
const OUTPUT_SIZE = 100;
const MEMORY_TTL_MS = 60_000; // protege a cota mesmo sem cache de CDN (ex.: dev local)

let memo = null; // { at, payload } por instância da função

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } });
  }

  if (memo && Date.now() - memo.at < MEMORY_TTL_MS) {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(memo.payload);
  }

  try {
    const candles = await fetchCandles({
      symbol: SYMBOL, interval: INTERVAL, outputsize: OUTPUT_SIZE,
      apiKey: process.env.TWELVE_DATA_API_KEY,
    });
    const payload = {
      symbol: SYMBOL,
      interval: INTERVAL,
      candles,
      lastCandleTime: candles[candles.length - 1].time,
      fetchedAt: Math.floor(Date.now() / 1000),
    };
    memo = { at: Date.now(), payload };
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(payload);
  } catch (err) {
    const e = err instanceof ProviderError ? err : new ProviderError('INTERNAL_ERROR', 'Erro interno ao obter dados.', 500);
    res.setHeader('Cache-Control', 'no-store');
    if (e.retryAfter) res.setHeader('Retry-After', String(e.retryAfter));
    return res.status(e.status).json({ error: { code: e.code, message: e.message, retryAfter: e.retryAfter } });
  }
}
