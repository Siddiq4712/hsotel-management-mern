import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { PermissionButton } from './PermissionControls';
import { ScreenPermission, ScreenPermissionContext } from '../../context/PermissionContext';

vi.mock('../../context/PermissionContext', async importOriginal => {
  const actual = await importOriginal();
  return { ...actual, usePermissions: () => ({ can: (_, action) => !action || action === 'view' }) };
});
afterEach(cleanup);
it('disables changes while leaving browsing controls usable', () => {
  const edit = vi.fn(), refresh = vi.fn();
  render(<ScreenPermissionContext.Provider value="attendance">
    <PermissionButton permissionAction="edit" onClick={edit}>Save attendance</PermissionButton>
    <PermissionButton onClick={refresh}>Refresh</PermissionButton>
  </ScreenPermissionContext.Provider>);
  expect(screen.getByRole('button', { name: 'Save attendance' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Save attendance' })); expect(edit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' })); expect(refresh).toHaveBeenCalledOnce();
});
