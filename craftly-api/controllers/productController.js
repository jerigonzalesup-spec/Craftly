import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { invalidateDashboardCache } from './dashboardController.js';

const db = getFirestore();

// ===========================
// SERVER-SIDE PRODUCT CACHE
// ===========================
// In-memory cache to reduce Firestore quota usage drastically
// Key: cache key (e.g., "all_products_active" or "user_123_active")
// Value: { data: products[], timestamp: number, ttl: number }
const productCache = new Map();
const PRODUCT_CACHE_TTL = 3 * 60 * 1000; // 3 minutes for all products
const SELLER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for seller-specific products

/**
 * Get cache key for product queries
 */
function getCacheKey(createdBy, status) {
  if (createdBy) {
    return `seller_${createdBy}_${status}`;
  }
  return `all_products_${status}`;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cacheEntry, ttl) {
  if (!cacheEntry || !cacheEntry.timestamp || !cacheEntry.data) {
    return false;
  }
  const age = Date.now() - cacheEntry.timestamp;
  const isValid = age < ttl;
  if (!isValid) {
    console.log(`⏰ Cache entry expired (age: ${Math.round(age / 1000)}s, TTL: ${Math.round(ttl / 1000)}s)`);
  }
  return isValid;
}

// ===========================
// SERVER-SIDE STATS CACHE
// ===========================
// In-memory cache for product stats (ratings, review count, sales count)
// Key: cache key (e.g., "stats_productId123")
// Value: { data: stats{averageRating, reviewCount, salesCount}, timestamp: number }
const statsCache = new Map();
const STATS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes - stats don't change as frequently

/**
 * Get cache key for product stats
 */
function getStatsCacheKey(productId) {
  return `stats_${productId}`;
}

/**
 * Invalidate stats cache for a product
 * Called when: review submitted, order status changes, product updated
 */
export function invalidateProductStats(productId) {
  if (productId) {
    statsCache.delete(getStatsCacheKey(productId));
    console.log(`🗑️ Stats cache invalidated for product: ${productId}`);
  }
}

/**
 * Invalidate stats cache for multiple products
 */
export function invalidateProductStatsMultiple(productIds = []) {
  productIds.forEach(productId => {
    statsCache.delete(getStatsCacheKey(productId));
  });
  console.log(`🗑️ Stats cache invalidated for ${productIds.length} products`);
}

/**
 * GET /api/products
 * Fetch all active products, optionally filtered by createdBy
 * Query params: createdBy (seller ID), status (default: active)
 * 
 * ⚡ OPTIMIZED: Server-side caching reduces quota by ~99% for repeated requests
 * 🛡️ FALLBACK: If Firestore quota exceeded, uses cached data even if stale
 */
export const getAllProducts = asyncHandler(async (req, res) => {
  const { createdBy, status = 'active' } = req.query;
  const cacheKey = getCacheKey(createdBy, status);
  const ttl = createdBy ? SELLER_CACHE_TTL : PRODUCT_CACHE_TTL;

  console.log(`📦 Fetching products... ${createdBy ? `(createdBy: ${createdBy})` : '(all active)'}`);

  // Check cache first - MASSIVE quota savings
  const cachedEntry = productCache.get(cacheKey);
  if (isCacheValid(cachedEntry, ttl)) {
    const age = Math.round((Date.now() - cachedEntry.timestamp) / 1000);
    console.log(`✅ CACHE HIT for products (age: ${age}s, TTL: ${Math.round(ttl / 1000)}s)`);
    return res.status(200).json({
      success: true,
      data: cachedEntry.data,
      fromCache: true,
      cacheAge: age,
    });
  }

  try {
    let query = db.collection('products');

    // Filter by status
    query = query.where('status', '==', status);

    // Filter by createdBy if provided
    if (createdBy) {
      query = query.where('createdBy', '==', createdBy);
    }

    const snapshot = await query.get();

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Cache the fresh results
    productCache.set(cacheKey, {
      data: products,
      timestamp: Date.now(),
      ttl: ttl,
    });

    console.log(`📦 CACHE MISS - Fetched ${products.length} products from Firestore (caching for ${Math.round(ttl / 1000)}s)`);

    res.status(200).json({
      success: true,
      data: products,
      fromCache: false,
    });
  } catch (error) {
    console.error('❌ Error fetching products from Firestore:', error.message);

    // FALLBACK: If Firestore quota exceeded, return cached data even if stale
    if (error.message && error.message.includes('Quota exceeded')) {
      console.warn(`⚠️ Firestore quota exceeded, using stale cache for fallback`);
      if (cachedEntry && cachedEntry.data) {
        const staleness = Math.round((Date.now() - cachedEntry.timestamp) / 1000);
        console.warn(`⚠️ Returning stale cache (age: ${staleness}s)`);
        return res.status(200).json({
          success: true,
          data: cachedEntry.data,
          fromCache: true,
          isStale: true,
          cacheAge: staleness,
          warning: 'Database quota exceeded. Showing cached data.',
        });
      }
      // If no cache available, return empty  array instead of error
      console.warn(`⚠️ No cache available, returning empty products array`);
      return res.status(200).json({
        success: true,
        data: [],
        fromCache: false,
        warning: 'Database quota exceeded. No cached data available.',
      });
    }

    console.error('❌ Error fetching products:', error);
    throw new ApiError(`Failed to fetch products: ${error.message}`, 500);
  }
});

