import { ProductCard } from '@/components/ProductCard';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase/provider';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { Skeleton } from '../components/ui/skeleton';
import placeholderImages from '@/lib/placeholder-images.json';
import { ArrowRight, Sparkles, HandHeart, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { categories } from '@/lib/data';

export function LandingPage() {
  const firestore = useFirestore();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    // Increased limit for better scrolling experience
    const q = query(collection(firestore, 'products'), where('status', '==', 'active'), limit(12));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const prods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFeaturedProducts(prods);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firestore]);


  return (
    <div className="animate-in fade-in duration-500">
      <section className="relative h-[60vh] min-h-[400px] md:h-[500px] w-full flex items-center justify-center text-center text-white overflow-hidden">
        <img
            src={placeholderImages.landingHero.src}
            alt="Background of handmade crafts"
            className="absolute inset-0 object-cover w-full h-full"
            data-ai-hint={placeholderImages.landingHero.hint}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/40" />
        <div className="relative container mx-auto px-4 z-10">
             <h1 className="text-4xl font-bold tracking-tight font-headline sm:text-5xl lg:text-6xl">
                Craftly
            </h1>
            <p className="mt-4 text-lg text-white/90 max-w-2xl mx-auto">
                Discover unique, locally crafted products made with passion and care. Find the perfect piece that tells a story.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg">
                    <Link to="/products">Explore the Collection</Link>
                </Button>
                 <Button asChild size="lg" variant="secondary">
                    <Link to="/register">Become a Seller</Link>
                </Button>
            </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-background via-background to-primary/5">
         <div className="container mx-auto px-4">
            <div className="text-center mb-12">
               <h2 className="text-3xl font-bold tracking-tight font-headline">
                Our Commitment
              </h2>
              <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
                We believe in the power of handmade and the community it builds.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Unique Products</h3>
                <p className="text-muted-foreground">Every item is one-of-a-kind, carrying the signature touch of its creator.</p>
              </div>
               <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                  <HandHeart className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Support Local</h3>
                <p className="text-muted-foreground">Your purchase directly supports local artisans and their families in Dagupan.</p>
              </div>
               <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
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
           <h2 className="text-3xl font-bold tracking-tight font-headline text-center mb-12">
              Shop by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {categories.map((cat) => (
                <Link to={`/products?category=${cat.id}`} key={cat.id} className="group">
                  <div className="flex flex-col items-center p-4 rounded-lg border border-input bg-card hover:bg-muted transition-all duration-200 hover:shadow-sm">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <span className="text-xl font-semibold text-primary">{cat.name.charAt(0)}</span>
                    </div>
                    <h3 className="font-medium text-sm text-center leading-tight">{cat.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight font-headline">
              Featured Products
            </h2>
            <Button asChild variant="ghost">
              <Link to="/products">
                See All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {loading ? (
             <div className="flex gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-60 md:w-64 flex-shrink-0">
                        <Skeleton className="h-96 w-full" />
                    </div>
                ))}
            </div>
          ) : (
            <div className="relative">
                <div className="flex gap-6 -mx-4 px-4 pb-4 overflow-x-auto">
                    {featuredProducts.map((product) => (
                        <div key={product.id} className="w-60 md:w-64 flex-shrink-0">
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