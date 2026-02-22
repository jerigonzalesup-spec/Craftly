
import { useEffect, useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Package, ShoppingCart, DollarSign, AlertTriangle, ListOrdered, TrendingUp, BarChart3, Plus, Eye, Settings, Clock, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    <Card className="glass rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-amber-600/30 hover:border-input animate-fade-in-up">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-amber-400 transition-transform duration-300 group-hover:rotate-12" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-3/4 bg-input" />
        ) : (
          <div className="text-2xl font-bold text-foreground">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SellerDashboardPage() {
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0 });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [salesChartData, setSalesChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timePeriod, setTimePeriod] = useState(7);
  const [orderStatusCounts, setOrderStatusCounts] = useState({});
  const [inventoryHealth, setInventoryHealth] = useState(null);
  const [salesGoal, setSalesGoal] = useState(null);
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();

  const fetchStats = async (period) => {
    setLoading(true);
    setError('');
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      if (!user?.uid) {
        console.warn('⚠️ User not authenticated yet');
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      console.log(`📊 Fetching dashboard stats for period: ${period} days, user: ${user.uid}`);
      
      const response = await fetch(`${API_URL}/api/dashboard/seller-stats?timePeriod=${period}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.uid,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch dashboard stats`);
      }

      const responseData = await response.json();
      console.log(`✅ Dashboard API Response:`, responseData);

      if (!responseData.data) {
        console.warn('⚠️ No data in response:', responseData);
        setError('No data received from server');
        setStats({ products: 0, orders: 0, revenue: 0 });
        setRecentSales([]);
        setLowStockProducts([]);
        setSalesChartData([]);
        setOrderStatusCounts({});
        setInventoryHealth(null);
        setSalesGoal(null);
        setLoading(false);
        return;
      }

      const { stats: statsData, recentSales: sales, lowStockProducts: lowStock, orderStatusCounts: statusCounts, inventoryHealth: health, salesGoal: goal } = responseData.data;

      console.log(`📈 Stats Data:`, statsData);
      console.log(`📦 Recent Sales (${sales?.length || 0}):`, sales);
      console.log(`⚠️ Low Stock (${lowStock?.length || 0}):`, lowStock);

      // Set state with proper defaults
      setStats(statsData || { products: 0, orders: 0, revenue: 0 });
      setRecentSales(sales || []);
      setLowStockProducts(lowStock || []);
      setOrderStatusCounts(statusCounts || {});
      setInventoryHealth(health || null);
      setSalesGoal(goal || null);

      // Prepare data for sales chart
      const chartData = (sales || []).map((sale, index) => ({
        date: format(getDateFromCreatedAt(sale.createdAt), 'MMM d'),
        value: sale.sellerItemsValue || 0,
        items: sale.sellerItemCount || 0,
      }));
      setSalesChartData(chartData);

      console.log(`✅ Dashboard stats loaded successfully - Revenue: ₱${statsData?.revenue || 0}`);
      setError('');
    } catch (err) {
      console.error("❌ Error fetching seller stats:", err);
      const errorMsg = err.message || 'Failed to load dashboard data';
      setError(errorMsg);
      setStats({ products: 0, orders: 0, revenue: 0 });
      setRecentSales([]);
      setLowStockProducts([]);
      setSalesChartData([]);
      toast({ 
        variant: 'destructive', 
        title: 'Dashboard Error', 
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading || !user) {
        setStats({ products: 0, orders: 0, revenue: 0 });
        setRecentSales([]);
        setLowStockProducts([]);
        setSalesChartData([]);
        setOrderStatusCounts({});
        setInventoryHealth(null);
        setSalesGoal(null);
        setError('');
        setLoading(false);
        return;
    }

    console.log(`🔄 Initial dashboard fetch for user: ${user.uid}`);
    fetchStats(timePeriod);
  }, [user?.uid, userLoading, timePeriod]);

  // Check for dashboard update flags and refetch if needed
  // Triggered when products are added/updated or orders are placed
  useEffect(() => {
    if (!user?.uid) return;
    
    const dashboardUpdateKey = `dashboardNeedsUpdate_${user.uid}`;
    const needsUpdate = localStorage.getItem(dashboardUpdateKey);
    
    if (needsUpdate) {
      console.log(`📊 Dashboard update detected for seller ${user.uid}, clearing flag...`);
      localStorage.removeItem(dashboardUpdateKey);
      
      // Wait 5 seconds for backend cache to clear and Firestore to sync, then refetch
      const timer = setTimeout(() => {
        console.log(`⚡ Refetching dashboard stats after 5s (product/order change)...`);
        fetchStats(timePeriod);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [user?.uid, timePeriod]);

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
    <div className="container mx-auto px-4 py-12">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            {error}
            <Button 
              onClick={() => fetchStats(timePeriod)} 
              variant="outline" 
              size="sm" 
              className="ml-4"
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <h1 className="text-4xl font-bold mb-8 font-headline text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-400 animate-fade-in-up">Seller Dashboard</h1>

      {/* Time Period Filter & Refresh */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-medium text-muted-foreground">View period:</span>
        </div>
        <div className="flex gap-2">
          <Select value={String(timePeriod)} onValueChange={(value) => setTimePeriod(parseInt(value))}>
            <SelectTrigger className="w-[140px] bg-input border border-input hover:bg-input/80 transition-all duration-300 text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-input">
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => fetchStats(timePeriod)} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            {loading ? '⟳ Loading...' : '⟳ Refresh'}
          </Button>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Button asChild className="h-auto py-6 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:shadow-xl hover:shadow-amber-600/30 group cursor-pointer animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Link to="/dashboard/my-products">
            <Plus className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-125" />
            <span className="text-sm font-medium transition-all duration-300">Add New Product</span>
          </Link>
        </Button>
        <Button asChild className="h-auto py-6 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 group cursor-pointer animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <Link to="/dashboard/my-sales">
            <Eye className="h-6 w-6 transition-transform duration-300 group-hover:scale-125" />
            <span className="text-sm font-medium transition-all duration-300">View Sales</span>
          </Link>
        </Button>
        <Button asChild className="h-auto py-6 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/30 group cursor-pointer animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Link to="/dashboard/my-products">
            <Package className="h-6 w-6 transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-12" />
            <span className="text-sm font-medium transition-all duration-300">Manage Inventory</span>
          </Link>
        </Button>
        <Button asChild className="h-auto py-6 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/30 group cursor-pointer animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
          <Link to="/profile">
            <Settings className="h-6 w-6 transition-transform duration-300 group-hover:rotate-180" />
            <span className="text-sm font-medium transition-all duration-300">Shop Settings</span>
          </Link>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="animate-in fade-in slide-in-from-left duration-500 [animation-delay:0ms]">
          <StatCard
              title="Total Revenue"
              value={`₱${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={DollarSign}
              loading={loading}
          />
        </div>
        <div className="animate-in fade-in slide-in-from-left duration-500 [animation-delay:100ms]">
          <StatCard
              title="Active Products"
              value={stats.products}
              icon={Package}
              loading={loading}
          />
        </div>
        <div className="animate-in fade-in slide-in-from-left duration-500 [animation-delay:200ms]">
          <StatCard
              title="Total Orders"
              value={stats.orders}
              icon={ShoppingCart}
              loading={loading}
          />
        </div>
      </div>

      {/* Charts Section with Inventory Health */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-8">
        {/* Sales Chart */}
        <Card className="glass rounded-lg lg:col-span-2 transition-all duration-500 hover:shadow-lg hover:shadow-amber-600/20 border-input hover:border-input animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <TrendingUp className="text-green-400" />
                    Sales Trend
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Your sales over the {timePeriod} days
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-80 w-full rounded-lg" />
                ) : salesChartData.length > 0 ? (
                    <div className="w-full h-80 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="date" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '8px', color: '#fff' }}
                                    formatter={(value) => `₱${value.toFixed(2)}`}
                                />
                                <Legend wrapperStyle={{ color: '#9ca3af' }} />
                                <Bar dataKey="value" fill="#10b981" name="Revenue (₱)" radius={[8, 8, 0, 0]} />
                                <Bar dataKey="items" fill="#3b82f6" name="Items Sold" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <div className="text-center">
                            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No sales data available for this period.</p>
                            <p className="text-sm mt-1">Start selling to see your chart!</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Inventory Health Score */}
        <div className="space-y-4">
          <Card className="glass rounded-lg transition-all duration-500 hover:shadow-lg hover:shadow-amber-600/20 border-input hover:border-input animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                      <Package className="text-blue-400" />
                      Inventory Health
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  {loading ? (
                      <Skeleton className="h-32 w-full rounded-lg" />
                  ) : inventoryHealth ? (
                      <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                          <div className="flex items-center justify-center">
                              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-500/30 to-green-600/20 flex items-center justify-center border-4 border-green-400 hover:scale-110 transition-transform duration-300">
                                  <div className="text-center">
                                      <div className="text-2xl font-bold text-green-400">{inventoryHealth.healthScore}%</div>
                                      <div className="text-xs text-muted-foreground">Health</div>
                                  </div>
                              </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="text-center p-2 bg-green-500/20 rounded border border-green-500/30 transition-all duration-300 hover:bg-green-500/30 hover:border-green-400/50">
                                  <div className="font-semibold text-green-400">{inventoryHealth.wellStocked}</div>
                                  <div className="text-xs text-muted-foreground">Well-stocked</div>
                              </div>
                              <div className="text-center p-2 bg-amber-500/20 rounded border border-amber-500/30 transition-all duration-300 hover:bg-amber-500/30 hover:border-amber-400/50">
                                  <div className="font-semibold text-amber-400">{inventoryHealth.lowStock}</div>
                                  <div className="text-xs text-muted-foreground">Low Stock</div>
                              </div>
                              <div className="text-center p-2 bg-red-500/20 rounded border border-red-500/30 transition-all duration-300 hover:bg-red-500/30 hover:border-red-400/50">
                                  <div className="font-semibold text-red-400">{inventoryHealth.outOfStock}</div>
                                  <div className="text-xs text-muted-foreground">Out of Stock</div>
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                          <p>No inventory data available.</p>
                      </div>
                  )}
              </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card className="glass rounded-lg transition-all duration-500 hover:shadow-lg hover:shadow-amber-600/20 border-input hover:border-input animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                      <AlertTriangle className="text-amber-400 animate-bounce"/>
                      Low Stock Alerts
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                      Products with 5 or fewer items in stock.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  {loading ? (
                      <Skeleton className="h-40 w-full rounded-lg" />
                  ) : lowStockProducts.length > 0 ? (
                      <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.55s' }}>
                          {lowStockProducts.slice(0, 3).map((product, idx) => (
                              <div key={product.id} className="flex justify-between items-center text-sm transition-all duration-300 hover:translate-x-1 animate-fade-in-up" style={{ animationDelay: `${0.6 + idx * 0.05}s` }}>
                                  <Link to="/dashboard/my-products" className="font-medium hover:text-amber-400 truncate pr-4 transition-colors text-foreground">
                                    {product.name}
                                  </Link>
                                  <span className="font-bold text-red-400 flex-shrink-0 animate-pulse">{product.stock} left</span>
                              </div>
                          ))}
                          <Button asChild variant="secondary" className="w-full mt-4 transition-all duration-300 hover:shadow-lg group">
                              <Link to="/dashboard/my-products">Manage Products</Link>
                          </Button>
                      </div>
                  ) : (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                          <p className="text-center">All products are well-stocked! ✨</p>
                      </div>
                  )}
              </CardContent>
          </Card>
        </div>
      </div>

      {/* Sales Goal Progress */}
      <div className="mt-8 mb-8 animate-fade-in-up" style={{ animationDelay: '0.65s' }}>
          <Card className="glass rounded-lg transition-all duration-500 hover:shadow-lg hover:shadow-amber-600/20 border-input hover:border-input">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="text-blue-400" />
                Sales Goal Progress
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Current vs Previous {salesGoal?.goalType || 'period'} Revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                  <Skeleton className="h-8 w-full rounded-lg" />
              ) : salesGoal ? (
                  <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
                    <div className="flex justify-between items-center transition-all duration-300">
                      <span className="font-medium text-foreground">₱{salesGoal.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-muted-foreground">/ ₱{salesGoal.target.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-4 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-input">
                      {(() => {
                        const percentage = salesGoal.target > 0 ? Math.min((salesGoal.current / salesGoal.target) * 100, 100) : 0;
                        let bgColor = 'bg-gradient-to-r from-green-500 to-emerald-500';
                        if (percentage < 50) bgColor = 'bg-gradient-to-r from-red-500 to-red-600';
                        else if (percentage < 75) bgColor = 'bg-gradient-to-r from-amber-500 to-amber-600';
                        return (
                          <div
                            className={`${bgColor} h-full transition-all duration-500 rounded-full shadow-lg`}
                            style={{ width: `${percentage}%` }}
                          />
                        );
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium animate-fade-in-up" style={{ animationDelay: '0.75s' }}>
                      {(() => {
                        const percentage = salesGoal.target > 0 ? Math.round((salesGoal.current / salesGoal.target) * 100) : 0;
                        if (percentage >= 100) return `🎉 Goal exceeded! ${percentage}% of target`;
                        if (percentage >= 75) return `✅ On track! ${percentage}% of target`;
                        if (percentage >= 50) return `⚠️ Halfway there! ${percentage}% of target`;
                        return `📈 Keep pushing! ${percentage}% of target`;
                      })()}
                    </div>
                  </div>
              ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <p>No sales data to calculate goal yet.</p>
                  </div>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Revenue Distribution Pie Chart */}
      <div className="mt-8 mb-8 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
          <Card className="glass rounded-lg transition-all duration-500 hover:shadow-lg hover:shadow-amber-600/20 border-input hover:border-input">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                Revenue Breakdown
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Distribution of your total revenue (₱{stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                  <Skeleton className="h-80 w-full rounded-lg" />
              ) : recentSales.length > 0 ? (
                  <div className="w-full h-80 animate-fade-in-up" style={{ animationDelay: '0.75s' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={recentSales.slice(0, 5).map((sale, index) => ({
                            name: format(getDateFromCreatedAt(sale.createdAt), 'MMM d'),
                            value: sale.sellerItemsValue,
                            id: sale.id
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ₱${value.toFixed(0)}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#ef4444" />
                          <Cell fill="#8b5cf6" />
                        </Pie>
                        <Tooltip formatter={(value) => `₱${value.toFixed(2)}`} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '8px', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
              ) : (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                      <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No revenue data available yet.</p>
                          <p className="text-sm mt-1">Complete orders to see your breakdown!</p>
                      </div>
                  </div>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Recent Sales Table */}
      <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.75s' }}>
          <Card className="glass rounded-lg transition-all duration-500 hover:shadow-lg hover:shadow-amber-600/20 border-input hover:border-input">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <ListOrdered className="text-amber-400" />
                Recent Sales Details
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                The 5 most recent orders that include your products.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                  <Skeleton className="h-40 w-full rounded-lg" />
              ) : recentSales.length > 0 ? (
                  <div className="overflow-x-auto animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-secondary transition-colors duration-300 border-input">
                          <TableHead className="text-muted-foreground">Date</TableHead>
                          <TableHead className="text-muted-foreground">Items</TableHead>
                          <TableHead className="text-right text-muted-foreground">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentSales.map((order, idx) => (
                          <TableRow key={order.id} className="transition-all duration-300 hover:bg-secondary border-input animate-fade-in-up" style={{ animationDelay: `${0.85 + idx * 0.05}s` }}>
                            <TableCell className="transition-colors duration-300 text-foreground">{format(getDateFromCreatedAt(order.createdAt), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="transition-colors duration-300 text-foreground">{order.sellerItemCount}</TableCell>
                            <TableCell className="text-right font-medium transition-colors duration-300 text-foreground">₱{order.sellerItemsValue.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
              ) : (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <div className="text-center">
                          <ListOrdered className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No sales yet.</p>
                          <p className="text-sm mt-1">Your recent orders will appear here!</p>
                      </div>
                  </div>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}

