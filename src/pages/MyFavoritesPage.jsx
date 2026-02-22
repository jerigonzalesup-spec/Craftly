
import { useUser } from '@/firebase/auth/use-user';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useFavorites } from '@/hooks/use-favorites';
import { Button } from '@/components/ui/button';

export default function MyFavoritesPage() {
  const { user, loading: userLoading } = useUser();
  const { favoriteIds, loading: favoritesLoading } = useFavorites();
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
      if (!userLoading && !user) {
          navigate('/login', { replace: true });
      }
  }, [user, userLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    setProductsLoading(true);

    // Fetch active products via API
    const fetchAllProducts = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

        const response = await fetch(`${API_URL}/api/products?status=active`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const prods = data.data || data;
          setAllProducts(Array.isArray(prods) ? prods : []);
        }
      } catch (error) {
        console.error("Error fetching products: ", error);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchAllProducts();
  }, [user]);

  const favoriteProducts = useMemo(() => {
    if (!user) return [];
    return allProducts.filter(p => favoriteIds.has(p.id));
  }, [allProducts, favoriteIds, user]);
  
  const isLoading = userLoading || favoritesLoading || productsLoading;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 font-headline">My Favorites</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:gap-x-6">
          {[...Array(5)].map((_, i) => (
             <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      ) : favoriteProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:gap-x-6">
          {favoriteProducts.map((product) => (
            <ProductCard key={product.id} product={product} user={user} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h3 className="mt-4 text-xl font-semibold">Your Wishlist is Empty</h3>
          <p className="mt-2 text-muted-foreground">
            Click the heart on any product to save it here.
          </p>
          <Button asChild className="mt-6">
            <Link to="/products">Explore Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
