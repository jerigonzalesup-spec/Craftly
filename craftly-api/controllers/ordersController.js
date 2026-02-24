import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { invalidateProductStatsMultiple } from './productController.js';
import { invalidateDashboardCache } from './dashboardController.js';

const db = getFirestore();

// Server-side orders cache to reduce Firestore quota
const ordersCache = new Map();
const ORDERS_CACHE_TTL = 1 * 1000; // 1 second - real-time fresh data for sellers and customers

// Cache entry structure: { data: orders, timestamp: Date }
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false;
  const now = new Date().getTime();
  return now - cacheEntry.timestamp < ORDERS_CACHE_TTL;
};

const invalidateOrdersCache = (userId, sellerId) => {
  if (userId) {
    ordersCache.delete(`buyer_${userId}`);
    console.log(`🗑️ Invalidated buyer orders cache for user: ${userId}`);
  }
  if (sellerId) {
    ordersCache.delete(`seller_${sellerId}`);
    console.log(`🗑️ Invalidated seller orders cache for seller: ${sellerId}`);
  }
};

// List of allowed email domains to prevent typos and fake emails
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'aol.com',
  'protonmail.com',
  'icloud.com',
  'mail.com',
  'zoho.com',
];

/**
 * Validate email domain against whitelist
 */
