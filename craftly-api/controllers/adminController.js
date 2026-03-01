import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import * as emailService from '../services/emailService.js';
import { convertFirestoreDocToJSON } from '../lib/firestoreUtils.js';

const db = getFirestore();

// Server-side admin cache to reduce Firestore quota
const adminCache = new Map();
const ADMIN_STATS_CACHE_TTL = 1 * 1000; // 1 second (fast admin dashboard)
const ADMIN_APPS_CACHE_TTL = 2 * 1000; // 2 seconds (quick updates)
const ADMIN_PRODUCTS_CACHE_TTL = 2 * 1000; // 2 seconds (quick updates)
const ADMIN_USERS_CACHE_TTL = 2 * 1000; // 2 seconds (quick updates)

// Cache validation helper
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false;
  const now = new Date().getTime();
  return now - cacheEntry.timestamp < cacheEntry.ttl;
};

// Cache invalidation helpers
const invalidateAdminCache = () => {
  adminCache.delete('stats');
  adminCache.delete('applications');
  adminCache.delete('products');
  adminCache.delete('users');
  console.log(`🗑️ Invalidated all admin caches`);
};

const invalidateStatCache = () => {
  adminCache.delete('stats');
  console.log(`🗑️ Invalidated admin stats cache`);
};

const invalidateApplicationsCache = () => {
  adminCache.delete('applications');
  console.log(`🗑️ Invalidated admin applications cache`);
};

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 * Implements 10-minute server-side caching to reduce Firestore quota
 */
export const getAdminStats = asyncHandler(async (req, res) => {
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId) {
    throw new ApiError('User ID is required', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  console.log(`👤 Fetching admin stats for admin: ${headerUserId}`);

  try {
    // Check cache first - MAJOR quota saver
    const cachedStats = adminCache.get('stats');
    if (isCacheValid({ ...cachedStats, ttl: ADMIN_STATS_CACHE_TTL })) {
      console.log(`✅ Cache HIT for admin stats (age: ${Math.round((new Date().getTime() - cachedStats.timestamp) / 1000)}s)`);
      return res.status(200).json({
        success: true,
        data: cachedStats.data,
        fromCache: true,
      });
    }

    // Cache MISS - fetch fresh data
    const [usersSnapshot, productsSnapshot, ordersSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('products').get(),
      db.collection('orders').get(),
    ]);

    const totalRevenue = ordersSnapshot.docs
      .filter(doc => doc.data().paymentStatus === 'paid')
      .reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);

    // Calculate 5% admin commission on platform revenue
    const adminCommission = totalRevenue * 0.05;

    const statsData = {
      users: usersSnapshot.size,
      products: productsSnapshot.size,
      orders: ordersSnapshot.size,
      revenue: totalRevenue,
      adminCommission: adminCommission,
    };

    // Store in cache
    adminCache.set('stats', {
      data: statsData,
      timestamp: new Date().getTime(),
      ttl: ADMIN_STATS_CACHE_TTL,
    });

    console.log(`📦 Cache MISS - Fresh fetch: admin stats (${statsData.users} users, ${statsData.products} products)`);

    res.status(200).json({
      success: true,
      data: statsData,
    });
  } catch (error) {
    console.error('❌ Error fetching admin stats:', error);
    throw new ApiError(`Failed to fetch admin stats: ${error.message}`, 500);
  }
});

/**
 * GET /api/admin/applications
 * Get all seller applications
 * Implements 5-minute server-side caching to reduce Firestore quota
 */
