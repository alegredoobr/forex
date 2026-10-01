import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCandles, toUnixSeconds } from '../lib/twelvedata.js';
test('toUnixSeconds converte UTC',()=>assert.equal(toUnixSeconds('2025-01-01 00:00:00'),1735689600));
test('normalizeCandles converte e ordena',()=>{const o=normalizeCandles([{datetime:'2025-01-01 00:15:00',open:'1.2',high:'1.3',low:'1.1',close:'1.25'},{datetime:'2025-01-01 00:00:00',open:'1.1',high:'1.2',low:'1.0',close:'1.15'}]);assert.equal(o.length,2);assert.ok(o[0].time<o[1].time);assert.equal(typeof o[0].close,'number');});
test('normalizeCandles rejeita inválidos',()=>assert.throws(()=>normalizeCandles([{datetime:'x',open:'x'}])));
