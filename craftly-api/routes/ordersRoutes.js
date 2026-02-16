import { Router } from 'express';
import {
  createOrder,
  getUserOrders,
  getOrderDetails,
  getSellerOrders,
  updateOrderStatus,
} from '../controllers/ordersController.js';

const router = Router();

/**
 * POST /api/orders
 * Create a new order
 */
router.post('/', createOrder);

/**
 * GET /api/orders/:orderId/details
 * Get specific order details
 */
router.get('/:orderId/details', getOrderDetails);

/**
 * GET /api/orders/seller/:sellerId
 * Get all orders for a seller (where seller has items)
 */
router.get('/seller/:sellerId', getSellerOrders);

/**
 * GET /api/orders/:userId
 * Get all orders for a user
 */
router.get('/:userId', getUserOrders);

/**
 * POST /api/orders/:orderId/status
 * Update order status
 */
router.post('/:orderId/status', updateOrderStatus);

export default router;
