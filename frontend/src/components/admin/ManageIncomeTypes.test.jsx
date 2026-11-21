import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ManageIncomeTypes from './ManageIncomeTypes';
import { adminAPI } from '../../services/api';

vi.mock('../../services/api', () => ({ adminAPI: {
  getIncomeTypes: vi.fn(), updateIncomeType: vi.fn(), createIncomeType: vi.fn(), deleteIncomeType: vi.fn(),
} }));

const category = { id: 1, name: 'Cash Token', description: 'Historical collection', createdAt: '2026-10-14' };
const response = data => ({ data: { data } });

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
beforeEach(() => {
  vi.resetAllMocks();
  adminAPI.getIncomeTypes.mockResolvedValue(response([category, { id: 2, name: 'Newspaper' }]));
});
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

it('searches the same list and keeps edit values after a failed save', async () => {
  adminAPI.updateIncomeType.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({});
  render(<ManageIncomeTypes />);
  await screen.findByText('Cash Token');
  const search = screen.getByRole('textbox', { name: 'Search income categories' });
  fireEvent.change(search, { target: { value: 'Historical' } });
  expect(screen.queryByText('Newspaper')).not.toBeInTheDocument();
  expect(screen.getByText('1 of 2 categories')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Edit Cash Token' }));
  const modal = within(await screen.findByRole('dialog'));
  const name = modal.getByRole('textbox', { name: 'Category name' });
  expect(name).toHaveValue('Cash Token');
  fireEvent.change(name, { target: { value: 'Cash receipts' } });
  fireEvent.click(modal.getByRole('button', { name: 'Save changes' }));
  expect(await modal.findByText('Connection lost')).toBeInTheDocument();
  expect(name).toHaveValue('Cash receipts');
  fireEvent.click(modal.getByRole('button', { name: /Save changes/ }));
  expect(await screen.findByText('Cash receipts was updated.')).toBeInTheDocument();
  expect(adminAPI.updateIncomeType).toHaveBeenLastCalledWith(1, { name: 'Cash receipts', description: 'Historical collection' });
});

it('uses the existing deactivation action and reloads the categories', async () => {
  adminAPI.deleteIncomeType.mockResolvedValue({});
  adminAPI.getIncomeTypes.mockResolvedValueOnce(response([category])).mockResolvedValueOnce(response([]));
  render(<ManageIncomeTypes />);
  fireEvent.click(await screen.findByRole('button', { name: 'Deactivate Cash Token' }));
  const modal = within(await screen.findByRole('dialog'));
  expect(modal.getByText(/will stop appearing/)).toBeInTheDocument();
  fireEvent.click(modal.getByRole('button', { name: 'Deactivate', exact: true }));
  expect(await screen.findByText('No income categories yet.')).toBeInTheDocument();
  expect(adminAPI.deleteIncomeType).toHaveBeenCalledWith(1);
});
