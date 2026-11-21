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
  it('orders Admin navigation by workflow and keeps related pages together', () => {
    mount();
    const nav = screen.getByRole('navigation', { name: 'Workspace navigation' });
    const sections = Array.from(nav.querySelectorAll('.ant-menu-item-group'), group => [
      group.querySelector('.ant-menu-item-group-title').textContent,
      within(group).getAllByRole('menuitem').map(item => item.textContent),
    ]);

    expect(sections).toEqual([
      ['Workspace', ['Overview']],
      ['Hostel Operations', ['Manage Hostels', 'Manage Rooms', 'Manage Batches', 'Monthly Attendance Import']],
      ['Requests', ['Mess Reductions', 'Gate Pass Logs']],
      ['Administration', ['Manage Users', 'Screen Permissions', 'Activity Logs']],
      ['Configuration', ['Income Types', 'Expense Types', 'Units of Measure']],
    ]);
  });

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
  it('fades in a different page without delaying sidebar navigation', () => {
    function Workspace() {
      const [view, select] = React.useState('dashboard');
      return <Layout workspace="admin" currentView={view} setCurrentView={select}><h1>{view}</h1><Location /></Layout>;
    }
    render(<MemoryRouter><Workspace /></MemoryRouter>);
    const animate = vi.fn(() => ({ cancel: vi.fn() }));
    screen.getByRole('main').querySelector('.workspace-content').animate = animate;
    const nav = screen.getByRole('navigation', { name: 'Workspace navigation' });
    const hostels = within(nav).getByText('Manage Hostels');
    fireEvent.click(hostels);
    expect(screen.getByRole('heading', { name: 'hostels' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/hostels?workspace=admin');
    expect(animate).toHaveBeenCalledTimes(1);
    fireEvent.click(hostels);
    expect(animate).toHaveBeenCalledTimes(1);
  });
  it('opens mobile navigation and closes it after selecting a destination', async () => {
    mount();
    fireEvent.click(screen.getByLabelText('Open navigation'));
    const nav = await screen.findByRole('navigation', { name: 'Mobile workspace navigation' });
    fireEvent.click(within(nav).getByText('Manage Hostels'));
    expect(screen.getByLabelText('Open navigation')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('location')).toHaveTextContent('/hostels?workspace=admin');
  });
  it('offers sign out from the Admin workspace menu', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Workspace' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Logout' }));
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

  it.each([
    ['admin', ['Mess Reductions', 'Gate Pass Logs'], 'Gate Pass Logs', '/outpass-logs?workspace=admin'],
    ['warden', ['Leave Requests', 'Mess Reductions', 'Gate Pass Requests', 'Room Requests', 'Complaints'], 'Gate Pass Requests', '/outpass-approval?workspace=warden'],
    ['student', ['My Leaves', 'Mess Reductions', 'Gate Pass', 'Rooms & Requests', 'My Complaints'], 'Gate Pass', '/outpass'],
  ])('groups %s requests together and opens the existing gate pass page', (workspace, labels, gateLabel, destination) => {
    if (workspace === 'student') useAuth.mockReturnValue({ user: { role: 'student' }, logout: vi.fn() });
    mount({ workspace });
    const navigation = screen.getByRole('navigation', { name: 'Workspace navigation' });
    const group = within(navigation).getByText('Requests', { exact: true }).closest('.ant-menu-item-group');
    expect(within(group).getAllByRole('menuitem').map(item => item.textContent)).toEqual(labels);
    fireEvent.click(within(group).getByRole('menuitem', { name: gateLabel }));
    expect(screen.getByTestId('location')).toHaveTextContent(destination);
  });
});
