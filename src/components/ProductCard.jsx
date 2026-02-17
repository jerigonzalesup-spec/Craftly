
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Zap, Heart, Truck, MapPin } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { getImageUrl } from '@/lib/image-utils';
import { useFavorites } from '@/hooks/use-favorites';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';

export function ProductCard({ product, user }) {
  const imageUrl = getImageUrl(product.images[0]);
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFavorited, toggleFavorite } = useFavorites();
  const firestore = useFirestore();
  const [sellerDelivery, setSellerDelivery] = useState(null);

  const isFavorite = isFavorited(product.id);

  // Fetch seller delivery methods
  useEffect(() => {
    if (!firestore || !product.createdBy) return;

    const fetchSellerDelivery = async () => {
      try {
        const sellerRef = doc(firestore, 'users', product.createdBy);
        const sellerSnap = await getDoc(sellerRef);
        if (sellerSnap.exists()) {
          const data = sellerSnap.data();
          setSellerDelivery({
            allowShipping: data.allowShipping !== false,
            allowPickup: data.allowPickup === true,
          });
        }
      } catch (error) {
        console.error('Error fetching seller delivery methods:', error);
      }
    };

    fetchSellerDelivery();
  }, [firestore, product.createdBy]);
  
  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (imageUrl) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: imageUrl,
        stock: product.stock,
        quantity: 1,
        createdBy: product.createdBy,
      });
    }
  };

  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (imageUrl) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: imageUrl,
        stock: product.stock,
        quantity: 1,
        createdBy: product.createdBy,
      }, { showToast: false });
      navigate('/checkout');
    }
  };
  
  const isOwnProduct = user && user.uid === product.createdBy;

  return (
    <Link to={`/products/${product.id}`} className="block group">
      <Card className="overflow-hidden h-full flex flex-col border border-input shadow-sm rounded-lg bg-transparent hover:shadow-md transition-shadow">
          <div className="aspect-square relative overflow-hidden rounded-lg">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={product.name}
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
              />
            )}
             {user && !isOwnProduct && (
              <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 z-20 h-9 w-9 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background"
                  onClick={handleFavoriteClick}
              >
                  <Heart className={cn("h-5 w-5 transition-colors", isFavorite ? "fill-red-500 text-red-500" : "text-foreground")} />
              </Button>
            )}
            {isOwnProduct && (
                 <div className="absolute top-2 left-2 z-10">
                    <p className="text-xs font-bold text-white bg-black/60 rounded-full px-3 py-1">Your Product</p>
                </div>
            )}
            {product.stock === 0 && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
                    <p className="text-sm font-bold text-white bg-black/60 rounded-full px-4 py-1">Out of Stock</p>
                </div>
            )}
             {user && !isOwnProduct && product.stock > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-2 z-20 flex items-center justify-center gap-2 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0">
                  <Button size="sm" className="flex-1 shadow-lg" onClick={handleAddToCart}>
                      <ShoppingCart className="h-4 w-4 mr-2" /> Cart
                  </Button>
                  <Button size="sm" variant="secondary" className="flex-1 shadow-lg" onClick={handleBuyNow}>
                      <Zap className="h-4 w-4 mr-2" /> Buy Now
                  </Button>
              </div>
            )}
          </div>
          <CardContent className="p-0 pt-4 flex-1 flex flex-col justify-between">
              <div>
                  <h3 className="font-semibold text-base leading-tight mt-1 truncate">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.category.replace('-', ' ')}</p>

                  {/* Delivery Method Badges */}
                  {sellerDelivery && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {sellerDelivery.allowShipping && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 rounded text-xs text-blue-700">
                          <Truck className="h-3 w-3" />
                          <span>Ships</span>
                        </div>
                      )}
                      {sellerDelivery.allowPickup && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 rounded text-xs text-green-700">
                          <MapPin className="h-3 w-3" />
                          <span>Pickup</span>
                        </div>
                      )}
                    </div>
                  )}
              </div>
              <p className="text-lg font-bold text-foreground mt-2">₱{product.price.toFixed(2)}</p>
          </CardContent>
      </Card>
    </Link>
  );
}
