import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

const db = getFirestore();

/**
 * GET /api/dashboard/seller-stats
 * Get seller dashboard statistics (revenue, products, orders, low stock items)
 */
export const getSellerStats = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    throw new ApiError('User ID is required', 401);
  }

  console.log(`📊 Fetching dashboard stats for seller: ${userId}`);

  try {
    // 1. Fetch all active products by the current seller
    const productsSnapshot = await db
      .collection('products')
      .where('createdBy', '==', userId)
      .get();

    const sellerProducts = productsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => p.status === 'active');

    const sellerProductIds = new Set(sellerProducts.map(p => p.id));

    // 2. Low Stock Products (5 or fewer items)
    const lowStock = sellerProducts
      .filter(p => p.stock > 0 && p.stock <= 5)
      .sort((a, b) => a.stock - b.stock);

    // 3. Fetch all orders and filter for seller's products
    const ordersSnapshot = await db.collection('orders').get();

    let totalRevenue = 0;
    const sellerOrders = [];
    const recentSales = [];

    ordersSnapshot.docs.forEach(orderDoc => {
      const order = { id: orderDoc.id, ...orderDoc.data() };
      let sellerItemsValue = 0;
      let sellerItemCount = 0;

      order.items.forEach(item => {
        if (sellerProductIds.has(item.productId)) {
          const itemValue = item.price * item.quantity;
          // Only count PAID orders toward revenue
          if (order.paymentStatus === 'paid') {
            totalRevenue += itemValue;
          }
          sellerItemsValue += itemValue;
          sellerItemCount += item.quantity;
        }
      });

      if (sellerItemsValue > 0) {
        sellerOrders.push({
          ...order,
          sellerItemsValue,
          sellerItemCount,
        });
      }
    });

    // Sort orders by date descending and get top 5 recent
    sellerOrders.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
    recentSales.push(...sellerOrders.slice(0, 5));

    console.log(`✅ Dashboard stats retrieved for seller ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          products: sellerProducts.length,
          orders: sellerOrders.length,
          revenue: totalRevenue,
        },
        recentSales,
        lowStockProducts: lowStock,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    throw new ApiError(`Failed to fetch dashboard stats: ${error.message}`, 500);
  }
});
