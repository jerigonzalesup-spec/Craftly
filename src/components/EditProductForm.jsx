
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
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { categories } from '@/lib/data';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useState } from 'react';
import { getImageUrl } from '@/lib/image-utils';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { uploadProductImage } from '@/lib/imageUpload';

const formSchema = z.object({
  productName: z.string().min(3, 'Product name must be 3-80 characters.').max(80, 'Product name must be 3-80 characters.'),
  description: z.string().min(10, 'Description must be 10-1000 characters.').max(1000, 'Description must be 10-1000 characters.'),
  price: z.coerce.number().positive('Price must be a positive number.').max(1000000, "Price must be less than ₱1,000,000."),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative.').max(10000, "Stock cannot be more than 10,000."),
  category: z.string().min(3, 'Category must be 3-50 characters.').max(50, 'Category must be 3-50 characters.'),
  materialsUsed: z.string().min(3, 'Materials must be 3-100 characters.').max(100, 'Materials must be 3-100 characters.'),
  imageUrl: z.string().min(1, 'An image is required.'),
});

export function EditProductForm({ product, onClose }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState(getImageUrl(product.images[0]) || null);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
      materialsUsed: product.materialsUsed,
      imageUrl: product.images[0], // Existing image URL
    },
  });

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        form.setError('imageUrl', { message: 'Image file must be less than 5MB.' });
        setImageFile(null);
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
        form.setError('imageUrl', { message: 'Failed to read image file.' });
        setImageFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(values) {
    if (!firestore || !user) return;

    try {
      setUploading(true);

      // If a new image was selected, upload it; otherwise use existing URL
      let imageUrl = values.imageUrl;
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile, user.uid);
      }

      const productDocRef = doc(firestore, 'products', product.id);

      const productData = {
        name: values.productName,
        description: values.description,
        price: values.price,
        stock: values.stock,
        category: values.category.toLowerCase().replace(/\s+/g, '-'),
        materialsUsed: values.materialsUsed,
        images: [imageUrl], // Store Firebase Storage URL
        updatedAt: serverTimestamp(),
      };

      updateDoc(productDocRef, productData).then(() => {
        toast({ title: 'Product Updated!', description: `${values.productName} has been updated.` });
        
        // Set flag to refetch dashboard stats
        localStorage.setItem(`dashboardNeedsUpdate_${user.uid}`, 'true');
        
        onClose();
      }).catch((serverError) => {
          const permissionError = new FirestorePermissionError({
              path: productDocRef.path,
              operation: 'update',
              requestResourceData: productData,
          });
          errorEmitter.emit('permission-error', permissionError);
      });
    } catch (error) {
      form.setError('imageUrl', { message: error.message || 'Failed to upload image. Please try again.' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Product</DialogTitle>
        <DialogDescription>Update the details for your handmade item.</DialogDescription>
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
                  <Input {...field} />
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
                  <Textarea {...field} />
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
                    <Input type="number" {...field} />
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
                    <Input type="number" {...field} />
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
                  <Input {...field} />
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
                  <Input {...field} list="category-suggestions" />
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
            render={() => (
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
                  Upload a new image to replace the current one (max 5MB). Leave empty to keep existing image.
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
            <Button type="submit" disabled={uploading || form.formState.isSubmitting}>
              {uploading ? 'Uploading Image...' : form.formState.isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}