import express from 'express';
import {
  signUp,
  signIn,
  changePassword,
  checkRecoveryCodes,
  verifyRecoveryCodeAndReset,
  recoverPassword,
  viewRecoveryCodes,
} from '../controllers/authController.js';

const router = express.Router();

/**
 * Auth Routes
 */

// Sign up
router.post('/signup', signUp);

// Sign in
router.post('/signin', signIn);

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

export default router;