/**
 * GET /api/products/:id
 * Fetch single product by ID
 */
export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError('Product ID is required', 400);
  }

  console.log(`📦 Fetching product: ${id}`);

  try {
    const doc = await db.collection('products').doc(id).get();

    if (!doc.exists) {
      throw new ApiError('Product not found', 404);
    }

    const product = {
      id: doc.id,
      ...doc.data(),
    };

    console.log(`✅ Product found: ${product.name}`);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      throw error;
    }
    console.error(`❌ Error fetching product ${id}:`, error);
    throw new ApiError(`Failed to fetch product: ${error.message}`, 500);
  }
});

/**
 * POST /api/products (Protected)
 * Create new product
 * Note: Requires authentication token in future
 */
export const createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, price, stock, images } = req.body;

  // Validation
  if (!name || !description || !category || price === undefined || stock === undefined) {
    throw new ApiError('Missing required fields: name, description, category, price, stock', 400);
  }

  // For now, we'll use a placeholder userId
  // In production, this would come from verified JWT token
  const userId = req.headers['x-user-id'] || 'test-user';

  console.log(`📦 Creating product: ${name} by user ${userId}`);

  try {
    const newProduct = {
      name,
      description,
      category,
      price: parseFloat(price),
      stock: parseInt(stock),
      images: images || [],
      createdBy: userId,
      status: 'active',
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('products').add(newProduct);

    console.log(`✅ Product created with ID: ${docRef.id}`);

    // Invalidate dashboard cache since product inventory has changed
    invalidateDashboardCache(userId);

    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        ...newProduct,
      },
    });
  } catch (error) {
    console.error(`❌ Error creating product:`, error);
    throw new ApiError(`Failed to create product: ${error.message}`, 500);
  }
});

/**
 * PUT /api/products/:id (Protected)
 * Update product
 */
/**
 * Clear relevant product cache entries
 * Invalidates cache for affected products
 */
function invalidateProductCache(createdBy = null) {
  if (createdBy) {
    // Invalidate seller-specific caches
    productCache.delete(`seller_${createdBy}_active`);
    productCache.delete(`seller_${createdBy}_archived`);
  }
  // Always invalidate the "all products" cache since a product changed
  productCache.delete('all_products_active');
  productCache.delete('all_products_archived');
  console.log('🔄 Product cache invalidated');
}

