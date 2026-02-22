
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Zap, Heart, Truck, MapPin, Star } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useProductStats } from '@/hooks/use-product-stats';
import { useSellerDelivery } from '@/hooks/use-seller-delivery';
import { getImageUrl } from '@/lib/image-utils';
import { useFavorites } from '@/hooks/use-favorites';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function ProductCard({ product, user }) {
  const imageUrl = getImageUrl(product.images[0]);
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFavorited, toggleFavorite } = useFavorites();
  const { sellerDelivery } = useSellerDelivery(product.createdBy);
  const { stats, isCached } = useProductStats(product.id);

  const isFavorite = isFavorited(product.id);

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
      <Card className="overflow-hidden h-full flex flex-col glass rounded-lg hover:shadow-xl hover:shadow-amber-600/20 transition-all duration-300 hover:border-white/20 animate-fade-in-up">
          <div className="aspect-square relative overflow-hidden rounded-lg">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={product.name}
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
              />
            )}
             {user && !isOwnProduct && (
              <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 z-20 h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm hover:bg-amber-600/60 transition-all duration-200"
                  onClick={handleFavoriteClick}
              >
                  <Heart className={cn("h-5 w-5 transition-all duration-200", isFavorite ? "fill-red-500 text-red-500 scale-110" : "text-white")} />
              </Button>
            )}
            {isOwnProduct && (
                 <div className="absolute top-2 left-2 z-10">
                    <p className="text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-800 rounded-full px-3 py-1">Your Product</p>
                </div>
            )}
            {product.stock === 0 && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                    <p className="text-sm font-bold text-white bg-black/60 rounded-full px-4 py-1">Out of Stock</p>
                </div>
            )}
             {user && !isOwnProduct && product.stock > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-3 z-20 flex items-center justify-center gap-2 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-6 group-hover:translate-y-0 bg-gradient-to-t from-black via-black/60 to-transparent">
                  <Button size="sm" className="flex-1 shadow-lg bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-700 hover:to-red-600 text-white border-0" onClick={handleAddToCart}>
                      <ShoppingCart className="h-4 w-4 mr-2" /> Cart
                  </Button>
                  <Button size="sm" className="flex-1 shadow-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground border-0" onClick={handleBuyNow}>
                      <Zap className="h-4 w-4 mr-2" /> Buy Now
                  </Button>
              </div>
            )}
          </div>
          <CardContent className="p-4 flex-1 flex flex-col justify-between">
              <div>
                  <h3 className="font-semibold text-base leading-tight mt-1 truncate text-foreground">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.category.replace('-', ' ')}</p>

                  {/* Star Rating and Sales */}
                  {(stats.averageRating > 0 || stats.reviewCount > 0 || stats.salesCount > 0) ? (
                    <div className="flex items-center gap-2 text-sm mt-2">
                      {stats.reviewCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-yellow-400">{stats.averageRating.toFixed(1)}</span>
                        </div>
                      )}
                      {stats.reviewCount > 0 && (
                        <>
                          <span className="text-muted-foreground">({stats.reviewCount})</span>
                          <span className="text-muted-foreground">·</span>
                        </>
                      )}
                      {stats.salesCount > 0 && (
                        <span className="text-muted-foreground">{stats.salesCount} sold</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground mt-2">No ratings yet</div>
                  )}

                  {/* Delivery Method Badges */}
                  {sellerDelivery && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {sellerDelivery.allowShipping && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-600/30 to-blue-500/20 rounded text-xs text-blue-300 border border-blue-500/30 backdrop-blur-sm">
                          <Truck className="h-3 w-3" />
                          <span>Ships</span>
                        </div>
                      )}
                      {sellerDelivery.allowPickup && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-green-600/30 to-green-500/20 rounded text-xs text-green-300 border border-green-500/30 backdrop-blur-sm">
                          <MapPin className="h-3 w-3" />
                          <span>Pickup</span>
                        </div>
                      )}
                    </div>
                  )}
              </div>
              <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-400 mt-2">₱{product.price.toFixed(2)}</p>
          </CardContent>
      </Card>
    </Link>
  );
}
