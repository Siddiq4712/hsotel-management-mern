import React from 'react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/login');
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
});
afterEach(cleanup);

it('requires sign-in before showing hostel approval controls', async () => {
  render(React.createElement(App));
  expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  expect(screen.getByPlaceholderText('userName or Roll Number')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve date range' })).not.toBeInTheDocument();
});
