import React from 'react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ItemManagement from './ItemManagement';
import { messAPI } from '../../services/api';

vi.mock('../../services/api', () => ({ messAPI: {
  getItems: vi.fn(), getItemCategories: vi.fn(), getUOMs: vi.fn(), updateItem: vi.fn(), createItem: vi.fn(),
} }));
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
beforeEach(() => {
  vi.clearAllMocks();
  messAPI.getItems.mockResolvedValue({ data: { data: [{
    id: 1, name: 'Rice', category_id: 2, unit_id: 3, unit_price: 45, maximum_quantity: 500,
    stock_quantity: 80, description: 'Keep dry', tbl_ItemCategory: { name: 'Grains' }, UOM: { name: 'Kilogram', abbreviation: 'kg' },
  }] } });
  messAPI.getItemCategories.mockResolvedValue({ data: { data: [{ id: 2, name: 'Grains' }] } });
  messAPI.getUOMs.mockResolvedValue({ data: { data: [{ id: 3, name: 'Kilogram', abbreviation: 'kg' }] } });
  messAPI.updateItem.mockResolvedValue({});
});
afterEach(cleanup);

it('shows shared item details without stock quantities or price summaries', async () => {
  render(<ItemManagement />);
  await screen.findByText('Rice');
  expect(screen.getByText('kg')).toBeInTheDocument();
  expect(screen.getByText('Keep dry')).toBeInTheDocument();
  for (const text of ['Stock Level', 'Unit Price', 'Low Stock Items', 'Est. Stock Value', '80.00', '₹45.00']) {
    expect(screen.queryByText(text)).not.toBeInTheDocument();
  }
});

it('edits item details while preserving existing reference price and replenishment limit', async () => {
  render(<ItemManagement />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit', exact: true }));
  const name = await screen.findByLabelText('Item Name');
  fireEvent.change(name, { target: { value: 'Raw Rice' } });
  expect(screen.queryByLabelText(/Purchase Price/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'OK', exact: true }));
  await waitFor(() => expect(messAPI.updateItem).toHaveBeenCalledWith(1, expect.objectContaining({
    name: 'Raw Rice', category_id: 2, unit_id: 3, description: 'Keep dry', unit_price: 45, maximum_quantity: 500,
  })));
});
