import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SinglePageDailyConsumption from './SinglePageDailyConsumption';
import { adminAPI, messAPI } from '../../services/api';

const auth = vi.hoisted(() => ({ user: { role: 'admin' } }));
const scope = vi.hoisted(() => ({ inventory: null }));
vi.mock('./InventoryWorkspace', () => ({ useInventoryWorkspace: () => scope.inventory }));
vi.mock('../common/MomentPickers', () => ({ DatePicker: () => null }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../services/api', () => ({
  adminAPI: { getHostels: vi.fn() },
  messAPI: { getItems: vi.fn(), getUOMs: vi.fn(), getItemStock: vi.fn(), recordSinglePageDailyConsumption: vi.fn() },
}));
// Keep these component tests focused on hostel state and request scope.
vi.mock('antd', () => {
  const Wrap = ({ children }) => <div>{children}</div>;
  const Select = ({ options, children, value, onChange, disabled, 'aria-label': label }) => {
    const choices = options || React.Children.toArray(children).map(child => ({ value: child.props.value, label: 'Rice' }));
    return <select aria-label={label} disabled={disabled} value={value ?? ''}
      onChange={event => onChange(Number(event.target.value))}>
      <option value="">Select</option>
      {choices.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>;
  };
  Select.Option = Wrap;
  return {
    Card: Wrap, Table: Wrap, Tag: Wrap, Space: Wrap, Form: Wrap, Input: Wrap,
    Divider: Wrap, ConfigProvider: Wrap, Row: Wrap, Col: Wrap, Badge: Wrap, Spin: Wrap, Tooltip: Wrap, Progress: Wrap,
    Typography: { Title: Wrap, Text: Wrap, Paragraph: Wrap }, Select,
    DatePicker: () => null,
    Alert: ({ title, message, action }) => <div role="alert">{title || message}{action}</div>,
    Button: ({ children, onClick, disabled }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
    InputNumber: ({ value, onChange, 'aria-label': label }) => <input type="number" aria-label={label} value={value ?? ''}
      onChange={event => onChange(Number(event.target.value))} />,
    Modal: ({ open, title, children, onOk, onCancel, okText, cancelText, cancelButtonProps }) => open
      ? <div role="dialog">{title}{children}<button onClick={onOk}>{okText || 'OK'}</button>
        <button disabled={cancelButtonProps?.disabled} onClick={onCancel}>{cancelText || 'Cancel'}</button></div> : null,
    message: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
  };
});
afterEach(cleanup);
const response = data => ({ data: { data } });
beforeEach(() => {
  vi.resetAllMocks();
  auth.user = { role: 'admin' };
  scope.inventory = null;
  adminAPI.getHostels.mockResolvedValue(response([{ id: 1, name: 'Hostel A' }, { id: 2, name: 'Hostel B' }]));
  messAPI.getItems.mockResolvedValue(response([{ id: 17, name: 'Rice', unit_id: 3, UOM: { abbreviation: 'kg' } }]));
  messAPI.getUOMs.mockResolvedValue(response([{ id: 3, abbreviation: 'kg' }]));
  messAPI.getItemStock.mockImplementation(params => Promise.resolve(response([
    { item_id: 17, current_stock: params?.hostel_id === 2 ? 8 : 40, minimum_stock: 2 },
  ])));
  messAPI.recordSinglePageDailyConsumption.mockResolvedValue(response({ totalCost: 100 }));
});
async function choose(label, option) {
  await waitFor(() => expect(screen.getByRole('combobox', { name: label })).not.toBeDisabled());
  fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value: option === 'Hostel A' ? '1' : '2' } });
}
async function enterRice() {
  await screen.findByRole('combobox', { name: 'Breakfast material 1' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Breakfast material 1' }), { target: { value: '17' } });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Breakfast quantity 1' }), { target: { value: '3' } });
}

