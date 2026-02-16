import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Package, ShoppingCart, DollarSign, ListChecks, CheckCircle, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '@/firebase/auth/use-user';
import { getInitials } from '@/lib/utils';
import { AdminService } from '@/services/admin/adminService';

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


function StatCard({ title, value, icon: Icon, loading }) {
  return (
    <Card>
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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ users: 0, products: 0, orders: 0, revenue: 0 });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (!user || !user.uid) {
        setLoading(false);
        setStats({ users: 0, products: 0, orders: 0, revenue: 0 });
        return;
    }

    setLoading(true);
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
    const fetchLogs = async () => {
      try {
        const data = await AdminService.getAdminLogs(user.uid);
        setActivities(data || []);
      } catch (error) {
        console.error("Error fetching admin logs:", error);
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`₱${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          loading={loading}
        />
        <StatCard
          title="Total Users"
          value={stats.users}
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Total Products"
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

      {/* Recent Activities */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
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
