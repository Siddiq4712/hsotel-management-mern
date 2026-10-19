import React from 'react';
import { beforeAll, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import MessOrderDashboard from './MessOrderDashboard';
import { messAPI } from '../../services/api';
import { ACTIVE_FOOD_ORDER_STATUSES } from '../../utils/additionalFoodSummary';

vi.mock('../../services/api', () => ({ messAPI: { getFoodOrders: vi.fn() } }));
vi.mock('./AdditionalFoodStudentReport', () => ({ default: () => <button>Student Food Report</button> }));
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(cleanup);

it('shows a food summary including staff extras without approval actions, and refreshes totals', async () => {
  const food = { food_item_id: 1, quantity: 2, food_name_snapshot: 'Egg', category_snapshot: 'Non-Veg', meal_type_snapshot: 'Breakfast' };
  const base = { id: 1, student_id: 10, order_source: 'student', status: 'pending', requested_time: '2026-10-25T04:00:00Z', FoodOrderItems: [food] };
  const staff = { ...base, id: 2, order_source: 'staff', status: 'confirmed', FoodOrderItems: [{ ...food, quantity: 3 }] };
  messAPI.getFoodOrders.mockResolvedValueOnce({ data: { data: [base, staff] } })
    .mockResolvedValueOnce({ data: { data: [base, staff, { ...staff, id: 3, student_id: 20 }] } });
  render(<MessOrderDashboard />);
  await screen.findByText('Egg');
  expect(messAPI.getFoodOrders).toHaveBeenCalledWith({ status: ACTIVE_FOOD_ORDER_STATUSES });
  expect(screen.queryByRole('button', { name: /approve|reject|confirm/i })).toBeNull();
  const cells = within(screen.getByText('Egg').closest('tr')).getAllByRole('cell');
  expect(cells.slice(4).map(cell => cell.textContent)).toEqual(['1', '2', '3', '5']);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await waitFor(() => {
    const refreshed = within(screen.getByText('Egg').closest('tr')).getAllByRole('cell');
    expect(refreshed.slice(4).map(cell => cell.textContent)).toEqual(['2', '2', '6', '8']);
  });
}, 60000);
