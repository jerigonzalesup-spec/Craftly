import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/firebase/auth/use-user';
import { AdminService } from '@/services/admin/adminService';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShieldCheck, ShieldMinus, ShieldPlus, AlertTriangle, Loader2 } from 'lucide-react';

export default function AdminsPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isSuperAdmin = user?.roles?.includes('superadmin');

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  // Promote form
  const [promoteEmail, setPromoteEmail] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);

  // Demote dialog
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isDemoteOpen, setIsDemoteOpen] = useState(false);
  const [isDemoting, setIsDemoting] = useState(false);

  // Bootstrap setup
  const [isSettingUp, setIsSettingUp] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return; // non-superadmins can't load this
    loadAdmins();
  }, [isSuperAdmin]);

  async function loadAdmins() {
    setLoading(true);
    try {
      const data = await AdminService.getAdmins(user.uid);
      setAdmins(data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSetupSuperAdmin() {
    setIsSettingUp(true);
    try {
      await AdminService.setupSuperAdmin(user.uid);
      toast({ title: 'Success', description: 'You are now a Super Admin. Please refresh the page.' });
      // Force page reload so useUser picks up the new role
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Setup Failed', description: err.message });
    } finally {
      setIsSettingUp(false);
    }
  }

  async function handlePromote(e) {
    e.preventDefault();
    const email = promoteEmail.trim();
    if (!email) return;

    setIsPromoting(true);
    try {
      // Find the user UID from the users list. The server accepts UID, not email,
      // so we need to search for the matching user
      const allUsers = await AdminService.getAdminUsers(user.uid);
      const target = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!target) {
        toast({ variant: 'destructive', title: 'Not Found', description: `No user found with email: ${email}` });
        return;
      }
      if (target.roles?.includes('admin') || target.role === 'admin') {
        toast({ variant: 'destructive', title: 'Already Admin', description: `${email} is already an admin.` });
        return;
      }

      await AdminService.promoteToAdmin(user.uid, target.uid);
      toast({ title: 'Promoted', description: `${email} is now an Admin.` });
      setPromoteEmail('');
      loadAdmins();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    } finally {
      setIsPromoting(false);
    }
  }

  async function handleDemote() {
    if (!selectedAdmin) return;
    setIsDemoting(true);
    try {
      await AdminService.demoteAdmin(user.uid, selectedAdmin.uid);
      toast({ title: 'Demoted', description: `${selectedAdmin.email} admin access removed.` });
      setIsDemoteOpen(false);
      setSelectedAdmin(null);
      loadAdmins();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    } finally {
      setIsDemoting(false);
    }
  }

  // Show bootstrap setup button for admins who aren't superadmin yet (one-time)
  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-3xl font-bold mb-2 font-headline">Manage Admins</h1>
        <p className="text-muted-foreground mb-8">Super Admin access required.</p>

        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <ShieldCheck className="h-5 w-5" />
              First-Time Setup
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-500">
              No Super Admin exists yet. If you are the platform owner, click below to
              claim the Super Admin role. This can only be done once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSetupSuperAdmin} disabled={isSettingUp} className="bg-amber-600 hover:bg-amber-700">
              {isSettingUp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Claim Super Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Manage Admins</h1>
        <p className="text-muted-foreground mt-1">
          Promote users to admin or remove admin privileges. Super Admins cannot be demoted.
        </p>
      </div>

      {/* Promote form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldPlus className="h-5 w-5 text-green-600" />
            Promote User to Admin
          </CardTitle>
          <CardDescription>Enter the exact email address of the user you want to promote.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePromote} className="flex gap-3">
            <Input
              type="email"
              placeholder="user@example.com"
              value={promoteEmail}
              onChange={e => setPromoteEmail(e.target.value)}
              className="max-w-sm"
              disabled={isPromoting}
            />
            <Button type="submit" disabled={isPromoting || !promoteEmail.trim()}>
              {isPromoting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Promote
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Admins list */}
      <Card>
        <CardHeader>
          <CardTitle>Current Admins ({admins.length})</CardTitle>
          <CardDescription>All users with admin or superadmin roles on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : admins.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No admins found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map(admin => {
                  const isSuper = admin.roles?.includes('superadmin');
                  const isSelf = admin.uid === user.uid;
                  return (
                    <TableRow key={admin.uid}>
                      <TableCell className="font-medium">{admin.fullName || '—'}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {admin.roles?.map(r => (
                            <Badge
                              key={r}
                              variant={r === 'superadmin' ? 'destructive' : r === 'admin' ? 'default' : 'secondary'}
                              className="capitalize text-xs"
                            >
                              {r === 'superadmin' && <ShieldCheck className="h-3 w-3 mr-1" />}
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={admin.accountStatus === 'active' ? 'outline' : 'secondary'} className="capitalize">
                          {admin.accountStatus || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!isSuper && !isSelf ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => { setSelectedAdmin(admin); setIsDemoteOpen(true); }}
                          >
                            <ShieldMinus className="h-3 w-3 mr-1" />
                            Remove Admin
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {isSelf ? 'You' : isSuper ? 'Protected' : ''}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Demote confirm dialog */}
      <AlertDialog open={isDemoteOpen} onOpenChange={setIsDemoteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove Admin Access?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the <strong>admin</strong> role from{' '}
              <strong>{selectedAdmin?.email}</strong>. They will lose access to the
              admin panel immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDemoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDemote}
              disabled={isDemoting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDemoting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
