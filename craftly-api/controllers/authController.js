import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import crypto from 'crypto';

const db = getFirestore();

// List of allowed email domains to prevent typos and fake emails
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'aol.com',
  'protonmail.com',
  'icloud.com',
  'mail.com',
  'zoho.com',
];

/**
 * Validate email domain against whitelist
 */
function isValidEmailDomain(email) {
  const domain = email.toLowerCase().split('@')[1];
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

/**
 * Generate unique user ID (like Firebase)
 */
function generateUserId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Hash password using SHA-256
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Hash recovery code using SHA-256
 */
function hashRecoveryCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Generate 10 recovery codes with 12 characters
 * Format: 12 character uppercase alphanumeric (e.g., "K7X9M2Q5P8R3")
 * @returns {Array<Object>} Array of 10 unique recovery codes
 */
function generateRecoveryCodes() {
  const codes = [];
  const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const CODES_TO_GENERATE = 10;
  const CODE_LENGTH = 12;

  for (let i = 0; i < CODES_TO_GENERATE; i++) {
    // Generate random 12-character code
    let code = '';
    for (let j = 0; j < CODE_LENGTH; j++) {
      code += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
    }

    codes.push({
      code: code, // Friendly code shown to user (e.g., "K7X9M2Q5P8R3")
      codeHash: hashRecoveryCode(code), // Hash stored in database
      used: false,
      usedAt: null,
      createdAt: new Date().toISOString(),
    });
  }

  return codes;
}

/**
 * POST /api/auth/signup
 * Create a new user account in Firestore
 */
export const signUp = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;

  console.log('🚀🚀🚀 SIGNUP ENDPOINT HIT 🚀🚀🚀');
  console.log('📥 Request body received:', { email, password: '***', fullName });

  // Validate input
  if (!email || !password || !fullName) {
    throw new ApiError('Email, password, and fullName are required', 400);
  }

  // Validate fullName: only letters, spaces, hyphens, apostrophes - no numbers
  if (!/^[a-zA-Z\s'-]+$/.test(fullName)) {
    throw new ApiError('Full name must contain only letters, spaces, hyphens, and apostrophes. Numbers are not allowed.', 400);
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    throw new ApiError('Invalid email address', 400);
  }

  // Validate email domain is in whitelist
  if (!isValidEmailDomain(email)) {
    throw new ApiError('Email domain not supported. Please use gmail.com, yahoo.com, outlook.com, or other common providers', 400);
  }

  // Validate password strength (minimum 6 characters)
  if (password.length < 6) {
    throw new ApiError('Password must be at least 6 characters long', 400);
  }

  console.log(`👤 Signing up user: ${email}`);

  try {
    // Check if email already exists
    const existingUser = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .get();

    if (!existingUser.empty) {
      throw new ApiError('Email already in use', 400);
    }

    // Generate user ID and hash password
    const userId = generateUserId();
    const passwordHash = hashPassword(password);

    // Generate 10 recovery codes
    const recoveryCodes = generateRecoveryCodes();
    console.log(`🔐 Generated ${recoveryCodes.length} recovery codes`);
    console.log(`📝 First 3 codes for verification:`, recoveryCodes.slice(0, 3).map(c => c.code));

    // Create user profile in Firestore
    const userProfileData = {
      uid: userId,
      fullName,
      email: email.toLowerCase(),
      passwordHash,
      role: 'buyer',
      // Initialize profile fields for checkout auto-fill
      contactNumber: null,
      streetAddress: null,
      barangay: null,
      city: 'Dagupan',
      postalCode: '2400',
      country: 'Philippines',
      // Initialize GCash payment details
      gcashName: null,
      gcashNumber: null,
      recoveryCodes: recoveryCodes,
      recoveryCodesUpdatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const userDocRef = db.collection('users').doc(userId);
    await userDocRef.set(userProfileData);

    console.log(`✅ User created successfully: ${userId}`);

    // Return recovery codes (unhashed) to user for display
    const codesToDisplay = recoveryCodes.map(c => c.code);
    console.log(`📤 Codes to display count: ${codesToDisplay.length}`);
    console.log(`📤 First 3 codes being sent to client:`, codesToDisplay.slice(0, 3));

    res.status(201).json({
      success: true,
      data: {
        uid: userId,
        email: userProfileData.email,
        displayName: userProfileData.fullName,
        role: userProfileData.role,
        recoveryCodes: codesToDisplay, // Return unhashed codes for user to save
      },
      message: 'User account created successfully. Please save your recovery codes!',
    });
  } catch (error) {
    console.error('❌ Error during signup:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Signup failed: ${error.message}`, 500);
  }
});

/**
 * POST /api/auth/signin
 * Authenticate user and return user data with profile
 */
export const signIn = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ApiError('Email and password are required', 400);
  }

  console.log(`👤 Signing in user: ${email}`);

  try {
    // Query Firestore to find user by email
    const snapshot = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .get();

    if (snapshot.empty) {
      throw new ApiError('Invalid email or password', 401);
    }

    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    // Verify password hash matches
    const passwordHash = hashPassword(password);
    if (!userData.passwordHash || passwordHash !== userData.passwordHash) {
      throw new ApiError('Invalid email or password', 401);
    }

    console.log(`✅ User signed in successfully: ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        uid: userId,
        email: userData.email,
        displayName: userData.fullName,
        role: userData.role,
      },
      message: 'Signed in successfully',
    });
  } catch (error) {
    console.error('❌ Error during signin:', error);

    if (error.status === 401) {
      throw error;
    }

    throw new ApiError(`Signin failed: ${error.message}`, 500);
  }
});

/**
 * POST /api/auth/change-password
 * Change password for logged-in user
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    throw new ApiError('Email, current password, and new password are required', 400);
  }

  // Validate password strength
  if (newPassword.length < 6) {
    throw new ApiError('Password must be at least 6 characters long', 400);
  }

  // Prevent same password
  if (currentPassword === newPassword) {
    throw new ApiError('New password must be different from current password', 400);
  }

  console.log(`🔑 Changing password for user: ${email}`);

  try {
    // Find user by email
    const snapshot = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .get();

    if (snapshot.empty) {
      throw new ApiError('User not found', 404);
    }

    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    // Verify current password
    const currentPasswordHash = hashPassword(currentPassword);
    if (!userData.passwordHash || currentPasswordHash !== userData.passwordHash) {
      throw new ApiError('Current password is incorrect', 401);
    }

    // Hash new password
    const newPasswordHash = hashPassword(newPassword);

    // Update password hash in Firestore (using admin SDK, no security rule check needed)
    const userDocRef = db.collection('users').doc(userId);
    await userDocRef.update({
      passwordHash: newPasswordHash,
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Password changed successfully for user: ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        message: 'Password changed successfully. Please sign in with your new password.',
      },
    });
  } catch (error) {
    console.error('❌ Error during password change:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Password change failed: ${error.message}`, 500);
  }
});

