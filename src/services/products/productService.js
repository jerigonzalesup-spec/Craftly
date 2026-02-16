import { Timestamp } from 'firebase/firestore';

/**
 * Products Service
 * Handles all product-related API operations
 * This is part of the Model layer in MVVM architecture
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export class ProductService {
  constructor() {
    // No longer needs firestore instance
  }

  /**
   * Fetch active products from API
   * @param {Function} onSuccess - Callback when products are loaded
   * @param {Function} onError - Callback when error occurs
   * @returns {Function} Unsubscribe function (no-op for HTTP calls)
   */
  subscribeToActiveProducts(onSuccess, onError) {
    // Start the async fetch
    fetch(`${API_URL}/api/products`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return response.json();
      })
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          onSuccess(json.data);
        } else {
          throw new Error('Invalid API response format');
        }
      })
      .catch((error) => {
        console.error('Error fetching products:', error);
        onError(error);
      });

    // Return no-op unsubscribe function
    return () => {};
  }

  /**
   * Filter products by category
   * @param {Array} products - All products
   * @param {String} category - Category to filter by ('all' returns all)
   * @returns {Array} Filtered products
   */
  filterByCategory(products, category) {
    if (category === 'all') return products;
    return products.filter(product => product.category === category);
  }

  /**
   * Search products by name
   * @param {Array} products - All products
   * @param {String} searchTerm - Search term
   * @returns {Array} Filtered products
   */
  searchByName(products, searchTerm) {
    if (searchTerm === '') return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  /**
   * Sort products by specified criteria
   * @param {Array} products - Products to sort
   * @param {String} sortBy - Sort criteria ('newest', 'price-asc', 'price-desc')
   * @returns {Array} Sorted products
   */
  sortProducts(products, sortBy) {
    const sorted = [...products];

    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'newest':
      default:
        return sorted.sort((a, b) => {
          const dateA = a.createdAt instanceof Timestamp
            ? a.createdAt.toDate().getTime()
            : 0;
          const dateB = b.createdAt instanceof Timestamp
            ? b.createdAt.toDate().getTime()
            : 0;
          return dateB - dateA;
        });
    }
  }

  /**
   * Apply all filters and sorting to products
   * @param {Array} products - All products
   * @param {Object} filters - Filter options
   * @returns {Array} Filtered and sorted products
   */
  applyFiltersAndSort(products, filters) {
    const { category, searchTerm, sortBy } = filters;

    let filtered = products;
    filtered = this.filterByCategory(filtered, category);
    filtered = this.searchByName(filtered, searchTerm);
    filtered = this.sortProducts(filtered, sortBy);

    return filtered;
  }
}

/**
 * Create a ProductService instance
 * @returns {ProductService} Service instance
 */
export function createProductService() {
  return new ProductService();
}
