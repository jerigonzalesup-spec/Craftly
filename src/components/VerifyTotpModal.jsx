import { useState } from 'react';

export default function VerifyTotpModal({ isOpen, onSubmit, onCancel, loading = false }) {
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    if (totpCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    onSubmit(totpCode);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && totpCode.length === 6) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-2">Enter Authentication Code</h2>
        <p className="text-gray-600 text-sm mb-4">
          Enter the 6-digit code from your authenticator app:
        </p>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}

        <input
          type="text"
          value={totpCode}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setTotpCode(value);
            setError(null);
          }}
          onKeyPress={handleKeyPress}
          placeholder="000000"
          maxLength="6"
          autoFocus
          disabled={loading}
          className="w-full px-3 py-3 border border-gray-300 rounded text-center text-3xl tracking-widest font-mono mb-4 disabled:bg-gray-50"
        />

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || totpCode.length !== 6}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>
    </div>
  );
}
