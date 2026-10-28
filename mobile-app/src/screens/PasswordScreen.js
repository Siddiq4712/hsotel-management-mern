import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Text } from '../components/common/ReferenceDesign';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import ReferenceHeader from '../components/common/ReferenceHeader';
import colors from '../theme/colors';
import { authAPI } from '../api/api';
import { ShieldCheck, Check } from 'lucide-react-native';

export default function PasswordScreen({ navigation, route }) {
  const changing = route.name === 'ChangePassword';
  const [step, setStep] = useState(changing ? 'password' : 'email');
  const [form, setForm] = useState({ email: '', otp: '', oldPassword: '', newPassword: '', confirmPassword: '' });
  const [resetToken, setResetToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const update = (name, value) => { setForm(previous => ({ ...previous, [name]: value })); setError(''); };
  const submit = async () => {
    if (busy) return;
    setError('');
    const email = form.email.trim().toLowerCase();
    if (step === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter your registered email address.');
    if (step === 'otp' && !/^\d{6}$/.test(form.otp)) return setError('Enter the six-digit code from your email.');
    if (step === 'password') {
      if (changing && !form.oldPassword) return setError('Enter your current password.');
      if (form.newPassword.length < 8) return setError('Use at least 8 characters.');
      if (form.newPassword !== form.confirmPassword) return setError('New passwords do not match.');
      if (changing && form.oldPassword === form.newPassword) return setError('Choose a password different from your current password.');
    }
    setBusy(true);
    try {
      if (step === 'email') {
        const response = await authAPI.forgotPassword({ email });
        update('email', email); setNotice(response.data.message); setStep('otp');
      } else if (step === 'otp') {
        const response = await authAPI.verifyPasswordOtp({ email, otp: form.otp });
        setResetToken(response.data.resetToken); setNotice('Email verified. Create your new password.'); setStep('password');
      } else {
        const response = changing ? await authAPI.changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword, confirmPassword: form.confirmPassword })
          : await authAPI.resetPassword({ email, resetToken, newPassword: form.newPassword, confirmPassword: form.confirmPassword });
        setForm({ email: '', otp: '', oldPassword: '', newPassword: '', confirmPassword: '' });
        setResetToken(''); setNotice(response.data.message); setStep('done');
      }
    } catch (e) { setError(e.message || 'Unable to update password.'); }
    finally { setBusy(false); }
  };
  const field = (name, label, placeholder, secret = false) => <View style={styles.field} key={name}>
    <Text style={styles.label}>{label} <Text style={{ color: colors.danger }}>*</Text></Text>
    <Input accessibilityLabel={label} placeholder={placeholder} value={form[name]} onChangeText={value => update(name, value)}
      editable={!busy} secureTextEntry={secret} autoCapitalize="none" autoCorrect={false}
      autoComplete={secret ? (name === 'oldPassword' ? 'current-password' : 'new-password') : name === 'email' ? 'email' : 'one-time-code'}
      keyboardType={name === 'email' ? 'email-address' : name === 'otp' ? 'number-pad' : 'default'}
      maxLength={name === 'otp' ? 6 : undefined} style={styles.input} />
  </View>;
  return <View style={styles.page}>
    <ReferenceHeader title={changing ? 'Change password' : 'Forgot password'} subtitle="Secure your account" back notifications={false} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.info}><ShieldCheck size={21} color={colors.primary} /><Text style={styles.infoText}>{changing ? 'Enter your current password, then create a new password you have not used for this account before.' : 'Verify your registered email with an OTP to reset your password.'}</Text></View>
        {notice ? <Text accessibilityRole="text" accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {step === 'email' && field('email', 'Registered email', 'Enter your registered email')}
        {step === 'otp' && <><Text style={styles.hint}>Enter the code sent to {form.email}. Check your spam folder too.</Text>{field('otp', 'Email OTP', '6-digit code')}</>}
        {step === 'password' && <>
          {changing && <>{field('oldPassword', 'Current password', 'Enter current password', true)}<Text style={styles.divider}>NEW PASSWORD</Text></>}
          {field('newPassword', 'New password', 'Enter new password', true)}
          <Text style={styles.hint}>Use at least 8 characters.</Text>
          {field('confirmPassword', 'Confirm new password', 'Enter the password again', true)}
          <View style={styles.checks}>{[
            ['At least 8 characters', form.newPassword.length >= 8],
            ...(changing ? [['Different from current password', !!form.newPassword && form.newPassword !== form.oldPassword]] : []),
            ['Both new passwords match', !!form.newPassword && form.newPassword === form.confirmPassword],
          ].map(([label, valid]) => <View key={label} style={styles.check}><Check size={15} color={valid ? '#16805d' : colors.mutedText} /><Text style={[styles.hint, valid && { color: '#16805d' }]}>{label}</Text></View>)}</View>
        </>}
        {step === 'done' ? <Button onPress={() => navigation.goBack()}>{changing ? 'Back to profile' : 'Back to sign in'}</Button> : <>
          <Button onPress={submit} loading={busy}>{step === 'email' ? 'Send OTP' : step === 'otp' ? 'Verify OTP' : changing ? 'Update password' : 'Reset password'}</Button>
          {!changing && step !== 'email' && <Button variant="ghost" disabled={busy} onPress={() => { setStep('email'); setResetToken(''); setNotice(''); setError(''); update('otp', ''); }}>Request a new code / change email</Button>}
          <Button variant="secondary" disabled={busy} onPress={() => navigation.goBack()} style={{ backgroundColor: colors.card }}>Cancel</Button>
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, gap: 16, paddingBottom: 40 },
  info: { flexDirection: 'row', gap: 12, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryTint, borderRadius: 14, padding: 14 },
  infoText: { color: colors.primaryDark, fontSize: 12, lineHeight: 19, flex: 1 },
  field: { gap: 9 }, label: { fontSize: 14, color: colors.text, fontWeight: '600' },
  input: { paddingHorizontal: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, minHeight: 52 },
  hint: { fontSize: 12, color: colors.mutedText, lineHeight: 18 },
  divider: { color: colors.mutedText, fontSize: 10, textAlign: 'center', letterSpacing: 1.4, paddingVertical: 6 },
  checks: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 10 }, check: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  error: { color: colors.danger, fontSize: 14 }, notice: { color: colors.primaryDark, fontSize: 14, lineHeight: 21 },
});
