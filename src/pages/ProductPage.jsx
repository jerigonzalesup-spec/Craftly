
import { useParams, Link } from 'react-router-dom';
import { ProductImageCarousel } from '../components/ProductImageCarousel';
import { ChevronRight, Heart, Truck, MapPin } from 'lucide-react';
import { AddToCartForm } from '../components/AddToCartForm';
import { ProductReviews } from '../components/ProductReviews';
import { Separator } from '../components/ui/separator';
import { useEffect, useState } from 'react';
import { Skeleton } from '../components/ui/skeleton';
import { categories } from '../lib/data';
import { useFavorites } from '../hooks/use-favorites';
import { useUser } from '../firebase/auth/use-user';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

function NotFound() {
    return (
        <div className="text-center py-20">
            <h1 className="text-4xl font-bold">404 - Not Found</h1>
            <p className="text-muted-foreground mt-4">The product you are looking for does not exist.</p>
        </div>
    );
}

export default function ProductPage() {
  const params = useParams();
  const id = params?.id;
  const [product, setProduct] = useState(null);
  const [sellerName, setSellerName] = useState(null);
  const [sellerDelivery, setSellerDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { user: authUser } = useUser();
  const { isFavorited, toggleFavorite, loading: favoritesLoading } = useFavorites();

  useEffect(() => {
    if (!id) return;

    const fetchProductDetails = async () => {
      setLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

        // Fetch product via API
        const response = await fetch(`${API_URL}/api/products/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const data = await response.json();
        const productData = data.data || data;

        if (productData.status === 'archived') {
          setNotFound(true);
        } else {
          setProduct(productData);
          setSellerName(productData.sellerName || 'Craftly Seller');

          // Extract delivery methods from product data if available
          if (productData.allowShipping !== undefined || productData.allowPickup !== undefined) {
            setSellerDelivery({
              allowShipping: productData.allowShipping !== false,
              allowPickup: productData.allowPickup === true,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching product details:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
         <Skeleton className="h-6 w-1/2 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <Skeleton className="h-[500px] w-full" />
            <div className="space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        </div>
      </div>
    );
  }

  if (notFound) {
      return <NotFound />;
  }

  if (!product) {
    return null;
  }

  const categoryName = categories.find(c => c.id === product.category)?.name || product.category;

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="text-sm text-muted-foreground mb-4 flex items-center">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <Link to="/products" className="hover:text-primary capitalize">{categoryName}</Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="text-foreground">{product.name}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <ProductImageCarousel product={product} />
          </div>
          <div className="flex flex-col">
            <div className="flex justify-between items-start gap-4">
              <h1 className="text-3xl lg:text-4xl font-bold mb-2 font-headline">{product.name}</h1>
                {authUser && authUser.uid !== product.createdBy && !favoritesLoading && (
                  <Button
                      size="icon"
                      variant="outline"
                      className="rounded-full h-11 w-11 flex-shrink-0"
                      onClick={() => toggleFavorite(product.id)}
                  >
                      <Heart className={cn("h-5 w-5", isFavorited(product.id) ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                      <span className="sr-only">Toggle Favorite</span>
                  </Button>
              )}
            </div>
            {sellerName && product.createdBy && (
                <p className="text-sm text-muted-foreground mb-4">
                    Sold by <Link to={`/seller/${product.createdBy}`} className="font-semibold text-foreground hover:underline">{sellerName}</Link>
                </p>
            )}
            <p className="text-2xl font-semibold text-primary mb-4">₱{product.price.toFixed(2)}</p>
            <p className="text-muted-foreground text-base leading-relaxed mb-6">{product.description}</p>

            {/* Delivery Method Badges */}
            {sellerDelivery && (
              <div className="flex flex-wrap gap-2 mb-6">
                {sellerDelivery.allowShipping && (
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 rounded-md text-sm text-blue-700 font-medium">
                    <Truck className="h-4 w-4" />
                    <span>Shipping Available</span>
                  </div>
                )}
                {sellerDelivery.allowPickup && (
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 rounded-md text-sm text-green-700 font-medium">
                    <MapPin className="h-4 w-4" />
                    <span>Local Pickup Available</span>
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-2">Details</h3>
              <div className="text-sm space-y-2 text-muted-foreground">
                  <p><span className="font-medium text-foreground">Materials:</span> {product.materialsUsed}</p>
                  <p><span className="font-medium text-foreground">In Stock:</span> {product.stock} items</p>
              </div>
            </div>
            
            <div className="mt-8">
              <AddToCartForm product={product} />
            </div>

          </div>
        </div>

        <Separator className="my-12" />

        <div>
          <ProductReviews 
            productId={product.id}
            productCreatorId={product.createdBy}
            productName={product.name}
          />
        </div>
      </div>
    </>
  );
}
