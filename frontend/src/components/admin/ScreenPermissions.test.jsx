import React from 'react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ConfigProvider, message } from 'antd';
import ScreenPermissions from './ScreenPermissions';
import api from '../../services/api';
import { defaultPermissions } from '../../../../shared/permissions.js';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
// Exercise the real matrix controls with a focused catalogue, avoiding unrelated
// Ant Design rows that make jsdom save-flow tests slow on Windows.
vi.mock('../../../../shared/permissions.js', async importOriginal => {
  const actual = await importOriginal();
  return { ...actual, SCREENS: actual.SCREENS.filter(s => ['attendance', 'leave-approvals'].includes(s.id)) };
});
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(url => Promise.resolve({ data: { data: url.endsWith('/history') ? { rows: [], count: 0 } : { revision: 3, grants: defaultPermissions(), counts: { warden: 2, student: 50 } } } }));
  api.put.mockImplementation((url, body) => Promise.resolve({ data: { data: { revision: 4, grants: body.grants } } }));
});
afterEach(() => { cleanup(); message.destroy(); });
// Text selectors avoid repeated computed-style scans of Ant Design's tables in jsdom.
const button = (name, scope = screen) => scope.getByText(name, { selector: 'button, button span' }).closest('button');

it('renders role columns and saves a reviewed role change with its revision and reason', async () => {
  render(<ConfigProvider theme={{ token: { motion: false } }}><ScreenPermissions /></ConfigProvider>);
  fireEvent.change(screen.getByLabelText('Search screens'), { target: { value: 'Attendance' } });
  const cell = await screen.findByLabelText('Warden: Attendance');
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/permissions'));
  const headers = [...document.querySelectorAll('thead th')].map(header => header.textContent);
  expect(headers.some(text => text.startsWith('LAPC'))).toBe(false);
  expect(headers.some(text => text.startsWith('Student'))).toBe(true);
  expect(screen.getAllByText('Full · protected').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Not applicable').length).toBeGreaterThan(0);
  fireEvent.mouseDown(cell);
  fireEvent.click(await screen.findByText('View', { selector: '.ant-select-item-option-content' }));
  fireEvent.click(button('Review & Save'));
  const dialog = screen.getByRole('dialog');
  expect(button('Save Changes', within(dialog))).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText('Reason for change'), { target: { value: 'Attendance review only during reconciliation' } });
  fireEvent.click(button('Save Changes', within(dialog)));
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
  const [url, payload] = api.put.mock.calls[0];
  expect(url).toBe('/permissions'); expect(payload.revision).toBe(3);
  expect(payload.grants.warden.attendance).toEqual(['view']);
  expect(payload.grants.student).toEqual(defaultPermissions().student);
  expect(payload.reason).toMatch(/reconciliation/);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), { timeout: 10000 });
}, 60000);

it('keeps a failed save open and lets the administrator discard the draft', async () => {
  api.put.mockRejectedValue(new Error('Another administrator changed permissions. Reload and review your changes again.'));
  render(<ConfigProvider theme={{ token: { motion: false } }}><ScreenPermissions /></ConfigProvider>);
  fireEvent.change(screen.getByLabelText('Search screens'), { target: { value: 'Leave Requests' } });
  await waitFor(() => expect(button('Apply to draft')).not.toBeDisabled());
  fireEvent.click(button('Apply to draft'));
  fireEvent.click(button('Review & Save'));
  fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Reason for change'), { target: { value: 'Review only' } });
  fireEvent.click(button('Save Changes', within(screen.getByRole('dialog'))));
  await waitFor(() => expect(api.put).toHaveBeenCalled());
  await waitFor(() => expect(screen.getAllByText(/Another administrator changed permissions/).length).toBeGreaterThan(0));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.click(button('Cancel', within(screen.getByRole('dialog'))));
  fireEvent.click(button('Discard Changes'));
  expect(button('Review & Save')).toBeDisabled();
}, 60000);
