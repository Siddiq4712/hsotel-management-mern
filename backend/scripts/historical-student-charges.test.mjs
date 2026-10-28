import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { HistoricalBilling } from '../utils/historicalBilling.js';
import { studentMessCharges } from '../services/studentMessCharges.js';

test('historical student breakdown includes imported charges and reconciles to each saved bill', async () => {
  const payload = JSON.parse(fs.readFileSync(new URL('../import-work/august-2026/reconciliation.json', import.meta.url)));
  const lookup = mock.method(HistoricalBilling, 'findOne', async () => ({ payload }));
  try {
    for (const row of payload.rows) {
      const result = await studentMessCharges({ userId: row.studentId, roll_number: row.regNo, hostel_id: 2 }, 8, 2026);
      const summary = result.monthlySummary;
      const sum = type => summary.flatFees.filter(fee => fee.fee_type === type).reduce((total, fee) => total + fee.amount, 0);
      assert.equal(sum('additional'), row.additionalAmount);
      assert.equal(sum('bed_charge'), row.bedCharges);
      assert.equal(sum('newspaper'), row.hinduIndianExpress);
      assert.equal(summary.historicalFinalAmount, row.finalAmount);
      assert.ok(Math.abs(summary.historicalMessAmount + summary.flatFees.reduce((total, fee) => total + fee.amount, 0) - row.finalAmount) < 0.005);
      assert.deepEqual(result.dailyCharges, []);
    }
    const target = payload.rows.find(row => String(row.regNo) === '24104085');
    assert.ok(target, 'Requested student must be in the imported workbook');
    const fallback = await studentMessCharges({ userId: -1, roll_number: '24104085', hostel_id: 2 }, 8, 2026);
    assert.equal(fallback.monthlySummary.historicalFinalAmount, target.finalAmount);
    const unknown = await studentMessCharges({ userId: -1, hostel_id: 2 }, 8, 2026);
    assert.deepEqual(unknown.monthlySummary.flatFees, []);
  } finally {
    lookup.mock.restore();
  }
});
