import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '../components/ui/skeleton';
import { ProductCard } from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { useUser } from '../firebase/auth/use-user';
import { ChevronLeft, Star, MapPin, Truck, MapPinOff } from 'lucide-react';

export default function SellerProfilePage() {
  const params = useParams();
  const sellerId = params?.sellerId;
  const navigate = useNavigate();
  const { user: authUser } = useUser();

  const { profile: seller, loading, error, products, productsLoading, notFound } = useUserProfile(sellerId);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-6 w-32 mb-8" />
        <Skeleton className="h-32 w-32 rounded-full mb-8" />
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-96 mb-8" />
      </div>
    );
  }

  if (notFound && !loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
        <div className="text-center py-20">
          <h1 className="text-4xl font-bold">404 - Seller Not Found</h1>
          <p className="text-muted-foreground mt-4">The seller you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
        <ChevronLeft className="h-4 w-4 mr-2" />
        Go Back
      </Button>

      {/* Seller Header */}
      <div className="mb-12 pb-8 border-b">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-6">
          {/* Seller Avatar */}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center flex-shrink-0">
            <span className="text-5xl font-headline font-bold text-primary">
              {seller.fullName?.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Seller Info */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold font-headline mb-2">{seller.fullName}</h1>

            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground mb-4">
              <div>
                <span className="font-semibold text-foreground">{products.length}</span>
                <span className="ml-2">Product{products.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                <span className="font-semibold text-foreground">4.5</span>
                <span className="ml-2">(Based on reviews)</span>
              </div>
            </div>

            <p className="text-muted-foreground mb-4">
              Member since {new Date(seller.createdAt?.toDate?.() || seller.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
              })}
            </p>

            {/* Action Button */}
            {authUser && authUser.uid !== sellerId && (
              <Button className="mr-3">
                Message Seller
              </Button>
            )}
            {authUser && authUser.uid === sellerId && (
              <Button variant="secondary">
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Shop Details Section */}
      {seller.shopName && (
        <div className="mb-12 pb-8 border-b">
          <h2 className="text-2xl font-bold font-headline mb-6">Shop Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shop Info Card */}
            <div className="border border-input rounded-lg p-6 bg-card">
              <h3 className="text-lg font-semibold mb-4">{seller.shopName}</h3>

              {seller.shopAddress && (
                <div className="flex gap-3 mb-3">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground">
                      {seller.shopAddress}
                      {seller.shopBarangay && `, ${seller.shopBarangay}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {seller.shopCity || 'Dagupan'}, Philippines
                    </p>
                  </div>
                </div>
              )}

              {/* Delivery Methods */}
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm font-semibold mb-3">Delivery Methods</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {seller.allowShipping ? (
                      <>
                        <Truck className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Shipping Available</span>
                      </>
                    ) : (
                      <>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Shipping Not Available</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {seller.allowPickup ? (
                      <>
                        <MapPinOff className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Local Pickup Available</span>
                      </>
                    ) : (
                      <>
                        <MapPinOff className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Local Pickup Not Available</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Map Placeholder (Ready for Google Maps integration) */}
            <div className="border border-input rounded-lg p-6 bg-card flex items-center justify-center min-h-[280px]">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Map view coming soon
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Section */}
      <div>
        <h2 className="text-3xl font-bold font-headline mb-8">Products ({products.length})</h2>

        {productsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} user={authUser} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">This seller has no active products yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
