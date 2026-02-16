import { Router } from 'express';
import { getSellerStats } from '../controllers/dashboardController.js';

const router = Router();

/**
 * GET /api/dashboard/seller-stats
 * Get seller overview statistics
 */
router.get('/seller-stats', getSellerStats);

export default router;
