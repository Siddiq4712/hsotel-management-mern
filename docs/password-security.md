Password changes and email reset
===============================

Mobile: Profile → Security → Change password. Enter current password and the new password twice.
Web: My Profile → Password Settings. Parent Security uses the same validation.
Both sign-in screens have Forgot password: registered email → email OTP → new password twice → sign in.

API (under /api/auth):
- PUT /change-password (authenticated): oldPassword, newPassword, confirmPassword.
- POST /forgot-password: email.
- POST /verify-password-otp: email, otp; returns a temporary resetToken.
- POST /reset-password: email, resetToken, newPassword, confirmPassword.

Restart the backend to register and create the password_resets table through the existing Sequelize startup sync. No existing user columns or import password rules change.

Configure these in backend/.env (use your mail provider's actual values):

    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_SECURE=false
    SMTP_USER=your-sending-account@example.com
    SMTP_PASSWORD=your-provider-app-password
    SMTP_FROM_EMAIL=your-sending-account@example.com
    SMTP_FROM_NAME=Hostel Management

Gmail requires an app password for the sending account. Never use the normal account password or commit credentials. An existing JWT_SECRET is required for keyed OTP/token hashes. Restart after updating environment variables.

Codes expire 10 minutes after issue, with a 60-second resend cooldown and five incorrect attempts. Resending replaces the previous code. Verification exchanges a code once for a random reset token with the original expiry. Successful reset consumes the token. A password change invalidates pending resets via the stored password hash. All reset endpoints share an IP request limit (20 per 15 minutes); configure Express trusted proxies appropriately for your hosting topology.

New passwords require at least 8 characters, at most 72 UTF-8 bytes, matching confirmation, and must differ from the current password. Existing login/import rules are preserved. Existing JWT sessions retain their normal expiry; this feature does not add session revocation.

Verification:

    cd backend
    node --test scripts/password-security.test.mjs

Tests use in-memory model/mail doubles. They do not send emails or change registered users. Check real inbox delivery after SMTP configuration and verify device keyboard/layout separately.
