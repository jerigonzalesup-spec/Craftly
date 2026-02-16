import { Router } from 'express';
import {
  getUserProfile,
  updateUserProfile,
} from '../controllers/profileController.js';

const router = Router();

/**
 * GET /api/profile/:userId
 * Get user profile information
 */
router.get('/:userId', getUserProfile);

/**
 * POST /api/profile/:userId
 * Update user profile information
 */
router.post('/:userId', updateUserProfile);

export default router;
