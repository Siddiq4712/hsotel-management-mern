import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('../../context/AuthContext',()=>({useAuth:vi.fn()}));
import { useAuth } from '../../context/AuthContext';
import Header from './Header';

beforeAll(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());
describe('Admin workspace switcher',()=>{
  it.each(['admin', 'mess'])('uses the college header in the %s workspace', workspace => {
    useAuth.mockReturnValue({ user: { role: 'admin' } });
    render(<Header workspace={workspace} />);
    expect(screen.getByRole('img', { name: 'National Engineering College logo' })).toBeInTheDocument();
    expect(screen.getByText(`${workspace} portal`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Workspace' })).toBeInTheDocument();
  });
  it('shows assigned staff and dispatches the account ID',async()=>{
    useAuth.mockReturnValue({user:{role:'admin',username:'admin'}});
    const change=vi.fn();
    render(<Header workspace="admin" onWorkspaceChange={change} workspaceChoices={[
      { id: 17, name: 'Warden 1', role: 'warden', hostel: { id: 5, name: 'Boys Hostel' } },
      { id: 25, name: 'Mess 2', role: 'mess', hostel: { id: 6, name: 'LAPC Hostel' }, inventory: { id: 10, name: 'Boys Inventory' } },
    ]} />);
    const picker=screen.getByRole('button',{name:'Workspace'});
    expect(picker).toHaveAttribute('aria-expanded','false');
    fireEvent.click(picker);
    const warden=await screen.findByRole('menuitem',{name:/Warden/});
    expect(screen.getAllByRole('menuitem')).toHaveLength(4);
    expect(picker).toHaveAttribute('aria-expanded','true');
    fireEvent.click(warden);
    expect(change).toHaveBeenCalledWith('17');
    expect(picker).toHaveAttribute('aria-expanded','false');
  });
  it('logs out from the bottom of the Workspace menu without switching workspace',async()=>{
    const logout=vi.fn();
    const change=vi.fn();
    useAuth.mockReturnValue({user:{role:'admin'},logout});
    render(<Header workspace="admin" onWorkspaceChange={change} />);
    const picker=screen.getByRole('button',{name:'Workspace'});
    fireEvent.click(picker);
    const item=await screen.findByRole('menuitem',{name:'Logout'});
    expect(screen.getAllByRole('menuitem').at(-1)).toBe(item);
    fireEvent.click(item);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(change).not.toHaveBeenCalled();
    expect(picker).toHaveAttribute('aria-expanded','false');
  });
  it('does not offer workspace switching to a regular Warden',()=>{
    useAuth.mockReturnValue({user:{role:'warden'}});
    render(<Header workspace="warden" />);
    expect(screen.queryByRole('button',{name:'Workspace'})).toBeNull();
  });
  it('identifies a staff resident without exposing an administration workspace',()=>{
    useAuth.mockReturnValue({user:{role:'student',resident_type:'staff',username:'Resident'}});
    render(<Header workspace="student" />);
    expect(screen.getByText('Staff resident portal')).toBeInTheDocument();
    expect(screen.getByText('Staff resident')).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Workspace'})).toBeNull();
  });
});