/**
 * PUT /api/products/:id (Protected)
 * Update product
 * ⚡ Invalidates cache on update to prevent stale data
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'] || 'test-user';

  if (!id) {
    throw new ApiError('Product ID is required', 400);
  }

  console.log(`📦 Updating product: ${id}`);

  try {
    const doc = await db.collection('products').doc(id).get();

    if (!doc.exists) {
      throw new ApiError('Product not found', 404);
    }

    // Verify ownership (in production, verify via JWT)
    const createdBy = doc.data().createdBy;
    if (createdBy !== userId && userId !== 'admin') {
      throw new ApiError('You do not have permission to update this product', 403);
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('products').doc(id).update(updateData);

    // Invalidate product cache on update
    invalidateProductCache(createdBy);
    
    // Invalidate dashboard cache since product data has changed
    invalidateDashboardCache(createdBy);

    console.log(`✅ Product ${id} updated`);

    res.status(200).json({
      success: true,
      data: {
        id,
        ...updateData,
      },
    });
  } catch (error) {
    if (error.message.includes('permission') || error.message === 'Product not found') {
      throw error;
    }
    console.error(`❌ Error updating product ${id}:`, error);
    throw new ApiError(`Failed to update product: ${error.message}`, 500);
  }
});

/**
 * DELETE /api/products/:id (Protected)
 * Delete product
 * ⚡ Invalidates cache on delete
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'] || 'test-user';

  if (!id) {
    throw new ApiError('Product ID is required', 400);
  }

  console.log(`📦 Deleting product: ${id}`);

  try {
    const doc = await db.collection('products').doc(id).get();

    if (!doc.exists) {
      throw new ApiError('Product not found', 404);
    }

    // Verify ownership
    const createdBy = doc.data().createdBy;
    if (createdBy !== userId && userId !== 'admin') {
      throw new ApiError('You do not have permission to delete this product', 403);
    }

    await db.collection('products').doc(id).delete();

    // Invalidate product cache on delete
    invalidateProductCache(createdBy);
    
    // Invalidate dashboard cache since inventory has changed
    invalidateDashboardCache(createdBy);

    console.log(`✅ Product ${id} deleted`);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: { id },
    });
  } catch (error) {
    if (error.message.includes('permission') || error.message === 'Product not found') {
      throw error;
    }
    console.error(`❌ Error deleting product ${id}:`, error);
    throw new ApiError(`Failed to delete product: ${error.message}`, 500);
  }
});

/**
 * GET /api/products/:id/stats
 * Fetch product statistics: sales count and average rating
 * ⚡ OPTIMIZED: Server-side caching reduces quota by ~90% for repeated requests
 */
export const getProductStats = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError('Product ID is required', 400);
  }

  console.log(`📊 Fetching stats for product: ${id}`);

  try {
    // Check cache FIRST - huge quota savings for frequently viewed products
    const cacheKey = getStatsCacheKey(id);
    const cachedEntry = statsCache.get(cacheKey);
    if (isCacheValid(cachedEntry, STATS_CACHE_TTL)) {
      const age = Math.round((Date.now() - cachedEntry.timestamp) / 1000);
      console.log(`✅ CACHE HIT for product stats ${id} (age: ${age}s, TTL: ${Math.round(STATS_CACHE_TTL / 1000)}s)`);
      return res.status(200).json({
        success: true,
        data: cachedEntry.data,
        fromCache: true,
        cacheAge: age,
      });
    }

    // Check if product exists
    const productDoc = await db.collection('products').doc(id).get();
    if (!productDoc.exists) {
      throw new ApiError('Product not found', 404);
    }

    // Get all reviews for this product
    const reviewsSnapshot = await db
      .collection('products')
      .doc(id)
      .collection('reviews')
      .limit(1000) // Limit to prevent memory issues
      .get();

    const reviews = reviewsSnapshot.docs.map(doc => doc.data());
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0
      ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviewCount
      : 0;

    // Optimized: Query only completed/paid orders to count sales
    // This avoids loading ALL orders from the entire database
    const ordersSnapshot = await db
      .collection('orders')
      .where('orderStatus', 'in', ['completed', 'delivered', 'shipped'])
      .limit(5000) // Safety limit to prevent memory issues
      .get();

    let salesCount = 0;

    ordersSnapshot.docs.forEach(orderDoc => {
      const order = orderDoc.data();
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.productId === id) {
            salesCount += item.quantity || 0;
          }
        });
      }
    });

    // Prepare stats data
    const statsData = {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      reviewCount,
      salesCount,
    };

    // Cache the results before sending
    statsCache.set(cacheKey, {
      data: statsData,
      timestamp: Date.now(),
    });

    console.log(`📦 CACHE MISS - Fresh fetch for product ${id}: ${reviewCount} reviews (avg: ${averageRating.toFixed(1)}), ${salesCount} sold (caching for ${Math.round(STATS_CACHE_TTL / 1000)}s)`);

    res.status(200).json({
      success: true,
      data: statsData,
      fromCache: false,
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      throw error;
    }
    console.error(`❌ Error fetching product stats for ${id}:`, error);
    throw new ApiError(`Failed to fetch product stats: ${error.message}`, 500);
  }
});

