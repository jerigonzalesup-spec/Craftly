import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { viewRecoveryCodesWithPassword } from '@/firebase/auth/auth';

/**
 * Custom hook to manage recovery codes logic and state
 * Eliminates 9+ useState calls from ProfileForm
 * Handles password verification, code display, and download/copy functionality
 */
export function useRecoveryCodes(user) {
  const { toast } = useToast();
  const [codesRemaining, setCodesRemaining] = useState(0);
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [passwordInput, setPasswordInput] = useState('');
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);

  const handleViewRecoveryCodes = async () => {
    if (!user || !passwordInput.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter your password',
      });
      return;
    }

    try {
      setLoadingCodes(true);
      const result = await viewRecoveryCodesWithPassword(user.email, passwordInput);
      setRecoveryCodes(result.recoveryCodes);
      setShowPasswordModal(false);
      setShowCodesModal(true);
      setPasswordInput('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to retrieve codes. Check your password and try again.',
      });
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleCopyCodes = () => {
    const codesText = recoveryCodes.map(c => c.code).join('\n');
    navigator.clipboard.writeText(codesText);
    setCopiedCodes(true);
    toast({
      title: 'Copied',
      description: 'Recovery codes copied to clipboard',
    });
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    const codesText = `CRAFTLY RECOVERY CODES\n\nRetrieved: ${new Date().toLocaleString()}\n\nIMPORTANT: Keep these codes safe. Each code can only be used once.\n\n${recoveryCodes.map((c, idx) => `${idx + 1}. ${c.code} ${c.used ? '(USED)' : ''}`).join('\n')}\n\nStore this file securely. Do not share these codes with anyone.`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(codesText));
    element.setAttribute('download', 'craftly_recovery_codes.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: 'Downloaded',
      description: 'Recovery codes downloaded as craftly_recovery_codes.txt',
    });
  };

  const handleCloseCodesModal = () => {
    setShowCodesModal(false);
    setRecoveryCodes([]);
  };

  return {
    codesRemaining,
    setCodesRemaining,
    showCodesModal,
    setShowCodesModal,
    showPasswordModal,
    setShowPasswordModal,
    recoveryCodes,
    passwordInput,
    setPasswordInput,
    copiedCodes,
    loadingCodes,
    handleViewRecoveryCodes,
    handleCopyCodes,
    handleDownloadCodes,
    handleCloseCodesModal,
  };
}
