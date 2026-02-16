import { getFirestore } from '../config/firebase.js';

/**
 * Favorites Controller
 * Handles favorite-related API endpoints
 */

/**
 * Get user's favorites
 * GET /api/favorites/:userId
 */
export async function getUserFavorites(req, res, next) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    const db = getFirestore();
    const favsCollectionRef = db.collection(`users/${userId}/favorites`);
    const snapshot = await favsCollectionRef.get();

    const favoriteIds = snapshot.docs.map(doc => doc.id);

    res.status(200).json({
      success: true,
      data: {
        userId,
        favorites: favoriteIds,
        count: favoriteIds.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add product to favorites
 * POST /api/favorites
 */
export async function addFavorite(req, res, next) {
  try {
    const userId = req.headers['x-user-id'];
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID is required (x-user-id header)',
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId is required',
      });
    }

    const db = getFirestore();
    const favDocRef = db.collection(`users/${userId}/favorites`).doc(productId);

    await favDocRef.set({
      productId,
      addedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: {
        userId,
        productId,
        message: 'Product added to favorites',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove product from favorites
 * DELETE /api/favorites/:productId
 */
export async function removeFavorite(req, res, next) {
  try {
    const userId = req.headers['x-user-id'];
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID is required (x-user-id header)',
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId is required',
      });
    }

    const db = getFirestore();
    const favDocRef = db.collection(`users/${userId}/favorites`).doc(productId);

    await favDocRef.delete();

    res.status(200).json({
      success: true,
      data: {
        userId,
        productId,
        message: 'Product removed from favorites',
      },
    });
  } catch (error) {
    next(error);
  }
}
