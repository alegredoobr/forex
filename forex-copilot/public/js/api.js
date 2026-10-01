export async function getForex() {
  let res;
  try { res = await fetch('/api/forex', { headers: { Accept: 'application/json' } }); }
  catch { const e = new Error('Falha de rede ao consultar o servidor.'); e.code='NETWORK_ERROR'; throw e; }
  let body;
  try { body = await res.json(); }
  catch { const e = new Error('O servidor respondeu em formato inválido.'); e.code='INVALID_RESPONSE'; throw e; }
  if (!res.ok) {
    const e = new Error(body?.error?.message || 'Não foi possível obter os dados Forex.');
    e.code = body?.error?.code || 'HTTP_ERROR';
    e.retryAfter = Number(body?.error?.retryAfter || res.headers.get('Retry-After') || 0);
    throw e;
  }
  if (!Array.isArray(body?.candles) || body.candles.length === 0) {
    const e = new Error('O servidor não retornou candles válidos.'); e.code='NO_DATA'; throw e;
  }
  return body;
}
