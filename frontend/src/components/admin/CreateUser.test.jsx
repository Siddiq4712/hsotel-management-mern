import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ConfigProvider, message } from 'antd';
import CreateUser from './CreateUser';
import { adminAPI } from '../../services/api';

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1 } }) }));
vi.mock('../../services/api', () => ({ adminAPI: {
  getUsers: vi.fn(), getRoles: vi.fn(), getHostels: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), deleteUser: vi.fn(), createRole: vi.fn()
} }));

const admin = { roleId: 1, roleName: 'Admin' };
const student = { roleId: 2, roleName: 'Student' };
const warden = { roleId: 3, roleName: 'Warden' };
const accounts = [
  { userId: 1, userName: 'Site Admin', userMail: 'admin@example.test', roleId: 1, role: admin },
  { userId: 5, userName: 'Taylor Lee', userMail: 'taylor@example.test', roleId: 2, role: student, roll_number: 'S123', room_number: 'B205', hostel_id: 7 }
];
const response = (data) => ({ data: { data } });

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
beforeEach(() => {
  vi.resetAllMocks();
  adminAPI.getUsers.mockResolvedValue(response(accounts));
  adminAPI.getRoles.mockResolvedValue(response([admin, student, warden]));
  adminAPI.getHostels.mockResolvedValue(response([{ id: 7, name: 'Maple House' }]));
});
afterEach(() => { cleanup(); message.destroy(); });
afterAll(() => vi.unstubAllGlobals());

async function chooseOption(select, name, scope = screen) {
  fireEvent.mouseDown(select);
  const option = await scope.findByText(name, { selector: '.ant-select-item-option-content' });
  fireEvent.click(option);
}

// Ant Design uses the same generated accessibility ID for every popup in tests.
async function findDialog(title) {
  const heading = await screen.findByText(title, { selector: '.ant-modal-title' }, { timeout: 5000 });
  return heading.closest('[role="dialog"]');
}

