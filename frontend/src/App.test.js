import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import api from './services/api';

vi.mock('./components/admin/AdminDashboard', () => ({ default: () => <h1>Admin dashboard</h1> }));
vi.mock('./components/warden/WardenDashboard', () => ({ default: () => <h1>Warden dashboard</h1> }));
vi.mock('./components/mess/MessDashboard', () => ({ default: () => <h1>Mess dashboard</h1> }));
vi.mock('./components/common/NotificationBell', () => ({ default: () => null }));

const originalAdapter = api.defaults.adapter;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.history.replaceState({}, '', '/login');
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  api.defaults.adapter = originalAdapter;
});

it('requires sign-in before showing hostel approval controls', async () => {
  render(React.createElement(App));
  expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Username or Rollnumber')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve date range' })).not.toBeInTheDocument();
});

it('switches between staff accounts and returns to Admin while keeping the original login', async () => {
  const admin = { userId: 99, userName: 'Administrator', role: 'admin' };
  localStorage.setItem('token', 'admin-token-fixture');
  localStorage.setItem('user', JSON.stringify(admin));
  window.history.replaceState({}, '', '/dashboard?workspace=admin');
  api.defaults.adapter = async config => ({
    config, status: 200, headers: {},
    data: { data: config.url === '/admin/staff-workspaces' ? [
      { id: 11, name: 'Warden North', role: 'warden', hostel: { id: 1, name: 'North Hostel' } },
      { id: 21, name: 'Mess South', role: 'mess', hostel: { id: 2, name: 'South Hostel' }, inventory: { id: 10, name: 'Shared Inventory' } },
    ] : { grants: {} } },
  });
  render(<App />);
  await screen.findByRole('heading', { name: 'Admin dashboard' });
  const switcher = screen.getByRole('button', { name: 'Workspace' });
  fireEvent.click(switcher);
  fireEvent.click(await screen.findByRole('menuitem', { name: /Warden North/ }));
  expect(await screen.findByRole('heading', { name: 'Warden dashboard' })).toBeInTheDocument();
  expect(screen.getByText('North Hostel')).toBeInTheDocument();
  expect(sessionStorage.getItem('activeAdminStaffId')).toBe('11');

  fireEvent.click(switcher);
  fireEvent.click(await screen.findByRole('menuitem', { name: /Mess South/ }));
  expect(await screen.findByRole('heading', { name: 'Mess dashboard' })).toBeInTheDocument();
  expect(screen.getByText('South Hostel')).toBeInTheDocument();
  expect(sessionStorage.getItem('activeAdminStaffId')).toBe('21');

  fireEvent.click(switcher);
  fireEvent.click(await screen.findByText('Manage the system'));
  await waitFor(() => expect(sessionStorage.getItem('activeAdminStaffId')).toBeNull());
  expect(screen.getByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBe('admin-token-fixture');
  expect(JSON.parse(localStorage.getItem('user'))).toEqual(admin);
}, 30000);

it.each([true, false])('opens the Security gate console and enforces scan access (%s)', async (allowScan) => {
  localStorage.setItem('token', 'security-token-fixture');
  localStorage.setItem('user', JSON.stringify({ userId: 82, userName: 'Gate Officer', role: 'security' }));
  window.history.replaceState({}, '', '/dashboard');
  const gateRequests = [];
  api.defaults.adapter = async config => {
    if (config.url.startsWith('/outpass/')) gateRequests.push(config);
    const data = config.url === '/permissions/mine' ? { role: 'security', grants: {
      security: { dashboard: ['view'], 'gate-activity': ['view'], 'gate-scan': allowScan ? ['view', 'create'] : ['view'] }
    } } : [];
    return { config, status: 200, headers: {}, data: {
      data, success: true, ...(config.url === '/outpass/scan' ? { message: 'Exit recorded' } : {})
    } };
  };
  render(<App />);
  await screen.findByRole('heading', { name: 'Security Gate Console' }, { timeout: 10000 });
  await waitFor(() => expect(gateRequests.map(request => request.url)).toEqual([
    '/outpass/today-activity', '/outpass/outside', '/outpass/recent-scans'
  ]), { timeout: 5000 });
  const submit = screen.getByRole('button', { name: 'Verify & Log' });
  if (allowScan) {
    fireEvent.change(screen.getByRole('textbox', { name: 'Outpass QR token' }), { target: { value: 'fixture-pass' } });
    fireEvent.click(submit);
    await screen.findByRole('heading', { name: 'Exit recorded' }, { timeout: 7000 });
    const scan = gateRequests.find(request => request.url === '/outpass/scan');
    expect(scan.method).toBe('post');
    expect(JSON.parse(scan.data)).toEqual({ qrToken: 'fixture-pass' });
  } else {
    expect(submit).toBeDisabled();
    expect(gateRequests.some(request => request.url === '/outpass/scan')).toBe(false);
  }
}, 120000);
