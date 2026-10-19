import React from 'react';
import { beforeAll, beforeEach, afterEach, afterAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { message, Modal } from 'antd';
import ManageHostels from './ManageHostels';
import { adminAPI } from '../../services/api';

vi.mock('../../services/api', () => ({ adminAPI: { getHostels: vi.fn(), getHostelById: vi.fn(), updateHostel: vi.fn(), createHostel: vi.fn(), deleteHostel: vi.fn() } }));
const hostel = { id: 7, name: 'Maple House', address: 'Campus North', contact_number: '12345', email: 'maple@example.invalid', capacity: 20, is_active: true, HostelRooms: [{ id: 1 }], createdAt: '2026-01-01' };
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
beforeEach(() => {
  vi.clearAllMocks();
  adminAPI.getHostels.mockResolvedValue({ data: { data: [hostel] } });
  adminAPI.getHostelById.mockResolvedValue({ data: { data: hostel } });
  adminAPI.updateHostel.mockResolvedValue({ data: { success: true } });
  adminAPI.createHostel.mockResolvedValue({ data: { success: true } });
  adminAPI.deleteHostel.mockResolvedValue({ data: { success: true, message: 'Hostel deactivated.' } });
});
afterEach(() => { cleanup(); Modal.destroyAll(); message.destroy(); });
afterAll(() => vi.unstubAllGlobals());

it('loads actual hostel details, saves edits, and refreshes the list with correct room counts', async () => {
  render(<ManageHostels />);
  expect(await screen.findByText('1 Rooms')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Maple House' }));
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(within(dialog).getByLabelText('Hostel name')).toHaveValue('Maple House'));
  fireEvent.change(within(dialog).getByLabelText('Hostel name'), { target: { value: 'Maple Residence' } });
  fireEvent.change(within(dialog).getByLabelText('Address'), { target: { value: 'Campus South' } });
  fireEvent.change(within(dialog).getByLabelText('Bed capacity'), { target: { value: '25' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(adminAPI.updateHostel).toHaveBeenCalledWith(7, expect.objectContaining({ name: 'Maple Residence', address: 'Campus South', capacity: 25, is_active: true })));
  await waitFor(() => expect(adminAPI.getHostels).toHaveBeenCalledTimes(2));
}, 30000);

it('creates a hostel from the same page and returns to the refreshed management list', async () => {
  render(<ManageHostels />);
  fireEvent.click(screen.getByRole('button', { name: /Create Hostel/ }));
  fireEvent.change(screen.getByLabelText('Hostel Identity Name'), { target: { value: 'New Residence' } });
  fireEvent.change(screen.getByLabelText('Authorized Bed Capacity'), { target: { value: '15' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
  await waitFor(() => expect(adminAPI.createHostel).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Residence', capacity: 15 })));
  await screen.findByRole('button', { name: 'Edit Maple House' });
}, 30000);

it('sends search and inactive filters to the server and requires confirmation before deletion', async () => {
  render(<ManageHostels />);
  await screen.findByRole('button', { name: 'Delete Maple House' });
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search hostels' }), { target: { value: 'Maple' } });
  fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Search hostels' }), { key: 'Enter', code: 'Enter', keyCode: 13 });
  await waitFor(() => expect(adminAPI.getHostels).toHaveBeenLastCalledWith({ search: 'Maple', include_inactive: 'false' }));
  fireEvent.click(await screen.findByRole('switch', { name: 'Show inactive hostels' }));
  await waitFor(() => expect(adminAPI.getHostels).toHaveBeenLastCalledWith({ search: 'Maple', include_inactive: 'true' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Maple House' }));
  expect(adminAPI.deleteHostel).not.toHaveBeenCalled();
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete / deactivate' }));
  await waitFor(() => expect(adminAPI.deleteHostel).toHaveBeenCalledWith(7));
}, 30000);

it('blocks saving when fresh hostel details fail to load', async () => {
  adminAPI.getHostelById.mockRejectedValue({ response: { data: { message: 'Hostel not found' } } });
  render(<ManageHostels />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Maple House' }));
  await screen.findByText('Hostel not found');
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  expect(adminAPI.updateHostel).not.toHaveBeenCalled();
}, 30000);
