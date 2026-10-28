import React from 'react';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('../../services/api', () => ({ authAPI: { forgotPassword: vi.fn(), verifyPasswordOtp: vi.fn(), resetPassword: vi.fn() } }));
// Load the real Ant Design CJS distribution directly to avoid transforming its
// entire ES module tree in this focused test.
vi.mock('antd', async () => {
  const { createRequire } = await import('node:module');
  return createRequire(import.meta.url)('antd');
});
import { authAPI } from '../../services/api';
import ForgotPassword from './ForgotPassword';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
beforeAll(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterAll(() => vi.unstubAllGlobals());

it('requires email verification before accepting matching new passwords', async () => {
  authAPI.forgotPassword.mockResolvedValue({ data: { message: 'Check your email.' } });
  authAPI.verifyPasswordOtp.mockResolvedValue({ data: { resetToken: 'verified-token' } });
  authAPI.resetPassword.mockResolvedValue({ data: { message: 'Password reset successfully.' } });
  const close = vi.fn();
  render(<ForgotPassword onClose={close} />);
  expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Registered email'), { target: { value: 'student@example.edu' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
  await waitFor(() => expect(authAPI.forgotPassword).toHaveBeenCalledWith({ email: 'student@example.edu' }));
  fireEvent.change(await screen.findByLabelText('Email OTP'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify OTP' }));
  fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'NewPassword1' } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'WrongPassword1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  await screen.findByText('Passwords do not match.');
  expect(authAPI.resetPassword).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'NewPassword1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  await waitFor(() => expect(authAPI.resetPassword).toHaveBeenCalledWith({ email: 'student@example.edu', resetToken: 'verified-token', newPassword: 'NewPassword1', confirmPassword: 'NewPassword1' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Back to sign in' }));
  expect(close).toHaveBeenCalledOnce();
});

it('keeps the OTP step and reports a rejected verification', async () => {
  authAPI.forgotPassword.mockResolvedValue({ data: { message: 'Check your email.' } });
  authAPI.verifyPasswordOtp.mockRejectedValue(new Error('Invalid or expired verification.'));
  render(<ForgotPassword onClose={() => {}} />);
  fireEvent.change(screen.getByLabelText('Registered email'), { target: { value: 'student@example.edu' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
  fireEvent.change(await screen.findByLabelText('Email OTP'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify OTP' }));
  await screen.findByText('Invalid or expired verification.');
  expect(screen.getByLabelText('Email OTP')).toBeInTheDocument();
  expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
});
