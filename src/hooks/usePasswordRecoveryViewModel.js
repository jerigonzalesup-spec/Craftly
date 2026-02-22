import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { convertApiErrorMessage } from '@/lib/errorMessages';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * usePasswordRecoveryViewModel Hook
 * ViewModel layer in MVVM architecture
 * Manages password recovery state with 6-digit code verification
 */
export function usePasswordRecoveryViewModel() {
  const { toast } = useToast();

  // Step 1: Email input
  const [step, setStep] = useState('email'); // 'email', 'code', 'password', 'success'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Action: Send password reset code to email
  const sendResetCode = useCallback(
    async (emailInput) => {
      setLoading(true);
      setError('');

      try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput)) {
          throw new Error('Please enter a valid email address');
        }

        if (emailInput.trim().length === 0) {
          throw new Error('Email cannot be empty');
        }

        // Call API to send reset code
        const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: emailInput }),
        });

        const json = await response.json();

        if (!response.ok) {
          const errorMsg = json.error || 'Failed to send reset code';
          throw new Error(errorMsg);
        }

        // Code sent successfully
        setEmail(emailInput);
        setStep('code');

        toast({
          title: 'Code sent!',
          description: `Check your email for a password reset code. It expires in 15 minutes.`,
        });

        setLoading(false);
        return true;
      } catch (err) {
        console.error('Error sending reset code:', err);
        const friendlyError = convertApiErrorMessage({ error: err.message });
        setError(friendlyError);
        setLoading(false);
        return false;
      }
    },
    [toast]
  );

  // Action: Verify code (optional - for better UX)
  const verifyCode = useCallback(
    async (codeInput) => {
      setLoading(true);
      setError('');

      try {
        if (!codeInput || codeInput.trim().length === 0) {
          throw new Error('Password reset code is required');
        }

        if (codeInput.length !== 6 || !/^\d+$/.test(codeInput)) {
          throw new Error('Code must be 6 digits');
        }

        // Verify code
        const response = await fetch(`${API_URL}/api/auth/verify-reset-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, code: codeInput }),
        });

        const json = await response.json();

        if (!response.ok) {
          const errorMsg = json.data?.message || json.error || 'Invalid code';
          throw new Error(errorMsg);
        }

        // Code verified, move to password step
        setCode(codeInput);
        setStep('password');

        toast({
          title: 'Code verified!',
          description: 'Now enter your new password.',
        });

        setLoading(false);
        return true;
      } catch (err) {
        console.error('Error verifying code:', err);
        const friendlyError = convertApiErrorMessage({ error: err.message });
        setError(friendlyError);
        setLoading(false);
        return false;
      }
    },
    [email, toast]
  );

  // Action: Reset password with code
  const resetPasswordWithCode = useCallback(
    async (password, confirmPwd) => {
      setLoading(true);
      setError('');

      try {
        // Validations
        if (!password || !confirmPwd) {
          throw new Error('Both password fields are required');
        }

        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        if (password.length > 128) {
          throw new Error('Password must not exceed 128 characters');
        }

        if (password !== confirmPwd) {
          throw new Error('Passwords do not match');
        }

        if (password.trim().length === 0) {
          throw new Error('Password cannot be empty or only spaces');
        }

        if (!email || !code) {
          throw new Error('Email or code not available');
        }

        // Call API to reset password with code
        const response = await fetch(`${API_URL}/api/auth/reset-password-with-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            code,
            newPassword: password,
          }),
        });

        const json = await response.json();

        if (!response.ok) {
          const errorMsg = json.error || 'Failed to reset password';
          throw new Error(errorMsg);
        }

        // Success!
        setStep('success');
        setNewPassword(password);

        toast({
          title: 'Password reset successfully!',
          description: 'You can now sign in with your new password.',
        });

        setLoading(false);
        return true;
      } catch (err) {
        console.error('Error resetting password:', err);
        const friendlyError = convertApiErrorMessage({ error: err.message });
        setError(friendlyError);
        setLoading(false);
        return false;
      }
    },
    [email, code, toast]
  );

  // Action: Reset form
  const resetForm = useCallback(() => {
    setStep('email');
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  }, []);

  return {
    // State
    step,
    email,
    code,
    newPassword,
    confirmPassword,
    loading,
    error,

    // Actions
    sendResetCode,
    verifyCode,
    setCode,
    resetPasswordWithCode,
    setNewPassword,
    setConfirmPassword,
    resetForm,
  };
}
