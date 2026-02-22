/**
 * Favorites Service
 * Handles all favorite-related API operations
 * This is part of the Model layer in MVVM architecture
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Simple cache for favorites per user to reduce quota usage
const favoritesCache = new Map(); // Map<userId, { data: Set, timestamp }>
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache duration (increased from 3 min to reduce quota)

export class FavoritesService {
  constructor() {
    // No longer needs firestore instance
  }

  /**
   * Fetch user's favorites from API with caching
   * @param {String} userId - User ID
   * @param {Function} onSuccess - Callback when favorites are loaded
   * @param {Function} onError - Callback when error occurs
   * @returns {Function} Unsubscribe function (no-op for HTTP calls)
   */
  subscribeToUserFavorites(userId, onSuccess, onError) {
    if (!userId) {
      onError(new Error('userId is required'));
      return () => {};
    }

    const now = Date.now();
    const cached = favoritesCache.get(userId);

    // Check if cache is still valid
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log('❤️ Using cached favorites (age: ' + (now - cached.timestamp) / 1000 + 's)');
      onSuccess(cached.data);
      return () => {};
    }

    // Cache miss or expired, fetch from API
    console.log('❤️ Fetching favorites from API...');
    fetch(`${API_URL}/api/favorites/${userId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return response.json();
      })
      .then((json) => {
        if (json.success && Array.isArray(json.data.favorites)) {
          // Convert array to Set like the original service
          const favoriteIds = new Set(json.data.favorites);

          // Update cache
          favoritesCache.set(userId, { data: favoriteIds, timestamp: now });

          onSuccess(favoriteIds);
        } else {
          throw new Error('Invalid API response format');
        }
      })
      .catch((error) => {
        console.error('Error fetching favorites:', error);
        onError(error);
      });

    // Return no-op unsubscribe function
    return () => {};
  }

  /**
   * Add product to favorites
   * @param {String} userId - User ID
   * @param {String} productId - Product ID
   * @returns {Promise<void>}
   */
  async addFavorite(userId, productId) {
    if (!userId || !productId) {
      throw new Error('userId and productId are required');
    }

    try {
      const response = await fetch(`${API_URL}/api/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) {
        throw new Error('Failed to add favorite');
      }

      // Invalidate cache for this user
      favoritesCache.delete(userId);
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  }

  /**
   * Remove product from favorites
   * @param {String} userId - User ID
   * @param {String} productId - Product ID
   * @returns {Promise<void>}
   */
  async removeFavorite(userId, productId) {
    if (!userId || !productId) {
      throw new Error('userId and productId are required');
    }

    try {
      const response = await fetch(`${API_URL}/api/favorites/${productId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) {
        throw new Error('Failed to remove favorite');
      }

      // Invalidate cache for this user
      favoritesCache.delete(userId);
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  }

  /**
   * Toggle favorite status
   * @param {String} userId - User ID
   * @param {String} productId - Product ID
   * @param {Boolean} isFavorited - Current favorite status
   * @returns {Promise<void>}
   */
  async toggleFavorite(userId, productId, isFavorited) {
    if (isFavorited) {
      await this.removeFavorite(userId, productId);
    } else {
      await this.addFavorite(userId, productId);
    }
  }
}

/**
 * Create a FavoritesService instance
 * @returns {FavoritesService} Service instance
 */
export function createFavoritesService() {
  return new FavoritesService();
}
