import React from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App, ConfigProvider } from 'antd';
import UOMManagement from './UOMManagement';
import { messAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  messAPI: { getUOMs: vi.fn(), updateUOM: vi.fn(), createUOM: vi.fn() }
}));

beforeAll(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('keeps search and measurement filtering while editing an existing unit', async () => {
  const liter = { id: 4, name: 'Litre', abbreviation: 'L', type: 'volume' };
  const kilogram = { id: 5, name: 'Kilogram', abbreviation: 'kg', type: 'weight' };
  messAPI.getUOMs.mockImplementation(async ({ type }) => ({
    data: { data: type ? [liter].filter(unit => unit.type === type) : [liter, kilogram] }
  }));
  messAPI.updateUOM.mockResolvedValue({ data: { success: true } });

  render(<ConfigProvider theme={{ token: { motion: false } }}><App><UOMManagement /></App></ConfigProvider>);
  await screen.findByRole('cell', { name: 'Kilogram' });
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Measurement type filter' }));
  fireEvent.click(await screen.findByText('Volume', { selector: '.ant-select-item-option-content' }));
  await waitFor(() => expect(messAPI.getUOMs).toHaveBeenCalledWith({ type: 'volume' }), { timeout: 5000 });
  await waitFor(() => expect(screen.queryByRole('cell', { name: 'Kilogram' })).not.toBeInTheDocument(), { timeout: 5000 });
  fireEvent.change(screen.getByRole('textbox', { name: 'Search units' }), { target: { value: 'Litre' } });
  fireEvent.click(screen.getByRole('button', { name: 'Edit Litre' }));

  const dialog = within(await screen.findByRole('dialog'));
  fireEvent.change(dialog.getByLabelText('Abbreviation'), { target: { value: 'ltr' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(messAPI.updateUOM).toHaveBeenCalledWith(4, {
    name: 'Litre', abbreviation: 'ltr', type: 'volume'
  }), { timeout: 5000 });
}, 120000);
