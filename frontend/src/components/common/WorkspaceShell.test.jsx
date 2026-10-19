import React from 'react';
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Layout from './Layout';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('./NotificationBell', () => ({ default: () => <button>Notifications</button> }));

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  localStorage.clear();
  useAuth.mockReturnValue({ user: { role: 'admin', username: 'Administrator' }, logout: vi.fn() });
});
afterEach(cleanup);
const Location = () => <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>;
const mount = (props = {}) => render(<MemoryRouter><Layout workspace="admin" currentView="dashboard" setCurrentView={vi.fn()} {...props}><h1>Overview</h1><Location /></Layout></MemoryRouter>);

describe('Shared workspace navigation', { timeout: 30000 }, () => {
  it('persists the explicit sidebar preference across mounts', () => {
    const view = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }));
    expect(localStorage.getItem('hostel-sidebar-collapsed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute('aria-expanded', 'false');
    view.unmount();
    mount();
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toBeInTheDocument();
  });
  it('filters navigation and preserves the admin workspace in the destination', () => {
    const select = vi.fn();
    mount({ workspace: 'mess', setCurrentView: select });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search navigation' }), { target: { value: 'purchase orders' } });
    const nav = screen.getByRole('navigation', { name: 'Workspace navigation' });
    expect(within(nav).queryByText('Manage Menus')).not.toBeInTheDocument();
    fireEvent.click(within(nav).getByText('Purchase Orders'));
    expect(select).toHaveBeenCalledWith('purchase-orders');
    expect(screen.getByTestId('location')).toHaveTextContent('/purchase-orders?workspace=mess');
  });
  it('opens mobile navigation and closes it after selecting a destination', async () => {
    mount();
    fireEvent.click(screen.getByLabelText('Open navigation'));
    const nav = await screen.findByRole('navigation', { name: 'Mobile workspace navigation' });
    fireEvent.click(within(nav).getByText('Manage Hostels'));
    expect(screen.getByLabelText('Open navigation')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('location')).toHaveTextContent('/hostels?workspace=admin');
  });
  it('offers working account sign out', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
    expect(useAuth().logout).toHaveBeenCalledOnce();
  });
  it('groups inventory tools under one navigation entry and highlights legacy stock links', () => {
    mount({ workspace: 'mess', currentView: 'stock' });
    const nav = screen.getByRole('navigation', { name: 'Workspace navigation' });
    expect(within(nav).queryByText('Manage Items')).not.toBeInTheDocument();
    expect(within(nav).queryByText('Stock Management')).not.toBeInTheDocument();
    expect(within(nav).queryByText('Inventory Logs')).not.toBeInTheDocument();
    const inventory = within(nav).getByRole('menuitem', { name: 'Inventory Management' });
    expect(inventory).toHaveClass('ant-menu-item-selected');
    fireEvent.click(inventory);
    expect(screen.getByTestId('location')).toHaveTextContent('/inventory?workspace=mess');
  });
});
