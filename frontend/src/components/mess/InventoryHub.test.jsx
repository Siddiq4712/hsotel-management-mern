import React from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import InventoryHub from './InventoryHub';

vi.mock('./ItemManagement', () => ({ default: () => <div>Shared item editor</div> }));
vi.mock('./StockManagement', () => ({ default: () => <div>Inventory stock editor</div> }));
vi.mock('./InventoryManagement', () => ({ default: () => <div>Purchase reports and corrections</div> }));
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(cleanup);

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output>{location.search}</output><button onClick={() => navigate(-1)}>Back</button></>;
}
function mount(path = '/inventory?workspace=mess', initialTab) {
  return render(<MemoryRouter initialEntries={[path]}><InventoryHub initialTab={initialTab} /><Navigation /></MemoryRouter>);
}

it('opens current stock and switches between the existing tools while preserving workspace', async () => {
  mount();
  expect(screen.getByText('Inventory stock editor')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Items' }));
  expect(await screen.findByText('Shared item editor')).toBeInTheDocument();
  expect(screen.getByText('?workspace=mess&inventoryTab=items')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText('Inventory stock editor')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('tab', { name: 'Purchase History' }));
  expect(await screen.findByText('Purchase reports and corrections')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Back'));
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Items' })).toHaveAttribute('aria-selected', 'true'));
});

it('opens a bookmarked tab and supports legacy item and stock destinations', () => {
  const view = mount('/inventory?workspace=mess&inventoryTab=purchases');
  expect(screen.getByRole('tab', { name: 'Purchase History' })).toHaveAttribute('aria-selected', 'true');
  view.unmount();
  mount('/items?workspace=mess', 'items');
  expect(screen.getByRole('tab', { name: 'Items' })).toHaveAttribute('aria-selected', 'true');
});

it('falls back to current stock for an invalid tab', () => {
  mount('/inventory?inventoryTab=unknown');
  expect(screen.getByRole('tab', { name: 'Current Stock' })).toHaveAttribute('aria-selected', 'true');
});
