import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { App, ConfigProvider } from 'antd';
import RoomAllotment from './RoomAllotment';
import { wardenAPI } from '../../services/api';

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { hostel: { name: 'North Hostel' } } }) }));
vi.mock('../../services/api', () => ({
  wardenAPI: { getStudents: vi.fn(), getAvailableRooms: vi.fn(), allotRoom: vi.fn() },
}));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('allows only the available seats and reviews the selected student before assigning', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  const students = [
    { userId: 21, userName: 'Resident A', roll_number: 'NEC21' },
    { userId: 22, userName: 'Resident B', roll_number: 'NEC22' },
    { userId: 23, userName: 'Already assigned', tbl_RoomAllotments: [{ is_active: true }] },
  ];
  wardenAPI.getStudents.mockResolvedValueOnce({ data: { data: students } })
    .mockResolvedValueOnce({ data: { data: students.slice(1) } });
  wardenAPI.getAvailableRooms.mockResolvedValueOnce({ data: { data: [
    { id: 102, room_number: '102', occupancy_count: 2, RoomType: { capacity: 3 } },
  ] } }).mockResolvedValueOnce({ data: { data: [] } });
  wardenAPI.allotRoom.mockResolvedValue({});

  await act(async () => { render(<ConfigProvider theme={{ token: { motion: false } }}><App><RoomAllotment /></App></ConfigProvider>); });
  expect(screen.queryByText('Already assigned')).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /Resident A/ })).toBeDisabled();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Target room' }));
  fireEvent.click(await screen.findByText('Room 102', { selector: '.ant-select-item-option-content .allotment-room-option > span:first-child' }, { timeout: 10000 }));
  expect(screen.getByText('67%')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('checkbox', { name: /Resident A/ }));
  expect(screen.getByRole('checkbox', { name: /Resident B/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Assign to Room 102' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByText('Resident A')).toBeInTheDocument();
  expect(wardenAPI.allotRoom).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(dialog.getByRole('button', { name: 'Confirm & Save' })); });
  expect(wardenAPI.allotRoom).toHaveBeenCalledExactlyOnceWith({ student_id: 21, room_id: 102 });
  const waitingList = within(screen.getByRole('list', { name: 'Students without rooms' }));
  expect(waitingList.queryByText('Resident A')).not.toBeInTheDocument();
  expect(waitingList.getByText('Resident B')).toBeInTheDocument();
}, 90000);
