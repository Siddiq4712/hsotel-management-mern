import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import WardenWorkspace from './WardenWorkspace';
import { StaffWorkspaceContext, StaffWorkspaceGuardContext } from '../../context/StaffWorkspaceContext';
import { useScopeDraft, useWorkspaceScope } from '../common/WorkspaceScope';
import { Modal } from 'antd';

vi.mock('antd', () => ({
  Form: { Provider: ({ children }) => <>{children}</> },
  Modal: { confirm: vi.fn() }, message: { info: vi.fn() },
}));

function Roster({ dirty = false }) {
  const scope = useWorkspaceScope();
  useScopeDraft(dirty);
  return <div>Roster scope {scope.id}</div>;
}

afterEach(cleanup);

it('uses the selected staff account hostel for scoped pages', () => {
  render(<StaffWorkspaceContext.Provider value={{ id: 20, hostel: { id: 2, name: 'Hostel B' } }}>
    <WardenWorkspace><Roster /></WardenWorkspace>
  </StaffWorkspaceContext.Provider>);
  expect(screen.getByText('Hostel B')).toBeInTheDocument();
  expect(screen.getByText('Roster scope 2')).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});

it('hides the hostel card while still scoping requests and protecting drafts', () => {
  const guard = { current: null };
  const changeWorkspace = vi.fn();
  render(<StaffWorkspaceGuardContext.Provider value={guard}>
    <StaffWorkspaceContext.Provider value={{ id: 20, hostel: { id: 2, name: 'Hostel B' } }}>
      <WardenWorkspace showHostelCard={false}><Roster dirty /></WardenWorkspace>
    </StaffWorkspaceContext.Provider>
  </StaffWorkspaceGuardContext.Provider>);

  expect(screen.queryByRole('region', { name: 'Hostel scope' })).not.toBeInTheDocument();
  expect(screen.getByText('Roster scope 2')).toBeInTheDocument();
  guard.current(changeWorkspace);
  expect(Modal.confirm).toHaveBeenCalledWith(expect.objectContaining({ onOk: changeWorkspace }));
  expect(changeWorkspace).not.toHaveBeenCalled();
});
