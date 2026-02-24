
import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useSellerOrders } from '@/hooks/use-seller-orders';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

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

export default function MySalesPage() {
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();

  const { orders, loading: ordersLoading, invalidateCache } = useSellerOrders(user?.uid);

  const sellerOrders = useMemo(() => {
    // Orders from API already have sellerItems and sellerTotal calculated
    // Just sort them by date (should already be sorted, but ensure consistency)
    const sorted = orders
      .sort((a, b) => getDateFromCreatedAt(b.createdAt).getTime() - getDateFromCreatedAt(a.createdAt).getTime());
    
    // DEBUG: Log order data structure
    if (sorted.length > 0) {
      console.log(`📋 Seller Orders Debug - First order:`, {
        orderId: sorted[0].id,
        paymentStatus: sorted[0].paymentStatus,
        sellerTotal: sorted[0].sellerTotal,
        sellerItems: sorted[0].sellerItems,
        items: sorted[0].items,
      });
    }
    
    return sorted;

  }, [orders]);

  // Helper: Check if order is older than 24 hours
  const isOrderLocked = (createdAt) => {
    const orderDate = getDateFromCreatedAt(createdAt);
    const currentDate = new Date();
    const hoursElapsed = (currentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    return hoursElapsed > 24;
  };

  // Helper: Get hours remaining to edit
  const getHoursRemaining = (createdAt) => {
    const orderDate = getDateFromCreatedAt(createdAt);
    const currentDate = new Date();
    const hoursElapsed = (currentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, 24 - hoursElapsed);
    return Math.ceil(hoursRemaining);
  };

  const handleStatusChange = async (orderId, buyerId, newStatus, order) => {
    // Check if order is locked (older than 24 hours)
    if (isOrderLocked(order.createdAt)) {
      toast({
        variant: 'destructive',
        title: 'Order Locked',
        description: 'You can only edit order status within 24 hours of creation.'
      });
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.uid,
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      // Invalidate cache immediately after successful update
      invalidateCache();
      
      toast({
        title: 'Order Status Updated',
        description: 'Order status has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update order status.',
      });
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'processing': return 'outline';
      case 'shipped': return 'default';
      case 'delivered': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  // Combine loading states
  const loading = userLoading || ordersLoading;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 font-headline">My Sales</h1>
        <Card>
          <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 font-headline">My Sales</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Orders</CardTitle>
          <CardDescription>Manage the status of orders containing your products.</CardDescription>
        </CardHeader>
        <CardContent>
          {sellerOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Customer</TableHead>
                  <TableHead>Your Revenue</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellerOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell>{format(getDateFromCreatedAt(order.createdAt), 'PPP')}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{order.shippingAddress.fullName}</TableCell>
                    <TableCell className="font-medium">
                      {/* Show revenue for all orders - payment is already validated at checkout */}
                      ₱{order.sellerTotal?.toFixed(2) || '0.00'}
                      {order.paymentStatus !== 'paid' && <span className="text-xs text-muted-foreground block">({order.paymentStatus})</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.paymentStatus === 'paid' ? 'default' : order.paymentStatus === 'pending' ? 'secondary' : 'destructive'}
                        className="capitalize"
                      >
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isOrderLocked(order.createdAt) ? (
                        <div className="space-y-1">
                          <Badge variant={getStatusVariant(order.orderStatus)} className="capitalize">
                            {order.orderStatus}
                          </Badge>
                          <p className="text-xs text-muted-foreground">Locked</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Select
                            defaultValue={order.orderStatus}
                            onValueChange={(value) => handleStatusChange(order.id, order.buyerId, value, order)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue>
                                 <Badge variant={getStatusVariant(order.orderStatus)} className="capitalize">{order.orderStatus}</Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">{getHoursRemaining(order.createdAt)}h remaining</p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button asChild variant="outline" size="sm">
                        <Link to={`/orders/${order.id}`}>View Details</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No sales yet</h3>
                <p className="text-muted-foreground mt-2">When a customer buys one of your products, the order will appear here.</p>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
