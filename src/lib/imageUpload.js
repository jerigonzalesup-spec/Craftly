/**
 * Image upload utility for Firebase Storage
 * Converts files to Firebase Storage URLs for product images
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Upload a product image to Firebase Storage via API
 * @param {File} imageFile - The image file to upload
 * @param {string} userId - The current user's ID for authorization
 * @returns {Promise<string>} Download URL of the uploaded image
 */
export async function uploadProductImage(imageFile, userId) {
  if (!imageFile) {
    throw new Error('Image file is required');
  }

  if (!userId) {
    throw new Error('User ID is required for authentication');
  }

  // Validate file type
  if (!imageFile.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  // Validate file size (2MB limit for testing)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (imageFile.size > maxSize) {
    throw new Error('Image file must be less than 2MB');
  }

  console.log(`📸 Uploading image:  ${imageFile.name} (${imageFile.size} bytes)`);

  try {
    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('image', imageFile);

    // Upload to API
    const response = await fetch(`${API_URL}/api/images/upload`, {
      method: 'POST',
      headers: {
        'X-User-ID': userId,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Upload failed with status ${response.status}`);
    }

    const json = await response.json();
    if (json.success && json.data?.imageUrl) {
      console.log(`✅ Image uploaded successfully:${json.data.imageUrl}`);
      return json.data.imageUrl;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('❌ Image upload failed:', error);
    throw error;
  }
}

/**
 * Convert a data URI to a File object
 * @param {string} dataURI - Data URI string
 * @param {string} filename - Filename for the File object
 * @returns {File} File object
 */
export function dataURIToFile(dataURI, filename) {
  const arr = dataURI.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  return new File([u8arr], filename, { type: mime });
}
