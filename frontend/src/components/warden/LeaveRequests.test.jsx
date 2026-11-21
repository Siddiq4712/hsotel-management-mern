import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LeaveRequests from './LeaveRequests';
import { wardenAPI } from '../../services/api';
import { StaffWorkspaceContext } from '../../context/StaffWorkspaceContext';

vi.mock('../../services/api', () => ({
  wardenAPI: { getLeaveRequests: vi.fn(), approveLeave: vi.fn() },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'admin' } }) }));
const permissions = vi.hoisted(() => ({ can: vi.fn() }));
vi.mock('../../context/PermissionContext', () => ({ usePermissions: () => permissions }));

const request = { id: 7, status: 'pending', Student: { userName: 'Resident A', roll_number: 'NEC701' },
  from_date: '2026-11-19', to_date: '2026-11-20', leave_type: 'personal', reason: 'Family visit' };
const response = rows => ({ data: { data: rows } });
const mount = hostel => render(<MemoryRouter initialEntries={['/leave-requests?workspace=warden&status=pending']}>
  <StaffWorkspaceContext.Provider value={{ id: hostel.id, hostel }}>
    <LeaveRequests />
  </StaffWorkspaceContext.Provider>
</MemoryRouter>);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  permissions.can.mockReturnValue(true);
  wardenAPI.getLeaveRequests.mockResolvedValue(response([request]));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('retries a failed decision with the original remarks and reloads the pending queue after saving', async () => {
  wardenAPI.approveLeave.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({});
  wardenAPI.getLeaveRequests.mockResolvedValueOnce(response([request])).mockResolvedValueOnce(response([]));
  mount({ id: 1, name: 'North Hostel' });
  expect(await screen.findByText('1 request needs your attention')).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
  expect(wardenAPI.approveLeave).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('North Hostel')).toBeInTheDocument();
  expect(within(dialog).getByText('Family visit')).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('Warden remarks'), { target: { value: 'Checked with guardian' } });
  const confirm = within(dialog).getByRole('button', { name: 'Confirm acceptance' });
  fireEvent.click(confirm);
  expect(await within(dialog).findByText('Connection lost')).toBeInTheDocument();
  expect(within(dialog).getByLabelText('Warden remarks')).toHaveValue('Checked with guardian');
  await waitFor(() => expect(confirm).not.toHaveClass('ant-btn-loading'));
  fireEvent.click(confirm);
  expect(await screen.findByText('No pending leave requests.')).toBeInTheDocument();
  expect(wardenAPI.approveLeave).toHaveBeenLastCalledWith(7, { status: 'approved', remarks: 'Checked with guardian' });
  expect(wardenAPI.getLeaveRequests.mock.calls).toEqual([[{ status: 'pending' }], [{ status: 'pending' }]]);
});

it('shows the second hostel and allows view-only staff to review details', async () => {
  permissions.can.mockReturnValue(false);
  mount({ id: 2, name: 'South Hostel' });
  fireEvent.click(await screen.findByRole('button', { name: 'Review leave request for Resident A' }));
  expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('South Hostel')).toBeInTheDocument();
  expect(within(dialog).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  await waitFor(() => expect(wardenAPI.getLeaveRequests).toHaveBeenCalledWith({ status: 'pending' }));
});

it('searches residents by name or roll number within the selected status', async () => {
  mount({ id: 1, name: 'North Hostel' });
  await screen.findByRole('button', { name: 'Review leave request for Resident A' });
  const search = screen.getByRole('textbox', { name: 'Search leave requests' });
  fireEvent.change(search, { target: { value: 'missing' } });
  expect(screen.getByText('No leave requests match your search and status.')).toBeInTheDocument();
  fireEvent.change(search, { target: { value: '  nec701 ' } });
  expect(screen.getByRole('button', { name: 'Review leave request for Resident A' })).toBeInTheDocument();
  fireEvent.change(search, { target: { value: 'resident a' } });
  expect(screen.getByRole('button', { name: 'Review leave request for Resident A' })).toBeInTheDocument();
  expect(wardenAPI.getLeaveRequests.mock.calls).toEqual([[{ status: 'pending' }]]);
});
