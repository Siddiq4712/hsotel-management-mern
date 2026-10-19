import React from 'react';
import { beforeAll, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { Modal, message } from 'antd';
import ManageBatches from './ManageSessions';
import { adminAPI } from '../../services/api';
vi.mock('../../services/api', () => ({ adminAPI: {
  getSessions: vi.fn(), getHostels: vi.fn(), createSession: vi.fn(), updateSession: vi.fn(), deleteSession: vi.fn(), previewBatchAllocation: vi.fn(), applyBatchAllocation: vi.fn()
} }));
beforeAll(() => {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
beforeEach(() => {
  vi.clearAllMocks();
  adminAPI.getSessions.mockResolvedValue({ data: { data: [] } });
  adminAPI.getHostels.mockResolvedValue({ data: { data: [{ id: 2, name: 'BOYS HOSTEL 2' }] } });
  adminAPI.createSession.mockResolvedValue({ data: { success: true } });
  adminAPI.previewBatchAllocation.mockResolvedValue({ data: { data: { rows: [], token: 'preview' } } });
});
afterEach(() => { cleanup(); Modal.destroyAll(); message.destroy(); });
it('uses ERP admission year 2024 for 2024-2028 and saves its chosen hostel before opening allocation review', async () => {
  render(<ManageBatches />);
  await waitFor(() => expect(adminAPI.getHostels).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Add Batch' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Start Year' }), { target: { value: '2024' } });
  await waitFor(() => expect(within(dialog).getByLabelText('ERP Batch Year')).toHaveValue('2024'));
  expect(within(dialog).queryByLabelText('Roll Number Prefix')).not.toBeInTheDocument();
  expect(within(dialog).getByRole('spinbutton', { name: 'End Year' })).toHaveValue('2028');
  fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Gender' }));
  fireEvent.click(await screen.findByTitle('Male'));
  fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Assigned Hostel' }));
  fireEvent.click(await screen.findByTitle('BOYS HOSTEL 2'));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save Batch' }));
  await waitFor(() => expect(adminAPI.createSession).toHaveBeenCalledWith(expect.objectContaining({ start_year: 2024, end_year: 2028, hostel_id: 2, gender: 'male' })));
  await waitFor(() => expect(adminAPI.previewBatchAllocation).toHaveBeenCalled());
}, 30000);
