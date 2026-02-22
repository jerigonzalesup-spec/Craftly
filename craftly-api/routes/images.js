import express from 'express';
import multer from 'multer';
import { uploadImage, deleteImage } from '../controllers/imageController.js';

const router = express.Router();

// Configure multer for image upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit (reduced from 5MB for testing)
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Multer error handling middleware
const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds 2MB limit',
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message || 'File upload error',
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Upload error',
    });
  }
  next();
};

/**
 * POST /api/images/upload
 * Upload a product image
 * Body: multipart/form-data with 'image' field
 */
router.post('/upload', upload.single('image'), uploadErrorHandler, uploadImage);

/**
 * DELETE /api/images/:imagePath
 * Delete a product image
 * Params: imagePath - Firebase Storage path (URL encoded)
 */
router.delete('/:imagePath', deleteImage);

export default router;
