import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import WorkspaceContextHeader from './WorkspaceContextHeader';

afterEach(cleanup);

it('renders a page header without a default dashboard link', () => {
  render(<MemoryRouter><WorkspaceContextHeader title="Attendance" headingAs="h1" /></MemoryRouter>);

  expect(screen.getByRole('heading', { name: 'Attendance' })).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

it('renders a back link when the page supplies a destination and label', () => {
  render(<MemoryRouter>
    <WorkspaceContextHeader title="Room Layout Editor"
      backTo={{ pathname: '/create-room', search: 'workspace=warden' }} backLabel="Back to Manage Rooms" />
  </MemoryRouter>);

  expect(screen.getByRole('link', { name: 'Back to Manage Rooms' })).toHaveAttribute('href', '/create-room?workspace=warden');
});