function isValidEmailDomain(email) {
  const domain = email.toLowerCase().split('@')[1];
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

/**
 * POST /api/orders
 * Create a new order from checkout
 */
export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  const {
    items,
    totalAmount,
    shippingMethod,
    shippingAddress,
    deliveryFee,
    paymentMethod,
    receiptImageUrl,
  } = req.body;

  // Validate user ID
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new ApiError('Valid user ID is required (x-user-id header)', 401);
  }

  // Validate items
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError('Order must contain at least one item', 400);
  }

  for (const item of items) {
    if (!item.productId || !item.productName || typeof item.quantity !== 'number' || typeof item.price !== 'number') {
      throw new ApiError('Each item must have productId, productName, quantity, and price', 400);
    }
    if (item.quantity <= 0) {
      throw new ApiError('Item quantity must be greater than 0', 400);
    }
    if (item.price < 0) {
      throw new ApiError('Item price cannot be negative', 400);
    }
  }

  // Validate total amount
  if (typeof totalAmount !== 'number' || totalAmount <= 0) {
    throw new ApiError('Total amount must be a positive number', 400);
  }

  // Validate shipping
  const validShippingMethods = ['local-delivery', 'store-pickup'];
  if (!shippingMethod || !validShippingMethods.includes(shippingMethod)) {
    throw new ApiError(`Shipping method must be one of: ${validShippingMethods.join(', ')}`, 400);
  }

  // Validate that sellers allow the selected shipping method
  if (items && items.length > 0) {
    for (const item of items) {
      if (item.sellerId) {
        try {
          const sellerRef = db.collection('users').doc(item.sellerId);
          const sellerDoc = await sellerRef.get();

          if (sellerDoc.exists) {
            const sellerData = sellerDoc.data();

            // Check if seller allows this shipping method
            if (shippingMethod === 'local-delivery' && !sellerData.allowShipping) {
              throw new ApiError(
                `The seller of "${item.productName}" does not allow local delivery. Please select store pickup or choose items from a seller who offers delivery.`,
                400
              );
            }

            if (shippingMethod === 'store-pickup' && !sellerData.allowPickup) {
              throw new ApiError(
                `The seller of "${item.productName}" does not allow store pickup. Please select local delivery or choose items from a seller who offers pickup.`,
                400
              );
            }
          }
        } catch (error) {
          if (error instanceof ApiError) {
            throw error;
          }
          console.error(`Error validating seller ${item.sellerId}:`, error);
          throw new ApiError(`Failed to validate seller delivery methods`, 400);
        }
      }
    }
  }

  // Validate shipping address
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    throw new ApiError('Shipping address is required', 400);
  }

  const { fullName, email, contactNumber, streetAddress, barangay } = shippingAddress;
  if (!fullName || !email || !contactNumber) {
    throw new ApiError('Shipping address must include fullName, email, and contactNumber', 400);
  }

  // Validate street address (required for local-delivery): must have house number + street name
  if (shippingMethod === 'local-delivery') {
    if (!streetAddress || typeof streetAddress !== 'string' || streetAddress.trim().length === 0) {
      throw new ApiError('Street address is required for local delivery', 400);
    }

    // Check if street address contains at least a number (house number) and a letter (street name)
    const hasNumber = /\d/.test(streetAddress);
    const hasLetter = /[a-zA-Z]/.test(streetAddress);
    if (!hasNumber || !hasLetter) {
      throw new ApiError('Street address must include both house/building number and street name (e.g., "123 Main Street")', 400);
    }

    // Validate barangay for local delivery
    if (!barangay || typeof barangay !== 'string' || barangay.trim().length === 0) {
      throw new ApiError('Barangay is required for local delivery', 400);
    }
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    throw new ApiError('Invalid email address in shipping address', 400);
  }

  // Validate email domain is in whitelist
  if (!isValidEmailDomain(email)) {
    throw new ApiError('Email domain not supported. Please use gmail.com, yahoo.com, outlook.com, or other common providers', 400);
  }

  // Validate phone number (basic check)
  if (!/^\d{10,}$/.test(contactNumber.replace(/\D/g, ''))) {
    throw new ApiError('Invalid phone number in shipping address', 400);
  }

  // Validate delivery fee
  if (typeof deliveryFee !== 'number' || deliveryFee < 0) {
    throw new ApiError('Delivery fee must be a non-negative number', 400);
  }

  // Validate payment method
  const validPaymentMethods = ['cod', 'gcash'];
  if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
    throw new ApiError(`Payment method must be one of: ${validPaymentMethods.join(', ')}`, 400);
  }

  console.log(`📦 Creating order for user: ${userId}`);

  try {
    // Create the order document
    const orderRef = db.collection('orders').doc();

    // Extract unique seller IDs for authorization/querying
    const sellerIds = [...new Set(items.map(item => item.sellerId).filter(id => id))];

    const orderData = {
      orderId: orderRef.id,
      buyerId: userId,
      sellerIds: sellerIds, // Add this for Firestore rules authorization
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        image: item.image || null,
        sellerId: item.sellerId || null,
      })),
      totalAmount,
      orderStatus: 'pending',
      shippingMethod,
      shippingAddress,
      deliveryFee,
      paymentMethod,
      paymentStatus: 'paid', // Mark all orders as paid immediately - payment validated in checkout
      receiptImageUrl: receiptImageUrl || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await orderRef.set(orderData);

    // Update product stock for each item (separate operation)
    for (const item of items) {
      try {
        const productRef = db.collection('products').doc(item.productId);
        const productDoc = await productRef.get();

        if (productDoc.exists) {
          const currentStock = productDoc.data().stock || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          await productRef.update({ stock: newStock });
        }
      } catch (error) {
        console.warn(`Warning: Could not update stock for product ${item.productId}:`, error.message);
        // Continue anyway - order was created successfully
      }
    }

    // Create notifications for sellers
    for (const sellerId of sellerIds) {
      if (sellerId === userId) continue; // Don't notify self

      try {
        const notificationRef = db.collection(`users/${sellerId}/notifications`).doc();
        const notificationData = {
          orderId: orderRef.id,
          message: `You have a new order from ${shippingAddress.fullName}`,
          type: 'new_order',
          isRead: false,
          createdAt: new Date().toISOString(),
        };

        await notificationRef.set(notificationData);
      } catch (error) {
        console.warn(`Warning: Could not create notification for seller ${sellerId}:`, error.message);
        // Continue anyway
      }
    }

    console.log(`✅ Order created: ${orderRef.id}`);

    // Invalidate caches for buyer and all sellers involved
    invalidateOrdersCache(userId, null); // Invalidate buyer cache
    sellerIds.forEach(sellerId => {
      invalidateOrdersCache(null, sellerId); // Invalidate each seller's cache
      // Invalidate dashboard cache since revenue/stats have changed
      invalidateDashboardCache(sellerId);
    });

    // Invalidate stats cache for all products in this order (sales count changed)
    const productIds = items.map(item => item.productId);
    invalidateProductStatsMultiple(productIds);

    res.status(201).json({
      success: true,
      data: {
        ...orderData,
        id: orderRef.id,
      },
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('❌ Error creating order:', error);

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(`Failed to create order: ${error.message}`, 500);
  }
});

