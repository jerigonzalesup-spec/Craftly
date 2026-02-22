
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase/provider';
import { useUser } from '@/firebase/auth/use-user';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { categories } from '@/lib/data';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useState } from 'react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { uploadProductImage } from '@/lib/imageUpload';
import { SCHEMAS, MESSAGES } from '@/lib/formValidation';
import { convertApiErrorMessage } from '@/lib/errorMessages';

const formSchema = z.object({
  productName: SCHEMAS.productName,
  description: SCHEMAS.description,
  price: SCHEMAS.price,
  stock: SCHEMAS.stock,
  category: SCHEMAS.category,
  materialsUsed: SCHEMAS.materialsUsed,
  imageUrl: SCHEMAS.imageUrl,
});


export function AddProductForm({ onClose }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: '',
      description: '',
      price: 0,
      stock: 1,
      category: '',
      materialsUsed: '',
      imageUrl: '',
    },
  });

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit (matching Firebase Storage limit)
        form.setError('imageUrl', { message: 'Image must be < 5MB' });
        setImagePreview(null);
        setImageFile(null);
        form.setValue('imageUrl', '');
        return;
      }

      // Store the file for later upload
      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result;
        setImagePreview(dataUri);
      };
      reader.onerror = () => {
        form.setError('imageUrl', { message: 'Failed to read image' });
        setImagePreview(null);
        setImageFile(null);
        form.setValue('imageUrl', '');
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(values) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to add a product.' });
      return;
    }

    if (!imageFile) {
      form.setError('imageUrl', { message: 'Please select an image to upload.' });
      return;
    }

    try {
      setUploading(true);

      // Upload image to Firebase Storage
      const imageUrl = await uploadProductImage(imageFile, user.uid);

      const productData = {
        name: values.productName,
        sellerName: user.displayName || 'Craftly Seller',
        description: values.description,
        price: values.price,
        stock: values.stock,
        category: values.category.toLowerCase().replace(/\s+/g, '-'),
        materialsUsed: values.materialsUsed,
        createdBy: user.uid,
        images: [imageUrl], // Store Firebase Storage URL
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const productsCollection = collection(firestore, 'products');
      addDoc(productsCollection, productData).then(() => {
        toast({ title: 'Success!', description: `${values.productName} posted.` });
        
        // Set flag to refetch dashboard stats
        localStorage.setItem(`dashboardNeedsUpdate_${user.uid}`, 'true');
        
        onClose();
      }).catch((serverError) => {
          const errorMsg = convertApiErrorMessage(serverError);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: errorMsg
          });
          const permissionError = new FirestorePermissionError({
              path: productsCollection.path,
              operation: 'create',
              requestResourceData: productData,
          });
          errorEmitter.emit('permission-error', permissionError);
      });
    } catch (error) {
      form.setError('imageUrl', { message: error.message || 'Image upload failed' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add a New Product</DialogTitle>
        <DialogDescription>Fill out the details for your new handmade item.</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <FormField
            control={form.control}
            name="productName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Handwoven Scarf" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe your product..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (PHP)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 65.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 15" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="materialsUsed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Materials Used</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Merino Wool, Natural Dyes" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Home Decor" {...field} list="category-suggestions" />
                </FormControl>
                <datalist id="category-suggestions">
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name} />
                  ))}
                </datalist>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Image</FormLabel>
                <FormControl>
                  <Input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageChange}
                      disabled={uploading}
                  />
                </FormControl>
                <FormDescription>
                  Upload an image for your product (max 5MB).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {imagePreview && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Image Preview:</p>
              <div className="relative w-48 h-48 rounded-md border overflow-hidden">
                <img src={imagePreview} alt="Product preview" className="object-cover w-full h-full"/>
              </div>
            </div>
          )}


          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading || form.formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || form.formState.isSubmitting || !imageFile}>
              {uploading ? 'Uploading Image...' : form.formState.isSubmitting ? 'Adding Product...' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