it('requires a hostel before loading stock, clears entries on switching, and saves the selected hostel', async () => {
  render(<SinglePageDailyConsumption />);
  await waitFor(() => expect(adminAPI.getHostels).toHaveBeenCalled());
  expect(messAPI.getItemStock).not.toHaveBeenCalled();
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  await choose('Hostel for daily stock entry', 'Hostel A');
  await enterRice();
  expect(messAPI.getItemStock).toHaveBeenLastCalledWith({ hostel_id: 1 });
  expect(screen.getByText('40 kg')).toBeInTheDocument();

  await choose('Hostel for daily stock entry', 'Hostel B');
  const quantity = await screen.findByRole('spinbutton', { name: 'Breakfast quantity 1' });
  expect(quantity.value).toBe('');
  expect(screen.getByRole('combobox', { name: 'Breakfast material 1' }).value).toBe('');
  expect(messAPI.getItemStock).toHaveBeenLastCalledWith({ hostel_id: 2 });
  await enterRice();
  expect(screen.getByText('8 kg')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Submit All Meals/ }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText('Hostel B')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm & Deduct Stock Now' }));
  await waitFor(() => expect(messAPI.recordSinglePageDailyConsumption).toHaveBeenCalledWith(expect.objectContaining({
    hostel_id: 2, items: [expect.objectContaining({ item_id: 17, quantity_consumed: 3, meal_type: 'breakfast' })],
  })));
}, 30000);

it('ignores an older hostel response that finishes after switching hostels', async () => {
  let resolveA;
  messAPI.getItemStock.mockImplementation(params => params.hostel_id === 1
    ? new Promise(resolve => { resolveA = resolve; })
    : Promise.resolve(response([{ item_id: 17, current_stock: 8 }])));
  render(<SinglePageDailyConsumption />);
  await choose('Hostel for daily stock entry', 'Hostel A');
  await waitFor(() => expect(resolveA).toBeTypeOf('function'));
  await choose('Hostel for daily stock entry', 'Hostel B');
  await enterRice();
  await act(async () => resolveA(response([{ item_id: 17, current_stock: 999 }])));
  expect(screen.getByText('8 kg')).toBeInTheDocument();
  expect(screen.queryByText('999 kg')).not.toBeInTheDocument();
}, 30000);

it('blocks entry after a stock loading failure and allows a refresh', async () => {
  messAPI.getItemStock.mockRejectedValueOnce(new Error('Offline'));
  render(<SinglePageDailyConsumption />);
  await choose('Hostel for daily stock entry', 'Hostel A');
  await screen.findByText('Unable to load stock. Refresh stock before entering consumption.');
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Submit & Reduce Stock/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh Stock' }));
  await screen.findByRole('spinbutton', { name: 'Breakfast quantity 1' });
  expect(messAPI.getItemStock).toHaveBeenLastCalledWith({ hostel_id: 1 });
}, 30000);

it('keeps mess staff on their assigned hostel without an admin selector', async () => {
  auth.user = { role: 'mess', hostel_id: 1 };
  render(<SinglePageDailyConsumption />);
  await enterRice();
  expect(adminAPI.getHostels).not.toHaveBeenCalled();
  expect(screen.queryByRole('combobox', { name: 'Hostel for daily stock entry' })).not.toBeInTheDocument();
  expect(messAPI.getItemStock).toHaveBeenCalledWith(undefined);
  fireEvent.click(screen.getByRole('button', { name: /Submit All Meals/ }));
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm & Deduct Stock Now' }));
  await waitFor(() => expect(messAPI.recordSinglePageDailyConsumption).toHaveBeenCalled());
  expect(messAPI.recordSinglePageDailyConsumption.mock.calls[0][0]).not.toHaveProperty('hostel_id');
}, 30000);

it('offers only the selected inventory hostels for consumption attribution', async () => {
  scope.inventory = { id: 10, name: 'Central inventory', hostels: [{ id: 1, name: 'Hostel A' }, { id: 2, name: 'Hostel B' }] };
  render(<SinglePageDailyConsumption />);
  await choose('Hostel for daily stock entry', 'Hostel B');
  await enterRice();
  expect(adminAPI.getHostels).not.toHaveBeenCalled();
  expect(screen.queryByRole('option', { name: 'Hostel C' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Submit All Meals/ }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText('Central inventory')).toBeInTheDocument();
  expect(within(dialog).getByText('Hostel B')).toBeInTheDocument();
}, 30000);
