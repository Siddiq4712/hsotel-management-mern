import React from 'react';
import { beforeAll, beforeEach, afterEach, afterAll, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WeeklyMenuWorkspace, { localToday } from './WeeklyMenuWorkspace';
import { menuPlanningAPI } from '../../services/api';

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'mess' } }) }));
vi.mock('../../services/api', () => ({ menuPlanningAPI: { hostels: vi.fn(), metadata: vi.fn(), day: vi.fn(), publish: vi.fn(), override: vi.fn(), consume: vi.fn(), settings: vi.fn() } }));
beforeAll(() => {
  configure({ asyncUtilTimeout: 15000 });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(cleanup); afterAll(() => vi.unstubAllGlobals());
const slot = { key: 'lunch', label: 'Lunch', time: '12:30', category: 'lunch' };
const meal = { date: localToday(), slot_key: 'lunch', slot, dishes: 'Rice and sambar', expected_count: 100,
  configured: true, plan_id: 1, plan_name: 'Annual menu', status: 'planned', source_key: 'plan:1:lunch', ingredients: [{ item_id: 1, quantity_per_serving: .1 }] };
const metadata = { settings_revision: 1, permissions: { plan: true, override: true, consume: true, settings: true },
  can_manage_permissions: false, settings: { default_count: 100, slots: [slot], permissions: { plan: ['mess'], override: ['mess'], consume: ['mess'], settings: ['mess'] } },
  plans: [{ id: 1, kind: 'regular', name: 'Annual menu', effective_from: '2026-01-01', default_count: 100, slots: [slot], meals: [{ day: 1, slot_key: 'lunch', dishes: 'Rice and sambar' }] }],
  menus: [], history: [], items: [{ id: 1, name: 'Rice', unit: 'kg', current_stock: 100 }] };
beforeEach(() => {
  vi.clearAllMocks();
  menuPlanningAPI.hostels.mockResolvedValue({ data: { data: [{ id: 2, name: 'Hostel 2' }] } });
  menuPlanningAPI.metadata.mockResolvedValue({ data: { data: structuredClone(metadata) } });
  menuPlanningAPI.day.mockResolvedValue({ data: { data: [structuredClone(meal)] } });
  menuPlanningAPI.override.mockResolvedValue({ data: { data: {} } });
  menuPlanningAPI.publish.mockResolvedValue({ data: { data: {} } });
});
const mount = props => render(<MemoryRouter><WeeklyMenuWorkspace {...props} /></MemoryRouter>);
it('shows the recurring meal without requiring staff to create schedules', async () => {
  mount();
  expect(await screen.findByRole('heading', { name: 'Rice and sambar' })).toBeInTheDocument();
  expect(screen.getByText('100', { exact: true })).toBeInTheDocument();
  expect(menuPlanningAPI.day).toHaveBeenCalledWith(2, localToday());
  expect(menuPlanningAPI.consume).not.toHaveBeenCalled();
});
it('saves a count override only for the selected date while preserving ingredient suggestions', async () => {
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Change menu / count' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Expected students' }), { target: { value: '120' } });
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Override reason' }), { target: { value: 'Holiday students' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save for this date only' }));
  await waitFor(() => expect(menuPlanningAPI.override).toHaveBeenCalledWith(2, localToday(), 'lunch', expect.objectContaining({ expected_count: 120, source_key: meal.source_key, clear_ingredients: false })));
  expect(menuPlanningAPI.publish).not.toHaveBeenCalled(); expect(menuPlanningAPI.consume).not.toHaveBeenCalled();
});
it('opens editable actual quantities and does not deduct stock on opening the form', async () => {
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Record consumption' }));
  const dialog = await screen.findByRole('dialog');
  expect(Number(within(dialog).getByRole('spinbutton', { name: 'Actual quantity 1' }).value)).toBe(10);
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Actual quantity 1' }), { target: { value: '11' } });
  expect(Number(within(dialog).getByRole('spinbutton', { name: 'Actual quantity 1' }).value)).toBe(11);
  expect(menuPlanningAPI.consume).not.toHaveBeenCalled();
}, 30000);
it('publishes a weekly version with its effective date and optional free-text dishes', async () => {
  mount({ initialTab: 'plans' });
  fireEvent.click(await screen.findByRole('button', { name: 'Create / revise weekly plan' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Monday Lunch dishes' }), { target: { value: 'Vegetable rice and curd' } });
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Reason for publishing' }), { target: { value: 'Annual menu revision' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Publish plan' }));
  await waitFor(() => expect(menuPlanningAPI.publish).toHaveBeenCalledWith(2, expect.objectContaining({ effective_from: localToday(), settings_revision: 1,
    meals: [expect.objectContaining({ day: 1, slot_key: 'lunch', dishes: 'Vegetable rice and curd' })] })));
});
