import React, { createContext } from 'react';
import { useCartViewModel } from '@/hooks/useCartViewModel';

export const CartContext = createContext(undefined);

export function CartProvider({ children }) {
  // Use ViewModel for all cart logic
  const viewModel = useCartViewModel();

  const value = {
    cartItems: viewModel.cartItems,
    addToCart: viewModel.addToCart,
    removeFromCart: viewModel.removeFromCart,
    updateQuantity: viewModel.updateQuantity,
    clearCart: viewModel.clearCart,
    cartTotal: viewModel.cartTotal,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
