import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ViewRecoveryCodesModal({ open, onOpenChange }) {
  const { firestore } = initializeFirebase();
  const auth = getAuth();
  const { toast } = useToast();
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    const fetchRecoveryCodes = async () => {
      try {
        if (!auth.currentUser) {
          setLoading(false);
          return;
        }

        const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const codes = userDoc.data().recoveryCodes || [];
          setRecoveryCodes(codes);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching recovery codes:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load recovery codes.',
        });
        setLoading(false);
      }
    };

    if (open) {
      fetchRecoveryCodes();
    }
  }, [open, firestore, auth, toast]);

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: 'Copied!',
      description: `Code "${code}" copied to clipboard.`,
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const unusedCount = recoveryCodes.filter(c => !c.used).length;
  const usedCount = recoveryCodes.length - unusedCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Your Recovery Codes</DialogTitle>
          <DialogDescription>
            These codes are used to recover your account if you forget your password. Keep them safe!
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <p className="text-muted-foreground">Loading your recovery codes...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Code Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Unused Codes</p>
                    <p className="text-2xl font-bold text-green-600">{unusedCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Used Codes</p>
                    <p className="text-2xl font-bold text-gray-600">{usedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warning if low on codes */}
            {unusedCount <= 3 && unusedCount > 0 && (
              <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900">Running low on recovery codes</p>
                  <p className="text-sm text-yellow-800">You have {unusedCount} unused code(s) remaining. Consider regenerating them soon.</p>
                </div>
              </div>
            )}

            {/* Recovery Codes List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Codes</CardTitle>
                <CardDescription>Click to copy any code to your clipboard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {recoveryCodes.map((codeObj, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => !codeObj.used && copyToClipboard(codeObj.code)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-sm md:text-base">
                          {codeObj.code}
                        </span>
                        <Badge variant={codeObj.used ? 'secondary' : 'outline'}>
                          {codeObj.used ? 'Used' : 'Unused'}
                        </Badge>
                      </div>
                      {!codeObj.used && (
                        <div>
                          {copiedCode === codeObj.code ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Info Note */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm text-blue-900">
                  <strong>💡 Tip:</strong> You only need 2 of these codes to reset your password if you forget it. Save them in a secure location such as a password manager or written down in a safe place.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
