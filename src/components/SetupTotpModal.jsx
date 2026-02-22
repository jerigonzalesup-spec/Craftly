import { useState } from 'react';
import { setupTotp, verifyTotp } from '@/firebase/auth/auth';
import { useUser } from '@/firebase/auth/use-user';
import { convertApiErrorMessage } from '@/lib/errorMessages';

export default function SetupTotpModal({ isOpen, onClose, userEmail, userPassword }) {
  const [step, setStep] = useState('setup'); // setup, verify, backup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totpData, setTotpData] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const { user } = useUser();

  const handleSetupTotp = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await setupTotp(userEmail, userPassword);
      setTotpData(data);
      setStep('verify');
    } catch (err) {
      const friendlyError = convertApiErrorMessage({ error: err.message });
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTotp = async () => {
    try {
      setLoading(true);
      setError(null);

      if (totpCode.length !== 6) {
        setError('Please enter a 6-digit code');
        setLoading(false);
        return;
      }

      const data = await verifyTotp(userEmail, totpCode, totpData.secret);
      setBackupCodes(data.backupCodes);
      setStep('backup');
    } catch (err) {
      const friendlyError = convertApiErrorMessage({ error: err.message });
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (codes) => {
    const text = codes.join('\n');
    navigator.clipboard.writeText(text);
    alert('Backup codes copied to clipboard');
  };

  const downloadBackupCodes = () => {
    const text = `Craftly - Backup Codes for Two-Factor Authentication\n\nGenerated: ${new Date().toISOString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe and private. Each can be used once if you lose access to your authenticator app.`;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', 'craftly-backup-codes.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Set Up Two-Factor Authentication</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}

        {step === 'setup' && (
          <div>
            <p className="text-gray-600 text-sm mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
            </p>
            {totpData && (
              <div className="mb-4">
                <img src={totpData.qrCode} alt="TOTP QR Code" className="w-full border border-gray-200 rounded" />
                <div className="mt-3 p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600 mb-1">Manual entry key:</p>
                  <code className="text-sm font-mono break-all">{totpData.manualEntryKey}</code>
                </div>
              </div>
            )}
            <button
              onClick={handleSetupTotp}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Generating...' : 'Generate QR Code'}
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div>
            <p className="text-gray-600 text-sm mb-4">
              Enter the 6-digit code from your authenticator app to verify setup:
            </p>
            <input
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength="6"
              className="w-full px-3 py-2 border border-gray-300 rounded text-center text-2xl tracking-widest font-mono mb-4"
            />
            <button
              onClick={handleVerifyTotp}
              disabled={loading || totpCode.length !== 6}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium mb-3"
            >
              {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
            </button>
            <button
              onClick={() => {
                setStep('setup');
                setTotpCode('');
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        )}

        {step === 'backup' && (
          <div>
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm font-bold text-yellow-800 mb-2">⚠️ Important: Save Your Backup Codes</p>
              <p className="text-xs text-yellow-700">
                Each backup code can be used once if you lose access to your authenticator app. Store them in a safe place.
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto mb-4 p-3 bg-gray-50 rounded border border-gray-200">
              {backupCodes.map((code, idx) => (
                <div key={idx} className="text-sm font-mono py-1 text-gray-700">
                  {idx + 1}. {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => copyToClipboard(backupCodes)}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm font-medium"
              >
                Copy
              </button>
              <button
                onClick={downloadBackupCodes}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm font-medium"
              >
                Download
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
