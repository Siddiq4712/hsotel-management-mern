import React from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import ComplaintManagement from './ComplaintManagement';
import { wardenAPI } from '../../services/api';

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'warden', hostel: { name: 'North Hostel' } } }) }));
vi.mock('../../services/api', () => ({ wardenAPI: { getComplaints: vi.fn(), updateComplaint: vi.fn() } }));

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shows the pending complaint and saves the selected action and resolution from review', async () => {
  const complaint = { id: 4, status: 'submitted', Student: { userName: 'Resident A', roll_number: 'NEC701' }, subject: 'Desk repair',
    description: 'The desk leg is loose.', category: 'maintenance', priority: 'high', createdAt: '2026-11-20T03:00:00Z' };
  wardenAPI.getComplaints.mockResolvedValueOnce({ data: { data: [complaint] } })
    .mockResolvedValueOnce({ data: { data: [{ ...complaint, status: 'resolved' }] } });
  wardenAPI.updateComplaint.mockResolvedValue({});
  render(<ConfigProvider theme={{ token: { motion: false } }}><MemoryRouter><ComplaintManagement /></MemoryRouter></ConfigProvider>);

  expect(await screen.findByText('1 request needs your attention', {}, { timeout: 5000 })).toBeInTheDocument();
  const search = screen.getByRole('textbox', { name: 'Search complaints' });
  fireEvent.change(search, { target: { value: 'missing' } });
  expect(screen.getByText('No complaints match these filters.')).toBeInTheDocument();
  fireEvent.change(search, { target: { value: 'nec701' } });
  expect(screen.getByText('Desk repair')).toBeInTheDocument();
  fireEvent.change(search, { target: { value: 'desk' } });
  const review = screen.getByRole('button', { name: 'Review complaint #4' });
  fireEvent.click(review);
  const dialog = within(await screen.findByRole('dialog', {}, { timeout: 5000 }));
  expect(dialog.getByText(complaint.description)).toBeInTheDocument();
  expect(wardenAPI.updateComplaint).not.toHaveBeenCalled();
  fireEvent.mouseDown(dialog.getByLabelText('Action'));
  fireEvent.click(await screen.findByText('Mark as solved', { selector: '.ant-select-item-option-content' }, { timeout: 5000 }));
  fireEvent.change(dialog.getByLabelText('Resolution summary'), { target: { value: 'The leg was secured.' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(wardenAPI.updateComplaint).toHaveBeenCalledWith(4, {
    status: 'resolved', resolution: 'The leg was secured.'
  }), { timeout: 5000 });
}, 60000);
