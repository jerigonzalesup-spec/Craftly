import { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

/**
 * Reminder popup to prompt user to download/save their recovery codes
 * Shows only after registration when user lands on homepage
 */
export function RecoveryCodeReminder() {
  const [showReminder, setShowReminder] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user just registered and needs to download codes
    const needsDownload = localStorage.getItem('craftly_needs_download_codes');
    if (needsDownload === 'true') {
      setShowReminder(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowReminder(false);
    localStorage.removeItem('craftly_needs_download_codes');
  };

  const handleGoToProfile = () => {
    localStorage.removeItem('craftly_needs_download_codes');
    navigate('/profile');
  };

  if (!showReminder) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              Don't Forget Your Recovery Codes!
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              You were shown 10 recovery codes during registration. You must download and save them now in your profile page, or you won't be able to see them again.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded p-3">
          <p className="text-xs text-amber-900">
            <strong>What you need to do:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Go to your profile page</li>
              <li>Click "View Recovery Codes"</li>
              <li>Download, screenshot, or copy the codes</li>
              <li>Store them securely</li>
            </ul>
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="flex-1"
          >
            Dismiss
          </Button>
          <Button
            onClick={handleGoToProfile}
            className="flex-1 bg-amber-600 hover:bg-amber-700"
          >
            Go to Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
