import { AlertCircle, Shield, Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

/**
 * Recovery Codes Section Component
 * Extracted from ProfileForm to separate concerns
 * Manages recovery code viewing, verification, and download UI
 */
export function RecoveryCodesSection({
  codesRemaining,
  showPasswordModal,
  setShowPasswordModal,
  showCodesModal,
  setShowCodesModal,
  recoveryCodes,
  passwordInput,
  setPasswordInput,
  copiedCodes,
  loadingCodes,
  onViewRecoveryCodes,
  onCopyCodes,
  onDownloadCodes,
  onCloseCodesModal,
}) {
  // Determine alert styling based on codes remaining
  const getAlertStyles = () => {
    if (codesRemaining === 0) {
      return 'bg-red-50 border-red-200';
    }
    if (codesRemaining <= 2) {
      return 'bg-amber-50 border-amber-200';
    }
    return 'bg-blue-50 border-blue-200';
  };

  const getAlertIconColor = () => {
    if (codesRemaining === 0) return 'text-red-600';
    if (codesRemaining <= 2) return 'text-amber-600';
    return 'text-blue-600';
  };

  return (
    <>
      {/* Recovery Codes Section */}
      <div className="space-y-4 pb-6 border-b">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-muted-foreground">Account Recovery</h3>
        </div>

        <div className={`p-4 rounded-lg border ${getAlertStyles()}`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${getAlertIconColor()}`} />
            <div className="space-y-2">
              <p className="text-sm font-medium">Recovery Codes</p>
              <p className="text-sm text-gray-700">
                You have <span className="font-semibold">{codesRemaining}</span> recovery code{codesRemaining !== 1 ? 's' : ''} remaining.
              </p>
              {codesRemaining === 0 && (
                <p className="text-sm text-red-700">
                  All your recovery codes have been used. Please contact support to generate new codes.
                </p>
              )}
              {codesRemaining > 0 && codesRemaining <= 2 && (
                <p className="text-sm text-amber-700">
                  You're running low on recovery codes. Consider requesting new codes soon.
                </p>
              )}
              <p className="text-xs text-gray-600 mt-2">
                Recovery codes help you regain access to your account if you forget your password. Each code can only be used once.
              </p>
            </div>
          </div>
        </div>

        {codesRemaining === 0 && (
          <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
            To request new recovery codes, please contact our support team at support@craftly.com or reply to this account dashboard.
          </p>
        )}

        <Button
          type="button"
          onClick={() => setShowPasswordModal(true)}
          className="w-full bg-slate-600 hover:bg-slate-700"
        >
          🔐 View Recovery Codes (Requires Password)
        </Button>
      </div>

      {/* Password Verification Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Your Password</DialogTitle>
            <DialogDescription>
              We need your password to verify your identity before showing your recovery codes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onViewRecoveryCodes()}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={onViewRecoveryCodes}
                disabled={loadingCodes}
                className="flex-1"
              >
                {loadingCodes ? 'Verifying...' : 'View Codes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recovery Codes Display Modal */}
      <Dialog open={showCodesModal} onOpenChange={setShowCodesModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Your Recovery Codes</DialogTitle>
            <DialogDescription>
              Download or screenshot these codes for your records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-2 font-mono text-sm bg-white p-3 rounded border border-blue-100 max-h-48 overflow-y-auto">
                {recoveryCodes.map((c, index) => (
                  <div key={index} className="text-gray-700">
                    {index + 1}. {c.code} {c.used && <span className="text-red-600 font-semibold">(USED)</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onCopyCodes}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-sm font-medium"
              >
                {copiedCodes ? (
                  <>
                    <Check className="h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy
                  </>
                )}
              </button>
              <button
                onClick={onDownloadCodes}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors text-sm font-medium text-blue-700"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
            <Button
              onClick={onCloseCodesModal}
              className="w-full"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
