import { useUser } from '@/firebase/auth/use-user';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Trash2, Ban, CheckCircle } from 'lucide-react';
import { AdminService } from '@/services/admin/adminService';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';


export default function AdminUsersPage() {
  const { user: adminUser } = useUser();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [action, setAction] = useState(null); // 'role', 'delete', 'ban', 'unban'
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('30');
  const [adminPassword, setAdminPassword] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  useEffect(() => {
    if (!adminUser || !adminUser.uid) {
      setLoading(false);
      setUsers([]);
      return;
    }

    setLoading(true);
    const fetchUsers = async () => {
      try {
        const data = await AdminService.getAdminUsers(adminUser.uid);
        setUsers(data || []);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not fetch users." });
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [adminUser, toast]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(user =>
      (user.fullName || '').toLowerCase().includes(term) ||
      (user.email || '').toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const openActionDialog = (user, actionType) => {
    setSelectedUser(user);
    setAction(actionType);
    if (actionType === 'role') {
      setNewRole(user.role === 'buyer' ? 'seller' : 'buyer');
    }
    if (actionType === 'delete') {
      setAdminPassword('');
    }
    setIsAlertOpen(true);
  };

  const verifyAdminPassword = async () => {
    if (!adminPassword.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Password is required.' });
      return false;
    }

    setIsVerifyingPassword(true);
    try {
      const auth = getAuth();
      // Re-authenticate the admin with their email and password
      await signInWithEmailAndPassword(auth, adminUser.email, adminPassword);
      setAdminPassword('');
      return true;
    } catch (error) {
      console.error('Password verification failed:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Incorrect password. Please try again.' });
      return false;
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedUser || !adminUser || !adminUser.uid) return;

    // Validate ban reason
    if (action === 'ban' && !banReason.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ban reason is required.' });
      return;
    }

    // Verify password for delete action
    if (action === 'delete') {
      const isPasswordValid = await verifyAdminPassword();
      if (!isPasswordValid) {
        return;
      }
    }

    // Store original state for rollback
    const originalUsers = users;

    // Optimistic update
    setUsers(prevUsers => {
      return prevUsers.map(u => {
        if (u.uid !== selectedUser.uid) return u;

        if (action === 'role') {
          return { ...u, role: newRole, roles: [newRole] };
        } else if (action === 'delete') {
          return { ...u, deletedAt: new Date().toISOString() };
        } else if (action === 'recover') {
          return { ...u, deletedAt: null };
        } else if (action === 'ban') {
          return { ...u, isBanned: true, banReason, banUntil: new Date(Date.now() + parseInt(banDuration) * 24 * 60 * 60 * 1000).toISOString() };
        } else if (action === 'unban') {
          return { ...u, isBanned: false, banReason: null, banUntil: null };
        }
        return u;
      });
    });

    try {
      if (action === 'role') {
        await AdminService.changeUserRole(adminUser.uid, selectedUser.uid, newRole);
        toast({ title: 'Role Updated', description: `User role changed to ${newRole}.` });
      } else if (action === 'delete') {
        await AdminService.deleteUser(adminUser.uid, selectedUser.uid);
        toast({ title: 'User Deleted', description: 'User account has been deleted.' });
      } else if (action === 'recover') {
        await AdminService.recoverUser(adminUser.uid, selectedUser.uid);
        toast({ title: 'User Recovered', description: 'User account has been restored.' });
      } else if (action === 'ban') {
        await AdminService.banUser(adminUser.uid, selectedUser.uid, banReason, parseInt(banDuration));
        toast({ title: 'User Banned', description: `User banned for ${banDuration} days.` });
      } else if (action === 'unban') {
        await AdminService.unbanUser(adminUser.uid, selectedUser.uid);
        toast({ title: 'User Unbanned', description: 'User ban has been lifted.' });
      }

      // Refetch fresh data in background (no await, no blocking)
      AdminService.getAdminUsers(adminUser.uid).then(data => {
        setUsers(data || []);
      }).catch(err => {
        console.error('Error refetching users:', err);
        // If refetch fails, keep optimistic update
      });

      // Reset
      setIsAlertOpen(false);
      setSelectedUser(null);
      setAction(null);
      setNewRole('');
      setBanReason('');
      setBanDuration('30');
      setAdminPassword('');
    } catch (error) {
      console.error('Error performing action:', error);
      // Rollback optimistic update on error
      setUsers(originalUsers);
      toast({ variant: 'destructive', title: "Error", description: error.message });
    }
  };

  // Derive display role from roles array, falling back to legacy role field
  const getDisplayRole = (user) => {
    const roles = user.roles || (user.role ? [user.role] : []);
    if (roles.includes('superadmin')) return 'superadmin';
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('seller')) return 'seller';
    return roles[0] || user.role || 'buyer';
  };

  const getRoleVariant = (role) => {
    switch (role) {
      case 'superadmin': return 'destructive';
      case 'admin': return 'destructive';
      case 'seller': return 'default';
      case 'buyer': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active': return 'outline';
      case 'banned': return 'destructive';
      case 'deleted': return 'secondary';
      default: return 'outline';
    }
  };

  const getAlertTitle = () => {
    if (action === 'role') return `Change ${selectedUser?.fullName}'s Role?`;
    if (action === 'delete') return `Delete ${selectedUser?.fullName}'s Account?`;
    if (action === 'recover') return `Recover ${selectedUser?.fullName}'s Account?`;
    if (action === 'ban') return `Ban ${selectedUser?.fullName}?`;
    if (action === 'unban') return `Unban ${selectedUser?.fullName}?`;
    return 'Confirm Action';
  };

  const getAlertDescription = () => {
    if (action === 'role') return `Change role from ${selectedUser?.role} to ${newRole}? User will be notified.`;
    if (action === 'delete') return 'This will soft delete the account. The user will not be able to login. This can be reversed by an admin.';
    if (action === 'recover') return 'This will restore the account and the user will be able to login again.';
    if (action === 'ban') return `Ban this user for ${banDuration} days. They will not be able to login during this time.`;
    if (action === 'unban') return 'Lift the ban and allow the user to login again.';
    return '';
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8 font-headline">Manage Users</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 font-headline">Manage Users</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          <CardDescription>View and manage all users on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
        <div className="mb-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search by name or email..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleVariant(getDisplayRole(user))} className="capitalize">{getDisplayRole(user)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(user.accountStatus)} className="capitalize">{user.accountStatus}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end flex-wrap">
                      {user.uid !== adminUser?.uid && !user.roles?.includes('admin') && user.role !== 'admin' && (
                        <>
                          {user.accountStatus !== 'deleted' && (
                            <Button size="sm" variant="outline" onClick={() => openActionDialog(user, 'role')}>
                              Change Role
                            </Button>
                          )}
                          {user.accountStatus === 'active' && (
                            <>
                              <Button size="sm" variant="destructive" onClick={() => openActionDialog(user, 'ban')}>
                                <Ban className="h-3 w-3 mr-1" /> Ban
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openActionDialog(user, 'delete')}>
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                              </Button>
                            </>
                          )}
                          {user.accountStatus === 'banned' && (
                            <Button size="sm" variant="outline" onClick={() => openActionDialog(user, 'unban')}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Unban
                            </Button>
                          )}
                          {user.accountStatus === 'deleted' && (
                            <Button size="sm" variant="outline" onClick={() => openActionDialog(user, 'recover')}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Recover
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredUsers.length === 0 && <p className="text-center text-muted-foreground pt-8">No users found.</p>}
        </CardContent>
      </Card>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getAlertTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {getAlertDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {action === 'ban' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Ban Reason</label>
                <Textarea
                  placeholder="e.g., Violation of community guidelines"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Duration (days)</label>
                <Select value={banDuration} onValueChange={setBanDuration}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">1 week</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {action === 'delete' && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <label className="text-sm font-medium">Confirm with Your Password</label>
                <p className="text-xs text-muted-foreground mb-2">For security, please enter your password to confirm this action.</p>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={isVerifyingPassword}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setAction(null);
              setNewRole('');
              setBanReason('');
              setBanDuration('30');
              setAdminPassword('');
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} disabled={isVerifyingPassword}>
              {action === 'role' && 'Change Role'}
              {action === 'delete' && 'Delete Account'}
              {action === 'recover' && 'Recover Account'}
              {action === 'ban' && 'Ban User'}
              {action === 'unban' && 'Unban User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