/**
 * GET /api/orders/:userId
 * Get all orders for a user
 */
export const getUserOrders = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Default 50, max 100

  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }

  console.log(`📦 Fetching orders for user: ${userId} (limit: ${limit})`);

  try {
    // Check cache first (only for first page, no pagination cursor)
    const cacheKey = `buyer_${userId}`;
    const cachedData = ordersCache.get(cacheKey);
    if (isCacheValid(cachedData)) {
      const age = Math.round((new Date().getTime() - cachedData.timestamp) / 1000);
      console.log(`✅ Cache HIT for buyer ${userId} orders (age: ${age}s)`);
      return res.status(200).json({
        success: true,
        data: {
          userId,
          orders: cachedData.data.slice(0, limit),
          count: cachedData.data.length,
          fromCache: true,
          hasMore: cachedData.data.length > limit,
        },
      });
    }

    // Fetch all orders matching buyerId (simple query, no index needed)
    const ordersSnapshot = await db.collection('orders')
      .where('buyerId', '==', userId)
      .get();

    // Convert to array and sort by createdAt descending
    let orders = ordersSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Cache full results
    ordersCache.set(cacheKey, {
      data: orders,
      timestamp: new Date().getTime(),
    });

    // Return paginated response
    const paginatedOrders = orders.slice(0, limit);
    const hasMore = orders.length > limit;

    console.log(`📦 Loaded ${paginatedOrders.length}/${orders.length} orders for user ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        userId,
        orders: paginatedOrders,
        count: paginatedOrders.length,
        total: orders.length,
        hasMore,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    throw new ApiError(`Failed to fetch orders: ${error.message}`, 500);
  }
});

/**
 * GET /api/orders/:orderId/details
 * Get specific order details
 */
export const getOrderDetails = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.headers['x-user-id'];

  if (!orderId) {
    throw new ApiError('Order ID is required', 400);
  }

  console.log(`📦 Fetching order details: ${orderId}`);

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new ApiError('Order not found', 404);
    }

    const orderData = orderDoc.data();

    // Security: Only allow buyer and sellers to view this order
    if (userId && userId !== orderData.buyerId && !orderData.items.some(item => item.sellerId === userId)) {
      throw new ApiError('Unauthorized to view this order', 403);
    }

    res.status(200).json({
      success: true,
      data: {
        ...orderData,
        id: orderId,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching order details:', error);

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(`Failed to fetch order details: ${error.message}`, 500);
  }
});

/**
 * GET /api/orders/seller/:sellerId
 * Get all orders for a seller (where seller has items)
 */
export const getSellerOrders = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;

  if (!sellerId) {
    throw new ApiError('Seller ID is required', 400);
  }

  console.log(`📦 Fetching orders for seller: ${sellerId}`);

  try {
    // Check cache first
    const cacheKey = `seller_${sellerId}`;
    const cachedData = ordersCache.get(cacheKey);
    if (isCacheValid(cachedData)) {
      console.log(`✅ Cache HIT for seller ${sellerId} orders (age: ${Math.round((new Date().getTime() - cachedData.timestamp) / 1000)}s)`);
      return res.status(200).json({
        success: true,
        data: {
          sellerId,
          orders: cachedData.data,
          count: cachedData.data.length,
          fromCache: true,
        },
      });
    }

    // Get seller orders - OPTIMIZED: Limit to last 200 orders for performance
    // Then filter for this seller (Firestore composite query would require index setup)
    const ordersSnapshot = await db.collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    const sellerOrders = [];

    // Efficient single-pass processing: filter + transform in one operation
    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data();
      
      // Skip if no items
      if (!order.items || order.items.length === 0) {
        return;
      }

      // Find seller items (early return if none found)
      const sellerItems = order.items.filter(item => item.sellerId === sellerId);
      if (sellerItems.length === 0) {
        return;
      }

      // Calculate total efficiently 
      const sellerTotal = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // DEBUG: Log calculation
      if (sellerTotal === 0) {
        console.warn(`⚠️ ZERO REVENUE - Order ${doc.id} (sellerId: ${sellerId})`);
        console.warn(`   sellerItems: ${JSON.stringify(sellerItems)}`);
      }

      // Add to results with ID
      sellerOrders.push({
        id: doc.id,
        ...order,
        sellerItems,
        sellerTotal,
      });
    });

    // Already sorted by Firestore query (descending), but ensure consistency
    sellerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Cache the results
    ordersCache.set(cacheKey, {
      data: sellerOrders,
      timestamp: new Date().getTime(),
    });

    console.log(`📦 Cache MISS - Fresh fetch: ${sellerOrders.length} orders for seller ${sellerId}`);

    res.status(200).json({
      success: true,
      data: {
        sellerId,
        orders: sellerOrders,
        count: sellerOrders.length,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching seller orders:', error);
    throw new ApiError(`Failed to fetch seller orders: ${error.message}`, 500);
  }
});

/**
 * GET /api/orders/seller/:sellerId/delivery-methods
 * Get seller's delivery methods (allowShipping and allowPickup)
 */
export const getSellerDeliveryMethods = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;

  if (!sellerId) {
    throw new ApiError('Seller ID is required', 400);
  }

  console.log(`🚚 Fetching delivery methods for seller: ${sellerId}`);

  try {
    const sellerRef = db.collection('users').doc(sellerId);
    const sellerDoc = await sellerRef.get();

    if (!sellerDoc.exists) {
      console.warn(`⚠️ Seller ${sellerId} not found, returning defaults`);
      return res.status(200).json({
        success: true,
        data: {
          sellerId,
          allowShipping: true,
          allowPickup: false,
        },
      });
    }

    const sellerData = sellerDoc.data();
    const deliveryMethods = {
      sellerId,
      allowShipping: sellerData.allowShipping !== false,
      allowPickup: sellerData.allowPickup === true,
    };

    console.log(`✅ Delivery methods fetched for seller ${sellerId}:`, deliveryMethods);

    res.status(200).json({
      success: true,
      data: deliveryMethods,
    });
  } catch (error) {
    console.error(`❌ Error fetching delivery methods for seller ${sellerId}:`, error);

    // On error, return safe defaults instead of failing
    return res.status(200).json({
      success: true,
      data: {
        sellerId,
        allowShipping: true,
        allowPickup: false,
      },
    });
  }
});

/**
 * POST /api/orders/:orderId/status
 * Update order status (seller/admin only)
 */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const userId = req.headers['x-user-id'];

  if (!orderId || !status) {
    throw new ApiError('Order ID and status are required', 400);
  }

  if (!userId) {
    throw new ApiError('User ID is required', 401);
  }

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  console.log(`📦 Updating order status: ${orderId} -> ${status}`);

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new ApiError('Order not found', 404);
    }

    const orderData = orderDoc.data();

    // Check if user is admin
    const userDoc = await db.collection('users').doc(userId).get();
    const isAdmin = userDoc.exists && userDoc.data().role === 'admin';

    // Check if user is a seller with items in this order
    let isSellerInOrder = false;
    if (orderData.items && Array.isArray(orderData.items)) {
      isSellerInOrder = orderData.items.some(item => item.sellerId === userId);
    }

    // Authorization: Only sellers of items in this order or admins can update status
    if (!isSellerInOrder && !isAdmin) {
      throw new ApiError('Unauthorized - You are not a seller in this order', 403);
    }

    await orderRef.update({
      orderStatus: status,
      updatedAt: new Date().toISOString(),
    });

    // Invalidate caches for buyer and all sellers in this order
    invalidateOrdersCache(orderData.buyerId, null); // Invalidate buyer cache
    if (orderData.items && Array.isArray(orderData.items)) {
      const sellerIds = [...new Set(orderData.items.map(item => item.sellerId).filter(id => id))];
      sellerIds.forEach(sellerId => {
        invalidateOrdersCache(null, sellerId); // Invalidate each seller's cache
      });

      // Invalidate stats cache for all products in this order (order status affects sales count)
      const productIds = orderData.items.map(item => item.productId);
      invalidateProductStatsMultiple(productIds);
    }

    res.status(200).json({
      success: true,
      data: {
        orderId,
        status,
        message: 'Order status updated successfully',
      },
    });
  } catch (error) {
    console.error('❌ Error updating order status:', error);

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(`Failed to update order status: ${error.message}`, 500);
  }
});

/**
 * POST /api/orders/:orderId/payment-status
 * Update order payment status (seller/admin only)
 */
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { paymentStatus } = req.body;
  const userId = req.headers['x-user-id'];

  if (!orderId || !paymentStatus) {
    throw new ApiError('Order ID and payment status are required', 400);
  }

  if (!userId) {
    throw new ApiError('User ID is required', 401);
  }

  const validPaymentStatuses = ['unpaid', 'pending', 'paid'];
  if (!validPaymentStatuses.includes(paymentStatus)) {
    throw new ApiError(`Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}`, 400);
  }

  console.log(`💳 Updating order payment status: ${orderId} -> ${paymentStatus}`);

  try {
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new ApiError('Order not found', 404);
    }

    const orderData = orderDoc.data();

    // Check if user is admin (via API call to get fresh user data with proper permissions)
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const isAdmin = userDoc.exists && (userDoc.data().roles?.includes('admin') || userDoc.data().role === 'admin');

    // Check if user is a seller with items in this order
    let isSellerInOrder = false;
    if (orderData.items && Array.isArray(orderData.items)) {
      isSellerInOrder = orderData.items.some(item => item.sellerId === userId);
    }

    // Authorization: Only sellers of items in this order or admins can update payment status
    if (!isSellerInOrder && !isAdmin) {
      throw new ApiError('Unauthorized - You are not a seller in this order', 403);
    }

    // If payment is being marked as paid, auto-update order status to processing if pending
    const updates = {
      paymentStatus: paymentStatus,
      updatedAt: new Date().toISOString(),
    };

    if (paymentStatus === 'paid' && orderData.orderStatus === 'pending') {
      updates.orderStatus = 'processing';
    }

    await orderRef.update(updates);

    // Invalidate caches for buyer and all sellers in this order
    invalidateOrdersCache(orderData.buyerId, null); // Invalidate buyer cache
    if (orderData.items && Array.isArray(orderData.items)) {
      const sellerIds = [...new Set(orderData.items.map(item => item.sellerId).filter(id => id))];
      sellerIds.forEach(sellerId => {
        invalidateOrdersCache(null, sellerId); // Invalidate each seller's cache
      });

      // Invalidate stats cache for all products in this order (payment status may affect sales count)
      const productIds = orderData.items.map(item => item.productId);
      invalidateProductStatsMultiple(productIds);
    }

    res.status(200).json({
      success: true,
      data: {
        orderId,
        paymentStatus,
        orderStatus: updates.orderStatus || orderData.orderStatus,
        message: 'Payment status updated successfully',
      },
    });
  } catch (error) {
    console.error('❌ Error updating payment status:', error);

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(`Failed to update payment status: ${error.message}`, 500);
  }
});
