import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REDUCTION_CATEGORIES, calculateBillableDays, canReviewReduction, reductionDates, validateReduction } from '../utils/reductionRules.js';
import { studentWaterCharge } from '../services/messCalculation.js';
import { roundBill } from '../services/monthlyMessReport.js';

test('inclusive dates and cross-month leap-year ranges', () => {
  assert.deepEqual(reductionDates('2028-02-28', '2028-03-01'), ['2028-02-28','2028-02-29','2028-03-01']);
  assert.deepEqual(reductionDates('2026-10-16', '2026-10-16'), ['2026-10-16']);
  for (const [from,to] of [['2026-02-29','2026-03-01'],['2026-11-02','2026-11-01'],['bad','2026-01-01'],['2026-01-01','2027-02-01']]) assert.throws(() => reductionDates(from,to));
});
test('each category maps to the requested attendance status', () => {
  assert.equal(REDUCTION_CATEGORIES.medical.attendance,'A');
  assert.equal(REDUCTION_CATEGORIES.study_holiday.attendance,'A');
  assert.equal(REDUCTION_CATEGORIES.od.attendance,'OD');
  assert.equal(REDUCTION_CATEGORIES.internship.attendance,'OD');
  assert.throws(() => validateReduction({category:'casual',from_date:'2026-10-01',to_date:'2026-10-02',reason:'Family trip'}));
});
test('admin can review all hostels; warden can review only their own', () => {
  const request={hostel_id:2};
  assert.equal(canReviewReduction({role:'admin',hostel_id:1},request),true);
  assert.equal(canReviewReduction({role:'warden',hostel_id:'2'},request),true);
  assert.equal(canReviewReduction({role:'warden',hostel_id:1},request),false);
  assert.equal(canReviewReduction({role:'student',hostel_id:2},request),false);
});
test('only unique approved operational days reduce the bill; attendance is irrelevant', () => {
  const dates=reductionDates('2026-10-01','2026-10-05');
  const result=calculateBillableDays({dates,holidays:['2026-10-02'],approvedDates:['2026-10-02','2026-10-03','2026-10-03']});
  assert.equal(result.baseDays,4);assert.equal(result.approvedReductionDays,1);assert.equal(result.billableDays,3);
  assert.equal(calculateBillableDays({dates}).billableDays,5);
});
test('eligibility bounds and zero-day months are handled without negative totals', () => {
  const dates=reductionDates('2026-10-01','2026-10-05');
  assert.equal(calculateBillableDays({dates,eligibleFrom:'2026-10-03',eligibleTo:'2026-10-04'}).baseDays,2);
  assert.equal(calculateBillableDays({dates,approvedDates:dates}).billableDays,0);
  assert.equal(calculateBillableDays({dates,holidays:dates}).baseDays,0);
});
test('water uses base days or an explicit fee, regardless of approved reduction days', () => {
  const calculation={waterRate:10};
  assert.equal(studentWaterCharge(calculation,{baseDays:30,billableDays:20}),300);
  assert.equal(studentWaterCharge(calculation,{baseDays:30,billableDays:0}),300);
  assert.equal(studentWaterCharge(calculation,{baseDays:30},[{fee_type:'water_bill',amount:'275'}]),275);
});
test('the existing 0.20 rounding threshold tolerates binary decimal noise', () => {
  assert.equal(roundBill(100.20),100);
  assert.equal(roundBill(100.21),101);
  assert.equal(roundBill(100.20001),101);
  assert.equal(roundBill(0),0);
});
