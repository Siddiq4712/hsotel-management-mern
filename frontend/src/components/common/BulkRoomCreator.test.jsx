import React from 'react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { message, Modal } from 'antd';
import { adminAPI, wardenAPI } from '../../services/api';
import BulkRoomCreator from './BulkRoomCreator';
vi.setConfig({ testTimeout: 60000 });

vi.mock('../../services/api', () => ({
  adminAPI: { getHostels: vi.fn(), getRoomTypes: vi.fn(), previewBulkRooms: vi.fn(), createBulkRooms: vi.fn(), deleteBulkRooms: vi.fn(), getRooms: vi.fn() },
  wardenAPI: { getRoomTypes: vi.fn(), previewBulkRooms: vi.fn(), createBulkRooms: vi.fn(), deleteBulkRooms: vi.fn(), getRooms: vi.fn() }
}));
vi.mock('antd', async importOriginal => {
  const actual = await importOriginal();
  return { ...actual, Select: ({ id, value, options = [], onChange, disabled, 'aria-label': ariaLabel }) => <select id={id} aria-label={ariaLabel} disabled={disabled} value={value ?? ''} onChange={event => onChange(/^\d+$/.test(event.target.value) ? Number(event.target.value) : event.target.value || undefined)}>
    <option value="">Choose</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select> };
});
const types = [{ id: 4, hostel_id: 2, name: 'Double', capacity: 2 }, { id: 5, hostel_id: 3, name: 'Triple', capacity: 3 }];
const preview = { hostel_name: 'Hostel II', room_type_name: 'Double', floor: 0, total: 100, to_create: 99, skipped: 1,
  rooms: [{ room_number: 'S1', exists: false }, { room_number: 'S2', exists: true }] };
beforeAll(() => {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
beforeEach(() => {
  vi.clearAllMocks();
  for (const api of [adminAPI, wardenAPI]) {
    api.getRoomTypes.mockResolvedValue({ data: { data: types } });
    api.previewBulkRooms.mockResolvedValue({ data: { data: preview } });
    api.createBulkRooms.mockResolvedValue({ data: { data: { ...preview, created: 99 } } });
    api.getRooms.mockResolvedValue({ data: { data: [] } });
    api.deleteBulkRooms.mockResolvedValue({ data: { data: { deleted: 1 } } });
  }
  adminAPI.getHostels.mockResolvedValue({ data: { data: [{ id: 2, name: 'Hostel II' }, { id: 3, name: 'Hostel III' }] } });
});
afterEach(() => { cleanup(); message.destroy(); Modal.destroyAll(); vi.restoreAllMocks(); });
async function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Bulk Create Rooms' }));
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Preview Rooms' })).toBeEnabled());
  return within(dialog);
}
it('warden previews and saves using assigned hostel without a hostel selector', async () => {
  const onCreated = vi.fn();
  render(<BulkRoomCreator onCreated={onCreated} showRooms />);
  const dialog = await open();
  expect(dialog.queryByLabelText('Hostel')).toBeNull();
  fireEvent.change(dialog.getByLabelText('Room Type'), { target: { value: '4' } });
  fireEvent.change(dialog.getByLabelText('Prefix (optional)'), { target: { value: 'S' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Preview Rooms' }));
  await dialog.findByText('Skip existing');
  expect(wardenAPI.previewBulkRooms).toHaveBeenCalledWith(expect.objectContaining({ prefix: 'S', start_number: 1, end_number: 100, room_type_id: 4 }));
  expect(wardenAPI.previewBulkRooms.mock.calls[0][0]).not.toHaveProperty('hostel_id');
  fireEvent.click(dialog.getByRole('button', { name: 'Create 99 Rooms' }));
  await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  expect(wardenAPI.createBulkRooms).toHaveBeenCalledWith(wardenAPI.previewBulkRooms.mock.calls[0][0]);
  expect(wardenAPI.getRooms).toHaveBeenCalledTimes(2);
});
it('admin selects a hostel and sees only its room types', async () => {
  render(<BulkRoomCreator isAdmin />);
  const dialog = await open();
  expect(dialog.getByLabelText('Room Type')).toBeDisabled();
  fireEvent.change(dialog.getByLabelText('Hostel'), { target: { value: '2' } });
  expect(await dialog.findByRole('option', { name: 'Double (2 beds)' })).toBeInTheDocument();
  expect(dialog.queryByRole('option', { name: 'Triple (3 beds)' })).toBeNull();
  fireEvent.change(dialog.getByLabelText('Room Type'), { target: { value: '4' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Preview Rooms' }));
  await dialog.findByText('Skip existing');
  expect(adminAPI.previewBulkRooms).toHaveBeenCalledWith(expect.objectContaining({ hostel_id: 2, room_type_id: 4 }));
  fireEvent.change(dialog.getByLabelText('Hostel'), { target: { value: '3' } });
  expect(dialog.getByLabelText('Room Type')).toHaveValue('');
  expect(dialog.getByRole('button', { name: 'Create Rooms' })).toBeDisabled();
});
it('changing the pattern invalidates the preview before saving', async () => {
  render(<BulkRoomCreator />);
  const dialog = await open();
  fireEvent.change(dialog.getByLabelText('Room Type'), { target: { value: '4' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Preview Rooms' }));
  await dialog.findByText('Skip existing');
  fireEvent.change(dialog.getByLabelText('End Number'), { target: { value: '50' } });
  expect(dialog.getByRole('button', { name: 'Create Rooms' })).toBeDisabled();
  expect(wardenAPI.createBulkRooms).not.toHaveBeenCalled();
});

it('deletes only selected filtered empty rooms after confirmation and clears hidden selections', async () => {
  const rooms = [
    { id: 1, room_number: 'S1', floor: 0, room_type_id: 4, occupancy_count: 0, RoomType: { name: 'Double', capacity: 2 } },
    { id: 2, room_number: 'S2', floor: 0, room_type_id: 4, occupancy_count: 1, RoomType: { name: 'Double', capacity: 2 } },
    { id: 3, room_number: 'G1', floor: 1, room_type_id: 4, occupancy_count: 0, RoomType: { name: 'Double', capacity: 2 } }
  ];
  wardenAPI.getRooms.mockResolvedValueOnce({ data: { data: rooms } }).mockResolvedValue({ data: { data: rooms.slice(1) } });
  let confirmation;
  vi.spyOn(Modal, 'confirm').mockImplementation(options => { confirmation = options; return { destroy() {} }; });
  render(<BulkRoomCreator showRooms />);
  await screen.findByText('S1');
  fireEvent.change(screen.getByLabelText('Filter room prefix'), { target: { value: 'S' } });
  expect(screen.queryByText('G1')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Select Filtered Rooms' }));
  expect(screen.getByRole('button', { name: 'Delete Selected (1)' })).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Filter room prefix'), { target: { value: 'G' } });
  expect(screen.getByRole('button', { name: 'Delete Selected (0)' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Filter room prefix'), { target: { value: 'S' } });
  fireEvent.click(screen.getByRole('button', { name: 'Select Filtered Rooms' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Selected (1)' }));
  expect(wardenAPI.deleteBulkRooms).not.toHaveBeenCalled();
  expect(confirmation.content).toBe('S1');
  await act(async () => { await confirmation.onOk(); });
  expect(wardenAPI.deleteBulkRooms).toHaveBeenCalledWith({ room_ids: [1] });
  expect(screen.queryByText('S1')).toBeNull();
  expect(screen.getByText('S2')).toBeInTheDocument();
});
