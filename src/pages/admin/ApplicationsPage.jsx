import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Undo2, Search } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { Input } from '@/components/ui/input';
import { AdminService } from '@/services/admin/adminService';


export default function AdminApplicationsPage() {
  const { toast } = useToast();
  const { user: adminUser } = useUser();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedAppForApproval, setSelectedAppForApproval] = useState(null);
  const [isApprovalAlertOpen, setIsApprovalAlertOpen] = useState(false);

  useEffect(() => {
    if (!adminUser || !adminUser.uid) {
      setLoading(false);
      setApplications([]);
      return;
    }

    setLoading(true);
    const fetchApplications = async () => {
      try {
        const data = await AdminService.getSellerApplications(adminUser.uid);
        setApplications(data || []);
      } catch (error) {
        console.error("Error fetching applications:", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not fetch applications." });
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [adminUser, toast]);

  const handleApprove = async (application) => {
    if (!adminUser || !adminUser.uid) return;

    // Optimistic update: immediately remove from pending list
    const originalApplications = applications;
    setApplications(apps =>
      apps.map(app => app.id === application.id ? { ...app, status: 'approved' } : app)
    );

    try {
      await AdminService.approveApplication(adminUser.uid, application.id);
      toast({ title: 'Application Approved', description: `${application.shopName} is now a seller.` });

      // Refetch fresh data in background (no await, no blocking)
      AdminService.getSellerApplications(adminUser.uid).then(data => {
        setApplications(data || []);
      }).catch(err => {
        console.error('Error refetching applications:', err);
        // If refetch fails, keep optimistic update
      });

      setIsApprovalAlertOpen(false);
      setSelectedAppForApproval(null);
    } catch (error) {
      console.error('Error approving application:', error);
      // Rollback optimistic update on error
      setApplications(originalApplications);
      toast({ variant: 'destructive', title: "Error", description: error.message });
    }
  };

  const openApprovalDialog = (application) => {
    setSelectedAppForApproval(application);
    setIsApprovalAlertOpen(true);
  };

  const handleReject = async () => {
    if (!adminUser || !selectedApp || !adminUser.uid) return;

    // Optimistic update: immediately update status to rejected
    const originalApplications = applications;
    setApplications(apps =>
      apps.map(app => app.id === selectedApp.id ? { ...app, status: 'rejected', rejectionReason } : app)
    );

    try {
      await AdminService.rejectApplication(adminUser.uid, selectedApp.id, rejectionReason);
      toast({ title: 'Application Rejected' });

      // Refetch fresh data in background (no await, no blocking)
      AdminService.getSellerApplications(adminUser.uid).then(data => {
        setApplications(data || []);
      }).catch(err => {
        console.error('Error refetching applications:', err);
        // If refetch fails, keep optimistic update
      });

      setRejectionReason('');
      setSelectedApp(null);
    } catch (error) {
      console.error('Error rejecting application:', error);
      // Rollback optimistic update on error
      setApplications(originalApplications);
      toast({ variant: 'destructive', title: "Error", description: error.message });
    }
  };

  const handleRevoke = async (application) => {
    // Note: Revoke functionality can be added to the backend if needed
    toast({ title: 'Not Implemented', description: 'Revoke functionality coming soon' });
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const parseDate = (dateValue) => {
    if (!dateValue) return null;
    // Handle ISO string
    if (typeof dateValue === 'string') return new Date(dateValue);
    // Handle Firestore Timestamp object
    if (dateValue._seconds) return new Date(dateValue._seconds * 1000);
    // Handle Date object
    if (dateValue instanceof Date) return dateValue;
    return null;
  };

  const filteredApplications = useMemo(() => {
    if (!searchTerm) return applications;
    return applications.filter(app => (app.shopName || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [applications, searchTerm]);

  const pendingApplications = useMemo(() => filteredApplications.filter(app => app.status === 'pending'), [filteredApplications]);
  const processedApplications = useMemo(() => filteredApplications.filter(app => app.status !== 'pending'), [filteredApplications]);


  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8 font-headline">Seller Applications</h1>
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
      <h1 className="text-3xl font-bold mb-8 font-headline">Seller Applications</h1>

      <div className="mb-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                placeholder="Search by shop name..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Pending Review ({pendingApplications.length})</CardTitle>
          <CardDescription>Review and process new seller applications.</CardDescription>
        </CardHeader>
        <CardContent>
            {pendingApplications.length > 0 ? (
                <div className="space-y-4">
                    {pendingApplications.map(app => (
                        <Card key={app.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 space-y-2">
                                <h3 className="font-semibold text-lg">{app.shopName}</h3>
                                <p className="text-sm text-muted-foreground"><strong>Reason:</strong> {app.reasonForApplying}</p>
                                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                                    <p><strong>Contact:</strong> {app.phoneNumber}</p>
                                    <p><strong>Sells:</strong> {app.productTypes}</p>
                                    {app.portfolioLink && <p className="col-span-2"><strong>Portfolio:</strong> <a href={app.portfolioLink} target="_blank" rel="noopener noreferrer" className="text-primary underline">{app.portfolioLink}</a></p>}
                                    <p className="col-span-2"><strong>Submitted:</strong> {app.submittedAt ? format(parseDate(app.submittedAt), 'PPP') : 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center flex-shrink-0">
                                <Button size="sm" onClick={() => openApprovalDialog(app)}><Check className="mr-2 h-4 w-4" /> Approve</Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive" onClick={() => setSelectedApp(app)}><X className="mr-2 h-4 w-4" /> Reject</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Reject Application?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Provide a reason for rejecting this application (optional). This will be shown to the user.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <Textarea
                                            placeholder="e.g., Portfolio link is broken, products not handmade..."
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                        />
                                        <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setRejectionReason('')}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleReject}>Confirm Rejection</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <h3 className="text-xl font-semibold">No pending applications</h3>
                    <p className="text-muted-foreground mt-2">Check back later for new seller requests.</p>
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processed Applications ({processedApplications.length})</CardTitle>
          <CardDescription>History of all approved and rejected applications.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Processed</TableHead>
                <TableHead className="hidden md:table-cell">Reason/Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedApplications.map(app => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.shopName}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(app.status)} className="capitalize">{app.status}</Badge>
                  </TableCell>
                  <TableCell>{app.updatedAt ? format(parseDate(app.updatedAt), 'PPP') : 'N/A'}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{app.rejectionReason || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {app.status === 'rejected' && (
                        <Button size="sm" variant="outline" onClick={() => openApprovalDialog(app)}>
                          <Check className="mr-2 h-4 w-4" /> Approve
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {processedApplications.length === 0 && <p className="text-center text-muted-foreground pt-8">No processed applications yet.</p>}
        </CardContent>
      </Card>

      <AlertDialog open={isApprovalAlertOpen} onOpenChange={setIsApprovalAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Approval?</AlertDialogTitle>
            <AlertDialogDescription>
              Approve <strong>{selectedAppForApproval?.shopName}</strong> as a seller? This will give them access to create and manage products. This action can be reversed by changing their role to buyer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedAppForApproval(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleApprove(selectedAppForApproval)}>Confirm Approval</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
