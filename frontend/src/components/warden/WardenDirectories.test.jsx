import React from 'react';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App, ConfigProvider } from 'antd';
import HolidayManagement from './HolidayManagement';
import LegacyRebateHistory from './LegacyRebateHistory';
import SuspensionManagement from './SuspensionManagement';
import { StaffWorkspaceContext } from '../../context/StaffWorkspaceContext';
import { wardenAPI } from '../../services/api';

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'admin', hostel: { name: 'Original Hostel' } } }) }));
vi.mock('../../services/api', () => ({ wardenAPI: {
  getHolidays: vi.fn(), getRebates: vi.fn(), getSuspensions: vi.fn(), getStudents: vi.fn(),
} }));

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
afterAll(() => vi.unstubAllGlobals());

const data = rows => ({ data: { data: rows } });
const mount = component => render(<ConfigProvider theme={{ token: { motion: false } }}>
  <App><StaffWorkspaceContext.Provider value={{ id: 7, hostel: { id: 3, name: 'Selected Hostel' } }}>
    {component}
  </StaffWorkspaceContext.Provider></App>
</ConfigProvider>);

it('keeps the selected hostel visible and separates holiday load failures from empty results', async () => {
  wardenAPI.getHolidays.mockResolvedValueOnce(data([{ id: 1, name: 'Campus Day', type: 'institutional', date: '2026-11-20' }]))
    .mockRejectedValueOnce(new Error('Calendar unavailable'));
  mount(<HolidayManagement />);
  expect(screen.getByText('Selected Hostel')).toBeInTheDocument();
  expect(await screen.findByText('Campus Day', {}, { timeout: 5000 })).toBeInTheDocument();
  const refresh = screen.getByRole('button', { name: /Refresh/ });
  await waitFor(() => expect(refresh).not.toHaveClass('ant-btn-loading'));
  fireEvent.click(refresh);
  expect(await screen.findByText('Calendar unavailable', {}, { timeout: 5000 })).toBeInTheDocument();
  expect(screen.queryByText('Campus Day')).not.toBeInTheDocument();
}, 60000);

it('finds a suspension by roll number and opens its recorded details', async () => {
  const record = { id: 4, student_id: 10, Student: { userName: 'Resident One', roll_number: 'S103' },
    reason: 'Recorded incident', remarks: 'Reviewed by the warden', status: 'active', start_date: '2026-11-19' };
  wardenAPI.getSuspensions.mockResolvedValue(data([record, { id: 5, student_id: 11, start_date: '2026-11-19' }]));
  wardenAPI.getStudents.mockResolvedValue(data([]));
  mount(<SuspensionManagement />);
  await screen.findByText('S103', { exact: false }, { timeout: 5000 });
  fireEvent.change(screen.getByRole('textbox', { name: 'Search suspensions' }), { target: { value: 's103' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review' }));
  const dialog = within(await screen.findByRole('dialog', {}, { timeout: 5000 }));
  expect(dialog.getByText('Recorded incident')).toBeInTheDocument();
  expect(dialog.getByText('Reviewed by the warden')).toBeInTheDocument();
}, 60000);

it('searches historical rebate records by roll number', async () => {
  wardenAPI.getRebates.mockResolvedValue(data([
    { id: 1, student_id: 10, RebateStudent: { userName: 'Resident One', roll_number: 'S103' }, amount: 15 },
    { id: 2, student_id: 11, RebateStudent: { userName: 'Resident Two', roll_number: 'S104' }, amount: 25 },
  ]));
  mount(<LegacyRebateHistory />);
  await screen.findByText('Resident Two', {}, { timeout: 5000 });
  fireEvent.change(screen.getByRole('textbox', { name: 'Search legacy rebates' }), { target: { value: 's103' } });
  expect(screen.getByText('Resident One')).toBeInTheDocument();
  expect(screen.queryByText('Resident Two')).not.toBeInTheDocument();
}, 60000);
