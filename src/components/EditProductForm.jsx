
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
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { categories } from '@/lib/data';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useState } from 'react';
import { getImageUrl } from '@/lib/image-utils';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const formSchema = z.object({
  productName: z.string().min(3, 'Product name must be 3-80 characters.').max(80, 'Product name must be 3-80 characters.'),
  description: z.string().min(10, 'Description must be 10-1000 characters.').max(1000, 'Description must be 10-1000 characters.'),
  price: z.coerce.number().positive('Price must be a positive number.').max(1000000, "Price must be less than ₱1,000,000."),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative.').max(10000, "Stock cannot be more than 10,000."),
  category: z.string().min(3, 'Category must be 3-50 characters.').max(50, 'Category must be 3-50 characters.'),
  materialsUsed: z.string().min(3, 'Materials must be 3-100 characters.').max(100, 'Materials must be 3-100 characters.'),
  imageDataUri: z.string().min(1, 'An image is required.'),
});

export function EditProductForm({ product, onClose }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState(getImageUrl(product.images[0]) || null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
      materialsUsed: product.materialsUsed,
      imageDataUri: product.images[0], // Can be a data URI or a placeholder ID
    },
  });

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) { // 1MB limit
        form.setError('imageDataUri', { message: 'Image file must be less than 1MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result;
        form.setValue('imageDataUri', dataUri, { shouldValidate: true });
        setImagePreview(dataUri);
      };
      reader.onerror = () => {
        form.setError('imageDataUri', { message: 'Failed to read image file.' });
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(values) {
    if (!firestore) return;

    const productDocRef = doc(firestore, 'products', product.id);

    const productData = {
      name: values.productName,
      description: values.description,
      price: values.price,
      stock: values.stock,
      category: values.category.toLowerCase().replace(/\s+/g, '-'),
      materialsUsed: values.materialsUsed,
      images: [values.imageDataUri],
      updatedAt: serverTimestamp(),
    };

    updateDoc(productDocRef, productData).then(() => {
      toast({ title: 'Product Updated!', description: `${values.productName} has been updated.` });
      onClose();
    }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: productDocRef.path,
            operation: 'update',
            requestResourceData: productData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
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
            name="imageDataUri"
            render={() => ( 
              <FormItem>
                <FormLabel>Product Image</FormLabel>
                <FormControl>
                  <Input 
                      type="file" 
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageChange}
                  />
                </FormControl>
                <FormDescription>
                  Upload a new image to replace the current one (max 1MB).
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}