import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { isValidBarangay } from '../lib/dagupanBarangays.js';
import { validateProfileData } from '../lib/validators.js';
import { invalidateProductCache } from './productController.js';

const db = getFirestore();

/**
 * GET /api/profile/:userId
 * Get user profile information
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const headerUserId = req.headers['x-user-id'];

  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }

  // Allow reading profiles - users can view their own or seller's public profile (for GCash details during checkout)
  // The Firestore rules provide additional security filtering
  console.log(`👤 Fetching profile for user: ${userId}`);

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new ApiError('User not found', 404);
    }

    const userData = userDoc.data();

    // Count remaining (unused) recovery codes
    let codesRemaining = 0;
    if (userData.recoveryCodes && Array.isArray(userData.recoveryCodes)) {
      codesRemaining = userData.recoveryCodes.filter(c => !c.used).length;
    }

    res.status(200).json({
      success: true,
      data: {
        uid: userId,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        // Profile information
        contactNumber: userData.contactNumber || null,
        streetAddress: userData.streetAddress || null,
        barangay: userData.barangay || null,
        city: userData.city || 'Dagupan',
        postalCode: userData.postalCode || '2400',
        country: userData.country || 'Philippines',
        // GCash details
        gcashName: userData.gcashName || null,
        gcashNumber: userData.gcashNumber || null,
        // Shop profile
        shopName: userData.shopName || null,
        shopAddress: userData.shopAddress || null,
        shopBarangay: userData.shopBarangay || null,
        shopCity: userData.shopCity || 'Dagupan',
        allowShipping: userData.allowShipping !== false,
        allowPickup: userData.allowPickup === true,
        allowCod: userData.allowCod !== false,
        allowGcash: userData.allowGcash === true,
        // Recovery codes info
        codesRemaining,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching profile:', error);

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(`Failed to fetch profile: ${error.message}`, 500);
  }
});

/**
 * POST /api/profile/:userId
 * Update user profile information
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const headerUserId = req.headers['x-user-id'];
  const { fullName, contactNumber, streetAddress, barangay, city, postalCode, country, gcashName, gcashNumber, shopName, shopAddress, shopBarangay, shopCity, allowShipping, allowPickup, allowCod, allowGcash } = req.body;

  if (!userId) {
    throw new ApiError('User ID is required', 400);
  }

  // Security: Users can only update their own profile
  if (headerUserId !== userId) {
    throw new ApiError('Unauthorized to update this profile', 403);
  }

  console.log(`👤 Updating profile for user: ${userId}`);
  console.log(`📥 Request body received:`, {
    fullName,
    contactNumber,
    streetAddress,
    barangay,
    city,
    postalCode,
    country,
    gcashName,
    gcashNumber,
    shopName,
    shopAddress,
    shopBarangay,
    shopCity,
    allowShipping,
    allowPickup,
  });

  // Validate input
  if (contactNumber && !/^\d{10,}$/.test(contactNumber.replace(/\D/g, ''))) {
    throw new ApiError('Invalid phone number format', 400);
  }

  if (gcashNumber && !/^\d{10,}$/.test(gcashNumber.replace(/\D/g, ''))) {
    console.log(`❌ GCash number validation failed: ${gcashNumber}`);
    throw new ApiError('Invalid GCash number format', 400);
  }

  // Validate barangay if provided
  if (barangay && !isValidBarangay(barangay)) {
    console.log(`❌ Barangay validation failed: ${barangay}`);
    throw new ApiError('Invalid barangay. Please select a valid Dagupan barangay.', 400);
  }

  // Validate shop barangay if provided
  if (shopBarangay && !isValidBarangay(shopBarangay)) {
    console.log(`❌ Shop barangay validation failed: ${shopBarangay}`);
    throw new ApiError('Invalid shop barangay. Please select a valid Dagupan barangay.', 400);
  }

  // Comprehensive validation
  const validation = validateProfileData({
    barangay,
    shopBarangay,
    contactNumber,
    gcashNumber,
    postalCode,
    streetAddress,
    shopAddress
  });

  if (!validation.isValid) {
    console.log(`❌ Profile validation failed:`, validation.errors);
    throw new ApiError(validation.errors[0], 400);
  }
  if (gcashNumber) {
    console.log(`✅ GCash number validation passed: ${gcashNumber}`);
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new ApiError('User not found', 404);
    }

    // Update only provided fields
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (contactNumber) updateData.contactNumber = contactNumber;
    if (streetAddress) updateData.streetAddress = streetAddress;
    if (barangay) updateData.barangay = barangay;
    if (city) updateData.city = city;
    if (postalCode) updateData.postalCode = postalCode;
    if (country) updateData.country = country;
    if (gcashName) updateData.gcashName = gcashName;
    if (gcashNumber) updateData.gcashNumber = gcashNumber;
    // Shop profile fields
    if (shopName) updateData.shopName = shopName;
    if (shopAddress) updateData.shopAddress = shopAddress;
    if (shopBarangay) updateData.shopBarangay = shopBarangay;
    if (shopCity) updateData.shopCity = shopCity;
    updateData.allowShipping = allowShipping !== false;
    updateData.allowPickup = allowPickup === true;
    updateData.allowCod = allowCod !== false;
    updateData.allowGcash = allowGcash === true;

    updateData.updatedAt = new Date().toISOString();

    console.log(`📝 Update object being saved to Firestore:`, updateData);

    await userRef.update(updateData);

    // Invalidate product cache so updated delivery/payment settings
    // reflect on product cards in the marketplace immediately
    invalidateProductCache(userId);

    console.log(`✅ Profile updated: ${userId}`);
    const updatedDoc = await userRef.get();
    const userData = updatedDoc.data();

    // Count remaining (unused) recovery codes
    let codesRemaining = 0;
    if (userData.recoveryCodes && Array.isArray(userData.recoveryCodes)) {
      codesRemaining = userData.recoveryCodes.filter(c => !c.used).length;
    }

    console.log(`✅ Fetched updated user document. GCash fields in database:`, {
      gcashName: userData.gcashName,
      gcashNumber: userData.gcashNumber,
    });

    res.status(200).json({
      success: true,
      data: {
        uid: userId,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        // Profile information
        contactNumber: userData.contactNumber || null,
        streetAddress: userData.streetAddress || null,
        barangay: userData.barangay || null,
        city: userData.city || 'Dagupan',
        postalCode: userData.postalCode || '2400',
        country: userData.country || 'Philippines',
        // GCash details
        gcashName: userData.gcashName || null,
        gcashNumber: userData.gcashNumber || null,
        // Shop profile
        shopName: userData.shopName || null,
        shopAddress: userData.shopAddress || null,
        shopBarangay: userData.shopBarangay || null,
        shopCity: userData.shopCity || 'Dagupan',
        allowShipping: userData.allowShipping !== false,
        allowPickup: userData.allowPickup === true,
        // Recovery codes info
        codesRemaining,
      },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('❌ Error updating profile:', error);

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(`Failed to update profile: ${error.message}`, 500);
  }
});
