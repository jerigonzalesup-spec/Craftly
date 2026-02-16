import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

const db = getFirestore();

/**
 * GET /api/cart/:userId
 * Fetch user's cart from Firestore
 */
export const getUserCart = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }

  console.log(`🛒 Fetching cart for user: ${userId}`);

  try {
    const cartRef = db.collection('carts').doc(userId);
    const cartDoc = await cartRef.get();

    if (!cartDoc.exists) {
      // Return empty cart if it doesn't exist
      return res.status(200).json({
        success: true,
        data: {
          userId,
          items: [],
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        userId,
        items: cartDoc.data().items || [],
      },
    });
  } catch (error) {
    console.error('❌ Error fetching cart:', error);
    throw new ApiError(`Failed to fetch cart: ${error.message}`, 500);
  }
});

/**
 * POST /api/cart
 * Save entire cart to Firestore
 */
export const saveCart = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { items } = req.body;

  if (!userId) {
    throw new ApiError('User ID is required (x-user-id header)', 401);
  }

  if (!Array.isArray(items)) {
    throw new ApiError('Items must be an array', 400);
  }

  console.log(`🛒 Saving cart for user: ${userId}`);

  try {
    const cartRef = db.collection('carts').doc(userId);

    await cartRef.set({
      items,
      updatedAt: new Date(),
      userId,
    }, { merge: true });

    res.status(200).json({
      success: true,
      data: {
        userId,
        items,
        message: 'Cart saved successfully',
      },
    });
  } catch (error) {
    console.error('❌ Error saving cart:', error);
    throw new ApiError(`Failed to save cart: ${error.message}`, 500);
  }
});

/**
 * DELETE /api/cart
 * Clear user's entire cart
 */
export const clearCart = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    throw new ApiError('User ID is required (x-user-id header)', 401);
  }

  console.log(`🛒 Clearing cart for user: ${userId}`);

  try {
    const cartRef = db.collection('carts').doc(userId);

    await cartRef.set({
      items: [],
      updatedAt: new Date(),
      userId,
    }, { merge: true });

    res.status(200).json({
      success: true,
      data: {
        userId,
        items: [],
        message: 'Cart cleared successfully',
      },
    });
  } catch (error) {
    console.error('❌ Error clearing cart:', error);
    throw new ApiError(`Failed to clear cart: ${error.message}`, 500);
  }
});
