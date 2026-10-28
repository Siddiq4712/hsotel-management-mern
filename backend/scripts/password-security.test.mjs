import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

// In-memory model and mail doubles: never changes accounts or sends real email.
let sent = [], failMail = false, registered = true, row = null;
const originalTransport = nodemailer.createTransport;
nodemailer.createTransport = () => ({ sendMail: async options => {
  if (failMail) throw new Error('simulated mail failure');
  sent.push(options); return { messageId: 'test' };
} });
process.env.JWT_SECRET ||= 'password-tests-only-secret';
const { User } = await import('../models/index.js');
const { PasswordReset } = await import('../models/passwordReset.js');
const { default: sequelize } = await import('../config/database.js');
const { forgotPassword, verifyPasswordOtp, resetPassword } = await import('../controllers/passwordResetController.js');
const { changePassword } = await import('../controllers/authController.js');
const { passwordError } = await import('../services/passwordSecurity.js');
const originals = [];
const patch = (object, key, value) => { originals.push([object, key, object[key]]); object[key] = value; };
after(() => { nodemailer.createTransport = originalTransport; for (const [object, key, value] of originals.reverse()) object[key] = value; });
const user = { userId: 7, userMail: 'student@example.edu', password: '', async update(data) { Object.assign(this, data); } };
patch(sequelize, 'transaction', async callback => callback({ LOCK: { UPDATE: 'UPDATE' } }));
patch(User, 'findOne', async () => registered ? user : null);
patch(User, 'findByPk', async () => registered ? user : null);
patch(User, 'update', async (data, { where }) => { if (where.password !== user.password) return [0]; Object.assign(user, data); return [1]; });
patch(PasswordReset, 'findByPk', async () => row);
patch(PasswordReset, 'upsert', async data => { row = { ...data, updatedAt: new Date(),
  async update(values) { Object.assign(this, values); }, async destroy() { row = null; } }; });
patch(PasswordReset, 'destroy', async () => { row = null; });
const invoke = async (controller, body) => {
  const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await controller({ body, user: { userId: 7 } }, response); return response;
};
const email = 'student@example.edu';
async function requestCode() {
  row = null; sent = []; failMail = false; registered = true;
  user.password = await bcrypt.hash('OldPassword1', 4);
  const response = await invoke(forgotPassword, { email: ' STUDENT@example.edu ' });
  assert.equal(response.code, 200);
  return sent[0].text.match(/\b\d{6}\b/)[0];
}

test('password validation rejects missing confirmation, short and oversized passwords', () => {
  assert.ok(passwordError('longpassword', undefined));
  assert.ok(passwordError('short', 'short'));
  assert.ok(passwordError('😀'.repeat(20), '😀'.repeat(20)));
  assert.equal(passwordError('NewPassword1', 'NewPassword1'), null);
});
test('change requires correct current password and matching confirmation', async () => {
  await requestCode(); const before = user.password;
  assert.equal((await invoke(changePassword, { oldPassword: 'wrong', newPassword: 'NewPassword1', confirmPassword: 'NewPassword1' })).code, 400);
  assert.equal((await invoke(changePassword, { oldPassword: 'OldPassword1', newPassword: 'NewPassword1', confirmPassword: 'different' })).code, 400);
  assert.equal(user.password, before);
  assert.equal((await invoke(changePassword, { oldPassword: 'OldPassword1', newPassword: 'NewPassword1', confirmPassword: 'NewPassword1' })).code, 200);
  assert.ok(await bcrypt.compare('NewPassword1', user.password));
  assert.ok(!await bcrypt.compare('OldPassword1', user.password));
});
test('email OTP then matching passwords resets once and stores no plaintext code', async () => {
  const otp = await requestCode();
  assert.notEqual(row.otpHash, otp);
  assert.equal(sent[0].to, email);
  assert.equal((await invoke(forgotPassword, { email })).code, 429);
  assert.equal((await invoke(resetPassword, { email, resetToken: 'a'.repeat(64), newPassword: 'NewPassword1', confirmPassword: 'NewPassword1' })).code, 400);
  const verified = await invoke(verifyPasswordOtp, { email, otp });
  assert.equal(verified.code, 200);
  assert.notEqual(row.tokenHash, verified.body.resetToken);
  assert.equal((await invoke(verifyPasswordOtp, { email, otp })).code, 400);
  const body = { email, resetToken: verified.body.resetToken, newPassword: 'NewPassword1', confirmPassword: 'NewPassword1' };
  assert.equal((await invoke(resetPassword, { ...body, confirmPassword: 'wrong' })).code, 400);
  assert.equal((await invoke(resetPassword, body)).code, 200);
  assert.ok(await bcrypt.compare('NewPassword1', user.password));
  assert.equal((await invoke(resetPassword, body)).code, 400);
});
test('five wrong codes lock verification; expired codes cannot verify', async () => {
  let otp = await requestCode();
  for (let i = 0; i < 5; i++) assert.equal((await invoke(verifyPasswordOtp, { email, otp: otp === '111111' ? '222222' : '111111' })).code, 400);
  assert.equal((await invoke(verifyPasswordOtp, { email, otp })).code, 400);
  otp = await requestCode(); row.expiresAt = new Date(Date.now() - 1);
  assert.equal((await invoke(verifyPasswordOtp, { email, otp })).code, 400);
});
test('password changes invalidate pending resets and reset tokens expire', async () => {
  let otp = await requestCode();
  user.password = await bcrypt.hash('ChangedPassword1', 4);
  assert.equal((await invoke(verifyPasswordOtp, { email, otp })).code, 400);
  otp = await requestCode();
  const { body } = await invoke(verifyPasswordOtp, { email, otp });
  row.expiresAt = new Date(Date.now() - 1);
  assert.equal((await invoke(resetPassword, { email, resetToken: body.resetToken, newPassword: 'NewPassword1', confirmPassword: 'NewPassword1' })).code, 400);
});
test('unregistered email receives generic response; failed delivery cannot leave usable code', async () => {
  await requestCode(); registered = false; sent = [];
  assert.equal((await invoke(forgotPassword, { email })).code, 200); assert.equal(sent.length, 0);
  registered = true; row = null; failMail = true;
  assert.equal((await invoke(forgotPassword, { email })).code, 503); assert.equal(row, null);
});
