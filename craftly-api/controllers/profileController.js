import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

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
  const { fullName, contactNumber, streetAddress, barangay, city, postalCode, country, gcashName, gcashNumber } = req.body;

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
  });

  // Validate input
  if (contactNumber && !/^\d{10,}$/.test(contactNumber.replace(/\D/g, ''))) {
    throw new ApiError('Invalid phone number format', 400);
  }

  if (gcashNumber && !/^\d{10,}$/.test(gcashNumber.replace(/\D/g, ''))) {
    console.log(`❌ GCash number validation failed: ${gcashNumber}`);
    throw new ApiError('Invalid GCash number format', 400);
  }

  if (gcashName) {
    console.log(`✅ GCash name validation passed: ${gcashName}`);
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

    updateData.updatedAt = new Date().toISOString();

    console.log(`📝 Update object being saved to Firestore:`, updateData);

    await userRef.update(updateData);

    console.log(`✅ Profile updated: ${userId}`);

    // Fetch the complete updated profile to return
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
