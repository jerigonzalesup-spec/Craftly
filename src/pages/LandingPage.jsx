import { ProductCard } from '@/components/ProductCard';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Skeleton } from '../components/ui/skeleton';
import placeholderImages from '@/lib/placeholder-images.json';
import { ArrowRight, Sparkles, HandHeart, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { categories } from '@/lib/data';

export function LandingPage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Fetch featured products via API instead of direct Firestore query
    const fetchFeaturedProducts = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

        // Use API endpoint instead of direct Firestore query
        const response = await fetch(`${API_URL}/api/products?status=active&limit=12`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const products = data.data || data;
          setFeaturedProducts(Array.isArray(products) ? products : []);
        }
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);


  return (
    <div className="">
      <section className="relative h-[60vh] min-h-[400px] md:h-[500px] w-full flex items-center justify-center text-center overflow-hidden">
        <img
            src={placeholderImages.landingHero.src}
            alt="Background of handmade crafts"
            className="absolute inset-0 object-cover w-full h-full"
            data-ai-hint={placeholderImages.landingHero.hint}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60" />
        <div className="relative container mx-auto px-4 z-10">
             <h1 className="text-4xl font-bold tracking-tight font-headline sm:text-5xl lg:text-6xl animate-fade-in-up text-white">
                Craftly
            </h1>
            <p className="mt-4 text-lg text-white/90 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                Discover unique, locally crafted products made with passion and care. Find the perfect piece that tells a story.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <Button asChild size="lg" className="bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-700 hover:to-red-600 text-white border-0 shadow-lg shadow-amber-600/50 hover:shadow-amber-600/75 transition-all duration-300">
                    <Link to="/products">Explore the Collection</Link>
                </Button>
                 <Button asChild size="lg" variant="secondary" className="text-foreground bg-secondary/80 hover:bg-secondary/60 border border-secondary">
                    <Link to="/register">Become a Seller</Link>
                </Button>
            </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-background via-background to-amber-900/10">
         <div className="container mx-auto px-4">
            <div className="text-center mb-12 animate-fade-in-up">
               <h2 className="text-3xl font-bold tracking-tight font-headline">
                Our Commitment
              </h2>
              <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
                We believe in the power of handmade and the community it builds.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center group animate-scale-in" style={{ animationDelay: '0s' }}>
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-amber-600/30 to-red-500/20 text-amber-400 mb-4 group-hover:from-amber-600/50 group-hover:to-red-500/30 transition-all duration-300 border border-amber-500/30">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Unique Products</h3>
                <p className="text-muted-foreground">Every item is one-of-a-kind, carrying the signature touch of its creator.</p>
              </div>
               <div className="flex flex-col items-center group animate-scale-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-amber-600/30 to-red-500/20 text-amber-400 mb-4 group-hover:from-amber-600/50 group-hover:to-red-500/30 transition-all duration-300 border border-amber-500/30">
                  <HandHeart className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Support Local</h3>
                <p className="text-muted-foreground">Your purchase directly supports local artisans and their families in Dagupan.</p>
              </div>
               <div className="flex flex-col items-center group animate-scale-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-amber-600/30 to-red-500/20 text-amber-400 mb-4 group-hover:from-amber-600/50 group-hover:to-red-500/30 transition-all duration-300 border border-amber-500/30">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Quality Craftsmanship</h3>
                <p className="text-muted-foreground">We curate products that are not only beautiful but also built to last.</p>
              </div>
            </div>
         </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
           <h2 className="text-3xl font-bold tracking-tight font-headline text-center mb-12 animate-fade-in-up">
              Shop by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {categories.map((cat, idx) => (
                <Link to={`/products?category=${cat.id}`} key={cat.id} className="group animate-scale-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="flex flex-col items-center p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all duration-300 group-hover:border-white/20 group-hover:shadow-lg group-hover:shadow-amber-600/20">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-600/30 to-red-500/20 flex items-center justify-center mb-3 group-hover:from-amber-600/50 group-hover:to-red-500/30 transition-all duration-300">
                      <span className="text-xl font-semibold text-amber-400">{cat.name.charAt(0)}</span>
                    </div>
                    <h3 className="font-medium text-sm text-center leading-tight">{cat.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-background to-amber-900/10">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8 animate-fade-in-up">
            <h2 className="text-3xl font-bold tracking-tight font-headline">
              Featured Products
            </h2>
            <Button asChild variant="ghost" className="text-amber-400 hover:text-red-400 transition-colors">
              <Link to="/products">
                See All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {loading ? (
             <div className="flex gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-60 md:w-64 flex-shrink-0">
                        <Skeleton className="h-96 w-full bg-white/5" />
                    </div>
                ))}
            </div>
          ) : (
            <div className="relative">
                <div className="flex gap-6 -mx-4 px-4 pb-4 overflow-x-auto">
                    {featuredProducts.map((product, idx) => (
                        <div key={product.id} className="w-60 md:w-64 flex-shrink-0 animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                            <ProductCard product={product} user={null} />
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}