import { getFirestore, getStorage } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

const db = getFirestore();
const storage = getStorage();

/**
 * POST /api/images/upload
 * Upload a product image to Firebase Storage via Admin SDK
 * Body: multipart/form-data with 'image' file field
 * Returns: { imageUrl: "https://storage.googleapis.com/..." }
 */
export const uploadImage = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }

  if (!req.file) {
    throw new ApiError('Image file is required', 400);
  }

  console.log(`📸 Upload image request from user: ${userId}`);
  console.log(`   File: ${req.file.originalname}, Size: ${req.file.size} bytes`);
  console.log(`   Mimetype: ${req.file.mimetype}`);

  try {
    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      throw new ApiError('Only image files are allowed', 400);
    }

    // Validate file size (2MB limit for testing)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (req.file.size > maxSize) {
      throw new ApiError('Image file must be less than 2MB', 400);
    }

    // Create storage path: uploads/{userId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const filename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-');
    const storagePath = `uploads/${userId}/${timestamp}-${filename}`;

    console.log(`📂 Uploading to: ${storagePath}`);

    // Get the storage bucket (already configured in firebase.js)
    const bucket = storage;
    if (!bucket) {
      console.error('❌ Storage bucket is null/undefined');
      throw new ApiError('Storage configuration error. Contact support.', 500);
    }

    const file = bucket.file(storagePath);

    // Upload file to Firebase Storage
    console.log(`⏳ Starting file upload to Firebase Storage...`);
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        customMetadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      },
      public: true,
    });

    console.log(`✅ File saved to Firebase Storage`);

    // Get download URL
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    console.log(`✅ Image uploaded successfully: ${storagePath}`);
    console.log(`   Download URL: ${downloadUrl}`);

    res.status(200).json({
      success: true,
      data: {
        imageUrl: downloadUrl,
        path: storagePath,
      },
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
    });

    if (error.status === 400) {
      throw error;
    }

    // Return more specific error messages
    const errorMsg = error.message || 'Failed to upload image';
    throw new ApiError(`Upload error: ${errorMsg}`, 500);
  }
});

/**
 * DELETE /api/images/:imagePath
 * Delete an image from Firebase Storage
 * Path parameter should be the file path (URL encoded)
 * Only the image owner or admin can delete
 */
export const deleteImage = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  let imagePath = req.params.imagePath;

  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }

  if (!imagePath) {
    throw new ApiError('Image path is required', 400);
  }

  // Decode path if it's URL encoded
  imagePath = decodeURIComponent(imagePath);

  console.log(`🗑️  Delete image request from user: ${userId}`);
  console.log(`   Path: ${imagePath}`);

  try {
    // Verify user owns the image (path starts with products/{userId}/)
    if (!imagePath.startsWith(`products/${userId}/`)) {
      // Also check if user is admin (for future admin panel)
      throw new ApiError('Unauthorized - You can only delete your own images', 403);
    }

    const bucket = storage;
    const file = bucket.file(imagePath);

    // Check if file exists
    const exists = await file.exists();
    if (!exists[0]) {
      throw new ApiError('Image not found', 404);
    }

    // Delete the file
    await file.delete();

    console.log(`✅ Image deleted successfully: ${imagePath}`);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting image:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Failed to delete image: ${error.message}`, 500);
  }
});
