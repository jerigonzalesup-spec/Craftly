import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  getProductStatsBatch,
} from '../controllers/productController.js';

const router = express.Router();

/**
 * Product Routes
 * All endpoints handle: GET, POST, PUT, DELETE
 */

// Public endpoints (no authentication required for now)
// More specific routes MUST come before less specific dynamic routes
router.post('/batch/stats', getProductStatsBatch); // Batch endpoint
router.get('/:id/stats', getProductStats);  // Specific: /stats endpoint
router.get('/:id', getProductById);          // Less specific: dynamic ID
router.get('/', getAllProducts);             // Least specific: root

// Protected endpoints (would require auth token in production)
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;