/**
 * POST /api/products/batch/stats
 * Fetch product statistics for multiple products in one request
 * This is more efficient than making individual requests for each product
 * ⚡ OPTIMIZED: Checks cache first, only fetches uncached products from Firestore
 */
export const getProductStatsBatch = asyncHandler(async (req, res) => {
  const { productIds } = req.body;

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    throw new ApiError('Product IDs array is required', 400);
  }

  if (productIds.length > 50) {
    throw new ApiError('Maximum 50 products per batch request', 400);
  }

  console.log(`📊 Fetching batch stats for ${productIds.length} products`);

  try {
    const stats = {};
    const uncachedIds = [];

    // STEP 1: Check cache for each product
    const cacheHits = [];
    productIds.forEach(productId => {
      const cacheKey = getStatsCacheKey(productId);
      const cachedEntry = statsCache.get(cacheKey);
      if (isCacheValid(cachedEntry, STATS_CACHE_TTL)) {
        stats[productId] = cachedEntry.data;
        cacheHits.push(productId);
      } else {
        uncachedIds.push(productId);
      }
    });

    if (cacheHits.length > 0) {
      console.log(`✅ CACHE HIT for ${cacheHits.length}/${productIds.length} products`);
    }

    // If all products are cached, return immediately
    if (uncachedIds.length === 0) {
      console.log(`📦 All ${productIds.length} products found in cache`);
      return res.status(200).json({
        success: true,
        data: stats,
        cacheHits,
        fromCache: true,
      });
    }

    // STEP 2: Fetch orders once for all uncached products
    console.log(`📦 Fetching from Firestore for ${uncachedIds.length} uncached products`);

    const ordersSnapshot = await db
      .collection('orders')
      .where('orderStatus', 'in', ['completed', 'delivered', 'shipped'])
      .limit(5000) // Safety limit
      .get();

    const orders = ordersSnapshot.docs.map(doc => doc.data());

    // STEP 3: Process each uncached product
    for (const productId of uncachedIds) {
      try {
        // Check if product exists
        const productDoc = await db.collection('products').doc(productId).get();
        if (!productDoc.exists) {
          stats[productId] = {
            error: 'Product not found',
            averageRating: 0,
            reviewCount: 0,
            salesCount: 0,
          };
          continue;
        }

        // Get reviews for this product
        const reviewsSnapshot = await db
          .collection('products')
          .doc(productId)
          .collection('reviews')
          .limit(1000)
          .get();

        const reviews = reviewsSnapshot.docs.map(doc => doc.data());
        const reviewCount = reviews.length;
        const averageRating = reviewCount > 0
          ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviewCount
          : 0;

        // Count sales from pre-fetched orders
        let salesCount = 0;
        orders.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              if (item.productId === productId) {
                salesCount += item.quantity || 0;
              }
            });
          }
        });

        const statsData = {
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount,
          salesCount,
        };

        stats[productId] = statsData;

        // Cache the results
        const cacheKey = getStatsCacheKey(productId);
        statsCache.set(cacheKey, {
          data: statsData,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(`❌ Error fetching stats for product ${productId}:`, error);
        stats[productId] = {
          error: error.message,
          averageRating: 0,
          reviewCount: 0,
          salesCount: 0,
        };
      }
    }

    console.log(`✅ Batch stats processed: ${cacheHits.length} from cache, ${uncachedIds.length} freshly fetched`);

    res.status(200).json({
      success: true,
      data: stats,
      cacheHits,
      freshFetches: uncachedIds,
      fromCache: false,
    });
  } catch (error) {
    console.error(`❌ Error fetching batch product stats:`, error);
    throw new ApiError(`Failed to fetch batch product stats: ${error.message}`, 500);
  }
});
