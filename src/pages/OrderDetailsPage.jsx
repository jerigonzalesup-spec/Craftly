
import { useEffect, useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useParams, Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Download, MapPin, Truck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { UserProfileService } from '@/services/user/userProfileService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Convert createdAt to Date object (handles both Firestore Timestamps and ISO strings from API)
function getDateFromCreatedAt(createdAt) {
  if (!createdAt) return new Date();

  // If Firestore Timestamp object with toDate method
  if (createdAt.toDate && typeof createdAt.toDate === 'function') {
    return createdAt.toDate();
  }

  // If ISO string
  if (typeof createdAt === 'string') {
    return new Date(createdAt);
  }

  // If already a Date object
  if (createdAt instanceof Date) {
    return createdAt;
  }

  return new Date();
}

function NotFound() {
    return (
        <div className="text-center py-20">
            <h1 className="text-4xl font-bold">404 - Not Found</h1>
            <p className="text-muted-foreground mt-4">The order you are looking for does not exist.</p>
        </div>
    );
}

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.orderId;
  const { user, loading: userLoading } = useUser();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shopDetails, setShopDetails] = useState(null);
  const [loadingShop, setLoadingShop] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userLoading || !orderId) {
        setLoading(userLoading);
        return;
    }

    setLoading(true);

    // Fetch order details via API instead of direct Firestore
    // This avoids permission issues and properly validates access
    const fetchOrderDetails = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

        const response = await fetch(`${API_URL}/api/orders/${orderId}/details`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user?.uid || '',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch order: ${response.status}`);
        }

        const data = await response.json();
        setOrder(data.data);
      } catch (error) {
        console.error("Error fetching order details:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, user, userLoading]);

  // Fetch seller shop details if order is store-pickup
  useEffect(() => {
    if (!order || order.shippingMethod !== 'store-pickup' || !order.items || order.items.length === 0) {
      setShopDetails(null);
      return;
    }

    const fetchShopDetails = async () => {
      try {
        setLoadingShop(true);
        // Get the first seller's shop details
        const firstSellerId = order.items[0].sellerId;
        if (firstSellerId) {
          const sellerProfile = await UserProfileService.getUserProfile(firstSellerId);
          setShopDetails(sellerProfile);
        }
      } catch (error) {
        console.error('Failed to fetch shop details:', error);
        setShopDetails(null);
      } finally {
        setLoadingShop(false);
      }
    };

    fetchShopDetails();
  }, [order]);

  // Helper: Check if order is older than 24 hours
  const isOrderLocked = () => {
    if (!order) return false;
    const orderDate = getDateFromCreatedAt(order.createdAt);
    const currentDate = new Date();
    const hoursElapsed = (currentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    return hoursElapsed > 24;
  };

  // Helper: Get hours remaining to edit
  const getHoursRemaining = () => {
    if (!order) return 0;
    const orderDate = getDateFromCreatedAt(order.createdAt);
    const currentDate = new Date();
    const hoursElapsed = (currentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, 24 - hoursElapsed);
    return Math.ceil(hoursRemaining);
  };

  const handlePaymentStatusChange = async (newStatus) => {
    // Check if order is locked (older than 24 hours)
    if (isOrderLocked()) {
      toast({
        variant: 'destructive',
        title: 'Order Locked',
        description: 'You can only edit payment status within 24 hours of order creation.'
      });
      return;
    }

    if (!user || !order) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const response = await fetch(`${API_URL}/api/orders/${order.id}/payment-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.uid,
        },
        body: JSON.stringify({
          paymentStatus: newStatus,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update payment status');
      }

      const data = await response.json();

      // Update local order state
      setOrder(prev => ({
        ...prev,
        paymentStatus: newStatus,
        orderStatus: data.data.orderStatus || prev.orderStatus,
      }));

      toast({
        title: 'Payment Status Updated',
        description: `Order payment status set to ${newStatus}.`,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Failed to update payment status.',
      });
    }
  }

  if (userLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-6 w-32 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  if (notFound) {
      return <NotFound />;
  }

  if (!order) {
    return null;
  }

  const getStatusVariant = (status) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'processing': return 'outline';
      case 'shipped': return 'default';
      case 'completed': return 'secondary';
      case 'unpaid': return 'destructive';
      case 'pending_verification': return 'outline';
      case 'paid': return 'default';
      default: return 'secondary';
    }
  };

  // Check if current user is a seller in this specific order (not just by role)
  const isSellerInOrder = user && order && order.items && order.items.some(item => item.sellerId === user.uid);
  const isAdmin = user && user.roles?.includes('admin');
  const isBuyer = user && order && order.buyerId === user.uid;

  // Only seller/admin of items in this order OR the buyer can modify payment status
  const canModifyPayment = isSellerInOrder || isAdmin;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to={isSellerInOrder ? "/dashboard/my-sales" : "/my-orders"}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Orders
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Order Details</CardTitle>
                  <CardDescription>
                    Order ID: <span className="font-mono text-xs">{order.id}</span>
                  </CardDescription>
                </div>
                <Badge variant={getStatusVariant(order.orderStatus)} className="capitalize text-base px-3 py-1">
                  {order.orderStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-sm font-medium">Order Date</p><p className="text-muted-foreground">{format(getDateFromCreatedAt(order.createdAt), 'PPP')}</p></div>
                <div><p className="text-sm font-medium">Order Total</p><p className="text-muted-foreground font-semibold">₱{order.totalAmount.toFixed(2)}</p></div>
                <div>
                  <p className="text-sm font-medium">Payment</p>
                    {canModifyPayment && !isOrderLocked() ? (
                        <div className="space-y-2 mt-1">
                          {/* GCash with pending receipt: show Approve / Reject buttons */}
                          {order.paymentMethod === 'gcash' && order.paymentStatus === 'pending_verification' ? (
                            <div className="flex gap-2 flex-wrap">
                              <Badge variant="outline" className="capitalize text-amber-600 border-amber-400 mb-1">Receipt Under Review</Badge>
                              <div className="flex gap-2 w-full">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs flex-1"
                                  onClick={() => handlePaymentStatusChange('paid')}
                                >
                                  Approve Payment
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-xs flex-1"
                                  onClick={() => handlePaymentStatusChange('unpaid')}
                                >
                                  Reject Receipt
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">{getHoursRemaining()}h remaining to review</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Select
                                  defaultValue={order.paymentStatus}
                                  onValueChange={(value) => handlePaymentStatusChange(value)}
                              >
                                  <SelectTrigger className="w-[140px]">
                                      <SelectValue>
                                          <Badge variant={getStatusVariant(order.paymentStatus)} className="capitalize">{order.paymentStatus?.replace('_', ' ')}</Badge>
                                      </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="unpaid">Unpaid</SelectItem>
                                      <SelectItem value="pending_verification">Under Review</SelectItem>
                                      <SelectItem value="paid">Paid</SelectItem>
                                  </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">{getHoursRemaining()}h remaining</p>
                            </div>
                          )}
                        </div>
                    ) : (
                      <div className="space-y-1 mt-1">
                        <Badge variant={getStatusVariant(order.paymentStatus)} className="capitalize">{order.paymentStatus?.replace('_', ' ')}</Badge>
                        {isOrderLocked() && <p className="text-xs text-destructive">Locked (24h passed)</p>}
                      </div>
                    )}
                </div>
                <div><p className="text-sm font-medium">Method</p><p className="text-muted-foreground capitalize">{order.paymentMethod}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Items Ordered ({order.items.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="relative h-16 w-16 rounded-md overflow-hidden border flex-shrink-0">
                        <img src={item.image} alt={item.productName} className="object-cover w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/products/${item.productId}`} className="font-semibold hover:underline block truncate">{item.productName}</Link>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-medium ml-4">₱{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
           <Card>
            <CardHeader>
              <CardTitle>
                {order.shippingMethod === 'store-pickup' ? 'Pickup Contact Information' : 'Shipping Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground capitalize">{order.shippingMethod ? order.shippingMethod.replace('-', ' ') : ''}</p>
                <Separator className="my-4" />
                <p className="font-medium text-foreground">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.email}</p>
                {order.shippingAddress.contactNumber && <p>{order.shippingAddress.contactNumber}</p>}

                {order.shippingMethod === 'local-delivery' && order.shippingAddress.streetAddress && (
                    <address className="not-italic mt-2">
                        {order.shippingAddress.streetAddress}<br/>
                        Brgy. {order.shippingAddress.barangay}, {order.shippingAddress.city}<br/>
                        {order.shippingAddress.postalCode}, {order.shippingAddress.country}
                    </address>
                )}

                {order.shippingMethod === 'store-pickup' && (
                    <p className="text-xs text-muted-foreground mt-3 italic">
                      We'll use this contact information to verify your pickup order.
                    </p>
                )}
            </CardContent>
          </Card>

          {order.shippingMethod === 'store-pickup' && (
            <Card>
              <CardHeader><CardTitle>Store Pickup Location</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {loadingShop ? (
                  <>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </>
                ) : shopDetails ? (
                  <>
                    <p className="font-medium text-foreground">{shopDetails.shopName || 'Shop'}</p>
                    {shopDetails.shopAddress && (
                      <p className="flex items-start gap-2 mt-2">
                        <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>
                          {shopDetails.shopAddress}
                          {shopDetails.shopBarangay && `, Brgy. ${shopDetails.shopBarangay}`}
                          {shopDetails.shopCity && `, ${shopDetails.shopCity}`}
                        </span>
                      </p>
                    )}
                    {(shopDetails.allowShipping || shopDetails.allowPickup) && (
                      <div className="flex gap-2 mt-4">
                        {shopDetails.allowShipping && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            <Truck className="h-3 w-3" /> Shipping
                          </span>
                        )}
                        {shopDetails.allowPickup && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            <MapPin className="h-3 w-3" /> Pickup
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-xs">Shop information not available</p>
                )}
              </CardContent>
            </Card>
          )}

          {isSellerInOrder && order.paymentMethod === 'gcash' && (
            <Card>
              <CardHeader><CardTitle>Payment Verification</CardTitle></CardHeader>
              <CardContent>
                {order.receiptImageUrl ? (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Buyer has uploaded a receipt.</p>
                        <div className="relative aspect-video rounded-md border overflow-hidden">
                            <img src={order.receiptImageUrl} alt="Payment Receipt" className="object-contain w-full h-full" />
                        </div>
                         <a href={order.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="inline-block w-full">
                            <Button variant="outline" className="w-full"><Download className="mr-2 h-4 w-4" /> View Full Image</Button>
                         </a>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Waiting for buyer to upload payment receipt.</p>
                )}
              </CardContent>
            </Card>
          )}

          {isBuyer && order.paymentMethod === 'gcash' && (
            <Card>
              <CardHeader><CardTitle>Your GCash Receipt</CardTitle></CardHeader>
              <CardContent>
                {order.paymentStatus === 'pending_verification' && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                    ⏳ Your receipt is being reviewed by the seller. We'll update you once it's confirmed.
                  </div>
                )}
                {order.paymentStatus === 'paid' && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
                    ✅ Payment confirmed by the seller.
                  </div>
                )}
                {order.paymentStatus === 'unpaid' && !order.receiptImageUrl && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                    ⚠️ No receipt uploaded yet. Please upload your GCash payment receipt.
                  </div>
                )}
                {order.receiptImageUrl ? (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Here's your uploaded payment receipt.</p>
                        <div className="relative aspect-video rounded-md border overflow-hidden">
                            <img src={order.receiptImageUrl} alt="Your Payment Receipt" className="object-contain w-full h-full" />
                        </div>
                         <a href={order.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="inline-block w-full">
                            <Button variant="outline" className="w-full"><Download className="mr-2 h-4 w-4" /> View Full Image</Button>
                         </a>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No receipt uploaded yet.</p>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
