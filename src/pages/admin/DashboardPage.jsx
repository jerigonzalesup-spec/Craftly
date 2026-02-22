import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Package, ShoppingCart, DollarSign, ListChecks, CheckCircle, AlertCircle, TrendingUp, Activity } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '@/firebase/auth/use-user';
import { getInitials } from '@/lib/utils';
import { AdminService } from '@/services/admin/adminService';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const parseDate = (createdAt) => {
  if (!createdAt) return new Date();
  // If it's a Firestore Timestamp object with toDate method
  if (typeof createdAt.toDate === 'function') {
    return createdAt.toDate();
  }
  // If it's a serialized Firestore Timestamp with _seconds
  if (createdAt._seconds) {
    return new Date(createdAt._seconds * 1000);
  }
  // If it's an ISO string
  if (typeof createdAt === 'string') {
    return new Date(createdAt);
  }
  // If it's already a Date
  if (createdAt instanceof Date) {
    return createdAt;
  }
  // Fallback
  return new Date();
};


function StatCard({ title, value, icon: Icon, loading, trend, bgColor = '#3b82f6' }) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-24 h-24 opacity-10 rounded-full -mr-12 -mt-12"
        style={{ backgroundColor: bgColor }}
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: bgColor + '20' }}
        >
          <Icon className="h-5 w-5" style={{ color: bgColor }} />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        {loading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {trend && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                {trend}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ users: 0, products: 0, orders: 0, revenue: 0 });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [activitiesError, setActivitiesError] = useState(null);
  const { user } = useUser();

  // Chart data
  const revenueData = [
    { name: 'Week 1', revenue: 4000, target: 3500 },
    { name: 'Week 2', revenue: 3000, target: 3500 },
    { name: 'Week 3', revenue: 5500, target: 3500 },
    { name: 'Week 4', revenue: 4500, target: 3500 },
    { name: 'Week 5', revenue: 6200, target: 3500 },
  ];

  const orderStatusData = [
    { name: 'Pending', value: 24, color: '#f59e0b' },
    { name: 'Processing', value: 45, color: '#3b82f6' },
    { name: 'Shipped', value: 28, color: '#8b5cf6' },
    { name: 'Delivered', value: 103, color: '#10b981' },
  ];

  const userGrowthData = [
    { name: 'Jan', users: 150 },
    { name: 'Feb', users: 280 },
    { name: 'Mar', users: 420 },
    { name: 'Apr', users: 560 },
    { name: 'May', users: 720 },
    { name: 'Jun', users: 890 },
  ];

  useEffect(() => {
    if (!user || !user.uid) {
        setLoading(false);
        setStats({ users: 0, products: 0, orders: 0, revenue: 0 });
        return;
    }

    setLoading(true);
    setStatsError(null);
    const fetchStats = async () => {
      try {
        const data = await AdminService.getAdminStats(user.uid);
        setStats({
          users: data.users || 0,
          products: data.products || 0,
          orders: data.orders || 0,
          revenue: data.revenue || 0,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        setStatsError('Failed to load dashboard statistics. Please refresh the page.');
        setStats({ users: 0, products: 0, orders: 0, revenue: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

  }, [user]);

  // Fetch recent admin activities/logs
  useEffect(() => {
    if (!user || !user.uid) {
      setActivitiesLoading(false);
      setActivities([]);
      return;
    }

    setActivitiesLoading(true);
    setActivitiesError(null);
    const fetchLogs = async () => {
      try {
        const data = await AdminService.getAdminLogs(user.uid);
        setActivities(data || []);
      } catch (error) {
        console.error("Error fetching admin logs:", error);
        setActivitiesError('Failed to load recent activities.');
        setActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
    };

    fetchLogs();
  }, [user]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 font-headline">Admin Dashboard</h1>

      {statsError && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Stats Error</p>
            <p className="text-sm mt-1">{statsError}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`₱${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          loading={loading}
          bgColor="#10b981"
          trend="↑ 12% from last month"
        />
        <StatCard
          title="Total Users"
          value={stats.users}
          icon={Users}
          loading={loading}
          bgColor="#3b82f6"
          trend={`${stats.users} active`}
        />
        <StatCard
          title="Total Products"
          value={stats.products}
          icon={Package}
          loading={loading}
          bgColor="#f59e0b"
          trend={`${stats.products} listed`}
        />
        <StatCard
          title="Total Orders"
          value={stats.orders}
          icon={ShoppingCart}
          loading={loading}
          bgColor="#8b5cf6"
          trend={`${stats.orders} completed`}
        />
      </div>

      {/* Analytics Section */}
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">This Month</span>
                  <span className="text-sm font-bold">75%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Last Month</span>
                  <span className="text-sm font-bold">60%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Last Quarter</span>
                  <span className="text-sm font-bold">85%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Health Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Database</span>
                  <span className="text-sm font-bold text-green-600">Healthy</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">API Response</span>
                  <span className="text-sm font-bold">96%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '96%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Storage Used</span>
                  <span className="text-sm font-bold">45%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
        {/* Revenue Trend Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => `₱${value.toLocaleString()}`}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#d97706" strokeWidth={3} dot={{ fill: '#d97706', r: 5 }} name="Actual Revenue" />
                <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#10b981', r: 4 }} name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Order Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 w-full text-sm">
                {orderStatusData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span>{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Growth Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="users" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesError && (
            <div className="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{activitiesError}</span>
            </div>
          )}

          {activitiesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between gap-4 pb-4 border-b last:border-b-0">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="text-xs">
                        {getInitials(activity.adminName || 'Admin')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        by {activity.adminName || 'System'} • {formatDistanceToNow(parseDate(activity.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activities</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
