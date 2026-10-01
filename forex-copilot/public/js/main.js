import { getForex } from './api.js';
import { createChart } from './chart.js';
import { renderAnalysisPlaceholder } from './analysis.js';
import { initRisk } from './risk.js';
import { initTraderState } from './trader.js';

const $ = (id) => document.getElementById(id);
const el = { price: $('price'), updated: $('updated'), notice: $('notice'), unavailable: $('unavailable'), refresh: $('refresh') };

// --- Estratégia de atualização (candles de 15 min) ---
// 1 busca ao abrir + 1 busca logo após cada fechamento de candle (xx:00/15/30/45 + 10 s).
// Aba oculta não busca; ao voltar, só busca se um candle novo já fechou desde a última busca.
// Botão manual tem espera de 60 s. Redimensionar nunca busca. ≈4 chamadas/h, ≤96/dia (cota grátis: 800/dia).
const CANDLE_MS = 15 * 60_000, SETTLE_MS = 10_000, MANUAL_COOLDOWN_MS = 60_000;
const STALE_AFTER_S = 60 * 60; // último candle com mais de 1 h: avisar (mercado fechado ou atraso)

let chart, inFlight = false, timer = null, lastFetchAt = 0;
const nextBoundary = () => Math.ceil((Date.now() + 1) / CANDLE_MS) * CANDLE_MS + SETTLE_MS;
const candleBucket = (ms) => Math.floor((ms - SETTLE_MS) / CANDLE_MS);

function schedule(delayMs) {
  clearTimeout(timer);
  timer = setTimeout(() => refresh(), delayMs ?? nextBoundary() - Date.now());
}

function showNotice(text, isError = false) {
  el.notice.hidden = !text;
  el.notice.textContent = text || '';
  el.notice.classList.toggle('error', isError);
}

function showUnavailable(on) { el.unavailable.hidden = !on; }

async function refresh() {
  if (inFlight) return; // evita chamadas duplicadas
  inFlight = true;
  el.refresh.disabled = true;
  let retryMs = null;
  try {
    const data = await getForex();
    lastFetchAt = Date.now();
    const last = data.candles[data.candles.length - 1];
    chart.setCandles(data.candles);
    showUnavailable(false);
    el.price.textContent = last.close.toFixed(5);
    const t = new Date(last.time * 1000).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    el.updated.textContent = `Candle das ${t} · atualizado às ${new Date().toLocaleTimeString('pt-BR')}`;
    const ageS = Math.floor(Date.now() / 1000) - last.time;
    showNotice(ageS > STALE_AFTER_S ? `O candle mais recente tem mais de 1 h (${t}). O mercado pode estar fechado ou os dados atrasados.` : '');
  } catch (err) {
    // Mantém o último gráfico válido na tela, se houver; senão, mostra DADOS INDISPONÍVEIS.
    if (!lastFetchAt) { showUnavailable(true); el.price.textContent = '—'; }
    showNotice(err.message, true);
    retryMs = Math.max((err.retryAfter ?? 0) * 1000, err.code === 'RATE_LIMIT' ? 5 * 60_000 : 2 * 60_000);
  } finally {
    inFlight = false;
    schedule(retryMs ?? undefined);
    setTimeout(() => { el.refresh.disabled = false; }, MANUAL_COOLDOWN_MS);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearTimeout(timer); return; }
  if (candleBucket(Date.now()) > candleBucket(lastFetchAt)) refresh(); else schedule();
});
el.refresh.addEventListener('click', refresh);

renderAnalysisPlaceholder($('analysis-list'));
initRisk({ bankroll: $('bankroll'), riskPct: $('riskPct'), out: $('riskMoney') });
initTraderState($('trader'));

if (typeof LightweightCharts === 'undefined') {
  showUnavailable(true);
  showNotice('Não foi possível carregar a biblioteca do gráfico (CDN).', true);
} else {
  chart = createChart($('chart'));
  refresh();
}
