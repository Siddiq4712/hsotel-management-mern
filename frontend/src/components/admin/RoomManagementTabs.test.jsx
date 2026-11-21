import React from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ConfigProvider, message, Modal } from 'antd';
import RoomManagementTabs from './RoomManagementTabs';
import { adminAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  adminAPI: { getHostels: vi.fn(), getRoomTypes: vi.fn(), getRooms: vi.fn(), updateRoomType: vi.fn(), deleteBulkRooms: vi.fn() }
}));

beforeAll(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => {
  cleanup();
  message.destroy();
  vi.restoreAllMocks();
});

it('keeps room type editing and protects occupied rooms in the filtered directory', async () => {
  const data = list => ({ data: { data: list } });
  const hostel = { id: 3, name: 'Maple Hall' };
  const type = { id: 7, name: 'Double', hostel_id: 3, capacity: 2, description: 'Two beds' };
  const empty = { id: 4, room_number: 'A-101', hostel_id: 3, room_type_id: 7, Hostel: hostel, RoomType: type };
  const occupied = { ...empty, id: 5, room_number: 'A-102', occupancy_count: 1 };
  adminAPI.getHostels.mockResolvedValue(data([hostel]));
  adminAPI.getRoomTypes.mockResolvedValue(data([type]));
  adminAPI.getRooms.mockResolvedValue(data([empty, occupied]));
  adminAPI.updateRoomType.mockResolvedValue(data({ ...type, name: 'Twin' }));
  adminAPI.deleteBulkRooms.mockImplementation(async () => {
    adminAPI.getRooms.mockResolvedValue(data([occupied]));
    return data({ deleted: 1 });
  });
  const confirmation = vi.spyOn(Modal, 'confirm').mockImplementation(() => ({}));

  render(<ConfigProvider theme={{ token: { motion: false } }}><RoomManagementTabs /></ConfigProvider>);
  const edit = await screen.findByRole('button', { name: 'Edit room type Double' });
  fireEvent.click(edit);
  const dialog = within(await screen.findByRole('dialog'));
  fireEvent.change(dialog.getByLabelText('Room type name'), { target: { value: 'Twin' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(adminAPI.updateRoomType).toHaveBeenCalledWith(7, expect.objectContaining({ name: 'Twin', hostel_id: 3 })), { timeout: 5000 });

  fireEvent.click(screen.getByRole('tab', { name: 'Rooms' }));
  expect(await screen.findByRole('button', { name: 'Delete room A-102' })).toBeDisabled();
  const search = screen.getByRole('textbox', { name: 'Search room number' });
  fireEvent.change(search, { target: { value: '101' } });
  expect(screen.queryByRole('cell', { name: 'A-102' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Delete room A-101' }));
  expect(confirmation).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete room A-101?' }));
  expect(adminAPI.deleteBulkRooms).not.toHaveBeenCalled();

  await act(async () => confirmation.mock.calls[0][0].onOk());
  expect(adminAPI.deleteBulkRooms).toHaveBeenCalledWith({ room_ids: [4], hostel_id: 3 });
  expect(screen.getByText('No rooms match your filters')).toBeInTheDocument();
}, 120000);
