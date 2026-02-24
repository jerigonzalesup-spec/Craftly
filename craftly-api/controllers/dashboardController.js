import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

const db = getFirestore();

// ===== SERVER-SIDE CACHE FOR DASHBOARD STATS =====
// Dramatically reduces Firestore quota for repeated dashboard views
const dashboardCache = new Map(); // Map<userId, { data: stats, timestamp }>
const DASHBOARD_CACHE_TTL = 5 * 1000; // 5 seconds - balanced for performance and data freshness

/**
 * Check if dashboard cache is still valid
 */
function isDashboardCacheValid(cacheEntry, ttl) {
  if (!cacheEntry || !cacheEntry.timestamp || !cacheEntry.data) {
    return false;
  }
  const age = Date.now() - cacheEntry.timestamp;
  return age < ttl;
}

/**
 * EXPORTED: Invalidate dashboard cache for a user
 * Called when products are added/updated or orders are placed
 */
export function invalidateDashboardCache(userId) {
  if (!userId) return;
  
  // Delete all cache entries for this seller (all time periods)
  let deletedCount = 0;
  for (const key of dashboardCache.keys()) {
    if (key.startsWith(`${userId}_`)) {
      dashboardCache.delete(key);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    console.log(`🧹 Dashboard cache cleared for user ${userId} (${deletedCount} entries)`);
  }
}

/**
 * GET /api/dashboard/seller-stats
 * Get seller dashboard statistics with support for time period filtering
 * Query params: timePeriod (7, 30, 90 days - default: 7)
 *
 * ⚡ OPTIMIZED: Heavy caching (10 min) + limited order fetching
 * 📊 Quota impact: ~80% reduction vs. fetching all orders
 */
export const getSellerStats = asyncHandler(async (req, res) => {
  // DEBUG: Log all headers to see what we're receiving
  console.log('📋 REQUEST HEADERS:', Object.keys(req.headers));
  console.log('📋 X-USER-ID Header Value:', req.headers['x-user-id']);
  
  const userId = req.headers['x-user-id'];
  const timePeriod = parseInt(req.query.timePeriod) || 7;

  console.log(`🔍 Dashboard request - userId: ${userId}, timePeriod: ${timePeriod}`);

  if (!userId) {
    console.error('❌ NO USER ID RECEIVED IN HEADER');
    throw new ApiError('User ID is required', 401);
  }

  if (![7, 30, 90].includes(timePeriod)) {
    throw new ApiError('Invalid timePeriod. Must be 7, 30, or 90', 400);
  }

  const cacheKey = `${userId}_${timePeriod}`;

  // CHECK CACHE FIRST - MASSIVE QUOTA SAVINGS
  const cachedEntry = dashboardCache.get(cacheKey);
  if (isDashboardCacheValid(cachedEntry, DASHBOARD_CACHE_TTL)) {
    const age = Math.round((Date.now() - cachedEntry.timestamp) / 1000);
    console.log(`📊 CACHE HIT: Dashboard stats (age: ${age}s, saves quota)`);
    return res.status(200).json({
      success: true,
      data: cachedEntry.data,
      fromCache: true,
      cacheAge: age,
    });
  }

  console.log(`📊 Fetching dashboard stats for seller: ${userId} (${timePeriod}-day period)`);

  try {
    // Calculate date ranges
    const now = new Date();
    const currentPeriodStart = new Date(now.getTime() - timePeriod * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - timePeriod * 24 * 60 * 60 * 1000);

    // 1. Fetch all active products by the current seller
    const productsSnapshot = await db
      .collection('products')
      .where('createdBy', '==', userId)
      .get();

    const sellerProducts = productsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => p.status === 'active');

    console.log(`🔎 Products found for seller ${userId}: ${productsSnapshot.docs.length} docs, ${sellerProducts.length} active products`);
    if (sellerProducts.length > 0) {
      console.log(`📦 First product:`, sellerProducts[0]);
    }

    // 2. Inventory Health Score calculation
    const wellStocked = sellerProducts.filter(p => p.stock > 5).length;
    const lowStock = sellerProducts.filter(p => p.stock > 0 && p.stock <= 5).length;
    const outOfStock = sellerProducts.filter(p => p.stock === 0).length;
    const healthScore = sellerProducts.length > 0
      ? Math.round((wellStocked / sellerProducts.length) * 100)
      : 0;

    console.log(`🏥 Inventory health calculated: Score=${healthScore}%, wellStocked=${wellStocked}, lowStock=${lowStock}, outOfStock=${outOfStock}`);

    // 3. Low Stock Products (5 or fewer items) - for alerts
    const lowStockProducts = sellerProducts
      .filter(p => p.stock > 0 && p.stock <= 5)
      .sort((a, b) => a.stock - b.stock);

    console.log(`📋 Orders query params: limit to 300 orders`);

    // 4. OPTIMIZED: Fetch last 300 orders (no index needed) then filter in memory
    // Much faster than using Firestore composite queries
    console.log(`🔍 Starting orders fetch: getting last 300 orders`);

    // Use Promise.race to ensure query doesn't hang beyond 8 seconds
    const ordersSnapshot = await Promise.race([
      db
        .collection('orders')
        .orderBy('createdAt', 'desc')
        .limit(300)
        .get(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Orders query timeout - exceeded 8 seconds')), 8000)
      )
    ]);

    console.log(`✅ Orders fetched: ${ordersSnapshot.docs.length} total orders`);

    let currentPeriodRevenue = 0;
    let previousPeriodRevenue = 0;
    const sellerOrders = [];
    const recentSales = [];
    const orderStatusCounts = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    // Process orders - only iterate through relevant documents
    ordersSnapshot.docs.forEach(orderDoc => {
      const order = { id: orderDoc.id, ...orderDoc.data() };
      let sellerItemsValue = 0;
      let sellerItemCount = 0;

      // Filter items to only include items SOLD BY this seller (check item.sellerId, not productId)
      order.items.forEach(item => {
        if (item.sellerId === userId) {
          const itemValue = item.price * item.quantity;
          sellerItemsValue += itemValue;
          sellerItemCount += item.quantity;
        }
      });

      if (sellerItemsValue > 0) {
        const orderDate = new Date(order.createdAt || 0);

        // Count revenue and status for current period
        if (orderDate >= currentPeriodStart) {
          // Count ALL order statuses for revenue (payment is validated at checkout)
          // Whether 'paid', 'unpaid', or 'pending', it's a confirmed order
          currentPeriodRevenue += sellerItemsValue;

          // Count order status in current period
          const status = order.orderStatus || 'pending';
          if (orderStatusCounts.hasOwnProperty(status)) {
            orderStatusCounts[status]++;
          }

          sellerOrders.push({
            ...order,
            sellerItemsValue,
            sellerItemCount,
          });
        }
        // Count revenue for previous period (for goal comparison)
        else if (orderDate >= previousPeriodStart && orderDate < currentPeriodStart) {
          // Count all order revenue regardless of payment status
          previousPeriodRevenue += sellerItemsValue;
        }
      }
    });

    console.log(`📊 Orders processing complete: sellerOrders=${sellerOrders.length}, currentPeriodRevenue=${currentPeriodRevenue}, orderStatusCounts=`, orderStatusCounts);

    // Sort orders by date descending and get top 5 recent for current period
    sellerOrders.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
    recentSales.push(...sellerOrders.slice(0, 5));

    // Determine goal type based on timePeriod
    const goalType = timePeriod === 7 ? 'weekly' : timePeriod === 30 ? 'monthly' : '3months';

    const dashboardData = {
      stats: {
        products: sellerProducts.length,
        orders: sellerOrders.length,
        revenue: currentPeriodRevenue,
        platformCommission: currentPeriodRevenue * 0.05,
      },
      recentSales,
      lowStockProducts: lowStockProducts.slice(0, 5), // Top 5 low stock
      orderStatusCounts,
      inventoryHealth: {
        healthScore,
        wellStocked,
        lowStock,
        outOfStock,
      },
      salesGoal: {
        target: previousPeriodRevenue, // Previous period as goal
        current: currentPeriodRevenue,
        goalType,
        daysInPeriod: timePeriod,
      },
    };

    // CACHE the results for 2 seconds
    dashboardCache.set(cacheKey, { data: dashboardData, timestamp: Date.now() });

    console.log(`✅ Dashboard stats retrieved for seller ${userId}`);
    console.log(`💰 Current period revenue: ₱${currentPeriodRevenue}, Previous: ₱${previousPeriodRevenue}`);
    console.log(`📊 Stats being sent:`, dashboardData.stats);    
    console.log(`📈 Sales Goal:`, dashboardData.salesGoal);
    console.log(`🏆 Recent Sales: ${dashboardData.recentSales.length} items`);
    console.log(`⚠️ Low Stock Products: ${dashboardData.lowStockProducts.length} items`);
    console.log(`📋 Order Status Counts:`, dashboardData.orderStatusCounts);
    console.log(`📦 Orders processed: ${sellerOrders.length} orders with seller items`);
    console.log(`📚 Documents fetched: ${productsSnapshot.size + ordersSnapshot.size} (cached for 2s)`);

    res.status(200).json({
      success: true,
      data: dashboardData,
      documentsRead:{
        products: productsSnapshot.size,
        orders: ordersSnapshot.size,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);

    // FALLBACK: If quota exceeded, return cached data if available
    if (cachedEntry) {
      const age = Math.round((Date.now() - cachedEntry.timestamp) / 1000);
      console.log(`⚠️ QUOTA EXCEEDED - Returning stale cache (age: ${age}s)`);
      return res.status(200).json({
        success: true,
        data: cachedEntry.data,
        fromCache: true,
        cacheAge: age,
        warning: 'Data may be stale due to quota limits',
      });
    }

    throw new ApiError(`Failed to fetch dashboard stats: ${error.message}`, 500);
  }
});
