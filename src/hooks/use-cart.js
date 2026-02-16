
import { CartContext } from '@/context/CartProvider';
import { useContext } from 'react';

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
