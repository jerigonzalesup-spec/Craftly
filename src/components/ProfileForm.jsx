
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
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { updateUserProfile } from '@/firebase/auth/auth';
import { UserProfileService } from '@/services/user/userProfileService';
import { isValidBarangay } from '@/lib/dagupanBarangays';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { User, Phone, MapPin, Store, CreditCard, Truck } from 'lucide-react';
import { BarangayInput } from '@/components/BarangayInput';
import { useBarangaySuggestions } from '@/hooks/useBarangaySuggestions';
import { SCHEMAS, MESSAGES } from '@/lib/formValidation';

const formSchema = z.object({
  firstName: SCHEMAS.firstName,
  lastName: SCHEMAS.lastName,
  email: z.string(),
  contactNumber: SCHEMAS.phoneNumberOptional,
  streetAddress: SCHEMAS.addressOptional,
  barangay: SCHEMAS.barangay(isValidBarangay),
  city: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  gcashName: z.string().min(2, MESSAGES.gcashNameMin).optional().or(z.literal('')),
  gcashNumber: SCHEMAS.phoneNumberOptional,
  shopName: z.string().optional().or(z.literal('')),
  shopAddress: SCHEMAS.addressOptional,
  shopBarangay: SCHEMAS.barangay(isValidBarangay),
  shopCity: z.string().optional().or(z.literal('')),
  allowShipping: z.boolean().optional(),
  allowPickup: z.boolean().optional(),
  allowCod: z.boolean().optional(),
  allowGcash: z.boolean().optional(),
}).refine(data => {
  if (data.streetAddress && data.streetAddress.trim().length > 0) {
    const hasNumber = /\d/.test(data.streetAddress);
    const hasLetter = /[a-zA-Z]/.test(data.streetAddress);
    return hasNumber && hasLetter;
  }
  return true;
}, {
  message: MESSAGES.addressInvalid,
  path: ['streetAddress'],
}).refine(data => {
  if (data.shopAddress && data.shopAddress.trim().length > 0) {
    const hasNumber = /\d/.test(data.shopAddress);
    const hasLetter = /[a-zA-Z]/.test(data.shopAddress);
    return hasNumber && hasLetter;
  }
  return true;
}, {
  message: MESSAGES.addressInvalid,
  path: ['shopAddress'],
});

