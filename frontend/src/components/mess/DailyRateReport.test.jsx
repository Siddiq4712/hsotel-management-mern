import React from 'react';
import { beforeAll, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import moment from 'moment';
import { messAPI } from '../../services/api';
import DailyRateReport from './DailyRateReport';

vi.setConfig({ testTimeout: 30000 });
vi.mock('../../services/api', () => ({ messAPI: { generateDailyRateReport: vi.fn(), exportDailyRateReport: vi.fn() } }));
vi.mock('../../utils/billingDate', () => ({ initialBillingDate: () => moment('2026-08-01') }));
beforeAll(() => {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('identifies the shared historical statement and prevents saving a recalculated ledger rate', async () => {
  messAPI.generateDailyRateReport.mockResolvedValue({ data: { historicalImport: true, data: {
    historicalImport: true, scopeLabel: 'BOYS HOSTEL 1 + BOYS HOSTEL 2',
    totalManDays: 13837, dailyRate: 92.98, subTotal: 1804058.62, totalExpenses: 1286562.62,
    totalDeductions: 517496, expenses: [], deductions: {}
  } } });
  render(<DailyRateReport />);
  expect(await screen.findByText(/August 2026 imported statement/, {}, { timeout: 10000 })).toHaveTextContent('BOYS HOSTEL 1 + BOYS HOSTEL 2');
  expect(screen.getByText('Approved Shared Daily Rate')).toBeInTheDocument();
  expect(screen.getByText('₹92.98')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Save to Ledger/ })).toBeDisabled();
  expect(messAPI.generateDailyRateReport).toHaveBeenCalledWith({ month: 8, year: 2026 });
});

it.each([false, true])('releases download URLs and links, including click failure: %s', async failClick => {
  messAPI.generateDailyRateReport.mockResolvedValue({ data: { data: {} } });
  messAPI.exportDailyRateReport.mockResolvedValue({ data: new Blob(['report']) });
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { if (failClick) throw new Error('Download failed'); });
  render(<DailyRateReport />);
  fireEvent.click(screen.getByRole('button', { name: /Export/ }));
  await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:report'));
  expect(create).toHaveBeenCalledTimes(1);
  expect(document.querySelector('a[download]')).toBeNull();
});
