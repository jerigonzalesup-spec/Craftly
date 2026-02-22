
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
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { useState, useEffect } from 'react';
import { Loader2, MapPin, Truck, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OrdersService } from '@/services/orders/ordersService';
import { UserProfileService } from '@/services/user/userProfileService';
import { SORTED_BARANGAYS, isValidBarangay } from '@/lib/dagupanBarangays';
import { uploadProductImage } from '@/lib/imageUpload';
import { SCHEMAS, MESSAGES, HELPERS } from '@/lib/formValidation';


const formSchema = z.object({
    shippingMethod: z.enum(['local-delivery', 'store-pickup']),
    paymentMethod: z.enum(['cod', 'gcash']),
    firstName: SCHEMAS.firstName,
    lastName: SCHEMAS.lastName,
    email: SCHEMAS.email,
    contactNumber: SCHEMAS.phoneNumber,
    streetAddress: z.string().optional(),
    barangay: z.string().optional(), // Optional here, but validated in refine
    receipt: z.instanceof(File).optional(),
}).refine(data => {
    // Validate local delivery requirements
    if (data.shippingMethod === 'local-delivery') {
        // Barangay is REQUIRED for local delivery
        if (!data.barangay || data.barangay.trim().length === 0) {
            return false;
        }
        // Validate barangay is from Dagupan
        if (!isValidBarangay(data.barangay)) {
            return false;
        }
        // Street address is required
        if (!data.streetAddress || data.streetAddress.length < 5) return false;
        const hasNumber = /\d/.test(data.streetAddress);
        const hasLetter = /[a-zA-Z]/.test(data.streetAddress);
        return hasNumber && hasLetter;
    }
    return true;
}, {
    message: 'Check barangay and street address. Barangay must be a valid Dagupan barangay.',
    path: ['barangay'],
}).refine(data => {
    if (data.paymentMethod === 'gcash') {
        return !!data.receipt;
    }
    return true;
}, {
    message: MESSAGES.receiptRequired,
    path: ['receipt'],
});