export function ProfileForm() {
  const { user, loading } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profileLoading, setProfileLoading] = useState(false);
  const isSeller = user?.roles?.includes('seller');

  // Barangay state management using custom hooks
  const barangay = useBarangaySuggestions();
  const shopBarangay = useBarangaySuggestions();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      contactNumber: '',
      streetAddress: '',
      barangay: '',
      city: 'Dagupan',
      postalCode: '2400',
      country: 'Philippines',
      gcashName: '',
      gcashNumber: '',
      shopName: '',
      shopAddress: '',
      shopBarangay: '',
      shopCity: 'Dagupan',
      allowShipping: true,
      allowPickup: false,
      allowCod: true,
      allowGcash: false,
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
          // Split fullName into firstName and lastName
          const fullName = profile.fullName || user.displayName || '';
          const [firstName, ...lastNameParts] = fullName.trim().split(' ');
          const lastName = lastNameParts.join(' ');

          form.reset({
            firstName: firstName || '',
            lastName: lastName || '',
            email: profile.email || user.email || '',
            contactNumber: profile.contactNumber || '',
            streetAddress: profile.streetAddress || '',
            barangay: profile.barangay || '',
            city: profile.city || 'Dagupan',
            postalCode: profile.postalCode || '2400',
            country: profile.country || 'Philippines',
            gcashName: profile.gcashName || '',
            gcashNumber: profile.gcashNumber || '',
            shopName: profile.shopName || '',
            shopAddress: profile.shopAddress || '',
            shopBarangay: profile.shopBarangay || '',
            shopCity: profile.shopCity || 'Dagupan',
            allowShipping: profile.allowShipping !== false,
            allowPickup: profile.allowPickup === true,
            allowCod: profile.allowCod !== false,
            allowGcash: profile.allowGcash === true,
          });
          barangay.setInput(profile.barangay || '');
          shopBarangay.setInput(profile.shopBarangay || '');
        }
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  async function onSubmit(values) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update profile.' });
      return;
    }

    try {
      const updateData = {
        fullName: `${values.firstName} ${values.lastName}`,
      };

      if (values.contactNumber) updateData.contactNumber = values.contactNumber;
      if (values.streetAddress) updateData.streetAddress = values.streetAddress;
      if (values.barangay) updateData.barangay = values.barangay;
      if (values.city) updateData.city = values.city;
      if (values.postalCode) updateData.postalCode = values.postalCode;
      if (values.country) updateData.country = values.country;
      if (values.gcashName) updateData.gcashName = values.gcashName;
      if (values.gcashNumber) updateData.gcashNumber = values.gcashNumber;
      // Add shop fields
      if (values.shopName) updateData.shopName = values.shopName;
      if (values.shopAddress) updateData.shopAddress = values.shopAddress;
      if (values.shopBarangay) updateData.shopBarangay = values.shopBarangay;
      if (values.shopCity) updateData.shopCity = values.shopCity;
      updateData.allowShipping = values.allowShipping;
      updateData.allowPickup = values.allowPickup;
      updateData.allowCod = values.allowCod;
      updateData.allowGcash = values.allowGcash;

      // Update profile via API service - this now returns complete profile data
      const responseData = await UserProfileService.updateUserProfile(user.uid, updateData);

      // Use the complete response data directly (backend now returns all fields)
      if (responseData) {
        // Split fullName into firstName and lastName from response
        const fullNameResponse = responseData.fullName || user.displayName || '';
        const [firstNameFromResponse, ...lastNamePartsResponse] = fullNameResponse.trim().split(' ');
        const lastNameFromResponse = lastNamePartsResponse.join(' ');

        form.reset({
          firstName: firstNameFromResponse || '',
          lastName: lastNameFromResponse || '',
          email: responseData.email || user.email || '',
          contactNumber: responseData.contactNumber || '',
          streetAddress: responseData.streetAddress || '',
          barangay: responseData.barangay || '',
          city: responseData.city || 'Dagupan',
          postalCode: responseData.postalCode || '2400',
          country: responseData.country || 'Philippines',
          gcashName: responseData.gcashName || '',
          gcashNumber: responseData.gcashNumber || '',
          shopName: responseData.shopName || '',
          shopAddress: responseData.shopAddress || '',
          shopBarangay: responseData.shopBarangay || '',
          shopCity: responseData.shopCity || 'Dagupan',
          allowShipping: responseData.allowShipping !== false,
          allowPickup: responseData.allowPickup === true,
          allowCod: responseData.allowCod !== false,
          allowGcash: responseData.allowGcash === true,
        });
        barangay.setInput(responseData.barangay || '');
        shopBarangay.setInput(responseData.shopBarangay || '');
      }

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
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
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Account Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jeremy" {...field} className="bg-background border-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Cruz" {...field} className="bg-background border-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Contact Information</h3>
              </div>
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

            {/* GCash Payment Details - Sellers only */}
            {isSeller && (<div className="space-y-4 pb-6 border-b">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">GCash Payment Details</h3>
              </div>
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
            </div>)}

            {/* Shipping Address */}
            <div className="space-y-4 pb-6 border-b">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Shipping Address</h3>
              </div>

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
                          value={barangay.input}
                          onChange={(e) => {
                            barangay.handleChange(e.target.value);
                            field.onChange(e.target.value);
                          }}
                          onFocus={() => barangay.input.trim().length > 0 && barangay.setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => barangay.setShowSuggestions(false), 150)}
                        />
                        {barangay.showSuggestions && barangay.suggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 border border-gray-300 bg-white rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {barangay.suggestions.map((barangayItem, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  const selected = barangay.selectBarangay(barangayItem);
                                  field.onChange(selected);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                              >
                                {barangayItem}
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

            {/* Shop Profile Section - Sellers only */}
            {isSeller && (<div className="space-y-4 pb-6 border-b">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Shop Profile</h3>
              </div>

              <FormField
                control={form.control}
                name="shopName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shop Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., My Crafty Shop" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Your shop's display name</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shopAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shop Address (Optional)</FormLabel>
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
                name="shopBarangay"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>Shop Barangay (Optional)</FormLabel>
                    <FormControl>
                      <div>
                        <Input
                          placeholder="e.g., Pantal"
                          value={shopBarangay.input}
                          onChange={(e) => {
                            shopBarangay.handleChange(e.target.value);
                            field.onChange(e.target.value);
                          }}
                          onFocus={() => shopBarangay.input.trim().length > 0 && shopBarangay.setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => shopBarangay.setShowSuggestions(false), 150)}
                        />
                        {shopBarangay.showSuggestions && shopBarangay.suggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 border border-gray-300 bg-white rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {shopBarangay.suggestions.map((barangayItem, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  const selected = shopBarangay.selectBarangay(barangayItem);
                                  field.onChange(selected);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                              >
                                {barangayItem}
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

              <FormField
                control={form.control}
                name="shopCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shop City</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Delivery Methods</h4>
                </div>
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="allowShipping"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="w-4 h-4 rounded border-gray-300 text-primary cursor-pointer"
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer font-normal">Allow Shipping</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="allowPickup"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="w-4 h-4 rounded border-gray-300 text-primary cursor-pointer"
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer font-normal">Allow Local Pickup</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Choose which delivery methods you want to offer customers</p>
              </div>

              {isSeller && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Payment Methods</h4>
                  </div>
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="allowCod"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="w-4 h-4 rounded border-gray-300 text-primary cursor-pointer"
                            />
                          </FormControl>
                          <div>
                            <FormLabel className="cursor-pointer font-normal">💵 Cash on Delivery (COD)</FormLabel>
                            <p className="text-xs text-muted-foreground">Buyer pays in cash upon receiving the order</p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="allowGcash"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="w-4 h-4 rounded border-gray-300 text-primary cursor-pointer"
                            />
                          </FormControl>
                          <div>
                            <FormLabel className="cursor-pointer font-normal">📱 GCash</FormLabel>
                            <p className="text-xs text-muted-foreground">Buyer sends payment via GCash and uploads receipt</p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Choose which payment methods you accept from buyers</p>
                </div>
              )}
            </div>)}

            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
    </>
  );
}
