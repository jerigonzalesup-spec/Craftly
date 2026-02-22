
import { useUser } from '@/firebase/auth/use-user';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AddProductForm } from '@/components/AddProductForm';
import { EditProductForm } from '@/components/EditProductForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getImageUrl } from '@/lib/image-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';


export default function MyProductsPage() {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);

  useEffect(() => {
    // If user is loading, or logged out, or not a seller, stop.
    if (userLoading || !user || !user.roles?.includes('seller')) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/products?createdBy=${user.uid}&status=active`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user.uid,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        setProducts(data.data);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load products.' });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user, userLoading, toast]);

  const handleOpenForm = (product) => {
    setProductToEdit(product);
    setIsFormOpen(true);
  }

  const handleCloseForm = () => {
    setProductToEdit(null);
    setIsFormOpen(false);
  }

  const handleDeleteProduct = async (productId, productName) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.uid,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      // Remove from local state immediately
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));

      toast({
        title: 'Product Deleted',
        description: `${productName} has been removed.`,
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete product.',
      });
    }
  };

  if (userLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 font-headline">My Products</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold font-headline">My Products</h1>
          <Button onClick={() => handleOpenForm(null)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Your Product Listings</CardTitle>
            <CardDescription>Manage your handmade products here. You can add, edit, and delete items.</CardDescription>
          </CardHeader>
          <CardContent>
            {products.length > 0 ? (
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
                  {products.map(product => {
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
                        <TableCell>₱{product.price.toFixed(2)}</TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="icon" variant="outline" onClick={() => handleOpenForm(product)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the product "{product.name}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProduct(product.id, product.name)}>
                                    Confirm Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No products yet</h3>
                <p className="text-muted-foreground mt-2">Click "Add New Product" to start selling.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => {
          // This check is to prevent the dialog from closing when clicking on other radix primitives inside the form (like a select)
          if (e.target.closest('[data-radix-popper-content-wrapper]')) {
              e.preventDefault();
          }
      }}>
         <DialogHeader>
           <DialogTitle>{productToEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
           <DialogDescription>
             {productToEdit ? 'Update your product details' : 'Create a new product to sell'}
           </DialogDescription>
         </DialogHeader>
         {productToEdit ? (
           <EditProductForm product={productToEdit} onClose={handleCloseForm} />
         ) : (
           <AddProductForm onClose={handleCloseForm} />
         )}
      </DialogContent>
    </Dialog>
  );
}
