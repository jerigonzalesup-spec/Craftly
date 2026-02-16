
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

const formSchema = z.object({
  productName: z.string().min(3, 'Product name must be 3-80 characters.').max(80, 'Product name must be 3-80 characters.'),
  description: z.string().min(10, 'Description must be 10-200 characters.').max(200, 'Description must be 10-200 characters.').regex(/[a-zA-Z]/, 'Description must contain letters, not just numbers.'),
  price: z.coerce.number().positive('Price must be a positive number.').max(1000000, "Price must be less than ₱1,000,000."),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative.').max(10000, "Stock cannot be more than 10,000."),
  category: z.string().min(3, 'Category must be 3-30 characters.').max(30, 'Category must be 3-30 characters.').regex(/[a-zA-Z]/, 'Category must contain letters, not just numbers.'),
  materialsUsed: z.string().min(3, 'Materials must be 3-50 characters.').max(50, 'Materials must be 3-50 characters.').regex(/[a-zA-Z]/, 'Materials must contain letters, not just numbers.'),
  imageDataUri: z.string().startsWith('data:image/', { message: 'Please upload a valid image file.' }),
});


export function AddProductForm({ onClose }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: '',
      description: '',
      price: 0,
      stock: 1,
      category: '',
      materialsUsed: '',
      imageDataUri: '',
    },
  });
  
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) { // 1MB limit
        form.setError('imageDataUri', { message: 'Image file must be less than 1MB.' });
        setImagePreview(null);
        form.setValue('imageDataUri', '');
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
        setImagePreview(null);
        form.setValue('imageDataUri', '');
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(values) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to add a product.' });
      return;
    }

    const productData = {
      name: values.productName,
      sellerName: user.displayName || 'Craftly Seller',
      description: values.description,
      price: values.price,
      stock: values.stock,
      category: values.category.toLowerCase().replace(/\s+/g, '-'),
      materialsUsed: values.materialsUsed,
      createdBy: user.uid,
      images: [values.imageDataUri], 
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const productsCollection = collection(firestore, 'products');
    addDoc(productsCollection, productData).then(() => {
      toast({ title: 'Product Posted!', description: `${values.productName} has been posted successfully.` });
      onClose();
    }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: productsCollection.path,
            operation: 'create',
            requestResourceData: productData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
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
            name="imageDataUri"
            render={({ field }) => ( 
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
                  Upload an image for your product (max 1MB).
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
              {form.formState.isSubmitting ? 'Adding Product...' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
