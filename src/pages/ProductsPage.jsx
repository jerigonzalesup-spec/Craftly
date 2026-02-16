
import { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { categories } from '../lib/data';
import { ProductCard } from '../components/ProductCard';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { Search } from 'lucide-react';
import { useUser } from '../firebase/auth/use-user';
import { Skeleton } from '../components/ui/skeleton';
import { useProductsViewModel } from '../hooks/useProductsViewModel';

function ProductsPageContent() {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const { user } = useUser();

  // Use ViewModel for state and business logic
  const {
    products: filteredProducts,
    loading,
    searchTerm,
    selectedCategory,
    sortBy,
    updateSearchTerm,
    updateCategory,
    updateSortBy,
    setCategoryFromParam,
  } = useProductsViewModel(categoryParam || 'all');

  // Sync URL parameter with ViewModel
  useEffect(() => {
    setCategoryFromParam(categoryParam);
  }, [categoryParam, setCategoryFromParam]);

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight font-headline">
          All Products
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Explore our collection of handcrafted treasures.
        </p>
      </header>
      
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for products..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => updateSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={updateCategory}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={updateSortBy}>
            <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="newest">Sort by: Newest</SelectItem>
                <SelectItem value="price-asc">Sort by: Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Sort by: Price: High to Low</SelectItem>
            </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:gap-x-6">
          {[...Array(10)].map((_, i) => (
             <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:gap-x-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} user={user} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h3 className="mt-4 text-xl font-semibold">No products found</h3>
          <p className="mt-2 text-muted-foreground">
            Try adjusting your search or filters.
          </p>
        </div>
      )}
    </div>
  );
}


export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-12"><Skeleton className="h-screen w-full" /></div>}>
            <ProductsPageContent />
        </Suspense>
    )
}
