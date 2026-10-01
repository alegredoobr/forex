// Camada de acesso à Twelve Data. Isolada para que outros provedores/símbolos
// possam ser adicionados depois sem mexer no endpoint.
const BASE_URL = 'https://api.twelvedata.com/time_series';

export class ProviderError extends Error {
  constructor(code, message, status = 502, retryAfter = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/** "2025-01-31 14:15:00" (UTC) -> segundos Unix. Retorna null se inválido. */
export function toUnixSeconds(datetime) {
  if (typeof datetime !== 'string') return null;
  const iso = datetime.length <= 10 ? `${datetime}T00:00:00Z` : `${datetime.replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

/** Converte, valida, remove duplicatas e ordena (antigo -> recente). Nunca inventa dados. */
export function normalizeCandles(values) {
  if (!Array.isArray(values)) throw new ProviderError('INVALID_RESPONSE', 'Resposta inesperada do provedor de dados.');
  const byTime = new Map();
  for (const v of values) {
    const time = toUnixSeconds(v?.datetime);
    const open = Number(v?.open), high = Number(v?.high), low = Number(v?.low), close = Number(v?.close);
    const ok = time !== null && [open, high, low, close].every(Number.isFinite) && high >= low;
    if (ok) byTime.set(time, { time, open, high, low, close });
  }
  const candles = [...byTime.values()].sort((a, b) => a.time - b.time);
  if (candles.length === 0) throw new ProviderError('NO_DATA', 'O provedor não retornou candles válidos.');
  return candles;
}

export async function fetchCandles({ symbol, interval, outputsize, apiKey, timeoutMs = 8000, fetchImpl = fetch }) {
  if (!apiKey) throw new ProviderError('CONFIG_ERROR', 'Servidor sem chave de dados configurada.', 500);
  const params = new URLSearchParams({
    symbol, interval, outputsize: String(outputsize), timezone: 'UTC', order: 'DESC', apikey: apiKey,
  });

  let res;
  try {
    res = await fetchImpl(`${BASE_URL}?${params}`, { signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    // Mensagem genérica de propósito: erros de rede podem conter a URL (com a chave).
    throw new ProviderError('NETWORK_ERROR', 'Falha de rede ao consultar o provedor de dados.', 502);
  }

  let body;
  try { body = await res.json(); } catch {
    throw new ProviderError('INVALID_RESPONSE', 'O provedor respondeu em formato inválido.');
  }

  if (res.status === 429 || body?.code === 429) {
    throw new ProviderError('RATE_LIMIT', 'Limite de requisições do provedor atingido. Tente novamente em alguns minutos.', 429, 60);
  }
  if (body?.status === 'error' || !res.ok) {
    const code = body?.code;
    if (code === 401 || code === 403) throw new ProviderError('AUTH_ERROR', 'Chave de API inválida ou sem permissão.', 502);
    throw new ProviderError('PROVIDER_ERROR', 'O provedor de dados retornou um erro.', 502);
  }
  return normalizeCandles(body?.values);
}
