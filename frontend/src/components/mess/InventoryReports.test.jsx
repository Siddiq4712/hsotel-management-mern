import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InventoryReports from './InventoryReports';
import { inventoryAPI } from '../../services/api';
import { requestReportFormat } from '../../services/reportFormat';

vi.mock('../../services/api', () => ({ inventoryAPI: { policy: vi.fn(), report: vi.fn() } }));
vi.mock('../../services/reportFormat', () => ({ requestReportFormat: vi.fn() }));
vi.mock('./InventoryWorkspace', () => ({ useInventoryWorkspace: () => ({ id: 10, name: 'Central inventory' }) }));
vi.mock('../common/ReportPreview', () => ({ default: ({ rows }) => <div aria-label="Report preview">{JSON.stringify(rows)}</div> }));
vi.mock('antd', () => {
  const Wrap = ({ children }) => <div>{children}</div>;
  return { Space: Wrap, Card: Wrap, Typography: { Title: Wrap, Paragraph: Wrap, Text: Wrap },
    Alert: ({ title, description }) => <div>{title}{description}</div>, DatePicker: () => <input aria-label="Billing month" readOnly />,
    Select: ({ id, options, value, onChange }) => <select id={id} value={value ?? ''} onChange={event => onChange(id === 'report-hostel' ? Number(event.target.value) : event.target.value)}>
      <option value="">Choose</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>, Button: ({ children, disabled, onClick }) => <button disabled={disabled} onClick={onClick}>{children}</button>,
  };
});
const data = (kind = 'consumption', name = 'Hostel A') => ({ kind, scope: { name, level: 'hostel', hostels: [{ id: 1, name }], month: 10, year: 2026 }, summary: {}, rows: [{ Item: 'Rice', Quantity: 10 }] });
beforeEach(() => {
  vi.clearAllMocks();
  inventoryAPI.policy.mockResolvedValue({ data: { data: { mode: 'hostel', hostels: [{ id: 1, name: 'Hostel A' }, { id: 2, name: 'Hostel B' }] } } });
  inventoryAPI.report.mockImplementation((_, params) => Promise.resolve({ data: { data: data(params.kind) } }));
});
afterEach(cleanup);
it.each(['consumption', 'expenses', 'rate', 'billing', 'stock', 'purchases'])('loads %s preview by default without asking for a format', async kind => {
  render(<InventoryReports initialKind={kind} />);
  await screen.findByLabelText('Report preview');
  expect(inventoryAPI.report).toHaveBeenCalledWith(10, expect.objectContaining({ kind, format: 'preview' }));
  expect(requestReportFormat).not.toHaveBeenCalled();
  const params = inventoryAPI.report.mock.calls.at(-1)[1];
  if (['stock', 'purchases'].includes(kind)) expect(params).not.toHaveProperty('hostel_id');
  else expect(params.hostel_id).toBe(1);
});
it('reloads the selected hostel and report kind, and refreshes without a format prompt', async () => {
  render(<InventoryReports />);
  await screen.findByLabelText('Report preview');
  fireEvent.change(screen.getByLabelText('Hostel'), { target: { value: '2' } });
  await waitFor(() => expect(inventoryAPI.report).toHaveBeenLastCalledWith(10, expect.objectContaining({ hostel_id: 2 })));
  fireEvent.change(screen.getByLabelText('Report'), { target: { value: 'billing' } });
  await waitFor(() => expect(inventoryAPI.report).toHaveBeenLastCalledWith(10, expect.objectContaining({ kind: 'billing', hostel_id: 2 })));
  await screen.findByLabelText('Report preview');
  const count = inventoryAPI.report.mock.calls.length;
  fireEvent.click(screen.getByText('Refresh preview'));
  await waitFor(() => expect(inventoryAPI.report).toHaveBeenCalledTimes(count + 1));
  expect(requestReportFormat).not.toHaveBeenCalled();
});
it('loads shared reports without a hostel scope filter', async () => {
  inventoryAPI.policy.mockResolvedValue({ data: { data: { mode: 'shared', hostels: [{ id: 1, name: 'Hostel A' }, { id: 2, name: 'Hostel B' }] } } });
  render(<InventoryReports />);
  await screen.findByLabelText('Report preview');
  expect(screen.queryByLabelText('Hostel')).not.toBeInTheDocument();
  expect(inventoryAPI.report.mock.calls.at(-1)[1]).not.toHaveProperty('hostel_id');
});
it('ignores an older response after changing hostel', async () => {
  let finishOld;
  inventoryAPI.report.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockResolvedValue({ data: { data: data('consumption', 'Hostel B') } });
  render(<InventoryReports />);
  await waitFor(() => expect(inventoryAPI.report).toHaveBeenCalledOnce());
  fireEvent.change(screen.getByLabelText('Hostel'), { target: { value: '2' } });
  await screen.findByLabelText('Report preview');
  finishOld({ data: { data: { ...data(), rows: [{ Item: 'Stale result' }] } } });
  await waitFor(() => expect(screen.getByLabelText('Report preview')).not.toHaveTextContent('Stale result'));
});