export function CheckoutForm({ shippingMethod, setShippingMethod, deliveryFee }) {
  const navigate = useNavigate();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { toast } = useToast();
  const { user } = useUser();
  const [loadingText, setLoadingText] = useState(null);
  const [sellerDetails, setSellerDetails] = useState(null);
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [barangayInput, setBarangayInput] = useState('');
  const [barangaySuggestions, setBarangaySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shippingMethod: 'local-delivery',
      paymentMethod: 'cod',
      firstName: user?.displayName?.split(' ')[0] || '',
      lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
      email: user?.email || '',
      contactNumber: '',
      streetAddress: '',
      barangay: '',
    },
  });

  const watchedShippingMethod = form.watch('shippingMethod');
  const watchedPaymentMethod = form.watch('paymentMethod');

  // Load user profile on component mount
  useEffect(() => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    const loadUserProfile = async () => {
      try {
        setLoadingProfile(true);
        const profile = await UserProfileService.getUserProfile(user.uid);

        if (profile) {
          // Split fullName into firstName and lastName
          const fullName = profile.fullName || user.displayName || '';
          const [firstName, ...lastNameParts] = fullName.trim().split(' ');
          const lastName = lastNameParts.join(' ');

          // Pre-fill form with saved profile data
          form.reset({
            shippingMethod: form.getValues('shippingMethod'),
            paymentMethod: form.getValues('paymentMethod'),
            firstName: firstName || '',
            lastName: lastName || '',
            email: profile.email || user.email || '',
            contactNumber: profile.contactNumber || '',
            streetAddress: profile.streetAddress || '',
            barangay: profile.barangay || '',
          });
        }
      } catch (error) {
        console.warn('Could not load user profile:', error.message);
        // Silently fail - use default values
      } finally {
        setLoadingProfile(false);
      }
    };

    loadUserProfile();
  }, [user, form]);

  // Sync state with parent when form value changes
  useEffect(() => {
    if (watchedShippingMethod !== shippingMethod) {
        setShippingMethod(watchedShippingMethod);
    }
  }, [watchedShippingMethod, shippingMethod, setShippingMethod]);

  // Handle barangay input and filter suggestions
  const handleBarangayChange = (value) => {
    setBarangayInput(value);
    form.setValue('barangay', value);

    if (value.trim().length === 0) {
      setBarangaySuggestions(SORTED_BARANGAYS.slice(0, 10)); // Show first 10 when empty
      setShowSuggestions(true);
      return;
    }

    const filtered = SORTED_BARANGAYS.filter(barangay =>
      barangay.toLowerCase().includes(value.toLowerCase())
    );

    setBarangaySuggestions(filtered.slice(0, 15)); // Show max 15 suggestions
    setShowSuggestions(true);
  };

  // Handle selecting a barangay from suggestions
  const selectBarangay = (barangay) => {
    setBarangayInput(barangay);
    form.setValue('barangay', barangay);
    setShowSuggestions(false);
  };

  // Load seller details on component mount (for shop info display and GCash details)
  useEffect(() => {
    if (cartItems.length === 0) {
      setSellerDetails(null);
      setLoadingSeller(false);
      return;
    }

    const fetchSellerDetails = async () => {
      try {
        setLoadingSeller(true);

        // Get unique seller IDs from cart items
        const sellerIds = [...new Set(cartItems.map(item => item.createdBy))];

        // For now, fetch the first seller's details
        // In a real multi-vendor scenario, you'd want to show all sellers' details
        if (sellerIds.length > 0) {
          const profile = await UserProfileService.getUserProfile(sellerIds[0]);
          setSellerDetails(profile);
        }
      } catch (error) {
        console.error('Failed to fetch seller details:', error);
        setSellerDetails(null);
      } finally {
        setLoadingSeller(false);
      }
    };

    fetchSellerDetails();
  }, [cartItems]);

  // Fetch seller GCash details when payment method is selected (separate from shop info)
  useEffect(() => {
    if (watchedPaymentMethod !== 'gcash' || cartItems.length === 0) {
      // Don't reset sellerDetails here since we need it for shop info display
      return;
    }

    const fetchSellerGCashDetails = async () => {
      try {
        // If sellerDetails already has gcash info, we're done
        if (sellerDetails?.gcashName && sellerDetails?.gcashNumber) {
          return;
        }

        // Get unique seller IDs from cart items
        const sellerIds = [...new Set(cartItems.map(item => item.createdBy))];

        // For now, fetch the first seller's details
        if (sellerIds.length > 0) {
          const profile = await UserProfileService.getUserProfile(sellerIds[0]);
          // Update only if we got gcash details
          if (profile?.gcashName || profile?.gcashNumber) {
            setSellerDetails(profile);
          }
        }
      } catch (error) {
        console.error('Failed to fetch seller GCash details:', error);
      }
    };

    fetchSellerGCashDetails();
  }, [watchedPaymentMethod, cartItems, sellerDetails]);


  const uploadReceipt = async (file) => {
    if (!file) throw new Error("No file provided");

    // Use the existing imageUpload utility which has proper API URL configuration
    return await uploadProductImage(file, user.uid);
  }

  async function onSubmit(values) {
    console.log('📋 Form submitted with values:', {
      shippingMethod: values.shippingMethod,
      barangay: values.barangay,
      streetAddress: values.streetAddress,
    });

    setLoadingText('Placing Order...');
    if (cartItems.length === 0) {
        toast({
            variant: "destructive",
            title: "Empty Cart",
            description: "You cannot checkout with an empty cart.",
        });
        setLoadingText(null);
        return;
    }

    // DEFENSIVE CHECK: Validate barangay for local delivery
    if (values.shippingMethod === 'local-delivery') {
        if (!values.barangay || values.barangay.trim().length === 0) {
            toast({
                variant: "destructive",
                title: "Barangay Required",
                description: "Please select a barangay for delivery.",
            });
            form.setError('barangay', {
                message: 'Barangay is required for local delivery',
            });
            setLoadingText(null);
            return;
        }
        if (!isValidBarangay(values.barangay)) {
            toast({
                variant: "destructive",
                title: "Invalid Barangay",
                description: "Selected barangay is not valid. Please pick from the list.",
            });
            form.setError('barangay', {
                message: 'Invalid barangay - must be from Dagupan',
            });
            setLoadingText(null);
            return;
        }
    }

    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to place an order." });
      setLoadingText(null);
      return;
    }

    try {
        let receiptImageUrl = null;

        // Upload receipt if using GCash
        if (values.paymentMethod === 'gcash' && values.receipt) {
            setLoadingText("Uploading Receipt...");
            receiptImageUrl = await uploadReceipt(values.receipt);
            setLoadingText("Finalizing Order...");
        }

        // Prepare order data
        const orderData = {
            items: cartItems.map(item => ({
                productId: item.id,
                productName: item.name,
                quantity: item.quantity,
                price: item.price,
                image: item.image,
                sellerId: item.createdBy,
            })),
            totalAmount: cartTotal + deliveryFee,
            shippingMethod: values.shippingMethod,
            shippingAddress: {
                fullName: `${values.firstName} ${values.lastName}`,
                email: values.email,
                contactNumber: values.contactNumber,
                streetAddress: values.shippingMethod === 'local-delivery' ? values.streetAddress : null,
                barangay: values.shippingMethod === 'local-delivery' ? values.barangay : null,
                city: values.shippingMethod === 'local-delivery' ? 'Dagupan' : null,
                postalCode: values.shippingMethod === 'local-delivery' ? '2400' : null,
                country: values.shippingMethod === 'local-delivery' ? 'Philippines' : null,
            },
            deliveryFee: deliveryFee,
            paymentMethod: values.paymentMethod,
            receiptImageUrl: receiptImageUrl,
        };

        // Create order via API
        const result = await OrdersService.createOrder(user.uid, orderData);

        setLoadingText(null);
        form.reset();

        // Set user-specific flag to clear orders cache on next page load
        localStorage.setItem(`orderJustPlaced_${user.uid}`, 'true');

        toast({
            title: "Order Placed!",
            description: "Your order has been successfully submitted.",
        });
        clearCart();
        navigate(`/order-confirmation?orderId=${result.orderId}`);

    } catch (error) {
        console.error("Order submission failed:", error);
        setLoadingText(null);
        let description = 'An error occurred. Please try again.';

        // Parse error message
        const errorMsg = error.message || '';

        if (errorMsg.toLowerCase().includes('upload failed with status 500')) {
          description = 'Receipt upload failed. Please try a different file or try again.';
        } else if (errorMsg.toLowerCase().includes('upload failed')) {
          description = 'Receipt upload failed. Check file size (must be < 5MB) and format.';
        } else if (errorMsg.toLowerCase().includes('file') || errorMsg.toLowerCase().includes('image')) {
          description = 'Invalid file. Please upload a valid image file.';
        } else if (errorMsg.toLowerCase().includes('must be logged in')) {
          description = 'You must be logged in to place an order.';
        } else if (errorMsg.toLowerCase().includes('item') || errorMsg.toLowerCase().includes('quantity')) {
          description = 'Invalid item or quantity. Please check your cart.';
        } else if (errorMsg.toLowerCase().includes('shipping')) {
          description = 'Invalid shipping address. Please check your details.';
        } else if (errorMsg.toLowerCase().includes('payment')) {
          description = 'Invalid payment method selected.';
        } else if (errorMsg.toLowerCase().includes('stock')) {
          description = 'Some items are out of stock. Please update your cart.';
        } else if (errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('server')) {
          description = 'Server error. Please try again later.';
        } else if (errorMsg.length > 0) {
          description = errorMsg;
        }

        toast({
            variant: "destructive",
            title: "Order Failed",
            description: description,
        });
    } finally {
        setLoadingText(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checkout Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Shipping Method */}
            <FormField
              control={form.control}
              name="shippingMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-semibold">Shipping Method</FormLabel>
                  <FormControl>
                    <div className="flex flex-col sm:flex-row gap-4">
                      {(sellerDetails?.allowShipping || !sellerDetails) && (
                        <FormItem className="flex-1">
                          <FormControl>
                            <button
                              type="button"
                              onClick={() => field.onChange('local-delivery')}
                              disabled={sellerDetails && !sellerDetails.allowShipping}
                              className={`w-full text-left p-4 border rounded-md transition-colors ${
                                field.value === 'local-delivery'
                                  ? 'border-primary ring-2 ring-primary'
                                  : 'hover:bg-accent'
                              } ${sellerDetails && !sellerDetails.allowShipping ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <p className="font-bold capitalize">Local Delivery</p>
                              <p className="text-sm text-muted-foreground">Delivered to your address in Dagupan.</p>
                            </button>
                          </FormControl>
                        </FormItem>
                      )}
                      {(sellerDetails?.allowPickup || !sellerDetails) && (
                        <FormItem className="flex-1">
                          <FormControl>
                            <button
                              type="button"
                              onClick={() => field.onChange('store-pickup')}
                              disabled={sellerDetails && !sellerDetails.allowPickup}
                              className={`w-full text-left p-4 border rounded-md transition-colors ${
                                field.value === 'store-pickup'
                                  ? 'border-primary ring-2 ring-primary'
                                  : 'hover:bg-accent'
                              } ${sellerDetails && !sellerDetails.allowPickup ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <p className="font-bold capitalize">Store Pickup</p>
                              <p className="text-sm text-muted-foreground">Pick up your order at our physical store.</p>
                            </button>
                          </FormControl>
                        </FormItem>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Details - Conditional */}
            {watchedShippingMethod === 'local-delivery' && (
              <div className="space-y-4 p-4 border rounded-md animate-in fade-in-0">
                <h3 className="font-semibold">Shipping Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="Jeremy" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Cruz" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="contactNumber" render={({ field }) => ( <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="09123456789" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <FormField control={form.control} name="streetAddress" render={({ field }) => ( <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="barangay" render={({ field, fieldState }) => (
                        <FormItem className="relative">
                            <FormLabel className="text-sm font-medium">
                              Barangay <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                                        <Input
                                            placeholder="Search or select barangay..."
                                            value={barangayInput}
                                            onChange={(e) => handleBarangayChange(e.target.value)}
                                            onFocus={() => {
                                              if (barangayInput.trim().length > 0 || SORTED_BARANGAYS.length > 0) {
                                                setShowSuggestions(true);
                                              }
                                            }}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            className={`pl-9 pr-3 ${fieldState?.error ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                        />
                                    </div>
                                    {showSuggestions && barangaySuggestions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md shadow-lg max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                            <div className="sticky top-0 bg-gray-50 dark:bg-slate-800 px-4 py-2 border-b text-xs text-gray-600 dark:text-gray-300 font-medium">
                                              {barangaySuggestions.length} barangay{barangaySuggestions.length !== 1 ? 's' : ''} found
                                            </div>
                                            {barangaySuggestions.map((barangay, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => selectBarangay(barangay)}
                                                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors text-foreground flex items-center justify-between ${
                                                      barangayInput.toLowerCase() === barangay.toLowerCase() 
                                                        ? 'bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500' 
                                                        : ''
                                                    }`}
                                                >
                                                    <span className={barangayInput.toLowerCase() === barangay.toLowerCase() ? 'font-semibold text-blue-700 dark:text-blue-200' : ''}>
                                                      {barangay}
                                                    </span>
                                                    {barangayInput.toLowerCase() === barangay.toLowerCase() && (
                                                      <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </FormControl>
                            <FormMessage className="text-xs mt-1" />
                        </FormItem>
                    )}/>
                    <FormItem><FormLabel>City</FormLabel><FormControl><Input value="Dagupan" disabled /></FormControl></FormItem>
                </div>
              </div>
            )}
             {watchedShippingMethod === 'store-pickup' && (
              <div className="space-y-4 p-4 border rounded-md animate-in fade-in-0">
                  <h3 className="font-semibold">Contact Information</h3>
                  <p className="text-sm text-muted-foreground">We'll use this to notify you when your order is ready for pickup.</p>
                  <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="Jeremy" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Cruz" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField control={form.control} name="contactNumber" render={({ field }) => ( <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="09123456789" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
              </div>
            )}

            {/* Seller Shop Address Display */}
            {cartItems.length > 0 && (
              <div className="space-y-4 p-4 border rounded-md animate-in fade-in-0">
                <h3 className="font-semibold">Shop Information</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">You're ordering from:</p>
                  {loadingSeller ? (
                    <>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </>
                  ) : sellerDetails?.shopName ? (
                    <>
                      <p className="font-medium">{sellerDetails.shopName}</p>
                      {sellerDetails.shopAddress && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {sellerDetails.shopAddress}
                          {sellerDetails.shopBarangay && `, ${sellerDetails.shopBarangay}`}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {sellerDetails.allowShipping && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded text-xs">
                            <Truck className="h-3 w-3" /> Shipping Available
                          </span>
                        )}
                        {sellerDetails.allowPickup && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded text-xs">
                            <MapPin className="h-3 w-3" /> Pickup Available
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-xs">Shop information not available</p>
                  )}
                </div>
              </div>
            )}

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-semibold">Payment Method</FormLabel>
                   <div className="flex flex-col sm:flex-row gap-4">
                      {['cod', 'gcash'].map((method) => (
                        <FormItem key={method} className="flex-1">
                          <FormControl>
                             <button
                              type="button"
                              onClick={() => field.onChange(method)}
                              className={`w-full text-left p-4 border rounded-md transition-colors ${field.value === method ? 'border-primary ring-2 ring-primary' : 'hover:bg-accent'}`}
                            >
                              <p className="font-bold capitalize">{method.toUpperCase()}</p>
                              <p className="text-sm text-muted-foreground">{method === 'cod' ? 'Pay with cash upon delivery or pickup.' : 'Pay now via GCash and upload receipt.'}</p>
                            </button>
                          </FormControl>
                        </FormItem>
                      ))}
                    </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {watchedPaymentMethod === 'gcash' && (
                 <Alert className="animate-in fade-in-0">
                    <AlertTitle className="font-bold">GCash Payment Instructions</AlertTitle>
                    {loadingSeller ? (
                        <div className="space-y-2 mt-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ) : sellerDetails?.gcashName && sellerDetails?.gcashNumber ? (
                        <AlertDescription className="space-y-2 mt-2">
                            <p>Please send a total of <strong className="text-foreground">₱{(cartTotal + deliveryFee).toFixed(2)}</strong> to the seller's account below:</p>
                            <ul className="list-disc pl-5 text-foreground">
                                <li><strong>Account Name:</strong> {sellerDetails.gcashName}</li>
                                <li><strong>GCash Number:</strong> {sellerDetails.gcashNumber}</li>
                            </ul>
                            <p>After payment, upload a screenshot of your receipt below. The seller will process your order after verifying the payment.</p>
                             <FormField
                                control={form.control}
                                name="receipt"
                                render={({ field }) => (
                                    <FormItem className="pt-2">
                                    <FormLabel>Upload Receipt</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={(e) => field.onChange(e.target.files?.[0])}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </AlertDescription>
                    ) : (
                        <AlertDescription className="mt-2">
                            The seller has not provided their GCash details yet. Please select another payment method or contact the seller.
                        </AlertDescription>
                    )}
                </Alert>
            )}
            
            <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!!loadingText || cartItems.length === 0 || (watchedPaymentMethod === 'gcash' && (!sellerDetails?.gcashName || !sellerDetails?.gcashNumber))}
            >
                {loadingText ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> {loadingText}</> : 'Place Order'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}