/**
 * POST /api/auth/check-recovery-codes
 * Check if user has recovery codes remaining
 */
export const checkRecoveryCodes = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError('Email is required', 400);
  }

  console.log(`✅ Checking recovery codes for: ${email}`);

  try {
    // Find user by email
    const snapshot = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .get();

    if (snapshot.empty) {
      throw new ApiError('User not found', 404);
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const userCodes = userData.recoveryCodes || [];

    // Count remaining (unused) codes
    const codesRemaining = userCodes.filter(c => !c.used).length;

    if (codesRemaining === 0) {
      throw new ApiError('No recovery codes remaining. Please contact admin for assistance.', 403);
    }

    console.log(`✅ User ${email} has ${codesRemaining} codes remaining`);

    res.status(200).json({
      success: true,
      data: {
        email: email,
        codesRemaining: codesRemaining,
      },
    });
  } catch (error) {
    console.error('❌ Error checking recovery codes:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Error checking recovery codes: ${error.message}`, 500);
  }
});

/**
 * POST /api/auth/verify-recovery-code-and-reset
 * Verify recovery code and reset password
 * User enters email + 1 recovery code, system marks it as used and resets password
 */
export const verifyRecoveryCodeAndReset = asyncHandler(async (req, res) => {
  const { email, recoveryCode, newPassword } = req.body;

  if (!email || !recoveryCode || !newPassword) {
    throw new ApiError('Email, recovery code, and new password are required', 400);
  }

  // Validate password strength
  if (newPassword.length < 6) {
    throw new ApiError('Password must be at least 6 characters long', 400);
  }

  console.log(`🔑 Verifying recovery code for user: ${email}`);

  try {
    // Find user by email
    const snapshot = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .get();

    if (snapshot.empty) {
      throw new ApiError('User not found', 404);
    }

    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    const userCodes = userData.recoveryCodes || [];

    // Hash the input recovery code
    const inputCodeHash = hashRecoveryCode(recoveryCode);

    // Find the code in user's recovery codes
    const foundCode = userCodes.find(c => c.codeHash === inputCodeHash && !c.used);

    if (!foundCode) {
      throw new ApiError('Invalid or already used recovery code', 401);
    }

    // Mark the code as used
    const updatedCodes = userCodes.map(c =>
      c.codeHash === inputCodeHash
        ? { ...c, used: true, usedAt: new Date().toISOString() }
        : c
    );

    // Count remaining codes
    const remainingCodes = updatedCodes.filter(c => !c.used).length;

    // Hash new password
    const newPasswordHash = hashPassword(newPassword);

    // Update password and recovery codes in Firestore
    const userDocRef = db.collection('users').doc(userId);
    await userDocRef.update({
      passwordHash: newPasswordHash,
      recoveryCodes: updatedCodes,
      updatedAt: new Date().toISOString(),
      lastPasswordRecovery: new Date().toISOString(),
    });

    console.log(`✅ Password reset successfully for user: ${userId} (${remainingCodes} codes remaining)`);

    res.status(200).json({
      success: true,
      data: {
        message: 'Password reset successfully! You can now login with your new password.',
        remainingCodes: remainingCodes,
      },
    });
  } catch (error) {
    console.error('❌ Error during password recovery:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Password recovery failed: ${error.message}`, 500);
  }
});

/**
 * POST /api/auth/recover-password
 * Recover password using recovery codes
 */
export const recoverPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    throw new ApiError('Email and new password are required', 400);
  }

  // Validate password strength
  if (newPassword.length < 6) {
    throw new ApiError('Password must be at least 6 characters long', 400);
  }

  console.log(`🔑 Recovering password for user: ${email}`);

  try {
    // Find user by email
    const snapshot = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .get();

    if (snapshot.empty) {
      throw new ApiError('User not found', 404);
    }

    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;

    // Hash new password
    const newPasswordHash = hashPassword(newPassword);

    // Update password hash in Firestore
    const userDocRef = db.collection('users').doc(userId);
    await userDocRef.update({
      passwordHash: newPasswordHash,
      lastPasswordRecovery: new Date().toISOString(),
    });

    console.log(`✅ Password recovered for user: ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        message: 'Password reset successfully! You can now login with your new password.',
      },
    });
  } catch (error) {
    console.error('❌ Error during password recovery:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Password recovery failed: ${error.message}`, 500);
  }
});

