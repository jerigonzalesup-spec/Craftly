
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
import { useFirebaseApp } from '@/firebase/provider';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OrdersService } from '@/services/orders/ordersService';
import { UserProfileService } from '@/services/user/userProfileService';
import { SORTED_BARANGAYS, isValidBarangay } from '@/lib/dagupanBarangays';


const formSchema = z.object({
    shippingMethod: z.enum(['local-delivery', 'store-pickup']),
    paymentMethod: z.enum(['cod', 'gcash']),
    fullName: z.string()
      .min(2, 'Full name must be at least 2 characters.')
      .regex(/^[a-zA-Z\s'-]+$/, 'Full name must contain only letters, spaces, hyphens, and apostrophes. No numbers allowed.'),
    email: z.string()
      .regex(/^[a-zA-Z0-9._%+-]+@(gmail|yahoo|outlook|hotmail|aol|protonmail|icloud|mail|zoho)\.com$/, 'Please use a valid email from: gmail.com, yahoo.com, outlook.com, hotmail.com, aol.com, protonmail.com, icloud.com, mail.com, or zoho.com'),
    contactNumber: z.string().regex(/^(09|\+639)\d{9}$/, 'Please enter a valid PH mobile number (e.g., 09123456789 or +639123456789).'),
    streetAddress: z.string().optional(),
    barangay: z.string().refine(val => !val || isValidBarangay(val), { message: 'Please select a valid Dagupan barangay from the suggestions' }).optional(),
    receipt: z.instanceof(File).optional(),
}).refine(data => {
    if (data.shippingMethod === 'local-delivery') {
        if (!data.streetAddress || data.streetAddress.length < 5) return false;
        if (!data.barangay || data.barangay.length < 2) return false;

        // Must have both number (house number) and letters (street name)
        const hasNumber = /\d/.test(data.streetAddress);
        const hasLetter = /[a-zA-Z]/.test(data.streetAddress);
        return hasNumber && hasLetter;
    }
    return true;
}, {
    message: 'Street address must include house/building number and street name (e.g., "123 Main Street"). Barangay is also required.',
    path: ['streetAddress'],
}).refine(data => {
    if (data.paymentMethod === 'gcash') {
        return !!data.receipt;
    }
    return true;
}, {
    message: 'A receipt is required for GCash payment.',
    path: ['receipt'],
});


export function CheckoutForm({ shippingMethod, setShippingMethod, deliveryFee }) {
  const navigate = useNavigate();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { toast } = useToast();
  const { user } = useUser();
  const app = useFirebaseApp();
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
      fullName: user?.displayName || '',
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
          // Pre-fill form with saved profile data
          form.reset({
            shippingMethod: form.getValues('shippingMethod'),
            paymentMethod: form.getValues('paymentMethod'),
            fullName: profile.fullName || user.displayName || '',
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
      setBarangaySuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = SORTED_BARANGAYS.filter(barangay =>
      barangay.toLowerCase().includes(value.toLowerCase())
    );

    setBarangaySuggestions(filtered.slice(0, 8)); // Show max 8 suggestions
    setShowSuggestions(true);
  };

  // Handle selecting a barangay from suggestions
  const selectBarangay = (barangay) => {
    setBarangayInput(barangay);
    form.setValue('barangay', barangay);
    setShowSuggestions(false);
  };

  // Fetch seller's GCash details when payment method is selected
  useEffect(() => {
    if (watchedPaymentMethod !== 'gcash' || cartItems.length === 0) {
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
  }, [watchedPaymentMethod, cartItems]);


  const uploadReceipt = async (file, orderId) => {
    if (!app) throw new Error("Firebase app not initialized");
    const storage = getStorage(app);
    const storageRef = ref(storage, `receipts/${orderId}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  }

  async function onSubmit(values) {
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
            receiptImageUrl = await uploadReceipt(values.receipt, `${Date.now()}`);
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
                fullName: values.fullName,
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

        // Success
        form.reset();
        toast({
            title: "Order Placed!",
            description: "Your order has been successfully submitted.",
        });
        clearCart();
        navigate(`/order-confirmation?orderId=${result.orderId}`);

    } catch (error) {
        console.error("Order submission failed:", error);
        let description = 'An error occurred while placing your order.';

        // Parse error message
        const errorMsg = error.message || '';

        if (errorMsg.toLowerCase().includes('must be logged in')) {
          description = 'You must be logged in to place an order.';
        } else if (errorMsg.toLowerCase().includes('item') || errorMsg.toLowerCase().includes('quantity')) {
          description = 'Invalid item or quantity. Please check your cart.';
        } else if (errorMsg.toLowerCase().includes('shipping')) {
          description = 'Shipping address is invalid. Please check your details.';
        } else if (errorMsg.toLowerCase().includes('payment')) {
          description = 'Payment method is invalid. Please select a payment method.';
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
                      {['local-delivery', 'store-pickup'].map((method) => (
                        <FormItem key={method} className="flex-1">
                          <FormControl>
                            <button
                              type="button"
                              onClick={() => field.onChange(method)}
                              className={`w-full text-left p-4 border rounded-md transition-colors ${field.value === method ? 'border-primary ring-2 ring-primary' : 'hover:bg-accent'}`}
                            >
                              <p className="font-bold capitalize">{method.replace('-', ' ')}</p>
                              <p className="text-sm text-muted-foreground">{method === 'local-delivery' ? 'Delivered to your address in Dagupan.' : 'Pick up your order at our physical store.'}</p>
                            </button>
                          </FormControl>
                        </FormItem>
                      ))}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Jeremy Cruz" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                 <FormField control={form.control} name="contactNumber" render={({ field }) => ( <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="09123456789" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="streetAddress" render={({ field }) => ( <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="barangay" render={({ field }) => (
                        <FormItem className="relative">
                            <FormLabel>Barangay</FormLabel>
                            <FormControl>
                                <div>
                                    <Input
                                        placeholder="e.g. Pantal"
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
                    )}/>
                    <FormItem><FormLabel>City</FormLabel><FormControl><Input value="Dagupan" disabled /></FormControl></FormItem>
                </div>
              </div>
            )}
             {watchedShippingMethod === 'store-pickup' && (
              <div className="space-y-4 p-4 border rounded-md animate-in fade-in-0">
                  <h3 className="font-semibold">Contact Information</h3>
                  <p className="text-sm text-muted-foreground">We'll use this to notify you when your order is ready for pickup.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Jeremy Cruz" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  </div>
                  <FormField control={form.control} name="contactNumber" render={({ field }) => ( <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="09123456789" {...field} /></FormControl><FormMessage /></FormItem> )}/>
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