export const getSellerApplications = asyncHandler(async (req, res) => {
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId) {
    throw new ApiError('User ID is required', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  console.log(`👤 Fetching seller applications for admin: ${headerUserId}`);

  try {
    // Check cache first
    const cachedApps = adminCache.get('applications');
    if (isCacheValid({ ...cachedApps, ttl: ADMIN_APPS_CACHE_TTL })) {
      console.log(`✅ Cache HIT for seller applications (age: ${Math.round((new Date().getTime() - cachedApps.timestamp) / 1000)}s)`);
      return res.status(200).json({
        success: true,
        data: cachedApps.data,
        fromCache: true,
      });
    }

    // Cache MISS - fetch fresh data
    const applicationsSnapshot = await db.collection('seller-applications').get();
    const applications = applicationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Store in cache
    adminCache.set('applications', {
      data: applications,
      timestamp: new Date().getTime(),
      ttl: ADMIN_APPS_CACHE_TTL,
    });

    console.log(`📦 Cache MISS - Fresh fetch: ${applications.length} seller applications`);

    res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error('❌ Error fetching applications:', error);
    throw new ApiError(`Failed to fetch applications: ${error.message}`, 500);
  }
});

/**
 * POST /api/admin/applications/:userId/approve
 * Approve a seller application
 */
export const approveApplication = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId || !userId) {
    throw new ApiError('User ID and application user ID are required', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  console.log(`👤 Admin ${headerUserId} approving application for user: ${userId}`);

  try {
    const batch = db.batch();

    // 1. Update user's role to 'seller' - add 'seller' to roles array
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const currentRoles = userDoc.data().roles || [userDoc.data().role] || ['buyer'];

    // Add 'seller' role if not already present
    if (!currentRoles.includes('seller')) {
      currentRoles.push('seller');
    }

    batch.update(userRef, {
      roles: currentRoles,
      role: 'seller',  // Update legacy field
    });

    // 2. Update application status to 'approved'
    const appRef = db.collection('seller-applications').doc(userId);
    batch.update(appRef, { status: 'approved', updatedAt: new Date().toISOString() });

    // 3. Create notification for the user
    const notificationsColRef = db.collection('users').doc(userId).collection('notifications');
    const newNotificationRef = notificationsColRef.doc();
    batch.set(newNotificationRef, {
      message: `Congratulations! Your application to become a seller has been approved.`,
      link: '/dashboard/my-products',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 4. Create admin log entry
    const logRef = db.collection('admin-logs').doc();
    batch.set(logRef, {
      adminId: headerUserId,
      adminName: adminDoc.data().fullName || adminDoc.data().email,
      action: `Approved seller application for user "${userId}".`,
      createdAt: new Date().toISOString(),
    });

    await batch.commit();

    // Send approval email to seller
    try {
      const userEmail = userDoc.data().email;
      const applicationData = (await db.collection('seller-applications').doc(userId).get()).data();
      const shopName = applicationData?.shopName || 'Your Shop';
      await emailService.sendSellerApprovalEmail(userEmail, shopName);
      console.log(`✅ Approval email sent to ${userEmail}`);
    } catch (emailError) {
      console.warn(`⚠️ Failed to send approval email to ${userDoc.data().email}:`, emailError.message);
      // Continue anyway - application was still approved
    }

    // Invalidate caches - stats and applications have changed
    invalidateApplicationsCache();
    invalidateStatCache();

    console.log(`✅ Application approved for user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Application approved successfully',
    });
  } catch (error) {
    console.error('❌ Error approving application:', error);
    throw new ApiError(`Failed to approve application: ${error.message}`, 500);
  }
});

/**
 * POST /api/admin/applications/:userId/reject
 * Reject a seller application
 */
export const rejectApplication = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { rejectionReason } = req.body;
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId || !userId) {
    throw new ApiError('User ID and application user ID are required', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  console.log(`👤 Admin ${headerUserId} rejecting application for user: ${userId}`);

  try {
    const batch = db.batch();

    // 1. Update application status to 'rejected'
    const appRef = db.collection('seller-applications').doc(userId);
    batch.update(appRef, {
      status: 'rejected',
      rejectionReason: rejectionReason || '',
      updatedAt: new Date().toISOString(),
    });

    // 2. Create notification for the user
    const notificationsColRef = db.collection('users').doc(userId).collection('notifications');
    const newNotificationRef = notificationsColRef.doc();
    batch.set(newNotificationRef, {
      message: `Your seller application has been reviewed.`,
      link: '/profile',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 3. Create admin log entry
    const logRef = db.collection('admin-logs').doc();
    batch.set(logRef, {
      adminId: headerUserId,
      adminName: adminDoc.data().fullName || adminDoc.data().email,
      action: `Rejected seller application for user "${userId}".`,
      createdAt: new Date().toISOString(),
    });

    await batch.commit();

    // Send rejection email to seller
    try {
      const userRef = db.collection('users').doc(userId);
      const userDocForEmail = await userRef.get();
      const userEmail = userDocForEmail.data().email;
      const applicationRef = db.collection('seller-applications').doc(userId);
      const applicationDocForEmail = await applicationRef.get();
      const applicationData = applicationDocForEmail.data();
      const shopName = applicationData?.shopName || 'Your Shop';
      await emailService.sendSellerRejectionEmail(userEmail, shopName, rejectionReason);
      console.log(`✅ Rejection email sent to ${userEmail}`);
    } catch (emailError) {
      console.warn(`⚠️ Failed to send rejection email:`, emailError.message);
      // Continue anyway - application was still rejected
    }

    // Invalidate cache - applications list has changed
    invalidateApplicationsCache();

    console.log(`✅ Application rejected for user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Application rejected successfully',
    });
  } catch (error) {
    console.error('❌ Error rejecting application:', error);
    throw new ApiError(`Failed to reject application: ${error.message}`, 500);
  }
});

/**
 * GET /api/admin/products
 * Get all products
 * Implements 5-minute server-side caching to reduce Firestore quota
 */
export const getAdminProducts = asyncHandler(async (req, res) => {
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId) {
    throw new ApiError('User ID is required', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  console.log(`👤 Fetching products for admin: ${headerUserId}`);

  try {
    // Check cache first
    const cachedProducts = adminCache.get('products');
    if (isCacheValid({ ...cachedProducts, ttl: ADMIN_PRODUCTS_CACHE_TTL })) {
      console.log(`✅ Cache HIT for admin products (age: ${Math.round((new Date().getTime() - cachedProducts.timestamp) / 1000)}s)`);
      return res.status(200).json({
        success: true,
        data: cachedProducts.data,
        fromCache: true,
      });
    }

    // Cache MISS - fetch fresh data
    const productsSnapshot = await db.collection('products').get();
    const products = productsSnapshot.docs.map(doc => {
      const data = doc.data();
      return convertFirestoreDocToJSON({
        id: doc.id,
        name: data.name,
        price: data.price,
        stock: data.stock,
        status: data.status || 'active',
        createdBy: data.createdBy,
        archiveReason: data.archiveReason || '',
        images: data.images || [],
        createdAt: data.createdAt,
      });
    });

    // Store in cache
    adminCache.set('products', {
      data: products,
      timestamp: new Date().getTime(),
      ttl: ADMIN_PRODUCTS_CACHE_TTL,
    });

    console.log(`📦 Cache MISS - Fresh fetch: ${products.length} products`);

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    throw new ApiError(`Failed to fetch products: ${error.message}`, 500);
  }
});

/**
 * POST /api/admin/products/:productId/archive
 * Archive a product
 */
export const archiveProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { reason } = req.body;
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId || !productId || !reason) {
    throw new ApiError('User ID, product ID, and reason are required', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  console.log(`👤 Admin ${headerUserId} archiving product: ${productId}`);

  try {
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      throw new ApiError('Product not found', 404);
    }

    const productData = productDoc.data();
    const batch = db.batch();

    // 1. Update product status to 'archived'
    const productRef = db.collection('products').doc(productId);
    batch.update(productRef, {
      status: 'archived',
      archiveReason: reason,
      updatedAt: new Date().toISOString(),
    });

    // 2. Create notification for the seller
    const sellerId = productData.createdBy;
    if (sellerId) {
      const notificationsColRef = db.collection('users').doc(sellerId).collection('notifications');
      const newNotificationRef = notificationsColRef.doc();
      batch.set(newNotificationRef, {
        message: `An admin has archived your product "${productData.name}". Reason: ${reason}`,
        link: '/dashboard/my-products',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Create admin log entry
    const logRef = db.collection('admin-logs').doc();
    batch.set(logRef, {
      adminId: headerUserId,
      adminName: adminDoc.data().fullName || adminDoc.data().email,
      action: `Archived product "${productData.name}" with reason: "${reason}".`,
      target: {
        type: 'product',
        id: productId,
        name: productData.name,
      },
      createdAt: new Date().toISOString(),
    });

    await batch.commit();

    // Invalidate products cache - products list has changed
    adminCache.delete('products');
    console.log(`🗑️ Invalidated admin products cache`);

    console.log(`✅ Product archived: ${productId}`);

    res.status(200).json({
      success: true,
      message: 'Product archived successfully',
    });
  } catch (error) {
    console.error('❌ Error archiving product:', error);
    throw new ApiError(`Failed to archive product: ${error.message}`, 500);
  }
});

/**
 * POST /api/admin/products/:productId/restore
 * Restore an archived product
 */
export const restoreProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId || !productId) {
    throw new ApiError('User ID and product ID are required', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  console.log(`👤 Admin ${headerUserId} restoring product: ${productId}`);

  try {
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      throw new ApiError('Product not found', 404);
    }

    const productData = productDoc.data();
    const batch = db.batch();

    // 1. Update product status to 'active'
    const productRef = db.collection('products').doc(productId);
    batch.update(productRef, {
      status: 'active',
      archiveReason: '',
      updatedAt: new Date().toISOString(),
    });

    // 2. Create notification for the seller
    const sellerId = productData.createdBy;
    if (sellerId) {
      const notificationsColRef = db.collection('users').doc(sellerId).collection('notifications');
      const newNotificationRef = notificationsColRef.doc();
      batch.set(newNotificationRef, {
        message: `An admin has restored your product "${productData.name}". It is now live again.`,
        link: `/products/${productId}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Create admin log entry
    const logRef = db.collection('admin-logs').doc();
    batch.set(logRef, {
      adminId: headerUserId,
      adminName: adminDoc.data().fullName || adminDoc.data().email,
      action: `Restored product "${productData.name}".`,
      target: {
        type: 'product',
        id: productId,
        name: productData.name,
      },
      createdAt: new Date().toISOString(),
    });

    await batch.commit();

    // Invalidate products cache - products list has changed
    adminCache.delete('products');
    console.log(`🗑️ Invalidated admin products cache`);

    console.log(`✅ Product restored: ${productId}`);

    res.status(200).json({
      success: true,
      message: 'Product restored successfully',
    });
  } catch (error) {
    console.error('❌ Error restoring product:', error);
    throw new ApiError(`Failed to restore product: ${error.message}`, 500);
  }
});

/**
 * GET /api/admin/users
 * Get all users
 * Implements 5-minute server-side caching to reduce Firestore quota
 */
export const getAdminUsers = asyncHandler(async (req, res) => {
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId) {
    throw new ApiError('User ID is required', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  console.log(`👤 Fetching users for admin: ${headerUserId}`);

  try {
    // Check cache first
    const cachedUsers = adminCache.get('users');
    if (isCacheValid({ ...cachedUsers, ttl: ADMIN_USERS_CACHE_TTL })) {
      console.log(`✅ Cache HIT for admin users (age: ${Math.round((new Date().getTime() - cachedUsers.timestamp) / 1000)}s)`);
      return res.status(200).json({
        success: true,
        data: cachedUsers.data,
        fromCache: true,
      });
    }

    // Cache MISS - fetch fresh data
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        fullName: data.fullName || '',
        email: data.email || '',
        role: data.role || 'buyer',
        accountStatus: data.accountStatus || 'active',
        createdAt: data.createdAt,
      };
    });

    // Store in cache
    adminCache.set('users', {
      data: users,
      timestamp: new Date().getTime(),
      ttl: ADMIN_USERS_CACHE_TTL,
    });

    console.log(`📦 Cache MISS - Fresh fetch: ${users.length} users`);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw new ApiError(`Failed to fetch users: ${error.message}`, 500);
  }
});

/**
 * POST /api/admin/users/:userId/role
 * Change a user's role
 */
export const changeUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { newRole } = req.body;
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId || !userId || !newRole) {
    throw new ApiError('User ID, target user ID, and new role are required', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  // Prevent demoting self
  if (userId === headerUserId) {
    throw new ApiError('Cannot change your own role', 400);
  }

  console.log(`👤 Admin ${headerUserId} changing user ${userId} role to ${newRole}`);

  try {
    const targetUserDoc = await db.collection('users').doc(userId).get();
    if (!targetUserDoc.exists) {
      throw new ApiError('User not found', 404);
    }

    const targetUserData = targetUserDoc.data();
    const batch = db.batch();

    // 1. Update user's role - manage roles array
    // Users always have 'buyer' as base role, can toggle 'seller' on/off
    const userRef = db.collection('users').doc(userId);
    const currentRoles = targetUserData.roles || [targetUserData.role] || ['buyer'];

    // Validate newRole
    if (!['buyer', 'seller'].includes(newRole)) {
      throw new ApiError('Admin can only set role to buyer or seller. Admin role requires direct database update.', 400);
    }

    // Build new roles array
    // Always keep 'buyer', toggle 'seller' based on newRole
    let updatedRoles = ['buyer'];
    if (newRole === 'seller') {
      updatedRoles.push('seller');
    }

    batch.update(userRef, {
      roles: updatedRoles,
      role: newRole,  // Update legacy field
    });

    // 2. Create notification for the user
    const notificationsColRef = db.collection('users').doc(userId).collection('notifications');
    const newNotificationRef = notificationsColRef.doc();

    let notificationMessage = '';
    let notificationLink = '/profile';

    if (newRole === 'seller') {
      notificationMessage = `An administrator has promoted you to a 'seller'. You can now start listing your products.`;
      notificationLink = '/dashboard/my-products';
    } else if (newRole === 'buyer') {
      notificationMessage = `An administrator has revoked your seller privileges. You now have buyer-only access.`;
    }

    batch.set(newNotificationRef, {
      message: notificationMessage,
      link: notificationLink,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 3. Create admin log entry
    const logRef = db.collection('admin-logs').doc();
    batch.set(logRef, {
      adminId: headerUserId,
      adminName: adminDoc.data().fullName || adminDoc.data().email,
      action: `Changed role of ${targetUserData.fullName} from ${currentRoles.join(',')} to [${updatedRoles.join(',')}].`,
      target: {
        type: 'user',
        id: userId,
        name: targetUserData.fullName,
      },
      createdAt: new Date().toISOString(),
    });

    await batch.commit();

    // Invalidate stats cache - user roles have changed
    invalidateStatCache();

    console.log(`✅ User role changed: ${userId} to ${newRole}`);

    res.status(200).json({
      success: true,
      message: `User role changed to ${newRole}`,
    });
  } catch (error) {
    console.error('❌ Error changing user role:', error);
    throw new ApiError(`Failed to change user role: ${error.message}`, 500);
  }
});

/**
 * POST /api/admin/users/:userId/delete
 * Soft delete a user (disable account)
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId || !userId) {
    throw new ApiError('User ID is required', 400);
  }

  // Prevent deleting self
  if (userId === headerUserId) {
    throw new ApiError('Cannot delete your own account', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  console.log(`👤 Admin ${headerUserId} deleting user: ${userId}`);

  try {
    const targetUserDoc = await db.collection('users').doc(userId).get();
    if (!targetUserDoc.exists) {
      throw new ApiError('User not found', 404);
    }

    const targetUserData = targetUserDoc.data();
    const batch = db.batch();

    // 1. Soft delete user - mark accountStatus as 'deleted'
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      accountStatus: 'deleted',
      deletedAt: new Date().toISOString(),
      deletedBy: headerUserId,
    });

    // 2. Create notification for the user
    const notificationsColRef = db.collection('users').doc(userId).collection('notifications');
    const newNotificationRef = notificationsColRef.doc();
    batch.set(newNotificationRef, {
      message: `Your account has been deleted by an administrator. You can contact support if this was unexpected.`,
      link: '/contact',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 3. Create admin log entry
    const logRef = db.collection('admin-logs').doc();
    batch.set(logRef, {
      adminId: headerUserId,
      adminName: adminDoc.data().fullName || adminDoc.data().email,
      action: `Deleted account for ${targetUserData.fullName}.`,
      target: {
        type: 'user',
        id: userId,
        name: targetUserData.fullName,
      },
      createdAt: new Date().toISOString(),
    });

    await batch.commit();

    // Invalidate stats cache - user count has changed
    invalidateStatCache();

    console.log(`✅ User deleted: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'User account deleted',
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    throw new ApiError(`Failed to delete user: ${error.message}`, 500);
  }
});

/**
 * POST /api/admin/users/:userId/recover
 * Recover a deleted user account
 */
export const recoverUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId || !userId) {
    throw new ApiError('User ID is required', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  console.log(`👤 Admin ${headerUserId} recovering user: ${userId}`);

  try {
    const targetUserDoc = await db.collection('users').doc(userId).get();
    if (!targetUserDoc.exists) {
      throw new ApiError('User not found', 404);
    }

    const targetUserData = targetUserDoc.data();

    if (targetUserData.accountStatus !== 'deleted') {
      throw new ApiError('User account is not deleted', 400);
    }

    const batch = db.batch();

    // 1. Restore user - mark accountStatus as 'active'
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      accountStatus: 'active',
      deletedAt: null,
      deletedBy: null,
    });

    // 2. Create notification for the user
    const notificationsColRef = db.collection('users').doc(userId).collection('notifications');
    const newNotificationRef = notificationsColRef.doc();
    batch.set(newNotificationRef, {
      message: `Your account has been recovered by an administrator. You can now log in again.`,
      link: '/login',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 3. Create admin log entry
    const logRef = db.collection('admin-logs').doc();
    batch.set(logRef, {
      adminId: headerUserId,
      adminName: adminDoc.data().fullName || adminDoc.data().email,
      action: `Recovered account for ${targetUserData.fullName}.`,
      target: {
        type: 'user',
        id: userId,
        name: targetUserData.fullName,
      },
      createdAt: new Date().toISOString(),
    });

    await batch.commit();

    // Invalidate stats cache - user status has changed
    invalidateStatCache();

    console.log(`✅ User recovered: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'User account recovered',
    });
  } catch (error) {
    console.error('❌ Error recovering user:', error);
    throw new ApiError(`Failed to recover user: ${error.message}`, 500);
  }
});

/**
 * POST /api/admin/users/:userId/ban
 * Ban a user
 */
export const banUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { banReason, banDuration } = req.body;
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId || !userId || !banReason) {
    throw new ApiError('User ID and ban reason are required', 400);
  }

  // Prevent banning self
  if (userId === headerUserId) {
    throw new ApiError('Cannot ban your own account', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  console.log(`👤 Admin ${headerUserId} banning user: ${userId}`);

  try {
    const targetUserDoc = await db.collection('users').doc(userId).get();
    if (!targetUserDoc.exists) {
      throw new ApiError('User not found', 404);
    }

    const targetUserData = targetUserDoc.data();
    const batch = db.batch();

    // Calculate ban duration (default: 30 days)
    const banDurationMs = (banDuration || 30) * 24 * 60 * 60 * 1000;
    const bannedUntil = new Date(Date.now() + banDurationMs).toISOString();

    // 1. Update user account status to 'banned'
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      accountStatus: 'banned',
      banReason: banReason,
      bannedUntil: bannedUntil,
      bannedBy: headerUserId,
      bannedAt: new Date().toISOString(),
    });

    // 2. Create notification for the user
    const notificationsColRef = db.collection('users').doc(userId).collection('notifications');
    const newNotificationRef = notificationsColRef.doc();
    batch.set(newNotificationRef, {
      message: `Your account has been temporarily banned. Reason: ${banReason}. Ban will be lifted on ${new Date(bannedUntil).toDateString()}.`,
      link: '/contact',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 3. Create admin log entry
    const logRef = db.collection('admin-logs').doc();
    batch.set(logRef, {
      adminId: headerUserId,
      adminName: adminDoc.data().fullName || adminDoc.data().email,
      action: `Banned user ${targetUserData.fullName} for ${banDuration || 30} days. Reason: ${banReason}`,
      target: {
        type: 'user',
        id: userId,
        name: targetUserData.fullName,
      },
      createdAt: new Date().toISOString(),
    });

    await batch.commit();

    // Invalidate stats cache - user status has changed
    invalidateStatCache();

    console.log(`✅ User banned: ${userId}`);

    res.status(200).json({
      success: true,
      message: `User banned for ${banDuration || 30} days`,
    });
  } catch (error) {
    console.error('❌ Error banning user:', error);
    throw new ApiError(`Failed to ban user: ${error.message}`, 500);
  }
});

/**
 * POST /api/admin/users/:userId/unban
 * Unban a user
 */
export const unbanUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId || !userId) {
    throw new ApiError('User ID is required', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  console.log(`👤 Admin ${headerUserId} unbanning user: ${userId}`);

  try {
    const targetUserDoc = await db.collection('users').doc(userId).get();
    if (!targetUserDoc.exists) {
      throw new ApiError('User not found', 404);
    }

    const targetUserData = targetUserDoc.data();
    const batch = db.batch();

    // 1. Update user account status to 'active'
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      accountStatus: 'active',
      banReason: '',
      bannedUntil: '',
    });

    // 2. Create notification for the user
    const notificationsColRef = db.collection('users').doc(userId).collection('notifications');
    const newNotificationRef = notificationsColRef.doc();
    batch.set(newNotificationRef, {
      message: `Your account ban has been lifted. You can now access your account again.`,
      link: '/profile',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 3. Create admin log entry
    const logRef = db.collection('admin-logs').doc();
    batch.set(logRef, {
      adminId: headerUserId,
      adminName: adminDoc.data().fullName || adminDoc.data().email,
      action: `Unbanned user ${targetUserData.fullName}.`,
      target: {
        type: 'user',
        id: userId,
        name: targetUserData.fullName,
      },
      createdAt: new Date().toISOString(),
    });

    await batch.commit();

    // Invalidate stats cache - user status has changed
    invalidateStatCache();

    console.log(`✅ User unbanned: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'User unbanned',
    });
  } catch (error) {
    console.error('❌ Error unbanning user:', error);
    throw new ApiError(`Failed to unban user: ${error.message}`, 500);
  }
});

/**
 * GET /api/admin/logs
 * Get admin activity logs
 */
export const getAdminLogs = asyncHandler(async (req, res) => {
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId) {
    throw new ApiError('User ID is required', 400);
  }

  // Verify user is admin
  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  console.log(`👤 Fetching admin logs for admin: ${headerUserId}`);

  try {
    const logsSnapshot = await db
      .collection('admin-logs')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const logs = logsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        adminId: data.adminId,
        adminName: data.adminName,
        action: data.action,
        target: data.target,
        createdAt: data.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('❌ Error fetching admin logs:', error);
    throw new ApiError(`Failed to fetch admin logs: ${error.message}`, 500);
  }
});

// ─────────────────────────── SUPERADMIN ENDPOINTS ────────────────────────────

/**
 * Helper: check if a user document is a superadmin
 */
function isSuperAdmin(data) {
  return data?.roles?.includes('superadmin') || data?.role === 'superadmin';
}

/**
 * POST /api/admin/setup-superadmin
 * One-time bootstrap: promotes the calling admin to superadmin
 * Only works when no superadmin exists yet on the platform.
 */
export const setupSuperAdmin = asyncHandler(async (req, res) => {
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId) {
    throw new ApiError('User ID is required', 400);
  }

  const adminDoc = await db.collection('users').doc(headerUserId).get();
  if (!adminDoc.exists || (!adminDoc.data().roles?.includes('admin') && adminDoc.data().role !== 'admin')) {
    throw new ApiError('Unauthorized - Admin access required', 403);
  }

  // Only works if no superadmin exists yet
  const existing = await db.collection('users').where('roles', 'array-contains', 'superadmin').limit(1).get();
  if (!existing.empty) {
    throw new ApiError('A Super Admin already exists. Cannot run setup again.', 409);
  }

  const currentRoles = adminDoc.data().roles || [adminDoc.data().role || 'admin'];
  if (!currentRoles.includes('superadmin')) currentRoles.push('superadmin');
  if (!currentRoles.includes('admin')) currentRoles.push('admin');

  await db.collection('users').doc(headerUserId).update({ roles: currentRoles });

  // Log it
  await db.collection('admin-logs').doc().set({
    adminId: headerUserId,
    adminName: adminDoc.data().fullName || adminDoc.data().email,
    action: `Bootstrapped Super Admin role for self (${adminDoc.data().email}).`,
    createdAt: new Date().toISOString(),
  });

  invalidateAdminCache();

  res.status(200).json({ success: true, message: 'You are now a Super Admin.' });
});

