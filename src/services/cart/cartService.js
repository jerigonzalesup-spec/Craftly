/**
 * Cart Service
 * Handles cart data persistence and business logic
 * This is part of the Model layer in MVVM architecture
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper function to get user-specific cart storage key
function getCartStorageKey(userId) {
  if (!userId) {
    console.warn('⚠️ CartService: No userId provided, returning empty key. This may cause data corruption.');
    return 'cart_anonymous'; // Fallback for anonymous users
  }
  return `cart_${userId}`;
}

// Cache for cart data (short TTL since cart changes frequently)
const cartCache = new Map(); // Map<userId, { data: Array, timestamp }>
const CART_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache for cart (increased from 1 min to reduce quota)

export class CartService {
  /**
   * Load cart from localStorage with user-specific key
   * @param {String} userId - User ID (REQUIRED - prevents data leakage)
   * @returns {Array} Cart items
   */
  static loadCartFromStorage(userId) {
    if (!userId) {
      console.warn('⚠️ CartService.loadCartFromStorage: No userId provided, returning empty cart');
      return [];
    }

    try {
      const storageKey = getCartStorageKey(userId);
      const storedCart = localStorage.getItem(storageKey);

      // One-time cleanup: remove the old anonymous key if it still exists.
      // Do NOT migrate it — it could belong to any previous user.
      if (localStorage.getItem('cart_')) {
        localStorage.removeItem('cart_');
      }

      if (storedCart) {
        return JSON.parse(storedCart);
      }

      return [];
    } catch (error) {
      console.error('Failed to parse cart from localStorage', error);
      return [];
    }
  }

  /**
   * Save cart to localStorage with user-specific key
   * @param {String} userId - User ID (REQUIRED - prevents data leakage)
   * @param {Array} cartItems - Cart items to save
   */
  static saveCartToStorage(userId, cartItems) {
    if (!userId) {
      console.warn('⚠️ CartService.saveCartToStorage: No userId provided, cart NOT saved');
      return;
    }

    try {
      const storageKey = getCartStorageKey(userId);
      localStorage.setItem(storageKey, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Failed to save cart to localStorage', error);
    }
  }

  /**
   * Clear cart from localStorage with user-specific key
   * @param {String} userId - User ID (REQUIRED - prevents data leakage)
   */
  static clearCartStorage(userId) {
    if (!userId) {
      console.warn('⚠️ CartService.clearCartStorage: No userId provided, cart NOT cleared');
      return;
    }

    try {
      const storageKey = getCartStorageKey(userId);
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear cart from localStorage', error);
    }
  }

  /**
   * Sync cart to API backend
   * @param {String} userId - User ID
   * @param {Array} cartItems - Cart items to sync
   * @returns {Promise<Object>} { success: boolean, message: string }
   */
  static async syncCartToAPI(userId, cartItems) {
    if (!userId) {
      console.warn('Cannot sync cart: No user ID provided');
      return { success: false, message: 'No user ID' };
    }

    try {
      const response = await fetch(`${API_URL}/api/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ items: cartItems }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      if (json.success) {
        console.log('✅ Cart synced to API');
        // Invalidate cache after sync
        cartCache.delete(userId);
        return { success: true, message: 'Cart synced' };
      } else {
        throw new Error('API returned error');
      }
    } catch (error) {
      console.error('Error syncing cart to API:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Load cart from API with caching (short 1-min cache)
   * @param {String} userId - User ID
   * @returns {Promise<Array>} Cart items from API
   */
  static async loadCartFromAPI(userId) {
    if (!userId) {
      console.warn('Cannot load cart: No user ID provided');
      return [];
    }

    const now = Date.now();
    const cached = cartCache.get(userId);

    // Check if cache is still valid (1 minute)
    if (cached && (now - cached.timestamp) < CART_CACHE_TTL) {
      console.log('🛒 Using cached cart (age: ' + (now - cached.timestamp) / 1000 + 's)');
      return cached.data;
    }

    // Cache miss or expired
    try {
      console.log('🛒 Fetching cart from API...');
      const response = await fetch(`${API_URL}/api/cart/${userId}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && Array.isArray(json.data.items)) {
        // Update cache
        cartCache.set(userId, { data: json.data.items, timestamp: now });
        console.log('✅ Cart loaded from API');
        return json.data.items;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error loading cart from API:', error);
      return [];
    }
  }

  /**
   * Clear cart on API
   * @param {String} userId - User ID
   * @returns {Promise<Object>} { success: boolean }
   */
  static async clearCartOnAPI(userId) {
    if (!userId) {
      console.warn('Cannot clear cart on API: No user ID provided');
      return { success: false };
    }

    try {
      const response = await fetch(`${API_URL}/api/cart`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      if (json.success) {
        console.log('✅ Cart cleared on API');
        // Invalidate cache
        cartCache.delete(userId);
        return { success: true };
      }
    } catch (error) {
      console.error('Error clearing cart on API:', error);
      return { success: false };
    }
  }

  /**
   * Validate if item can be added (single seller rule)
   * @param {Array} cartItems - Current cart items
   * @param {Object} item - Item to add
   * @returns {Object} { isValid: boolean, message: string }
   */
  static validateAddToCart(cartItems, item) {
    // Enforce single seller per cart
    if (cartItems.length > 0 && cartItems[0].createdBy !== item.createdBy) {
      return {
        isValid: false,
        message:
          'You can only purchase items from one seller at a time. Please clear your cart or complete your current purchase before adding items from a different seller.',
      };
    }
    return { isValid: true };
  }

  /**
   * Add item to cart with validation
   * @param {Array} cartItems - Current cart items
   * @param {Object} item - Item to add
   * @returns {Object} { items: Array, error: string | null, success: boolean }
   */
  static addToCart(cartItems, item) {
    // Validate single seller rule
    const validation = this.validateAddToCart(cartItems, item);
    if (!validation.isValid) {
      return { items: cartItems, error: validation.message, success: false };
    }

    const quantityToAdd = item.quantity || 1;
    const existingItem = cartItems.find(i => i.id === item.id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantityToAdd;
      if (newQuantity > existingItem.stock) {
        return {
          items: cartItems,
          error: `You cannot have more than ${existingItem.stock} of this item in your cart.`,
          success: false,
        };
      }
      return {
        items: cartItems.map(i =>
          i.id === item.id ? { ...i, quantity: newQuantity } : i
        ),
        error: null,
        success: true,
      };
    }

    return {
      items: [...cartItems, { ...item, quantity: quantityToAdd }],
      error: null,
      success: true,
    };
  }

  /**
   * Remove item from cart
   * @param {Array} cartItems - Current cart items
   * @param {String} itemId - Item ID to remove
   * @returns {Array} Updated cart items
   */
  static removeFromCart(cartItems, itemId) {
    return cartItems.filter(item => item.id !== itemId);
  }

  /**
   * Update item quantity
   * @param {Array} cartItems - Current cart items
   * @param {String} itemId - Item ID to update
   * @param {Number} quantity - New quantity
   * @returns {Object} { items: Array, error: string | null, success: boolean }
   */
  static updateQuantity(cartItems, itemId, quantity) {
    const itemToUpdate = cartItems.find(item => item.id === itemId);
    if (!itemToUpdate) {
      return { items: cartItems, error: 'Item not found', success: false };
    }

    if (quantity > itemToUpdate.stock) {
      return {
        items: cartItems.map(item =>
          item.id === itemId ? { ...item, quantity: itemToUpdate.stock } : item
        ),
        error: `Only ${itemToUpdate.stock} items are available.`,
        success: false,
      };
    }

    if (quantity <= 0) {
      return {
        items: this.removeFromCart(cartItems, itemId),
        error: null,
        success: true,
      };
    }

    return {
      items: cartItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      ),
      error: null,
      success: true,
    };
  }

  /**
   * Calculate cart total
   * @param {Array} cartItems - Cart items
   * @returns {Number} Total price
   */
  static calculateTotal(cartItems) {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }
}

/**
 * Create a CartService instance (static, no instantiation needed)
 * @returns {CartService} Service class (static)
 */
export function createCartService() {
  return CartService;
}
