import { expect, it } from 'vitest';
import { reportFieldType, reportKeys, reportView, reportViewDescription } from './reportView';

const rows = [
  { Date: '2026-10-01', Hostel: 'Hostel 10', Item: 'Rice', Cost: 30 },
  { Date: '2026-10-02', Hostel: 'Hostel 2', Item: 'Rice', Cost: 20 },
  { Date: '2026-10-03', Hostel: 'Hostel 2', Item: 'Dal', Cost: 10 },
];
it('combines exact field filters, search, inclusive date and numeric ranges, and sorting without changing source rows', () => {
  const result = reportView(rows, { search: 'rice', filters: { Date: { from: '2026-10-01', to: '2026-10-02' }, Cost: { min: 20, max: 30 }, Item: { values: ['Rice'] } }, sort: { field: 'Cost', order: 'ascend' } });
  expect(result.map(row => row.Cost)).toEqual([20, 30]);
  expect(rows.map(row => row.Cost)).toEqual([30, 20, 10]);
  expect(reportView(rows, { filters: { Cost: { min: 0, max: 0 } } })).toEqual([]);
  expect(reportView(rows, { sort: { field: 'Hostel', order: 'ascend' } }).map(row => row.Hostel)).toEqual(['Hostel 2', 'Hostel 2', 'Hostel 10']);
});
it('detects every available field and preserves register numbers as text', () => {
  expect(reportKeys([{ A: 1 }, { B: 2 }])).toEqual(['A', 'B']);
  expect(reportFieldType(rows, 'Cost')).toBe('number');
  expect(reportFieldType(rows, 'Date')).toBe('date');
  expect(reportFieldType([{ Roll: '001' }], 'Roll')).toBe('text');
  expect(reportView([{ Cost: null }, { Cost: 0 }], { filters: { Cost: { min: 0 } } })).toEqual([{ Cost: 0 }]);
});
it('describes the selected filters and sort for printed and exported reports', () => {
  expect(reportViewDescription({ search: 'Rice', filters: { Cost: { min: 0, max: 20 }, Date: { from: '2026-10-01' }, Item: { values: ['Rice'] } }, sort: { field: 'Cost', order: 'descend' } }))
    .toEqual([['Search', 'Rice'], ['Cost minimum', 0], ['Cost maximum', 20], ['Date from', '2026-10-01'], ['Item', 'Rice'], ['Sort', 'Cost (descending)']]);
});
