import express from 'express';
import {
  getUserFavorites,
  addFavorite,
  removeFavorite,
} from '../controllers/favoritesController.js';

const router = express.Router();

/**
 * Favorites Routes
 */

// Get user's favorites
router.get('/:userId', getUserFavorites);

// Add product to favorites
router.post('/', addFavorite);

// Remove product from favorites
router.delete('/:productId', removeFavorite);

export default router;
