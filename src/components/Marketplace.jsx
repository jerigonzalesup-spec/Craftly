
import { ProductCard } from '@/components/ProductCard';
import { useEffect, useState } from 'react';
import { Skeleton } from './ui/skeleton';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { categories } from '@/lib/data';
import { ArrowRight } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';
import { useMarketplaceViewModel } from '@/hooks/useMarketplaceViewModel';


export function Marketplace({ user }) {
    const displayName = user.displayName || 'Craftly Member';

    // Use ViewModel for state and business logic
    const {
        productsByCategory,
        newestProducts,
        loading,
    } = useMarketplaceViewModel();

    // User-specific welcome logic
    const creationTime = user.metadata?.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;
    const lastSignInTime = user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).getTime() : 0;
    const isNewUser = lastSignInTime - creationTime < 60 * 1000;

    const welcomeMessage = isNewUser ? `Welcome to Craftly, ${displayName}!` : `Welcome back, ${displayName}!`;
    const welcomeSubtext = isNewUser
      ? "We're so glad you're here. Start by exploring our handcrafted treasures."
      : "Your handcrafted journey continues here. Discover something new today.";


    return (
        <div className="animate-in fade-in duration-500">
            <header className="relative w-full h-[300px] flex items-center justify-center text-center text-white overflow-hidden">
                <img
                    src={placeholderImages.marketplaceHero.src}
                    alt="Artisan workshop background"
                    className="absolute inset-0 object-cover w-full h-full"
                    data-ai-hint={placeholderImages.marketplaceHero.hint}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/40" />
                <div className="relative container mx-auto px-4 z-10">
                    <h1 className="text-4xl font-bold tracking-tight font-headline sm:text-5xl">
                        {welcomeMessage}
                    </h1>
                    <p className="mt-4 text-lg text-white/90 max-w-2xl mx-auto">
                        {welcomeSubtext}
                    </p>
                </div>
            </header>
            
            <div className="container mx-auto px-4 py-16 space-y-16">
                 {loading ? (
                    <div className="space-y-16">
                        {[...Array(3)].map((_, i) => (
                             <section key={i}>
                                <Skeleton className="h-9 w-64 mb-8" />
                                <div className="flex gap-6 -mx-4 px-4 pb-4 overflow-x-auto">
                                    {[...Array(4)].map((_, j) => (
                                        <div key={j} className="w-60 md:w-64 flex-shrink-0">
                                            <Skeleton className="h-96 w-full" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <>
                        <section>
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-3xl font-bold tracking-tight font-headline">Freshly Crafted</h2>
                                <Button asChild variant="ghost">
                                    <Link to="/products">See All <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                </Button>
                            </div>
                             <div className="relative">
                                <div className="flex gap-6 -mx-4 px-4 pb-4 overflow-x-auto">
                                    {newestProducts.map((product) => (
                                        <div key={product.id} className="w-60 md:w-64 flex-shrink-0">
                                            <ProductCard product={product} user={user} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {categories.map(category => {
                            const categoryProducts = productsByCategory[category.id];
                            if (categoryProducts && categoryProducts.length > 0) {
                                return (
                                    <section key={category.id}>
                                        <div className="flex justify-between items-center mb-8">
                                            <h2 className="text-3xl font-bold tracking-tight font-headline">{category.name}</h2>
                                            <Button asChild variant="ghost">
                                                <Link to={`/products?category=${category.id}`}>See All <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                            </Button>
                                        </div>
                                        <div className="relative">
                                            <div className="flex gap-6 -mx-4 px-4 pb-4 overflow-x-auto">
                                                {categoryProducts.slice(0,10).map((product) => (
                                                    <div key={product.id} className="w-60 md:w-64 flex-shrink-0">
                                                        <ProductCard product={product} user={user} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                );
                            }
                            return null;
                        })}
                    </>
                )}
            </div>
        </div>
    );
}
