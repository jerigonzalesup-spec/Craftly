import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from './use-toast';
import { CartService } from '@/services/cart/cartService';

/**
 * useCartViewModel Hook
 * ViewModel layer in MVVM architecture
 * Manages cart state and business logic
 */
export function useCartViewModel() {
  const [cartItems, setCartItems] = useState(() => {
    // Initialize state from localStorage immediately
    return CartService.loadCartFromStorage();
  });
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const userRef = useRef(user);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    CartService.saveCartToStorage(cartItems);
  }, [cartItems]);

  // Sync cart to API whenever it changes (if user is logged in)
  useEffect(() => {
    if (user && user.uid) {
      CartService.syncCartToAPI(user.uid, cartItems);
    }
  }, [user, cartItems]);

  // Clear cart when user logs out
  useEffect(() => {
    if (!userLoading) {
      // Check if user status changed from logged in to logged out
      if (userRef.current && !user) {
        setCartItems([]); // Clear the cart
        CartService.clearCartStorage();
      }
      userRef.current = user;
    }
  }, [user, userLoading]);

  // Action: Add to cart
  const addToCart = useCallback(
    (item, options = {}) => {
      const { showToast = true } = options;

      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Please log in',
          description: 'You must be logged in to add items to the cart.',
        });
        return;
      }

      setCartItems((prevItems) => {
        const result = CartService.addToCart(prevItems, item);

        if (!result.success) {
          toast({
            variant: 'destructive',
            title: 'Cannot Add Item',
            description: result.error,
            duration: 6000,
          });
          return prevItems;
        }

        if (showToast) {
          toast({
            title: 'Added to cart!',
            description: `1 x ${item.name}`,
          });
        }

        return result.items;
      });
    },
    [user, toast]
  );

  // Action: Remove from cart
  const removeFromCart = useCallback(
    (id) => {
      setCartItems((prevItems) => CartService.removeFromCart(prevItems, id));
      toast({
        variant: 'destructive',
        title: 'Item removed',
        description: 'The item has been removed from your cart.',
      });
    },
    [toast]
  );

  // Action: Update quantity
  const updateQuantity = useCallback(
    (id, quantity) => {
      setCartItems((prevItems) => {
        const result = CartService.updateQuantity(prevItems, id, quantity);

        if (!result.success && result.error) {
          toast({
            variant: 'destructive',
            title: 'Cannot Update Quantity',
            description: result.error,
          });
        }

        return result.items;
      });
    },
    [toast]
  );

  // Action: Clear cart
  const clearCart = useCallback(() => {
    setCartItems([]);
    CartService.clearCartStorage();
    // Also clear cart on API if user is logged in
    if (user && user.uid) {
      CartService.clearCartOnAPI(user.uid);
    }
  }, [user]);

  // Query: Calculate cart total
  const cartTotal = useMemo(() => {
    return CartService.calculateTotal(cartItems);
  }, [cartItems]);

  return {
    // State
    cartItems,
    cartTotal,

    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };
}
