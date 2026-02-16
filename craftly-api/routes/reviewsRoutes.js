import express from 'express';
import {
  submitReview,
  getProductReviews,
} from '../controllers/reviewsController.js';

const router = express.Router();

/**
 * Reviews Routes
 */

// Submit a review
router.post('/submit', submitReview);

// Get reviews for a product
router.get('/:productId', getProductReviews);

export default router;
