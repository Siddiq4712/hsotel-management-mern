import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import WardenWorkspace from './WardenWorkspace';
import { adminAPI } from '../../services/api';
vi.mock('../../services/api', () => ({ adminAPI: { getHostels: vi.fn() } }));
vi.mock('antd', () => ({
  Form: { Provider: ({ children }) => <>{children}</> }, Modal: { confirm: vi.fn() }, message: { info: vi.fn() },
  Alert: ({ title }) => <div role="alert">{title}</div>, Button: ({ onClick, children }) => <button onClick={onClick}>{children}</button>,
  Select: ({ options, value, onChange, 'aria-label': label }) => <select aria-label={label} value={value ?? ''} onChange={event => onChange(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>
}));
beforeEach(() => {
  sessionStorage.clear(); vi.clearAllMocks();
  adminAPI.getHostels.mockResolvedValue({ data: { data: [{ id: 1, name: 'Hostel A', is_active: true }, { id: 2, name: 'Hostel B', is_active: true }] } });
});
afterEach(cleanup);
it('browses all hostels and remembers a selected hostel for the next tab', async () => {
  const view = render(<WardenWorkspace><div>Roster</div></WardenWorkspace>);
  await screen.findByText('Roster');
  expect(screen.getByLabelText('Warden hostel')).toHaveValue('all');
  fireEvent.change(screen.getByLabelText('Warden hostel'), { target: { value: '2' } });
  expect(sessionStorage.getItem('selectedWardenHostelId')).toBe('2');
  view.unmount();
  render(<WardenWorkspace><div>Requests</div></WardenWorkspace>);
  await screen.findByText('Requests');
  expect(screen.getByLabelText('Warden hostel')).toHaveValue('2');
  fireEvent.change(screen.getByLabelText('Warden hostel'), { target: { value: 'all' } });
  expect(sessionStorage.getItem('selectedWardenHostelId')).toBeNull();
});
it('requires one hostel for layouts and clears an invalid remembered hostel', async () => {
  sessionStorage.setItem('selectedWardenHostelId', '999');
  render(<WardenWorkspace requireHostel><div>Layout editor</div></WardenWorkspace>);
  await screen.findByText('Choose a hostel to manage its rooms or layout.');
  expect(screen.queryByText('Layout editor')).not.toBeInTheDocument();
  expect(sessionStorage.getItem('selectedWardenHostelId')).toBeNull();
  fireEvent.change(screen.getByLabelText('Warden hostel'), { target: { value: '1' } });
  expect(screen.getByText('Layout editor')).toBeInTheDocument();
});
