import React, { useState } from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InventoryWorkspace, { useInventoryWorkspace } from './InventoryWorkspace';
import { inventoryAPI } from '../../services/api';

const auth = vi.hoisted(() => ({ user: { role: 'admin', userId: 1 } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../services/api', () => ({ inventoryAPI: { list: vi.fn() } }));
vi.mock('antd', () => ({
  Form: { Provider: ({ children }) => <>{children}</> },
  Modal: { confirm: vi.fn() }, message: { info: vi.fn() },
  Space: ({ children }) => <div>{children}</div>,
  Typography: { Text: ({ children }) => <span>{children}</span> },
  Button: ({ children, onClick, href }) => <button onClick={onClick} data-href={href}>{children}</button>,
  Alert: ({ title, action }) => <div role="alert">{title}{action}</div>,
  Select: ({ options, value, onChange, 'aria-label': label }) => <select aria-label={label} value={value || ''} onChange={event => onChange(Number(event.target.value))}>
    <option value="">Select inventory</option>{options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
  </select>,
}));
function Entry() {
  const inventory = useInventoryWorkspace();
  const [value, setValue] = useState('');
  return <div><span>Loaded stock: {inventory.name}</span><input aria-label="Entry quantity" value={value} onChange={event => setValue(event.target.value)} /></div>;
}
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear(); auth.user = { role: 'admin', userId: 1 };
  inventoryAPI.list.mockResolvedValue({ data: { data: [
    { id: 10, name: 'Central Inventory', hostels: [{ id: 1, name: 'Hostel A' }, { id: 2, name: 'Hostel B' }] },
    { id: 20, name: 'Separate Inventory', hostels: [{ id: 3, name: 'Hostel C' }] },
  ] } });
});
afterEach(cleanup);

it('requires inventory selection, exposes supplied hostels, and resets entries when changing pools', async () => {
  render(<InventoryWorkspace><Entry /></InventoryWorkspace>);
  await screen.findByText('Choose an inventory to view this page.');
  expect(screen.queryByLabelText('Entry quantity')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Inventory for stock management'), { target: { value: '10' } });
  expect(screen.getByText('Supplies: Hostel A, Hostel B')).toBeInTheDocument();
  expect(sessionStorage.getItem('selectedInventoryId')).toBe('10');
  fireEvent.change(screen.getByLabelText('Entry quantity'), { target: { value: '4' } });
  fireEvent.change(screen.getByLabelText('Inventory for stock management'), { target: { value: '20' } });
  expect(screen.getByText('Loaded stock: Separate Inventory')).toBeInTheDocument();
  expect(screen.getByLabelText('Entry quantity').value).toBe('');
  expect(sessionStorage.getItem('selectedInventoryId')).toBe('20');
});

it('automatically uses the assigned pool for mess staff', async () => {
  auth.user = { role: 'mess', userId: 2 };
  inventoryAPI.list.mockResolvedValue({ data: { data: [{ id: 10, name: 'Central Inventory', hostels: [{ id: 1, name: 'Hostel A' }, { id: 2, name: 'Hostel B' }] }] } });
  render(<InventoryWorkspace><Entry /></InventoryWorkspace>);
  await screen.findByText('Loaded stock: Central Inventory');
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(sessionStorage.getItem('selectedInventoryId')).toBe('10');
});

it('does not load stock when inventory assignments fail and offers retry', async () => {
  inventoryAPI.list.mockRejectedValueOnce(new Error('Offline'));
  render(<InventoryWorkspace><Entry /></InventoryWorkspace>);
  await screen.findByText('Unable to load inventory assignments.');
  expect(screen.queryByLabelText('Entry quantity')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(inventoryAPI.list).toHaveBeenCalledTimes(2));
  await screen.findByText('Choose an inventory to view this page.');
});