it('searches by username, roll number, and room number and combines search with a role filter', async () => {
  render(<CreateUser />);
  expect(await screen.findByRole('cell', { name: 'Taylor Lee' })).toBeInTheDocument();
  const search = screen.getByRole('textbox', { name: 'Search users' });
  for (const value of ['taylor', 's123', 'b205']) {
    fireEvent.change(search, { target: { value } });
    expect(screen.getByRole('cell', { name: 'Taylor Lee' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Site Admin' })).not.toBeInTheDocument();
  }
  await chooseOption(screen.getByRole('combobox', { name: 'Filter by role' }), 'Admin');
  expect(screen.getByText('No users match your filters')).toBeInTheDocument();
});

it('adds a role from the last dropdown option without losing the create-user draft', async () => {
  adminAPI.createRole.mockResolvedValue(response({ roleId: 4, roleName: 'Reception' }));
  adminAPI.createUser.mockResolvedValue(response({}));
  render(<CreateUser />);
  const launch = await screen.findByRole('button', { name: 'Create User' });
  await waitFor(() => expect(launch).not.toHaveClass('ant-btn-loading'));
  fireEvent.click(launch);
  const dialog = await findDialog('Create User');
  fireEvent.change(within(dialog).getByLabelText('Username'), { target: { value: 'new-user' } });
  await chooseOption(within(dialog).getByLabelText('Role'), 'Admin');
  fireEvent.mouseDown(within(dialog).getByLabelText('Role'));
  const roleOption = await screen.findByText('Create Role', { selector: '.ant-select-item-option-content' });
  expect(roleOption.closest('.ant-select-item-option')).toBe(roleOption.closest('.ant-select-item-option').parentElement.lastElementChild);
  fireEvent.click(roleOption);
  const roleDialog = await findDialog('Create Role');
  fireEvent.change(within(roleDialog).getByLabelText('Role name'), { target: { value: 'Reception' } });
  fireEvent.click(within(roleDialog).getByRole('button', { name: 'Create Role' }));
  await waitFor(() => expect(roleDialog).not.toBeVisible(), { timeout: 5000 });
  expect(within(dialog).getByLabelText('Username')).toHaveValue('new-user');
  expect(within(dialog).getByTitle('Admin')).toHaveTextContent('Admin');
  await chooseOption(within(dialog).getByLabelText('Role'), 'Reception');
  fireEvent.change(within(dialog).getByLabelText('Email address'), { target: { value: 'new@example.test' } });
  fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'dummy-password' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create User' }));
  await waitFor(() => expect(adminAPI.createUser).toHaveBeenCalledWith({
    username: 'new-user', email: 'new@example.test', password: 'dummy-password', roleId: 4, hostel_id: null
  }), { timeout: 5000 });
});

it('edits a student without altering their assignment and requires confirmation before deleting', async () => {
  adminAPI.updateUser.mockResolvedValue(response({}));
  adminAPI.deleteUser.mockImplementation(async () => {
    adminAPI.getUsers.mockResolvedValue(response([accounts[0]]));
    return response({});
  });
  render(<CreateUser />);
  const edit = await screen.findByRole('button', { name: 'Edit Taylor Lee' });
  await waitFor(() => expect(edit).toBeEnabled());
  expect(screen.getByRole('button', { name: 'Delete Site Admin' })).toBeDisabled();
  fireEvent.click(edit);
  const dialog = await findDialog('Edit Taylor Lee');
  expect(within(dialog).getByLabelText('Role')).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText('Username'), { target: { value: 'Taylor Updated' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(adminAPI.updateUser).toHaveBeenCalledWith(5, {
    username: 'Taylor Updated', email: 'taylor@example.test', roleId: 2, hostel_id: 7
  }), { timeout: 5000 });
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Delete Taylor Lee' }));
  expect(adminAPI.deleteUser).not.toHaveBeenCalled();
  fireEvent.click(within(await findDialog('Delete Taylor Lee?')).getByRole('button', { name: 'Delete user' }));
  await waitFor(() => expect(screen.queryByRole('cell', { name: 'Taylor Lee' })).not.toBeInTheDocument(), { timeout: 5000 });
  expect(adminAPI.deleteUser).toHaveBeenCalledWith(5);
});

it('filters staff by hostel and retries a role and hostel reassignment with the same selections', async () => {
  const mess = { roleId: 4, roleName: 'Mess' };
  adminAPI.getRoles.mockResolvedValue(response([admin, student, warden, mess]));
  adminAPI.getHostels.mockResolvedValue(response([{ id: 7, name: 'Maple House' }, { id: 8, name: 'Oak House' }]));
  adminAPI.getUsers.mockResolvedValue(response([...accounts, {
    userId: 6, userName: 'Warden One', userMail: 'warden@example.test', roleId: 3, role: warden, hostel_id: 8
  }]));
  adminAPI.updateUser.mockRejectedValueOnce(new Error('Choose an active hostel.')).mockResolvedValue(response({}));
  render(<ConfigProvider getPopupContainer={trigger => trigger?.parentElement ?? document.body} theme={{ token: { motion: false } }}>
    <CreateUser />
  </ConfigProvider>);
  const edit = await screen.findByRole('button', { name: 'Edit Warden One' });
  await waitFor(() => expect(edit).toBeEnabled());
  await chooseOption(screen.getByRole('combobox', { name: 'Filter users by hostel' }), 'Oak House');
  expect(screen.queryByRole('cell', { name: 'Taylor Lee' })).not.toBeInTheDocument();
  fireEvent.click(edit);

  const dialog = await findDialog('Edit Warden One');
  await chooseOption(within(dialog).getByLabelText('Role'), 'Mess', within(dialog));
  await chooseOption(within(dialog).getByLabelText('Assigned hostel'), 'Maple House', within(dialog));
  const save = within(dialog).getByRole('button', { name: 'Save changes' });
  fireEvent.click(save);
  expect(await screen.findByText('Choose an active hostel.', {}, { timeout: 5000 })).toBeInTheDocument();
  fireEvent.click(save);
  await waitFor(() => expect(adminAPI.updateUser).toHaveBeenCalledTimes(2), { timeout: 5000 });
  expect(adminAPI.updateUser).toHaveBeenLastCalledWith(6, {
    username: 'Warden One', email: 'warden@example.test', roleId: 4, hostel_id: 7
  });
});
