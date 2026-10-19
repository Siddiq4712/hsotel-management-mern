import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { monthlyHistoricalReport, getHistoricalBilling } from '../utils/historicalBilling.js';

test('historical college filters preserve source amounts, rounding and hostel-wide rate', () => {
  const payload = JSON.parse(fs.readFileSync(new URL('../import-work/august-2026/reconciliation.json', import.meta.url)));
  const all = monthlyHistoricalReport(payload, 'all');
  const nec = monthlyHistoricalReport(payload, 'nec');
  const lapc = monthlyHistoricalReport(payload, 'lapc');
  assert.equal(all.data.length, 537);
  assert.equal(nec.data.length, 420);
  assert.equal(lapc.data.length, 117);
  assert.equal(all.summary.grandTotal, 1541146);
  assert.equal(nec.summary.grandTotal, 1209036);
  assert.equal(lapc.summary.grandTotal, 332110);
  assert.equal(all.summary.totalMessAmount, 1286564.26);
  assert.equal(all.summary.totalHinduIndianExpress, 15998.70);
  assert.equal(all.summary.dailyRate, 92.98);
  assert.equal(all.summary.messDays, 13837);
  assert.deepEqual(all.data, payload.rows);
});

test('other periods do not enter the historical workflow', async () => {
  assert.equal(await getHistoricalBilling(2,9,2026), null);
  assert.equal(await getHistoricalBilling(2,8,2025), null);
});
