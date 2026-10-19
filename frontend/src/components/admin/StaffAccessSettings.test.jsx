import React from 'react';
import { beforeAll, afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { message } from 'antd';
import StaffAccessSettings from './StaffAccessSettings';
import { adminAPI } from '../../services/api';

vi.mock('../../services/api', () => ({ adminAPI: {
  getStaffAccess: vi.fn(), getHostels: vi.fn(), getRoles: vi.fn(), updateStaffAccess: vi.fn()
} }));
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
beforeEach(() => {
  vi.clearAllMocks();
  adminAPI.getStaffAccess.mockResolvedValue({ data: { data: [{ userId: 5, userName: 'Warden One', userMail: 'warden@example.test', roleId: 2, role: { roleName: 'warden' }, hostel_id: 1 }] } });
  adminAPI.getHostels.mockResolvedValue({ data: { data: [{ id: 1, name: 'Hostel One', is_active: true }, { id: 2, name: 'Hostel Two', is_active: true }] } });
  adminAPI.getRoles.mockResolvedValue({ data: { data: [{ roleId: 2, roleName: 'warden' }, { roleId: 3, roleName: 'mess' }, { roleId: 1, roleName: 'admin' }] } });
  adminAPI.updateStaffAccess.mockResolvedValue({ data: { success: true } });
});
afterEach(() => { cleanup(); message.destroy(); });
afterAll(() => vi.unstubAllGlobals());

it('moves an existing warden to another hostel and refreshes saved assignments', async () => {
  render(<StaffAccessSettings />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit access' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.mouseDown(within(dialog).getByLabelText('Assigned hostel'));
  fireEvent.click(await screen.findByText('Hostel Two', { selector: '.ant-select-item-option-content' }));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save access' }));
  await waitFor(() => expect(adminAPI.updateStaffAccess).toHaveBeenCalledWith(5, { roleId: 2, hostel_id: 2 }));
  await waitFor(() => expect(adminAPI.getStaffAccess).toHaveBeenCalledTimes(2));
});

it('keeps edits open when saving fails', async () => {
  adminAPI.updateStaffAccess.mockRejectedValue(new Error('Choose an active hostel.'));
  render(<StaffAccessSettings />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit access' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save access' }));
  expect(await screen.findByText('Choose an active hostel.')).toBeInTheDocument();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(adminAPI.getStaffAccess).toHaveBeenCalledTimes(1);
});
