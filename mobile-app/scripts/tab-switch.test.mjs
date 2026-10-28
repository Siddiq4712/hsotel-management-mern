import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { expenseChartData } from '../src/utils/expenseChartData.js';

const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
test('returning to Home with unchanged expenses retains the existing chart object', () => {
  const rows = [{ year: 2026, month: 2, total_amount: '1500.00' }];
  const first = expenseChartData(null, rows, 2026, labels);
  assert.equal(first.datasets[0].data[1], 1500);
  assert.equal(expenseChartData(first, rows.map(row => ({ ...row })), 2026, [...labels]), first);
});
test('fresh amounts, calendar year and locale changes update chart data', () => {
  const first = expenseChartData(null, [{ year: 2026, month: 1, total_amount: 10 }], 2026, labels);
  const next = expenseChartData(first, [{ year: 2026, month: 1, total_amount: 20 }], 2026, labels);
  assert.notEqual(next, first);
  assert.equal(next.datasets[0].data[0], 20);
  assert.notEqual(expenseChartData(first, [{ year: 2026, month: 1, total_amount: 10 }], 2025, labels), first);
  assert.notEqual(expenseChartData(first, [{ year: 2026, month: 1, total_amount: 10 }], 2026, labels.map(value => value + '.')), first);
});
test('chart construction handles missing data and keeps twelve finite month values', () => {
  const result = expenseChartData(null, [
    { year: '2026', month: '3', total_amount: '42.50' },
    { year: 2026, month: 0, total_amount: 10 },
    { year: 2026, month: 13, total_amount: 10 },
    { year: 2026, month: 1.5, total_amount: 10 },
    { year: 2026, month: 4, total_amount: 'invalid' },
  ], 2026, labels);
  assert.equal(result.datasets[0].data.length, 12);
  assert.ok(result.datasets[0].data.every(Number.isFinite));
  assert.equal(result.datasets[0].data[2], 42.5);
  assert.equal(expenseChartData(null, null, 2026, labels).datasets[0].data.reduce((sum, value) => sum + value, 0), 0);
});

const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
const code = transformSync(readFileSync(new URL('../src/hooks/useAfterPaintFocusEffect.js', import.meta.url), 'utf8'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
function setup(effect) {
  const frames = new Map();
  let next = 0, focus;
  const context = { exports: {},
    require: name => name === 'react' ? { useCallback: callback => callback } : { useFocusEffect: callback => { focus = callback; } },
    requestAnimationFrame: callback => { frames.set(++next, callback); return next; },
    cancelAnimationFrame: id => frames.delete(id),
  };
  vm.createContext(context); vm.runInContext(code, context);
  context.exports.default(effect);
  return { focus: () => focus(), frame() { const current = [...frames.values()]; frames.clear(); current.forEach(callback => callback()); } };
}
test('focus refresh runs after a paint opportunity rather than during tab selection', () => {
  let calls = 0;
  const run = setup(() => { calls++; });
  const blur = run.focus();
  assert.equal(calls, 0);
  run.frame(); assert.equal(calls, 0);
  run.frame(); assert.equal(calls, 1);
  blur();
});
test('rapid tab switching cancels refreshes before either frame', () => {
  for (const beforeBlur of [0, 1]) {
    let calls = 0;
    const run = setup(() => { calls++; });
    const blur = run.focus();
    if (beforeBlur) run.frame();
    blur(); run.frame(); run.frame();
    assert.equal(calls, 0);
  }
});
test('blur cleans up a running focus effect and subsequent focus refreshes normally', () => {
  let starts = 0, stops = 0;
  const run = setup(() => { starts++; return () => { stops++; }; });
  const blur = run.focus(); run.frame(); run.frame(); blur();
  assert.equal(starts, 1); assert.equal(stops, 1);
  const secondBlur = run.focus(); run.frame(); run.frame();
  assert.equal(starts, 2);
  secondBlur(); assert.equal(stops, 2);
});
