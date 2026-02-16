import express from 'express';
import {
  getUserCart,
  saveCart,
  clearCart,
} from '../controllers/cartController.js';

const router = express.Router();

/**
 * Cart Routes
 */

// Get user's cart
router.get('/:userId', getUserCart);

// Save/update cart
router.post('/', saveCart);

// Clear cart
router.delete('/', clearCart);

export default router;
