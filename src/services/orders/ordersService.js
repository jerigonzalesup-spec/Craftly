/**
 * Orders Service
 * Handles order data and API calls
 * This is part of the Model layer in MVVM architecture
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
   * Get user's orders
   * @param {String} userId - User ID
   * @returns {Promise<Array>} Array of orders
   */
  static async getUserOrders(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const response = await fetch(`${API_URL}/api/orders/${userId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && Array.isArray(json.data.orders)) {
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
   * Get specific order details
   * @param {String} orderId - Order ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Object>} Order details
   */
  static async getOrderDetails(orderId, userId) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    try {
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
