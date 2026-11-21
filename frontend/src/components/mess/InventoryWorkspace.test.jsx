import React, { useState } from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import InventoryWorkspace, { useInventoryWorkspace } from './InventoryWorkspace';
import { inventoryAPI } from '../../services/api';

import { MemoryRouter } from 'react-router-dom';
import { StaffWorkspaceContext } from '../../context/StaffWorkspaceContext';

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
  vi.clearAllMocks();
  inventoryAPI.list.mockResolvedValue({ data: { data: [
    { id: 10, name: 'Central Inventory', hostels: [{ id: 1, name: 'Hostel A' }, { id: 2, name: 'Hostel B' }] },
    { id: 20, name: 'Separate Inventory', hostels: [{ id: 3, name: 'Hostel C' }] },
  ] } });
});
afterEach(cleanup);

it('shows the chosen staff hostel and the assigned shared inventory', async () => {
  const staff = { id: 20, hostel: { id: 2, name: 'Hostel B' }, inventory: { id: 10, name: 'Central Inventory' } };
  render(<MemoryRouter><StaffWorkspaceContext.Provider value={staff}>
    <InventoryWorkspace><Entry /></InventoryWorkspace>
  </StaffWorkspaceContext.Provider></MemoryRouter>);
  expect(await screen.findByText('Loaded stock: Central Inventory')).toBeInTheDocument();
  expect(screen.getByText('Workspace hostel: Hostel B · Supplies: Hostel A, Hostel B')).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});

it('blocks inventory workflows when the hostel needs an assignment', async () => {
  inventoryAPI.list.mockResolvedValue({ data: { data: [] } });
  render(<InventoryWorkspace><Entry /></InventoryWorkspace>);
  await screen.findByText('An inventory assignment is required to open this page.');
  expect(screen.queryByLabelText('Entry quantity')).not.toBeInTheDocument();
});

it('offers retry after the assignment lookup fails', async () => {
  inventoryAPI.list.mockRejectedValueOnce(new Error('Offline'));
  render(<InventoryWorkspace><Entry /></InventoryWorkspace>);
  await screen.findByText('Offline');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Loaded stock: Central Inventory')).toBeInTheDocument();
});
