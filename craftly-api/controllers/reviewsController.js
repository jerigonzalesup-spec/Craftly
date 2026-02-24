import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { invalidateProductStats } from './productController.js';
import { convertFirestoreDocToJSON } from '../lib/firestoreUtils.js';

const db = getFirestore();

/**
 * POST /api/reviews/submit
 * Submit a review for a product
 * Requires: productId, productCreatorId, productName, userId, userName, rating, comment
 * Creates review and notification via batch write
 */
export const submitReview = asyncHandler(async (req, res) => {
  const { productId, productCreatorId, productName, userId, userName, rating, comment } = req.body;

  // Validate input
  if (!productId || !userId || !rating || !comment) {
    throw new ApiError('Missing required fields: productId, userId, rating, comment', 400);
  }

  if (rating < 1 || rating > 5) {
    throw new ApiError('Rating must be between 1 and 5', 400);
  }

  if (comment.length < 10 || comment.length > 500) {
    throw new ApiError('Comment must be between 10 and 500 characters', 400);
  }

  console.log(`📝 Submitting review for product ${productId} by user ${userId}`);

  try {
    // Check if user already reviewed this product
    const existingReview = await db
      .collection('products')
      .doc(productId)
      .collection('reviews')
      .doc(userId)
      .get();

    if (existingReview.exists) {
      throw new ApiError('You have already reviewed this product', 400);
    }

    // Create batch write for review + notification
    const batch = db.batch();

    // 1. Create review
    const reviewRef = db
      .collection('products')
      .doc(productId)
      .collection('reviews')
      .doc(userId);

    const newReview = {
      userId,
      userName: userName || 'Anonymous',
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };

    batch.set(reviewRef, newReview);

    // 2. Create notification for seller (if reviewer is not the seller)
    if (productCreatorId && productCreatorId !== userId) {
      const notificationRef = db
        .collection('users')
        .doc(productCreatorId)
        .collection('notifications')
        .doc();

      batch.set(notificationRef, {
        userId: productCreatorId,
        message: `${userName || 'Someone'} left a ${rating}-star review on your product: "${productName}".`,
        link: `/products/${productId}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Commit batch write (admin SDK has no permission restrictions)
    await batch.commit();

    // Invalidate stats cache for this product since review count changed
    invalidateProductStats(productId);

    console.log(`✅ Review submitted successfully for product ${productId}`);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        review: newReview,
      },
    });
  } catch (error) {
    console.error('❌ Error submitting review:', error);

    if (error.message.includes('already reviewed')) {
      throw error;
    }

    throw new ApiError(`Failed to submit review: ${error.message}`, 500);
  }
});

/**
 * GET /api/reviews/:productId
 * Fetch all reviews for a product
 */
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    throw new ApiError('Product ID is required', 400);
  }

  console.log(`📝 Fetching reviews for product ${productId}`);

  try {
    const snapshot = await db
      .collection('products')
      .doc(productId)
      .collection('reviews')
      .orderBy('createdAt', 'desc')
      .get();

    const reviews = snapshot.docs.map((doc) => 
      convertFirestoreDocToJSON({
        id: doc.id,
        ...doc.data(),
      })
    );

    console.log(`✅ Found ${reviews.length} reviews for product ${productId}`);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        count: reviews.length,
      },
    });
  } catch (error) {
    console.error(`❌ Error fetching reviews for product ${productId}:`, error);
    throw new ApiError(`Failed to fetch reviews: ${error.message}`, 500);
  }
});
