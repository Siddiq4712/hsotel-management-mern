import bcrypt from 'bcryptjs';
import { fn, col, where } from 'sequelize';
import sequelize from '../config/database.js';
import { User } from '../models/index.js';
import { PasswordReset } from '../models/passwordReset.js';
import { sendEmail } from '../utils/emailUtils.js';
import { normalizeEmail, validEmail, passwordError, secretHash, newOtp, newResetToken } from '../services/passwordSecurity.js';

const genericMessage = 'If this email is registered, a verification code has been sent. It expires in 10 minutes.';
const findUser = (email, transaction) => User.findOne({ where: where(fn('LOWER', col('email')), email), transaction });
const invalid = res => res.status(400).json({ message: 'Invalid or expired verification. Request a new code.' });

export const forgotPassword = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid registered email address.' });
  try {
    const user = await findUser(email);
    if (!user) return res.json({ message: genericMessage });
    const code = newOtp();
    const hash = secretHash(`${user.userId}:${code}`);
    // Lock the account row so concurrent resend requests cannot bypass cooldown.
    const created = await sequelize.transaction(async transaction => {
      const currentUser = await User.findByPk(user.userId, { transaction, lock: transaction.LOCK.UPDATE });
      const existing = await PasswordReset.findByPk(user.userId, { transaction });
      if (existing && Date.now() - existing.updatedAt.getTime() < 60000) return false;
      await PasswordReset.upsert({ userId: user.userId, otpHash: hash, tokenHash: null, attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60000), passwordHash: currentUser.password }, { transaction });
      return true;
    });
    if (!created) return res.status(429).json({ message: 'Please wait 60 seconds before requesting another code.' });
    const delivery = await sendEmail({ to: user.userMail, subject: 'Hostel Management password reset code',
      text: `Your password reset code is ${code}. It expires in 10 minutes. Do not share this code. If you did not request this, ignore this email.`,
      html: `<p>Your password reset code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. Do not share this code. If you did not request this, ignore this email.</p>` });
    if (!delivery.success) {
      await PasswordReset.destroy({ where: { userId: user.userId, otpHash: hash } });
      return res.status(503).json({ message: 'Unable to send verification email. Please try again later.' });
    }
    return res.json({ message: genericMessage });
  } catch (error) {
    console.error('Password reset request failed:', error.message);
    return res.status(500).json({ message: 'Unable to request a password reset.' });
  }
};

export const verifyPasswordOtp = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!validEmail(email) || typeof req.body.otp !== 'string' || !/^\d{6}$/.test(req.body.otp)) return invalid(res);
  try {
    const result = await sequelize.transaction(async transaction => {
      const user = await findUser(email, transaction);
      if (!user) return null;
      const reset = await PasswordReset.findByPk(user.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!reset || reset.expiresAt <= new Date() || reset.attempts >= 5 || reset.tokenHash || reset.passwordHash !== user.password) return null;
      if (reset.otpHash !== secretHash(`${user.userId}:${req.body.otp}`)) {
        await reset.update({ attempts: reset.attempts + 1 }, { transaction });
        return null;
      }
      const resetToken = newResetToken();
      await reset.update({ tokenHash: secretHash(resetToken) }, { transaction });
      return resetToken;
    });
    return result ? res.json({ resetToken: result }) : invalid(res);
  } catch (error) {
    console.error('OTP verification failed:', error.message);
    return res.status(500).json({ message: 'Unable to verify code.' });
  }
};

export const resetPassword = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const error = passwordError(req.body.newPassword, req.body.confirmPassword);
  if (error) return res.status(400).json({ message: error });
  if (!validEmail(email) || typeof req.body.resetToken !== 'string' || !/^[a-f0-9]{64}$/.test(req.body.resetToken)) return invalid(res);
  try {
    const result = await sequelize.transaction(async transaction => {
      const found = await findUser(email, transaction);
      if (!found) return false;
      const user = await User.findByPk(found.userId, { transaction, lock: transaction.LOCK.UPDATE });
      const reset = await PasswordReset.findByPk(user.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!reset || reset.expiresAt <= new Date() || reset.tokenHash !== secretHash(req.body.resetToken) || reset.passwordHash !== user.password) return false;
      if (await bcrypt.compare(req.body.newPassword, user.password)) return 'same';
      await user.update({ password: await bcrypt.hash(req.body.newPassword, 10) }, { transaction });
      await reset.destroy({ transaction });
      return true;
    });
    if (result === 'same') return res.status(400).json({ message: 'Choose a password different from your current password.' });
    return result ? res.json({ message: 'Password reset successfully. Sign in with your new password.' }) : invalid(res);
  } catch (error) {
    console.error('Password reset failed:', error.message);
    return res.status(500).json({ message: 'Unable to reset password.' });
  }
};
