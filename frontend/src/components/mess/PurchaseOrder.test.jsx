import React from 'react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { message } from 'antd';
import PurchaseOrder from './PurchaseOrder';
import { messAPI } from '../../services/api';

vi.mock('../../services/api', () => ({ messAPI: {
  getReceivedPurchaseOrders: vi.fn(), getItems: vi.fn(), getStores: vi.fn(), receivePurchaseOrder: vi.fn(),
} }));
vi.mock('./PurchaseSuggestions', () => ({ default: ({ onReceiveItem }) => <button onClick={() => onReceiveItem({ item_id: 1, quantity_needed: 10 })}>Receive suggested rice</button> }));
vi.mock('antd', async importOriginal => {
  const actual = await importOriginal();
  return { ...actual, message: { success: vi.fn(), error: vi.fn() },
    Select: ({ options, value, onChange, id, placeholder, disabled }) => <select id={id} value={value ?? ''} disabled={disabled} onChange={event => onChange(Number(event.target.value))}>
      <option value="">{placeholder}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>,
  };
});
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
beforeEach(() => {
  vi.clearAllMocks();
  messAPI.getItems.mockResolvedValue({ data: { data: [{ id: 1, name: 'Rice', UOM: { abbreviation: 'kg' } }] } });
  messAPI.getStores.mockResolvedValue({ data: { data: [{ id: 2, name: 'Supplier One' }] } });
  messAPI.getReceivedPurchaseOrders.mockResolvedValue({ data: { data: [] } });
  messAPI.receivePurchaseOrder.mockResolvedValue({ data: { success: true } });
});
afterEach(cleanup);

it('records received quantities and rates without making an expense request', async () => {
  const user = userEvent.setup();
  render(<PurchaseOrder />);
  const receive = await screen.findByRole('button', { name: 'Record received order' });
  await waitFor(() => expect(receive).toBeEnabled());
  fireEvent.click(receive);
  fireEvent.change(screen.getByLabelText('Order reference'), { target: { value: 'PO-001' } });
  fireEvent.change(screen.getByLabelText('Supplier store'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Item', { exact: true }), { target: { value: '1' } });
  await user.type(screen.getByLabelText('Received quantity'), '10');
  await user.type(screen.getByLabelText('Purchase rate (₹ / unit)'), '50');
  expect(await screen.findByText('Total purchase value: ₹500.00')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm receipt & add stock' }));
  await waitFor(() => expect(messAPI.receivePurchaseOrder).toHaveBeenCalledWith({ order_reference: 'PO-001', store_id: 2, items: [{ item_id: 1, quantity: 10, unit_price: 50 }] }));
  await waitFor(() => expect(message.success).toHaveBeenCalled());
});

it('lets suggestions prefill quantity and preserves the form on a duplicate receipt rejection', async () => {
  const user = userEvent.setup();
  render(<PurchaseOrder />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Record received order' })).toBeEnabled());
  fireEvent.click(screen.getByRole('tab', { name: 'Purchase Suggestions' }));
  fireEvent.click(await screen.findByText('Receive suggested rice'));
  expect(screen.getByLabelText('Received quantity')).toHaveValue('10.00');
  fireEvent.change(screen.getByLabelText('Order reference'), { target: { value: 'PO-EXISTING' } });
  fireEvent.change(screen.getByLabelText('Supplier store'), { target: { value: '2' } });
  await user.type(screen.getByLabelText('Purchase rate (₹ / unit)'), '40');
  messAPI.receivePurchaseOrder.mockRejectedValue({ response: { data: { message: 'Already received.' } } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm receipt & add stock' }));
  await waitFor(() => expect(message.error).toHaveBeenCalledWith('Already received.'));
  expect(screen.getByLabelText('Order reference')).toHaveValue('PO-EXISTING');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
