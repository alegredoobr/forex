import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../scripts/dev-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const realFetch = globalThis.fetch;

test('estrutura: api/forex.js existe, exporta função; lib/ fora de api/ e public/', async () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'api/forex.js')));
  assert.equal(typeof (await import('../api/forex.js')).default, 'function');
  assert.ok(fs.existsSync(path.join(ROOT, 'lib/twelvedata.js')));
  assert.deepEqual(fs.readdirSync(path.join(ROOT, 'api')), ['forex.js']); // nenhum helper virando função
  assert.ok(!fs.existsSync(path.join(ROOT, 'public/lib')));
});

test('vercel.json/package.json coerentes', () => {
  const v = JSON.parse(read('vercel.json')), p = JSON.parse(read('package.json'));
  assert.equal(v.outputDirectory, undefined);
  for (const f of Object.keys(v.functions)) assert.ok(fs.existsSync(path.join(ROOT, f)), `functions: ${f} não existe`);
  assert.equal(p.type, 'module');
  assert.equal(p.devDependencies?.vercel, undefined);
});

test('index.html: todo CSS/JS local é absoluto e existe em public/; imports ES resolvem', () => {
  const html = read('public/index.html');
  const urls = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:)?\/\//.test(u) && !u.startsWith('#'));
  assert.ok(urls.length >= 2);
  const seen = new Set();
  const visit = (u) => {
    assert.ok(u.startsWith('/'), `caminho relativo: ${u}`);
    const f = path.join(ROOT, 'public', u); assert.ok(fs.existsSync(f), `não existe: ${u}`);
    if (seen.has(u) || !u.endsWith('.js')) return; seen.add(u);
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/from\s+'(\.[^']+)'/g)) visit(path.posix.join(path.posix.dirname(u), m[1]));
  };
  urls.forEach(visit);
  assert.ok(seen.size >= 6, `módulos visitados: ${[...seen]}`);
});

test('rotas HTTP: / , CSS, JS, /api/forex (erros e sucesso), 404s', async () => {
  const mock = (impl) => { globalThis.fetch = (u, o) => String(u).startsWith('https://api.twelvedata.com') ? impl() : realFetch(u, o); };
  const srv = createServer(); await new Promise((r) => srv.listen(0, r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const get = (p) => realFetch(base + p);
  try {
    let r = await get('/'); assert.equal(r.status, 200); assert.match(await r.text(), /Forex Copilot/);
    r = await get('/css/style.css'); assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /text\/css/);
    for (const j of ['main', 'api', 'chart', 'analysis', 'risk', 'trader']) {
      r = await get(`/js/${j}.js`); assert.equal(r.status, 200, j); assert.match(r.headers.get('content-type'), /javascript/);
    }
    assert.equal((await get('/lib/twelvedata.js')).status, 404);
    assert.equal((await get('/api/nao-existe')).status, 404);

    delete process.env.TWELVE_DATA_API_KEY;
    r = await get('/api/forex'); assert.equal(r.status, 500); assert.equal((await r.json()).error.code, 'CONFIG_ERROR');
    process.env.TWELVE_DATA_API_KEY = 'SEGREDO';
    mock(async () => ({ status: 429, ok: false, json: async () => ({ code: 429, status: 'error' }) }));
    r = await get('/api/forex'); assert.equal(r.status, 429); assert.equal(r.headers.get('retry-after'), '60');
    mock(async () => { throw new Error('x'); });
    r = await get('/api/forex'); assert.equal(r.status, 502);
    mock(async () => ({ status: 200, ok: true, json: async () => ({ status: 'ok', values: [
      { datetime: '2025-01-01 00:15:00', open: '1.2', high: '1.3', low: '1.1', close: '1.25' },
      { datetime: '2025-01-01 00:00:00', open: '1.1', high: '1.2', low: '1.0', close: '1.15' }] }) }));
    r = await get('/api/forex'); assert.equal(r.status, 200);
    const b = await r.json();
    assert.equal(b.symbol, 'EUR/USD'); assert.ok(b.candles[0].time < b.candles[1].time); assert.equal(typeof b.candles[0].close, 'number');
    assert.ok(!JSON.stringify(b).includes('SEGREDO'));
  } finally { globalThis.fetch = realFetch; srv.close(); }
});
