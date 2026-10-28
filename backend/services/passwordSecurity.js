import { createHmac, randomInt, randomBytes } from 'node:crypto';

export const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
export const validEmail = email => email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const passwordError = (password, confirmation) => {
  if (typeof password !== 'string' || password.length < 8) return 'Use at least 8 characters for the new password.';
  if (Buffer.byteLength(password, 'utf8') > 72) return 'New password must not exceed 72 UTF-8 bytes.';
  if (password !== confirmation) return 'New passwords do not match.';
  return null;
};
export const secretHash = value => createHmac('sha256', process.env.JWT_SECRET).update(value).digest('hex');
export const newOtp = () => String(randomInt(100000, 1000000));
export const newResetToken = () => randomBytes(32).toString('hex');
