/**
 * Orders Service
 * Handles order data and API calls
 * This is part of the Model layer in MVVM architecture
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Cache for orders (1 second TTL for immediate updates)
const ordersCache = new Map(); // Map<userId, { data: Array, timestamp }>
const orderDetailsCache = new Map(); // Map<orderId, { data: Object, timestamp }>
const ORDERS_CACHE_TTL = 1 * 1000; // 1 second for user's orders (fast updates)
const ORDER_DETAILS_CACHE_TTL = 1 * 1000; // 1 second for order details (fast updates)

export class OrdersService {
  /**
   * Create a new order
   * @param {String} userId - User ID
   * @param {Object} orderData - Order data including items, address, payment info
   * @returns {Promise<Object>} Created order
   */
  static async createOrder(userId, orderData) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Order creation failed: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && json.data) {
        console.log('✅ Order created successfully:', json.data.orderId);
        // Invalidate orders cache for this user (new order added)
        ordersCache.delete(userId);
        return json.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * ⚠️  DEPRECATED: Use `useUserOrders` hook instead (client-side caching)
   * Get user's orders with caching (2-min cache)
   * @param {String} userId - User ID
   * @returns {Promise<Array>} Array of orders
   */
  static async getUserOrders(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const now = Date.now();
    const cached = ordersCache.get(userId);

    // Check if cache is still valid (2 minutes)
    if (cached && (now - cached.timestamp) < ORDERS_CACHE_TTL) {
      console.log('📦 Using cached orders (age: ' + (now - cached.timestamp) / 1000 + 's)');
      return cached.data;
    }

    // Cache miss or expired
    try {
      console.log('📦 Fetching orders from API...');
      const response = await fetch(`${API_URL}/api/orders/${userId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && Array.isArray(json.data.orders)) {
        // Update cache
        ordersCache.set(userId, { data: json.data.orders, timestamp: now });
        console.log('✅ Orders loaded:', json.data.orders.length);
        return json.data.orders;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Get specific order details with caching (2-min cache)
   * @param {String} orderId - Order ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Object>} Order details
   */
  static async getOrderDetails(orderId, userId) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    const now = Date.now();
    const cached = orderDetailsCache.get(orderId);

    // Check if cache is still valid (2 minutes)
    if (cached && (now - cached.timestamp) < ORDER_DETAILS_CACHE_TTL) {
      console.log('📋 Using cached order details (age: ' + (now - cached.timestamp) / 1000 + 's)');
      return cached.data;
    }

    // Cache miss or expired
    try {
      console.log('📋 Fetching order details from API...');
      const response = await fetch(`${API_URL}/api/orders/${orderId}/details`, {
        headers: {
          'x-user-id': userId || '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch order: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && json.data) {
        // Update cache
        orderDetailsCache.set(orderId, { data: json.data, timestamp: now });
        console.log('✅ Order details loaded');
        return json.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }
  }

  /**
   * Update order status
   * @param {String} orderId - Order ID
   * @param {String} status - New order status
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated order
   */
  static async updateOrderStatus(orderId, status, userId) {
    if (!orderId || !status) {
      throw new Error('Order ID and status are required');
    }

    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update order: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && json.data) {
        console.log('✅ Order status updated');
        // Invalidate caches (order changed)
        orderDetailsCache.delete(orderId);
        ordersCache.delete(userId);
        return json.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
}

/**
 * Create an OrdersService instance
 * @returns {OrdersService} Service class (static)
 */
export function createOrdersService() {
  return OrdersService;
}
