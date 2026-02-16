import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase/provider';
import { createProductService } from '@/services/products/productService';

/**
 * useMarketplaceViewModel Hook
 * ViewModel layer for Marketplace component
 * Manages products grouped by category
 */
export function useMarketplaceViewModel() {
  const firestore = useFirestore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create service instance
  const productService = useMemo(() => {
    return createProductService(firestore);
  }, [firestore]);

  // Subscribe to products
  useEffect(() => {
    if (!firestore) return;

    setLoading(true);
    setError(null);

    const unsubscribe = productService.subscribeToActiveProducts(
      (loadedProducts) => {
        setProducts(loadedProducts);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, productService]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    if (loading) return {};
    return products.reduce((acc, product) => {
      const categoryKey = product.category || 'other';
      if (!acc[categoryKey]) {
        acc[categoryKey] = [];
      }
      acc[categoryKey].push(product);
      return acc;
    }, {});
  }, [products, loading]);

  // Get newest products (first 10)
  const newestProducts = useMemo(() => {
    return products.slice(0, 10);
  }, [products]);

  return {
    // State
    products,
    productsByCategory,
    newestProducts,
    loading,
    error,
  };
}
