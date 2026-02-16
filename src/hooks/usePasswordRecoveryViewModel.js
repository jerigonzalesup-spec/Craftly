import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { recoverPasswordWithCodes } from '@/firebase/auth/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * usePasswordRecoveryViewModel Hook
 * ViewModel layer in MVVM architecture
 * Manages password recovery state and business logic using recovery codes
 * Uses API-based recovery (no Firestore queries from client)
 */
export function usePasswordRecoveryViewModel() {
  const { toast } = useToast();

  // Step 1: Email verification
  const [step, setStep] = useState('email'); // 'email', 'code', 'password', 'success'
  const [email, setEmail] = useState('');
  const [userFound, setUserFound] = useState(false);

  // Step 2: Recovery code (now only 1 code instead of 2)
  const [codesRemaining, setCodesRemaining] = useState(0);
  const [enteredCode, setEnteredCode] = useState('');

  // Step 3: New password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Action: Verify email exists (check if user has recovery codes)
  const verifyEmail = useCallback(
    async (emailInput) => {
      setLoading(true);
      setError('');

      try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput)) {
          throw new Error('Please enter a valid email address');
        }

        // Validate email is not empty or just whitespace
        if (emailInput.trim().length === 0) {
          throw new Error('Email cannot be empty');
        }

        // Call API to verify email and check if user has recovery codes
        const response = await fetch(`${API_URL}/api/auth/check-recovery-codes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: emailInput }),
        });

        const json = await response.json();

        if (!response.ok) {
          // Email not found or no recovery codes
          const errorMsg = json.error || 'User not found';
          throw new Error(errorMsg);
        }

        // User found and has recovery codes
        setEmail(emailInput);
        setUserFound(true);
        setCodesRemaining(json.data.codesRemaining || 0);
        setStep('code');

        toast({
          title: 'Email verified',
          description: `You have ${json.data.codesRemaining} recovery codes remaining. Enter one to proceed.`,
        });

        setLoading(false);
        return true;
      } catch (err) {
        console.error('Error verifying email:', err);
        setError(err.message || 'Error verifying email');
        setLoading(false);
        return false;
      }
    },
    [toast]
  );

  // Action: Verify recovery code (now just 1 code)
  const verifyCodes = useCallback(
    async (code) => {
      setLoading(true);
      setError('');

      try {
        // Validate code is not empty
        if (!code || code.trim().length === 0) {
          throw new Error('Recovery code is required');
        }

        // Note: We don't validate the code here - we'll do it when resetting password
        // Just store it and move to password step
        setEnteredCode(code);
        setStep('password');

        toast({
          title: 'Code received',
          description: 'Now enter your new password.',
        });

        setLoading(false);
        return true;
      } catch (err) {
        console.error('Error verifying code:', err);
        setError(err.message || 'Error verifying code');
        setLoading(false);
        return false;
      }
    },
    [toast]
  );

  // Action: Update password with recovery code
  const updatePassword = useCallback(
    async (password, confirmPwd) => {
      setLoading(true);
      setError('');

      try {
        // Validate passwords are not empty
        if (!password || !confirmPwd) {
          throw new Error('Both password fields are required');
        }

        // Validate password length
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        if (password.length > 128) {
          throw new Error('Password must not exceed 128 characters');
        }

        // Validate passwords match
        if (password !== confirmPwd) {
          throw new Error('Passwords do not match');
        }

        // Validate password is not just whitespace
        if (password.trim().length === 0) {
          throw new Error('Password cannot be empty or only spaces');
        }

        if (!email) {
          throw new Error('Email not available');
        }

        if (!enteredCode) {
          throw new Error('Recovery code not available');
        }

        // Call the API function to reset password with recovery code
        const result = await recoverPasswordWithCodes(email, enteredCode, password);

        setNewPassword(password);
        setStep('success');

        // Show remaining codes in success message
        const remainingMsg = result.remainingCodes === 0
          ? 'All your recovery codes have been used. Contact admin if you forget your password again.'
          : `You have ${result.remainingCodes} recovery codes remaining.`;

        toast({
          title: 'Password reset successfully!',
          description: `${result.message} ${remainingMsg}`,
        });

        setLoading(false);
        return true;
      } catch (err) {
        console.error('Error updating password:', err);
        setError(err.message || 'Error updating password');
        setLoading(false);
        return false;
      }
    },
    [email, enteredCode, toast]
  );

  // Action: Reset form
  const resetForm = useCallback(() => {
    setStep('email');
    setEmail('');
    setUserFound(false);
    setCodesRemaining(0);
    setEnteredCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  }, []);

  return {
    // State
    step,
    email,
    userFound,
    codesRemaining,
    enteredCode,
    newPassword,
    confirmPassword,
    loading,
    error,

    // Actions
    verifyEmail,
    verifyCodes,
    setEnteredCode,
    updatePassword,
    setNewPassword,
    setConfirmPassword,
    resetForm,
  };
}
