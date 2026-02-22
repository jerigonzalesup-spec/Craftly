import express from 'express';
import {
  signUp,
  signIn,
  changePassword,
  checkRecoveryCodes,
  verifyRecoveryCodeAndReset,
  recoverPassword,
  viewRecoveryCodes,
  signInWithGoogle,
  setupTotp,
  verifyTotp,
  disableTotp,
  requestPasswordReset,
  resetPassword,
  verifyResetToken,
  verifyResetCode,
  resetPasswordWithCode,
} from '../controllers/authController.js';

const router = express.Router();

/**
 * Auth Routes
 */

// Sign up
router.post('/signup', signUp);

// Sign in with email/password
router.post('/signin', signIn);

// Sign in with Google OAuth
router.post('/signin-google', signInWithGoogle);

// Change password (for logged-in users)
router.post('/change-password', changePassword);

// Check if user has recovery codes remaining
router.post('/check-recovery-codes', checkRecoveryCodes);

// Verify recovery code and reset password
router.post('/verify-recovery-code-and-reset', verifyRecoveryCodeAndReset);

// Recover password
router.post('/recover-password', recoverPassword);

// View recovery codes (with password verification)
router.post('/view-recovery-codes', viewRecoveryCodes);

// ========================
// TOTP (Two-Factor Authentication)
// ========================

// Setup TOTP - Generate QR code
router.post('/totp/setup', setupTotp);

// Verify TOTP code and enable 2FA
router.post('/totp/verify', verifyTotp);

// Disable TOTP
router.post('/totp/disable', disableTotp);

// ========================
// Password Reset (Email-based with CODE)
// ========================

// Request password reset code
router.post('/forgot-password', requestPasswordReset);

// Verify reset code
router.post('/verify-reset-code', verifyResetCode);

// Reset password with code
router.post('/reset-password-with-code', resetPasswordWithCode);

// Reset password with token (legacy - kept for backward compatibility)
router.post('/reset-password', resetPassword);

// Verify reset token (frontend validation - legacy)
router.post('/verify-reset-token', verifyResetToken);

export default router;