/**
 * GET /api/admin/admins
 * List all admin and superadmin users (superadmin only)
 */
export const getAdmins = asyncHandler(async (req, res) => {
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId) {
    throw new ApiError('User ID is required', 400);
  }

  const callerDoc = await db.collection('users').doc(headerUserId).get();
  if (!callerDoc.exists || !isSuperAdmin(callerDoc.data())) {
    throw new ApiError('Unauthorized - Super Admin access required', 403);
  }

  const snapshot = await db.collection('users').where('roles', 'array-contains', 'admin').get();
  const admins = snapshot.docs.map(doc => {
    const d = doc.data();
    return {
      uid: doc.id,
      fullName: d.fullName || '',
      email: d.email || '',
      roles: d.roles || [d.role || 'admin'],
      accountStatus: d.accountStatus || 'active',
      createdAt: typeof d.createdAt === 'string' ? d.createdAt : (d.createdAt?._seconds ? new Date(d.createdAt._seconds * 1000).toISOString() : null),
    };
  });

  res.status(200).json({ success: true, data: admins });
});

/**
 * POST /api/admin/admins/:userId/promote
 * Promote a regular user to admin (superadmin only)
 */
export const promoteToAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId || !userId) {
    throw new ApiError('Required IDs missing', 400);
  }
  if (headerUserId === userId) {
    throw new ApiError('You cannot change your own admin status.', 400);
  }

  const callerDoc = await db.collection('users').doc(headerUserId).get();
  if (!callerDoc.exists || !isSuperAdmin(callerDoc.data())) {
    throw new ApiError('Unauthorized - Super Admin access required', 403);
  }

  const targetDoc = await db.collection('users').doc(userId).get();
  if (!targetDoc.exists) {
    throw new ApiError('Target user not found', 404);
  }

  const d = targetDoc.data();
  const roles = d.roles || (d.role ? [d.role] : ['buyer']);
  if (!roles.includes('admin')) roles.push('admin');

  await db.collection('users').doc(userId).update({ roles, role: 'admin' });

  // Notification
  await db.collection('users').doc(userId).collection('notifications').doc().set({
    message: 'You have been granted Admin access on the platform.',
    link: '/admin/dashboard',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  // Log
  await db.collection('admin-logs').doc().set({
    adminId: headerUserId,
    adminName: callerDoc.data().fullName || callerDoc.data().email,
    action: `Promoted user "${d.email}" (${userId}) to Admin.`,
    createdAt: new Date().toISOString(),
  });

  invalidateAdminCache();

  res.status(200).json({ success: true, message: `${d.email} is now an Admin.` });
});

