
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { updateUserProfile, viewRecoveryCodesWithPassword } from '@/firebase/auth/auth';
import { UserProfileService } from '@/services/user/userProfileService';
import { SORTED_BARANGAYS } from '@/lib/dagupanBarangays';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AlertCircle, Shield, Copy, Check, Download } from 'lucide-react';

const formSchema = z.object({
  fullName: z.string()
    .min(2, { message: 'Full name must be 2-50 characters.' })
    .max(50, 'Full name must be 2-50 characters.')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name must contain only letters, spaces, hyphens, and apostrophes. No numbers allowed.'),
  email: z.string(),
  contactNumber: z.string().regex(/^(09|\+639)\d{9}$/, 'Please enter a valid PH mobile number (e.g., 09123456789 or +639123456789).').optional().or(z.literal('')),
  streetAddress: z.string().min(5, 'Street address must include house number and street name').optional().or(z.literal('')),
  barangay: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  gcashName: z.string().min(2, 'GCash name must be at least 2 characters.').optional().or(z.literal('')),
  gcashNumber: z.string().regex(/^(09|\+639)\d{9}$/, 'GCash number must be a valid PH mobile number (e.g., 09123456789 or +639123456789).').optional().or(z.literal('')),
}).refine(data => {
  // If street address is provided, it must have house number and letters
  if (data.streetAddress && data.streetAddress.trim().length > 0) {
    const hasNumber = /\d/.test(data.streetAddress);
    const hasLetter = /[a-zA-Z]/.test(data.streetAddress);
    return hasNumber && hasLetter;
  }
  return true;
}, {
  message: 'Street address must include both house/building number and street name (e.g., "123 Main Street")',
  path: ['streetAddress'],
});

