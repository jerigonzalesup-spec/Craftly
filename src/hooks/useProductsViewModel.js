import { useState, useEffect, useCallback, useMemo } from 'react';
import { createProductService } from '@/services/products/productService';

/**
 * useProductsViewModel Hook
 * ViewModel layer in MVVM architecture
 * Manages products state and business logic
 */
export function useProductsViewModel(initialCategory = 'all') {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState('newest');

  // Create service instance
  const productService = useMemo(() => {
    return createProductService();
  }, []);

  // Subscribe to products
  useEffect(() => {
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
  }, [productService]);

  // Apply filters and sorting
  const filteredProducts = useMemo(() => {
    return productService.applyFiltersAndSort(products, {
      category: selectedCategory,
      searchTerm: searchTerm,
      sortBy: sortBy,
    });
  }, [products, selectedCategory, searchTerm, sortBy, productService]);

  // Action: Update search term
  const updateSearchTerm = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  // Action: Update category filter
  const updateCategory = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  // Action: Update sort option
  const updateSortBy = useCallback((sort) => {
    setSortBy(sort);
  }, []);

  // Action: Set category from URL params
  const setCategoryFromParam = useCallback((categoryParam) => {
    if (categoryParam && categoryParam !== selectedCategory) {
      setSelectedCategory(categoryParam);
    }
  }, [selectedCategory]);

  return {
    // State
    products: filteredProducts,
    allProducts: products,
    loading,
    error,
    searchTerm,
    selectedCategory,
    sortBy,

    // Actions
    updateSearchTerm,
    updateCategory,
    updateSortBy,
    setCategoryFromParam,
  };
}
