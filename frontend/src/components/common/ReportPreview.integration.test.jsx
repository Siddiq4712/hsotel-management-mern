import React from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ReportPreview from './ReportPreview';
import { printTables } from '../../utils/reportExport';

vi.mock('../../utils/reportExport', () => ({ printTables: vi.fn(), exportWorkbook: vi.fn() }));
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(cleanup);
it('keeps actual Ant Design table sorting and printed rows identical after filtering', () => {
  const rows = Array.from({ length: 25 }, (_, index) => ({ Item: `Food ${index + 1}`, Cost: index + 1 }));
  render(<ReportPreview rows={rows} title="Actual report controls" compact formatValue={(value, key) => key === 'Cost' ? `₹${Number(value).toFixed(2)}` : String(value)} />);
  fireEvent.click(screen.getByText('Filters & sorting'));
  fireEvent.change(screen.getByLabelText('Cost min'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Cost max'), { target: { value: '24' } });
  const costHeader = screen.getByRole('columnheader', { name: /Cost/ });
  fireEvent.click(costHeader);
  fireEvent.click(costHeader);
  const tableRows = screen.getAllByRole('row').filter(row => within(row).queryByText(/^Food /));
  expect(tableRows).toHaveLength(20);
  expect(within(tableRows[0]).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['Food 24', '₹24.00']);
  fireEvent.click(screen.getByRole('button', { name: 'Print', exact: true }));
  const printed = printTables.mock.calls[0][0][1].rows.slice(1);
  expect(printed).toHaveLength(23);
  expect(printed[0]).toEqual(['Food 24', '₹24.00']);
  expect(printed.at(-1)).toEqual(['Food 2', '₹2.00']);
}, 60000);
