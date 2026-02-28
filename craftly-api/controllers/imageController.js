import { v2 as cloudinary } from 'cloudinary';
import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const db = getFirestore();

// Helper: wrap Cloudinary upload_stream in a Promise so we can await it
const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(options, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      })
      .end(buffer);
  });

/**
 * POST /api/images/upload
 * Upload an image to Cloudinary
 * Body: multipart/form-data with 'image' file field
 * Returns: { imageUrl: "https://res.cloudinary.com/..." }
 */
export const uploadImage = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];

  if (!userId) throw new ApiError('User ID is required', 400);
  if (!req.file) throw new ApiError('Image file is required', 400);

  console.log(`📸 Upload image request from user: ${userId}`);
  console.log(`   File: ${req.file.originalname}, Size: ${req.file.size} bytes`);
  console.log(`   Mimetype: ${req.file.mimetype}`);

  if (!req.file.mimetype.startsWith('image/')) {
    throw new ApiError('Only image files are allowed', 400);
  }
  if (req.file.size > 5 * 1024 * 1024) {
    throw new ApiError('Image file must be less than 5MB', 400);
  }

  try {
    const timestamp = Date.now();
    const publicId = `craftly/uploads/${userId}/${timestamp}`;

    console.log(`📂 Uploading to Cloudinary: ${publicId}`);

    const result = await uploadBuffer(req.file.buffer, {
      public_id: publicId,
      resource_type: 'image',
      overwrite: false,
    });

    console.log(`✅ Image uploaded: ${result.secure_url}`);

    res.status(200).json({
      success: true,
      data: {
        imageUrl: result.secure_url,
        publicId: result.public_id,
      },
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw new ApiError(`Upload error: ${error.message}`, 500);
  }
});

/**
 * DELETE /api/images/:imagePath
 * Delete an image from Cloudinary
 * Path parameter should be the Cloudinary public_id (URL encoded)
 * Only the image owner can delete
 */
export const deleteImage = asyncHandler(async (req, res) => {
  const userId = req.headers['x-user-id'];
  let publicId = req.params.imagePath;

  if (!userId) throw new ApiError('User ID is required', 400);
  if (!publicId) throw new ApiError('Image path is required', 400);

  publicId = decodeURIComponent(publicId);

  console.log(`🗑️  Delete image request from user: ${userId}`);
  console.log(`   Public ID: ${publicId}`);

  try {
    // Verify ownership: public_id must contain the userId segment
    if (!publicId.includes(`/${userId}/`)) {
      throw new ApiError('Unauthorized - You can only delete your own images', 403);
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok') {
      throw new ApiError('Image not found or already deleted', 404);
    }

    console.log(`✅ Image deleted: ${publicId}`);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    if (error.status) throw error;
    throw new ApiError(`Failed to delete image: ${error.message}`, 500);
  }
});