export function ProfileForm() {
  const { user, loading } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profileLoading, setProfileLoading] = useState(false);
  const [barangayInput, setBarangayInput] = useState('');
  const [barangaySuggestions, setBarangaySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [codesRemaining, setCodesRemaining] = useState(0);
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [passwordInput, setPasswordInput] = useState('');
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      contactNumber: '',
      streetAddress: '',
      barangay: '',
      city: 'Dagupan',
      postalCode: '2400',
      country: 'Philippines',
      gcashName: '',
      gcashNumber: '',
    }
  });

  // Load user profile on mount
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const profile = await UserProfileService.getUserProfile(user.uid);

        if (profile) {
          form.reset({
            fullName: profile.fullName || user.displayName || '',
            email: profile.email || user.email || '',
            contactNumber: profile.contactNumber || '',
            streetAddress: profile.streetAddress || '',
            barangay: profile.barangay || '',
            city: profile.city || 'Dagupan',
            postalCode: profile.postalCode || '2400',
            country: profile.country || 'Philippines',
            gcashName: profile.gcashName || '',
            gcashNumber: profile.gcashNumber || '',
          });
          setBarangayInput(profile.barangay || '');
          // Set recovery codes remaining count
          setCodesRemaining(profile.codesRemaining || 0);
        }
      } catch (error) {
        console.warn('Could not load profile:', error.message);
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Handle barangay input and filter suggestions
  const handleBarangayChange = (value) => {
    setBarangayInput(value);
    form.setValue('barangay', value);

    if (value.trim().length === 0) {
      setBarangaySuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = SORTED_BARANGAYS.filter(barangay =>
      barangay.toLowerCase().includes(value.toLowerCase())
    );

    setBarangaySuggestions(filtered.slice(0, 8));
    setShowSuggestions(true);
  };

  // Handle selecting a barangay from suggestions
  const selectBarangay = (barangay) => {
    setBarangayInput(barangay);
    form.setValue('barangay', barangay);
    setShowSuggestions(false);
  };

  // Handle viewing recovery codes with password verification
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
      console.error('Error viewing codes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to retrieve codes. Check your password and try again.',
      });
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleCloseCodesModal = () => {
    setShowCodesModal(false);
    setRecoveryCodes([]);
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

  async function onSubmit(values) {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update profile.' });
        return;
    }

    try {
      // Build update data - only include non-empty values
      const updateData = {
        fullName: values.fullName,
      };

      if (values.contactNumber) updateData.contactNumber = values.contactNumber;
      if (values.streetAddress) updateData.streetAddress = values.streetAddress;
      if (values.barangay) updateData.barangay = values.barangay;
      if (values.city) updateData.city = values.city;
      if (values.postalCode) updateData.postalCode = values.postalCode;
      if (values.country) updateData.country = values.country;
      if (values.gcashName) updateData.gcashName = values.gcashName;
      if (values.gcashNumber) updateData.gcashNumber = values.gcashNumber;

      console.log('📤 Sending update data to backend:', updateData);

      // Update profile via API service - this now returns complete profile data
      const responseData = await UserProfileService.updateUserProfile(user.uid, updateData);

      console.log('📥 Received response from backend:', responseData);

      // Use the complete response data directly (backend now returns all fields)
      if (responseData) {
        console.log('🔄 Resetting form with response data:', {
          gcashName: responseData.gcashName,
          gcashNumber: responseData.gcashNumber,
          fullName: responseData.fullName
        });

        form.reset({
          fullName: responseData.fullName || user.displayName || '',
          email: responseData.email || user.email || '',
          contactNumber: responseData.contactNumber || '',
          streetAddress: responseData.streetAddress || '',
          barangay: responseData.barangay || '',
          city: responseData.city || 'Dagupan',
          postalCode: responseData.postalCode || '2400',
          country: responseData.country || 'Philippines',
          gcashName: responseData.gcashName || '',
          gcashNumber: responseData.gcashNumber || '',
        });
        setBarangayInput(responseData.barangay || '');
        console.log('✅ Form reset completed');
      } else {
        console.warn('⚠️ No data in response from update');
      }

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      let description = 'An error occurred while updating your profile.';

      // Parse error message
      const errorMsg = error.message || '';

      if (errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('firestore')) {
        description = 'Permission denied. Please try again or contact support.';
      } else if (errorMsg.toLowerCase().includes('not found')) {
        description = 'User profile not found. Please log in again.';
      } else if (errorMsg.toLowerCase().includes('network')) {
        description = 'Network error. Please check your connection and try again.';
      } else if (errorMsg.toLowerCase().includes('invalid')) {
        description = 'Invalid data. Please check your input and try again.';
      } else if (errorMsg.length > 0) {
        description = errorMsg;
      }

      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: description,
      });
    }
  }

  if (loading) {
    return (
        <Card className="w-full">
            <CardHeader>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-32" />
            </CardContent>
        </Card>
    );
  }

  return (
    <>
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Personal & Shipping Details</CardTitle>
        <CardDescription>Edit your information. This will be auto-filled when you place orders.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Account Information */}
            <div className="space-y-4 pb-6 border-b">
              <h3 className="text-sm font-semibold text-muted-foreground">Account Information</h3>
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jeremy Cruz" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} disabled />
                    </FormControl>
                    <p className="text-xs text-muted-foreground pt-1">Email address cannot be changed.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-4 pb-6 border-b">
              <h3 className="text-sm font-semibold text-muted-foreground">Contact Information</h3>
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="09123456789" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">PH mobile number format: 09xxxxxxxxx or +639xxxxxxxxx</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* GCash Payment Details */}
            <div className="space-y-4 pb-6 border-b">
              <h3 className="text-sm font-semibold text-muted-foreground">GCash Payment Details (For Sellers)</h3>
              <FormField
                control={form.control}
                name="gcashName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GCash Account Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Jeremy Cruz" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Name registered on your GCash account</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gcashNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GCash Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="09123456789" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">PH mobile number format: 09xxxxxxxxx or +639xxxxxxxxx</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Shipping Address */}
            <div className="space-y-4 pb-6 border-b">
              <h3 className="text-sm font-semibold text-muted-foreground">Shipping Address</h3>

              <FormField
                control={form.control}
                name="streetAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123 Main Street" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Must include house/building number and street name</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="barangay"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>Barangay (Optional)</FormLabel>
                    <FormControl>
                      <div>
                        <Input
                          placeholder="e.g., Pantal"
                          value={barangayInput}
                          onChange={(e) => handleBarangayChange(e.target.value)}
                          onFocus={() => barangayInput.trim().length > 0 && setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        />
                        {showSuggestions && barangaySuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 border border-gray-300 bg-white rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {barangaySuggestions.map((barangay, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => selectBarangay(barangay)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                              >
                                {barangay}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Recovery Codes Section */}
            <div className="space-y-4 pb-6 border-b">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-muted-foreground">Account Recovery</h3>
              </div>

              <div className={`p-4 rounded-lg border ${
                codesRemaining === 0
                  ? 'bg-red-50 border-red-200'
                  : codesRemaining <= 2
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-600" />
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

            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>

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
              onKeyPress={(e) => e.key === 'Enter' && handleViewRecoveryCodes()}
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
              onClick={handleViewRecoveryCodes}
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
              onClick={handleCopyCodes}
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
              onClick={handleDownloadCodes}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors text-sm font-medium text-blue-700"
            >
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
          <Button
            onClick={handleCloseCodesModal}
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
