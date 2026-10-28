import React, { useState } from 'react';
import { Modal, Button, Input, Alert, Form } from 'antd';
import { authAPI } from '../../services/api';

export default function ForgotPassword({ onClose }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const submit = async values => {
    setBusy(true); setError('');
    try {
      if (step === 'email') {
        const address = values.email.trim().toLowerCase();
        const response = await authAPI.forgotPassword({ email: address });
        setEmail(address); setNotice(response.data.message); setStep('otp');
      } else if (step === 'otp') {
        const response = await authAPI.verifyPasswordOtp({ email, otp: values.otp });
        setResetToken(response.data.resetToken); setNotice('Email verified. Enter your new password twice.'); setStep('password');
      } else {
        const response = await authAPI.resetPassword({ email, resetToken, ...values });
        setResetToken(''); setNotice(response.data.message); setStep('done');
      }
    } catch (e) { setError(e.message || 'Unable to reset password.'); }
    finally { setBusy(false); }
  };
  return <Modal title="Forgot password" open onCancel={busy ? undefined : onClose} footer={null} closable={!busy} mask={{ closable: false }}>
    {notice && <Alert role="status" type="info" title={notice} style={{ marginBottom: 16 }} />}
    {error && <Alert role="alert" type="error" title={error} style={{ marginBottom: 16 }} />}
    {step === 'done' ? <Button type="primary" block onClick={onClose}>Back to sign in</Button> :
      <Form key={step} layout="vertical" onFinish={submit} disabled={busy}>
        {step === 'email' && <Form.Item label="Registered email" name="email" rules={[{ required: true, type: 'email' }]}><Input autoComplete="email" placeholder="Enter your registered email" /></Form.Item>}
        {step === 'otp' && <><p>Enter the six-digit code sent to {email}.</p><Form.Item label="Email OTP" name="otp" rules={[{ required: true, pattern: /^\d{6}$/, message: 'Enter the six-digit code.' }]}><Input autoComplete="one-time-code" inputMode="numeric" maxLength={6} /></Form.Item></>}
        {step === 'password' && <>
          <Form.Item label="New password" name="newPassword" rules={[{ required: true, min: 8 }]}><Input.Password autoComplete="new-password" placeholder="At least 8 characters" /></Form.Item>
          <Form.Item label="Confirm new password" name="confirmPassword" dependencies={['newPassword']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator: (_, value) => !value || value === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('Passwords do not match.')) })]}><Input.Password autoComplete="new-password" /></Form.Item>
        </>}
        <Button type="primary" htmlType="submit" block loading={busy}>{step === 'email' ? 'Send OTP' : step === 'otp' ? 'Verify OTP' : 'Reset password'}</Button>
        {step !== 'email' && <Button type="link" block onClick={() => { setStep('email'); setResetToken(''); setNotice(''); setError(''); }}>Request a new code / change email</Button>}
      </Form>}
  </Modal>;
}