/**
 * POST /api/auth/view-recovery-codes
 * View user's recovery codes with password verification
 * Returns unhashed codes only after password is verified
 */
export const viewRecoveryCodes = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError('Email and password are required', 400);
  }

  console.log(`🔐 Requesting recovery codes view for: ${email}`);

  try {
    // Find user by email
    const snapshot = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .get();

    if (snapshot.empty) {
      throw new ApiError('User not found', 404);
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Verify password hash matches
    const passwordHash = hashPassword(password);
    if (!userData.passwordHash || passwordHash !== userData.passwordHash) {
      throw new ApiError('Invalid password', 401);
    }

    // Get recovery codes and extract only unhashed codes
    const recoveryCodes = userData.recoveryCodes || [];
    const codesToDisplay = recoveryCodes.map(c => ({
      code: c.code,
      used: c.used,
      usedAt: c.usedAt,
      createdAt: c.createdAt,
    }));

    const codesRemaining = codesToDisplay.filter(c => !c.used).length;

    console.log(`✅ Recovery codes retrieved for user: ${userDoc.id}`);

    res.status(200).json({
      success: true,
      data: {
        recoveryCodes: codesToDisplay,
        codesRemaining,
      },
      message: 'Recovery codes retrieved successfully',
    });
  } catch (error) {
    console.error('❌ Error retrieving recovery codes:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Failed to retrieve recovery codes: ${error.message}`, 500);
  }
});
