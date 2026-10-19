import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import ReportFormatDialog from './ReportFormatDialog';
import { requestReportFormat } from '../../services/reportFormat';

afterEach(cleanup);
it('requires an explicit format and resolves cancellation without a format', async () => {
  render(<ReportFormatDialog />);
  let result;
  act(() => { result = requestReportFormat(); });
  expect(screen.getByRole('button', { name: 'Generate report' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('Excel (.xlsx)'));
  fireEvent.click(screen.getByRole('button', { name: 'Generate report' }));
  await expect(result).resolves.toBe('xlsx');
  act(() => { result = requestReportFormat({ title: 'Second report', formats: ['csv'] }); });
  expect(screen.getByRole('button', { name: 'Generate report' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await expect(result).resolves.toBeNull();
});