/**
 * POST /api/admin/admins/:userId/demote
 * Remove admin role from a user (superadmin only; cannot demote another superadmin)
 */
export const demoteAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const headerUserId = req.headers['x-user-id'];

  if (!headerUserId || !userId) {
    throw new ApiError('Required IDs missing', 400);
  }
  if (headerUserId === userId) {
    throw new ApiError('You cannot change your own admin status.', 400);
  }

  const callerDoc = await db.collection('users').doc(headerUserId).get();
  if (!callerDoc.exists || !isSuperAdmin(callerDoc.data())) {
    throw new ApiError('Unauthorized - Super Admin access required', 403);
  }

  const targetDoc = await db.collection('users').doc(userId).get();
  if (!targetDoc.exists) {
    throw new ApiError('Target user not found', 404);
  }

  const d = targetDoc.data();
  if (isSuperAdmin(d)) {
    throw new ApiError('Cannot demote another Super Admin.', 403);
  }

  const roles = (d.roles || [d.role || 'admin']).filter(r => r !== 'admin');
  const newRole = roles.includes('seller') ? 'seller' : 'buyer';

  await db.collection('users').doc(userId).update({ roles, role: newRole });

  // Notification
  await db.collection('users').doc(userId).collection('notifications').doc().set({
    message: 'Your Admin access on the platform has been removed.',
    link: '/profile',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  // Log
  await db.collection('admin-logs').doc().set({
    adminId: headerUserId,
    adminName: callerDoc.data().fullName || callerDoc.data().email,
    action: `Demoted Admin "${d.email}" (${userId}) to ${newRole}.`,
    createdAt: new Date().toISOString(),
  });

  invalidateAdminCache();

  res.status(200).json({ success: true, message: `${d.email} admin access removed.` });
});
