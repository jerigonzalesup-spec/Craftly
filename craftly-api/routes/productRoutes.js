import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';

const router = express.Router();

/**
 * Product Routes
 * All endpoints handle: GET, POST, PUT, DELETE
 */

// Public endpoints (no authentication required for now)
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Protected endpoints (would require auth token in production)
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;
