import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useToast } from '@/hooks/use-toast';
import { Archive, ArchiveRestore, Search } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { getImageUrl } from '@/lib/image-utils';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AdminService } from '@/services/admin/adminService';

export default function AdminProductsPage() {
  const { toast } = useToast();
  const { user: adminUser } = useUser();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reason, setReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isArchiveAlertOpen, setIsArchiveAlertOpen] = useState(false);
  const [isRestoreAlertOpen, setIsRestoreAlertOpen] = useState(false);

  const activeProducts = useMemo(() => products.filter(p => p.status !== 'archived'), [products]);
  const archivedProducts = useMemo(() => products.filter(p => p.status === 'archived'), [products]);

  const filteredActiveProducts = useMemo(() => {
    if (!searchTerm) return activeProducts;
    return activeProducts.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [activeProducts, searchTerm]);

  const filteredArchivedProducts = useMemo(() => {
      if (!searchTerm) return archivedProducts;
      return archivedProducts.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [archivedProducts, searchTerm]);

  useEffect(() => {
    if (!adminUser || !adminUser.uid) {
      setLoading(false);
      setProducts([]);
      return;
    }

    setLoading(true);
    const fetchProducts = async () => {
      try {
        const data = await AdminService.getAdminProducts(adminUser.uid);
        setProducts(data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not fetch products." });
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [adminUser, toast]);

  const handleOpenArchiveDialog = (product) => {
    setSelectedProduct(product);
    setIsArchiveAlertOpen(true);
  };

  const handleOpenRestoreDialog = (product) => {
    setSelectedProduct(product);
    setIsRestoreAlertOpen(true);
  };

  const handleArchiveAction = async () => {
    if (!adminUser || !adminUser.uid || !selectedProduct || !reason) {
      toast({ variant: 'destructive', title: 'Archive Failed', description: 'A reason is required to archive a product.' });
      return;
    }

    // Optimistic update: immediately mark product as archived
    const originalProducts = products;
    setProducts(prods =>
      prods.map(p => p.id === selectedProduct.id ? { ...p, status: 'archived' } : p)
    );

    try {
      await AdminService.archiveProduct(adminUser.uid, selectedProduct.id, reason);
      toast({ title: 'Product Archived', description: `${selectedProduct.name} has been archived.` });

      // Refetch fresh data in background (no await, no blocking)
      AdminService.getAdminProducts(adminUser.uid).then(data => {
        setProducts(data || []);
      }).catch(err => {
        console.error('Error refetching products:', err);
        // If refetch fails, keep optimistic update
      });

      setIsArchiveAlertOpen(false);
      setSelectedProduct(null);
      setReason('');
    } catch (error) {
      console.error('Error archiving product:', error);
      // Rollback optimistic update on error
      setProducts(originalProducts);
      toast({ variant: 'destructive', title: "Error", description: error.message });
    }
  };

  const handleRestoreAction = async () => {
    if (!adminUser || !adminUser.uid || !selectedProduct) return;

    // Optimistic update: immediately mark product as active (restore)
    const originalProducts = products;
    setProducts(prods =>
      prods.map(p => p.id === selectedProduct.id ? { ...p, status: 'active' } : p)
    );

    try {
      await AdminService.restoreProduct(adminUser.uid, selectedProduct.id);
      toast({ title: 'Product Restored', description: `${selectedProduct.name} is now active.` });

      // Refetch fresh data in background (no await, no blocking)
      AdminService.getAdminProducts(adminUser.uid).then(data => {
        setProducts(data || []);
      }).catch(err => {
        console.error('Error refetching products:', err);
        // If refetch fails, keep optimistic update
      });

      setIsRestoreAlertOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error restoring product:', error);
      // Rollback optimistic update on error
      setProducts(originalProducts);
      toast({ variant: 'destructive', title: "Error", description: error.message });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8 font-headline">Manage Products</h1>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 font-headline">Manage Products</h1>
      <div className="mb-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                placeholder="Search by product name..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>
      <Tabs defaultValue="active">
        <TabsList>
            <TabsTrigger value="active">Active ({filteredActiveProducts.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({filteredArchivedProducts.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
            <Card>
                <CardHeader>
                    <CardTitle>Active Products</CardTitle>
                    <CardDescription>Products currently visible and available for sale on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredActiveProducts.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="w-[80px]">Image</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredActiveProducts.map(product => {
                                const imageUrl = getImageUrl(product.images[0]);
                                return (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <div className="relative h-12 w-12 rounded-md overflow-hidden border">
                                            {imageUrl ? (
                                                <img src={imageUrl} alt={product.name} className="object-cover w-full h-full" />
                                            ) : (
                                                <div className="bg-muted h-full w-full" />
                                            )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>₱{(product.price || 0).toFixed(2)}</TableCell>
                                        <TableCell>{product.stock}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="destructive" onClick={() => handleOpenArchiveDialog(product)}>
                                                <Archive className="h-4 w-4 mr-2" /> Archive
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No active products found.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="archived">
            <Card>
                <CardHeader>
                    <CardTitle>Archived Products</CardTitle>
                    <CardDescription>Products that have been hidden from the public. You can restore them at any time.</CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredArchivedProducts.length > 0 ? (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="w-[80px]">Image</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Reason Archived</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredArchivedProducts.map(product => {
                                const imageUrl = getImageUrl(product.images[0]);
                                return (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <div className="relative h-12 w-12 rounded-md overflow-hidden border">
                                            {imageUrl ? (
                                                <img src={imageUrl} alt={product.name} className="object-cover w-full h-full" />
                                            ) : (
                                                <div className="bg-muted h-full w-full" />
                                            )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>₱{(product.price || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{product.archiveReason || 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="outline" onClick={() => handleOpenRestoreDialog(product)}>
                                                <ArchiveRestore className="h-4 w-4 mr-2" /> Restore
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No archived products found.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={isArchiveAlertOpen} onOpenChange={setIsArchiveAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Archive Product?</AlertDialogTitle>
              <AlertDialogDescription>
                  This action will hide "{selectedProduct?.name}" from public view. Please provide a reason for archiving (this will be sent to the seller).
              </AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                  placeholder="Reason for archiving..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="my-4"
              />
              <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setReason('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveAction}>Confirm Archive</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRestoreAlertOpen} onOpenChange={setIsRestoreAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Restore Product?</AlertDialogTitle>
              <AlertDialogDescription>
                  This will make the product "{selectedProduct?.name}" visible and purchasable on the site again.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestoreAction}>Confirm Restore</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
