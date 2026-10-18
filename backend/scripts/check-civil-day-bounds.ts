import {
  todayInTimezone,
  zonedDayEndExclusiveUtc,
  zonedDayStartUtc,
} from '../src/modules/billing/helpers/civil_date.helper.js';

let failed = false;
function check(label: string, actual: string, expected: string) {
  const ok = actual === expected;
  console.log(ok ? 'ok  ' : 'FAIL', label, actual, ok ? '' : `(esperado ${expected})`);
  if (!ok) failed = true;
}

const sp = 'America/Sao_Paulo';
// Brasil (UTC-3, sem horário de verão desde 2019): o dia 17/10 começa às 03:00Z.
check('início do dia 2026-10-17 em São Paulo', zonedDayStartUtc('2026-10-17', sp).toISOString(), '2026-10-17T03:00:00.000Z');
check('fim (exclusivo) do dia 2026-10-17', zonedDayEndExclusiveUtc('2026-10-17', sp).toISOString(), '2026-10-18T03:00:00.000Z');
// 22:18 BRT de 17/10 = 01:18Z de 18/10 — ainda é dia 17 na clínica.
const lateNight = new Date('2026-10-18T01:18:00.000Z');
check('pagamento às 22:18 BRT pertence ao dia 17', todayInTimezone(sp, lateNight), '2026-10-17');
const inside = lateNight >= zonedDayStartUtc('2026-10-17', sp) && lateNight < zonedDayEndExclusiveUtc('2026-10-17', sp);
check('e cai dentro do período do dia 17', String(inside), 'true');
// Madrugada: 00:30 BRT de 18/10 = 03:30Z de 18/10 — já é dia 18.
const earlyMorning = new Date('2026-10-18T03:30:00.000Z');
check('pagamento às 00:30 BRT pertence ao dia 18', todayInTimezone(sp, earlyMorning), '2026-10-18');
check('e fica fora do período do dia 17', String(earlyMorning < zonedDayEndExclusiveUtc('2026-10-17', sp)), 'false');
// Fuso diferente (Manaus, UTC-4).
check('início do dia em Manaus', zonedDayStartUtc('2026-10-17', 'America/Manaus').toISOString(), '2026-10-17T04:00:00.000Z');

if (failed) process.exit(1);
console.log('OK: limites de dia civil por fuso');
