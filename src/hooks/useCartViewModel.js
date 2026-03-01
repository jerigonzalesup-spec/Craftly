import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

  // Tracks which user's cart has been loaded into React state.
  // Used to distinguish between the initial storage-load update (skip save)
  // and genuine user actions (add/remove/update — do save).
  // This prevents the race condition where switching accounts would write
  // the old user's cart into the new user's storage slot.
  const cartInitializedForRef = useRef(null);

  // Load cart from user-specific storage when the logged-in user changes.
  useEffect(() => {
    // Reset the initialization flag so the persist effect knows the next
    // cartItems change is the storage load, not a user action.
    cartInitializedForRef.current = null;

    if (!userLoading && user?.uid) {
      const cartFromStorage = CartService.loadCartFromStorage(user.uid);
      setCartItems(cartFromStorage);
    } else if (!userLoading && !user) {
      setCartItems([]);
    }
  }, [user?.uid, userLoading]);

  // Persist & sync cart whenever cartItems changes.
  //
  // IMPORTANT: this effect intentionally does NOT depend on user?.uid.
  // If it did, it would also fire when the user switches — at that moment
  // cartItems still holds the OLD user's data, so we'd corrupt the new
  // user's storage slot before the load effect above has a chance to
  // overwrite cartItems with the correct data.
  //
  // Instead, we let the load effect signal readiness via cartInitializedForRef.
  // The FIRST time cartItems changes after a user switch it's always the
  // initial storage load — we skip saving that run. Every subsequent change
  // (add/remove/update) is a genuine user action and we persist it.
  useEffect(() => {
    if (!user?.uid) return;

    if (cartInitializedForRef.current !== user.uid) {
      // First cartItems update for this user — it came from loading storage.
      // Mark this user as initialized and do NOT save (avoid a redundant write
      // and, critically, avoid writing stale data from a previous user).
      cartInitializedForRef.current = user.uid;
      return;
    }

    // Genuine user action — persist to localStorage and sync to API.
    CartService.saveCartToStorage(user.uid, cartItems);
    CartService.syncCartToAPI(user.uid, cartItems);
  }, [cartItems]); // deliberately ONLY cartItems — see comment above

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
