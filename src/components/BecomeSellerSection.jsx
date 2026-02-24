import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const applyFormSchema = z.object({
  shopName: z.string().min(3, 'Shop name must be 3-50 characters.').max(50, 'Shop name must be 3-50 characters.'),
  phoneNumber: z.string().regex(/^(09|\+639)\d{9}$/, 'Please enter a valid PH mobile number (e.g., 09123456789 or +639123456789).'),
  productTypes: z.string().min(10, 'Description must be 10-100 characters.').max(100, 'Description must be 10-100 characters.'),
  portfolioLink: z.string().url({ message: 'Please enter a valid URL.' }).max(2048, 'URL is too long.').optional().or(z.literal('')),
  reason: z.string().min(50, 'Reason must be 50-1000 characters.').max(1000, 'Reason must be 50-1000 characters.'),
});

export function BecomeSellerSection() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!user || !firestore) {
        setApplication(null);
        setLoading(false);
        return;
    }
    setLoading(true);

    // Using one-time fetch instead of real-time listener to prevent Firestore watch target state corruption
    const fetchApplications = async () => {
      try {
        const appDocRef = doc(firestore, 'seller-applications', user.uid);
        const docSnap = await getDoc(appDocRef);

        if (docSnap.exists()) {
          setApplication({ id: docSnap.id, ...docSnap.data() });
        } else {
          setApplication(null);
        }
      } catch (error) {
        if (error.code !== 'permission-denied') {
          console.error("Error fetching seller application:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user, firestore]);

  const form = useForm({
    resolver: zodResolver(applyFormSchema),
    defaultValues: { 
        shopName: '',
        phoneNumber: '',
        productTypes: '',
        portfolioLink: '',
        reason: '' 
    },
  });

  const onSubmit = async (data) => {
    if (!user || !firestore) return;
    const appDocRef = doc(firestore, 'seller-applications', user.uid);
    const newApplication = {
      userId: user.uid,
      shopName: data.shopName,
      phoneNumber: data.phoneNumber,
      productTypes: data.productTypes,
      portfolioLink: data.portfolioLink || '',
      reasonForApplying: data.reason,
      status: 'pending',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      rejectionReason: '', // Clear previous rejection reason
    };

    // Using setDoc will create or overwrite the document.
    setDoc(appDocRef, newApplication).then(() => {
        toast({
            title: 'Application Submitted',
            description: 'We will review your application and get back to you.',
        });
        form.reset();
        setIsFormOpen(false);
    }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: appDocRef.path,
            operation: 'write',
            requestResourceData: newApplication,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };
  
  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Become a Seller</CardTitle>
            </CardHeader>
            <CardContent>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }

  const renderStatusContent = () => {
    if (application) {
      switch (application.status) {
        case 'pending':
          return (
             <Alert>
                <AlertTitle>Application Pending</AlertTitle>
                <AlertDescription>
                    Your request to become a seller is currently under review. Thank you for your patience.
                </AlertDescription>
            </Alert>
          );
        case 'rejected':
          return (
             <Alert variant="destructive">
                <AlertTitle>Application Not Approved</AlertTitle>
                <AlertDescription>
                    Unfortunately, your application was not approved at this time.
                    {application.rejectionReason && <p className="mt-2"><strong>Reason:</strong> {application.rejectionReason}</p>}
                    <Button className="mt-4" variant="secondary" onClick={() => setIsFormOpen(true)}>
                        Apply Again
                    </Button>
                </AlertDescription>
            </Alert>
          );
      }
    }

    // Default case: no application submitted yet
    return (
        <>
            <CardDescription>
                Interested in selling your handmade products on Craftly? Apply now to reach a wider audience and join our community of artisans.
            </CardDescription>
            <Button className="mt-4" onClick={() => setIsFormOpen(true)}>Apply to Become a Seller</Button>
      </>
    );
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Become a Seller</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderStatusContent()}
      </CardContent>

       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Seller Application</DialogTitle>
                <DialogDescription>
                    Tell us a bit about yourself and what you create. We'll review your application and get back to you.
                </DialogDescription>
            </DialogHeader>
            <Alert className="bg-blue-50 border-blue-200">
                <AlertTitle className="text-blue-900">📋 Platform Commission</AlertTitle>
                <AlertDescription className="text-blue-800">
                    Once approved, sellers pay <strong>5%</strong> commission on all sales.
                    <br />
                    <span className="text-sm">Example: Sale ₱10,000 → You earn ₱9,500</span>
                </AlertDescription>
            </Alert>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <FormField
                    control={form.control}
                    name="shopName"
                    render={({ field }) => (
                        <FormItem className="md:col-span-2">
                        <FormLabel>Shop Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. The Clay Corner" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                    <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                            <Input placeholder="09123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="productTypes"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>What do you sell?</FormLabel>
                        <FormControl>
                            <Input placeholder="Pottery, jewelry, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                    <FormField
                    control={form.control}
                    name="portfolioLink"
                    render={({ field }) => (
                        <FormItem className="md:col-span-2">
                        <FormLabel>Portfolio Link (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="https://instagram.com/yourshop" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                        <FormItem className="md:col-span-2">
                        <FormLabel>Why do you want to sell on Craftly?</FormLabel>
                        <FormControl>
                            <Textarea
                            placeholder="Describe your craft, your products, and what makes them special..."
                            rows={4}
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter className="md:col-span-2">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Application'}
                    </Button>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
        </Dialog>
    </Card>
  );
}