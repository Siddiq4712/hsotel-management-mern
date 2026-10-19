import React from 'react';
import moment from 'moment';
import { beforeAll, beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import StudentFoodMenu, { nextServingDate } from './StudentFoodMenu';
import SpecialFoodItemsManagement from '../mess/SpecialFoodItemsManagement';
import { studentAPI, messAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  studentAPI: { getSpecialFoodItems: vi.fn(), getFoodOrders: vi.fn(), createFoodOrder: vi.fn() },
  messAPI: { getSpecialFoodItems: vi.fn(), createSpecialFoodItem: vi.fn(), updateSpecialFoodItem: vi.fn(), updateSpecialFoodAvailability: vi.fn(), deleteSpecialFoodItem: vi.fn() },
}));
beforeAll(() => {
  configure({ asyncUtilTimeout: 15000 });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const food = { max_quantity_per_student: 2, id: 7, name: 'Extra egg', category: 'Non-Veg', meal_type: 'Lunch', price: '12.50', weekly_day: 1, is_available: true };
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-18T12:00:00+05:30').getTime());
  studentAPI.getSpecialFoodItems.mockResolvedValue({ data: { data: [food] } });
  studentAPI.createFoodOrder.mockResolvedValue({ data: { success: true } });
  studentAPI.getFoodOrders.mockResolvedValue({ data: { data: [] } });
  messAPI.getSpecialFoodItems.mockResolvedValue({ data: { data: [food] } });
  messAPI.updateSpecialFoodItem.mockResolvedValue({ data: { success: true } });
  messAPI.updateSpecialFoodAvailability.mockResolvedValue({ data: { data: { ...food, is_available: false }, message: 'Food is now not available.' } });
});
it('chooses the next weekly occurrence, including today and Sunday rollover', () => {
  expect(nextServingDate(1, moment('2026-10-18')).format('YYYY-MM-DD')).toBe('2026-10-19');
  expect(nextServingDate(0, moment('2026-10-18')).format('YYYY-MM-DD')).toBe('2026-10-18');
  expect(nextServingDate(0, moment('2026-10-19')).format('YYYY-MM-DD')).toBe('2026-10-25');
});
it('opens Add confirmation and submits one dated request without a cart', async () => {
  render(<StudentFoodMenu />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add' }));
  const dialog = await screen.findByRole('dialog');
  expect(studentAPI.createFoodOrder).not.toHaveBeenCalled();
  expect(screen.queryByText(/cart/i)).toBeNull();
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Quantity' }), { target: { value: '2' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm', exact: true }));
  await waitFor(() => expect(studentAPI.createFoodOrder).toHaveBeenCalledWith({ items: [{ food_item_id: 7, quantity: 2 }], serving_date: nextServingDate(1).format('YYYY-MM-DD') }));
  await screen.findByText('My Additional Food Orders');
}, 60000);
it('cancel does not create an order', async () => {
  render(<StudentFoodMenu />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add' }));
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  expect(studentAPI.createFoodOrder).not.toHaveBeenCalled();
}, 60000);
it('keeps confirmation open after a failed submission', async () => {
  studentAPI.createFoodOrder.mockRejectedValue({ response: { data: { message: 'Food unavailable' } } });
  render(<StudentFoodMenu />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add' }));
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm', exact: true }));
  await screen.findByText('Food unavailable');
  expect(screen.getByRole('dialog')).toBeTruthy();
}, 60000);
it('mess staff can save the name, price, category, and weekly day', async () => {
  render(<SpecialFoodItemsManagement />);
  fireEvent.click(await screen.findByRole('button', { name: 'Mark Extra egg as not available' }));
  await screen.findByRole('button', { name: 'Mark Extra egg as available' });
  expect(messAPI.updateSpecialFoodAvailability).toHaveBeenCalledWith(7, false);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Extra egg' }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByRole('textbox', { name: 'Repeat' }).value).toBe('Weekly');
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), { target: { value: 'Boiled egg' } });
  const deadline = within(dialog).getByLabelText('Order deadline (IST)');
  fireEvent.change(deadline, { target: { value: '19:01' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save Additional Food' }));
  await screen.findByText('The deadline cannot be later than 7:00 PM.');
  expect(messAPI.updateSpecialFoodItem).not.toHaveBeenCalled();
  fireEvent.change(deadline, { target: { value: '16:00' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save Additional Food' }));
  await waitFor(() => expect(messAPI.updateSpecialFoodItem).toHaveBeenCalledWith(7, { name: 'Boiled egg', price: 12.50, category: 'Non-Veg', meal_type: 'Lunch', max_quantity_per_student: 2, weekly_day: 1, order_deadline_time: '16:00', is_available: false }));
}, 60000);
it('shows ordering closed at the supervisor deadline on the serving day', async () => {
  Date.now.mockReturnValue(new Date('2026-10-19T16:00:00+05:30').getTime());
  studentAPI.getSpecialFoodItems.mockResolvedValue({ data: { data: [{ ...food, order_deadline_time: '16:00' }] } });
  render(<StudentFoodMenu />);
  expect(await screen.findByRole('button', { name: 'Ordering closed' })).toBeDisabled();
  expect(studentAPI.createFoodOrder).not.toHaveBeenCalled();
}, 60000);
