import { Router } from 'express';
import {
  getAdminStats,
  getSellerApplications,
  approveApplication,
  rejectApplication,
  getAdminProducts,
  archiveProduct,
  restoreProduct,
  getAdminUsers,
  changeUserRole,
  deleteUser,
  recoverUser,
  banUser,
  unbanUser,
  getAdminLogs,
} from '../controllers/adminController.js';

const router = Router();

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', getAdminStats);

/**
 * GET /api/admin/applications
 * Get all seller applications
 */
router.get('/applications', getSellerApplications);

/**
 * POST /api/admin/applications/:userId/approve
 * Approve a seller application
 */
router.post('/applications/:userId/approve', approveApplication);

/**
 * POST /api/admin/applications/:userId/reject
 * Reject a seller application
 */
router.post('/applications/:userId/reject', rejectApplication);

/**
 * GET /api/admin/products
 * Get all products
 */
router.get('/products', getAdminProducts);

/**
 * POST /api/admin/products/:productId/archive
 * Archive a product
 */
router.post('/products/:productId/archive', archiveProduct);

/**
 * POST /api/admin/products/:productId/restore
 * Restore an archived product
 */
router.post('/products/:productId/restore', restoreProduct);

/**
 * GET /api/admin/users
 * Get all users
 */
router.get('/users', getAdminUsers);

/**
 * POST /api/admin/users/:userId/role
 * Change a user's role
 */
router.post('/users/:userId/role', changeUserRole);

/**
 * POST /api/admin/users/:userId/delete
 * Delete a user (soft delete)
 */
router.post('/users/:userId/delete', deleteUser);

/**
 * POST /api/admin/users/:userId/recover
 * Recover a deleted user account
 */
router.post('/users/:userId/recover', recoverUser);

/**
 * POST /api/admin/users/:userId/ban
 * Ban a user
 */
router.post('/users/:userId/ban', banUser);

/**
 * POST /api/admin/users/:userId/unban
 * Unban a user
 */
router.post('/users/:userId/unban', unbanUser);

/**
 * GET /api/admin/logs
 * Get admin activity logs
 */
router.get('/logs', getAdminLogs);

export default router;
