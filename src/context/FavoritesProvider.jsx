
import React, { createContext } from 'react';
import { useFavoritesViewModel } from '@/hooks/useFavoritesViewModel';

export const FavoritesContext = createContext(undefined);

export function FavoritesProvider({ children }) {
  // Use ViewModel for all favorites logic
  const viewModel = useFavoritesViewModel();

  const value = {
    favoriteIds: viewModel.favoriteIds,
    toggleFavorite: viewModel.toggleFavorite,
    isFavorited: viewModel.isFavorited,
    loading: viewModel.loading,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}
