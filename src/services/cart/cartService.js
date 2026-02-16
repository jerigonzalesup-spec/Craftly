/**
 * Cart Service
 * Handles cart data persistence and business logic
 * This is part of the Model layer in MVVM architecture
 */

const CART_STORAGE_KEY = 'cart';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export class CartService {
  /**
   * Load cart from localStorage
   * @returns {Array} Cart items
   */
  static loadCartFromStorage() {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
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
   * Save cart to localStorage
   * @param {Array} cartItems - Cart items to save
   */
  static saveCartToStorage(cartItems) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Failed to save cart to localStorage', error);
    }
  }

  /**
   * Clear cart from localStorage
   */
  static clearCartStorage() {
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
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
   * Load cart from API
   * @param {String} userId - User ID
   * @returns {Promise<Array>} Cart items from API
   */
  static async loadCartFromAPI(userId) {
    if (!userId) {
      console.warn('Cannot load cart: No user ID provided');
      return [];
    }

    try {
      const response = await fetch(`${API_URL}/api/cart/${userId}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && Array.isArray(json.data.items)) {
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
