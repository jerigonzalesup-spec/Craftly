import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from './use-toast';
import { CartService } from '@/services/cart/cartService';

/**
 * useCartViewModel Hook
 * ViewModel layer in MVVM architecture
 * Manages cart state and business logic
 */
export function useCartViewModel() {
  const [cartItems, setCartItems] = useState([]);
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();

  // Load cart from user-specific storage when user becomes available
  useEffect(() => {
    if (!userLoading && user && user.uid) {
      console.log(`🛒 Loading cart for user ${user.uid}`);
      const cartFromStorage = CartService.loadCartFromStorage(user.uid);
      console.log(`🛒 Cart loaded from storage:`, {
        itemCount: cartFromStorage.length,
        items: cartFromStorage.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity }))
      });
      setCartItems(cartFromStorage);
    } else if (!userLoading && !user) {
      // User logged out or not loaded
      console.log('🛒 No user logged in, clearing cart state (localStorage persists for next login)');
      setCartItems([]);
    }
  }, [user?.uid, userLoading]); // Only re-run when user.uid or loading status changes

  // Persist cart to localStorage whenever it changes (only if user is logged in)
  useEffect(() => {
    if (user && user.uid && cartItems.length >= 0) {
      CartService.saveCartToStorage(user.uid, cartItems);
    }
  }, [user?.uid, cartItems]); // Only re-run when user.uid or cartItems changes

  // Sync cart to API whenever it changes (if user is logged in)
  useEffect(() => {
    if (user && user.uid) {
      CartService.syncCartToAPI(user.uid, cartItems);
    }
  }, [user?.uid, cartItems]); // Only re-run when user.uid or cartItems changes

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
    // Clear cart from user-specific storage if user is logged in
    if (user && user.uid) {
      CartService.clearCartStorage(user.uid);
      CartService.clearCartOnAPI(user.uid);
    }
  }, [user?.uid, user]);

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
