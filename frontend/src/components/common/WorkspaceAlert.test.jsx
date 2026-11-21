import React from 'react';
import { expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import WorkspaceAlert from './WorkspaceAlert';

it('lets users dismiss information and shows a subsequent error', () => {
  const { rerender } = render(<WorkspaceAlert title="Choose a hostel" />);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss information' }));
  expect(screen.getByRole('alert')).toHaveAttribute('data-show', 'false');

  rerender(<WorkspaceAlert type="error" title="Could not load hostels" />);
  expect(screen.getByText('Could not load hostels')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
