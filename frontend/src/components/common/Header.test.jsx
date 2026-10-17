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
  it('shows portal choices and dispatches the selected workspace',async()=>{
    useAuth.mockReturnValue({user:{role:'admin',username:'admin'}});
    const change=vi.fn();
    render(<Header workspace="admin" onWorkspaceChange={change} />);
    const picker=screen.getByRole('button',{name:'Workspace'});
    expect(picker).toHaveAttribute('aria-expanded','false');
    fireEvent.click(picker);
    const warden=await screen.findByRole('menuitem',{name:/Warden/});
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(picker).toHaveAttribute('aria-expanded','true');
    fireEvent.click(warden);
    expect(change).toHaveBeenCalledWith('warden');
    expect(picker).toHaveAttribute('aria-expanded','false');
  });
  it('does not offer workspace switching to a regular Warden',()=>{
    useAuth.mockReturnValue({user:{role:'warden'}});
    render(<Header workspace="warden" />);
    expect(screen.queryByRole('button',{name:'Workspace'})).toBeNull();
  });
});
