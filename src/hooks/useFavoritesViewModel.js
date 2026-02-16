import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from './use-toast';
import { createFavoritesService } from '@/services/favorites/favoritesService';

/**
 * useFavoritesViewModel Hook
 * ViewModel layer in MVVM architecture
 * Manages favorites state and business logic
 */
export function useFavoritesViewModel() {
  const { user } = useUser();
  const { toast } = useToast();
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Create service instance
  const favoritesService = useMemo(() => {
    return createFavoritesService();
  }, []);

  // Refetch favorites from API
  const refetchFavorites = useCallback(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }

    favoritesService.subscribeToUserFavorites(
      user.uid,
      (ids) => {
        setFavoriteIds(ids);
      },
      (error) => {
        console.error('Error fetching favorites:', error);
      }
    );
  }, [user, favoritesService]);

  // Subscribe to user's favorites on mount
  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = favoritesService.subscribeToUserFavorites(
      user.uid,
      (ids) => {
        setFavoriteIds(ids);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching favorites:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, favoritesService]);

  // Query function: Check if product is favorited
  const isFavorited = useCallback((productId) => {
    return favoriteIds.has(productId);
  }, [favoriteIds]);

  // Action: Toggle favorite
  const toggleFavorite = useCallback(
    async (productId) => {
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Please log in',
          description: 'You need to be logged in to manage your favorites.',
        });
        return;
      }

      try {
        const isFav = isFavorited(productId);
        await favoritesService.toggleFavorite(user.uid, productId, isFav);

        // After toggle succeeds, refetch favorites to update UI
        refetchFavorites();

        // Show success toast
        toast({
          title: isFav ? 'Removed from favorites' : 'Added to favorites',
          description: isFav ? '' : 'This item is now in your favorites.',
        });
      } catch (error) {
        console.error('Error toggling favorite:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update favorite. Please try again.',
        });
      }
    },
    [user, isFavorited, favoritesService, toast, refetchFavorites]
  );

  return {
    // State
    favoriteIds,
    loading,

    // Queries
    isFavorited,

    // Actions
    toggleFavorite,
  };
}
