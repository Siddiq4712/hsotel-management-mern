import React from 'react';
import { App } from 'antd';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import MessFeeManagement from './MessFeeManagement';
import { messAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  messAPI: { generateMonthlyMessReport: vi.fn(), generateDailyRateReport: vi.fn(), getStudents: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shows finalized amounts from the billing service and preserves their rounding', async () => {
  messAPI.generateMonthlyMessReport.mockResolvedValue({
    data: { finalized: true, summary: { dailyRate: 17.25, grandTotal: 88 }, data: [{
      studentId: 1, name: 'Test Resident', regNo: '123', baseDays: 6, approvedReductionDays: 1, messDays: 5,
      dailyRate: 17.25, messAmount: 86.25, waterCharges: 1.10, additionalAmount: 1.10,
      total: 87.35, roundingUp: 0.65, finalAmount: 88, bedCharges: 0, hinduIndianExpress: 0,
    }] },
  });
  render(<App><MessFeeManagement /></App>);
  fireEvent.click(await screen.findByRole('button', { name: 'View bill for Test Resident' }));
  const details = await screen.findByRole('dialog');
  expect(within(details).getByText('Billable days')).toBeInTheDocument();
  expect(within(details).getByText('₹86.25')).toBeInTheDocument();
  expect(within(details).getByText('Payable amount · ₹88.00')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Bills finalized' })).toBeDisabled();
  expect(messAPI.generateDailyRateReport).not.toHaveBeenCalled();
  expect(messAPI.getStudents).not.toHaveBeenCalled();
});

it('keeps issuing available for students whose saved-rate bills have yet to be issued', async () => {
  messAPI.generateMonthlyMessReport.mockResolvedValue({
    data: { ratesLocked: true, issuedCount: 1, finalized: false, summary: {}, data: [
      { studentId: 1, name: 'Issued resident', issued: true, finalAmount: 200 },
      { studentId: 2, name: 'Remaining resident', issued: false, finalAmount: 125 },
    ] },
  });
  render(<App><MessFeeManagement /></App>);
  expect(await screen.findByText('1 of 2 bills issued')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Finalize & Send Emails' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Add Manual Fee' })).toBeDisabled();
});
