
import { useEffect, useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, ShoppingCart, DollarSign, AlertTriangle, ListOrdered } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

/**
 * Safely convert createdAt to a Date object
 * Handles both Firestore Timestamp objects and ISO 8601 strings
 */
function getDateFromCreatedAt(createdAt) {
  if (!createdAt) return new Date();

  // If it's a Firestore Timestamp object with toDate method
  if (createdAt.toDate && typeof createdAt.toDate === 'function') {
    return createdAt.toDate();
  }

  // If it's an ISO string
  if (typeof createdAt === 'string') {
    return new Date(createdAt);
  }

  // If it's already a Date object
  if (createdAt instanceof Date) {
    return createdAt;
  }

  return new Date();
}


function StatCard({ title, value, icon: Icon, loading }) {
  return (
    <Card className="transition-all hover:scale-[1.02] hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SellerDashboardPage() {
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0 });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (userLoading || !user) {
        setStats({ products: 0, orders: 0, revenue: 0 });
        setRecentSales([]);
        setLowStockProducts([]);
        setLoading(false);
        return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/dashboard/seller-stats`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user.uid,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }

        const data = await response.json();
        const { stats: statsData, recentSales: sales, lowStockProducts: lowStock } = data.data;

        setStats(statsData);
        setRecentSales(sales);
        setLowStockProducts(lowStock);
      } catch (error) {
        console.error("Error fetching seller stats:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load dashboard data.' });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, userLoading, toast]);

  if (loading || userLoading) {
    return (
        <div className="container mx-auto px-4 py-12">
            <Skeleton className="h-10 w-64 mb-8" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Skeleton className="h-96 w-full lg:col-span-2" />
                <Skeleton className="h-96 w-full" />
            </div>
        </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold mb-8 font-headline">Seller Overview</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
            title="Total Revenue"
            value={`₱${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            loading={loading}
        />
        <StatCard
            title="Active Products"
            value={stats.products}
            icon={Package}
            loading={loading}
        />
        <StatCard
            title="Total Orders"
            value={stats.orders}
            icon={ShoppingCart}
            loading={loading}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ListOrdered />
                    Recent Sales
                </CardTitle>
                <CardDescription>
                    The 5 most recent orders that include your products.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {recentSales.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentSales.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell>{format(getDateFromCreatedAt(order.createdAt), 'MMM d, yyyy')}</TableCell>
                                    <TableCell>{order.sellerItemCount}</TableCell>
                                    <TableCell className="text-right font-medium">₱{order.sellerItemsValue.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-muted-foreground text-center py-8">No sales yet.</p>
                )}
            </CardContent>
        </Card>
        <Card>
             <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-amber-500"/>
                    Low Stock Alerts
                </CardTitle>
                <CardDescription>
                    Products with 5 or fewer items in stock.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 {lowStockProducts.length > 0 ? (
                    <div className="space-y-4">
                        {lowStockProducts.map(product => (
                            <div key={product.id} className="flex justify-between items-center text-sm">
                                <Link to="/dashboard/my-products" className="font-medium hover:underline truncate pr-4">
                                  {product.name}
                                </Link>
                                <span className="font-bold text-destructive flex-shrink-0">{product.stock} left</span>
                            </div>
                        ))}
                         <Button asChild variant="secondary" className="w-full mt-4">
                            <Link to="/dashboard/my-products">Manage Products</Link>
                        </Button>
                    </div>
                ) : (
                     <p className="text-muted-foreground text-center py-8">All products are well-stocked!</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

