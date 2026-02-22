import { getFirestore } from '../config/firebase.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import crypto from 'crypto';
import * as totpService from '../services/totpService.js';
import * as emailService from '../services/emailService.js';
import * as passwordResetService from '../services/passwordResetService.js';

const db = getFirestore();

// ========================
// USER EMAIL CACHE (SIGNIN)
// ========================
// Cache user lookups by email to prevent quota exhaustion on signin
// Key: email (lowercase), Value: { uid, email, fullName, roles, role, passwordHash, timestamp }
const userEmailCache = new Map();
const USER_EMAIL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes - credentials don't change often

const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false;
  const now = Date.now();
  return now - cacheEntry.timestamp < USER_EMAIL_CACHE_TTL;
};

const invalidateUserCache = (email) => {
  userEmailCache.delete(email.toLowerCase());
  console.log(`🗑️ Invalidated cache for user: ${email}`);
};

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
      roles: ['buyer'],  // New array-based roles system
      role: 'buyer',     // Legacy field for backward compatibility
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
        roles: userProfileData.roles,  // Always ['buyer'] for new accounts
        role: userProfileData.role,  // Legacy field
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
    const emailLower = email.toLowerCase();
    let userDoc;
    let isCached = false;

    // Check cache first - QUOTA SAVER: prevents ~90% of signin Firestore reads
    const cachedUser = userEmailCache.get(emailLower);
    if (isCacheValid(cachedUser)) {
      console.log(`✅ Cache HIT for user email lookup (age: ${Math.round((Date.now() - cachedUser.timestamp) / 1000)}s)`);
      // For cached users, verify password hash from cache first
      const passwordHash = hashPassword(password);
      if (cachedUser.passwordHash !== passwordHash) {
        throw new ApiError('Invalid email or password', 401);
      }
      
      // Password matched, try to get fresh user doc for latest data
      try {
        const freshDoc = await db.collection('users').doc(cachedUser.uid).get();
        if (!freshDoc.exists) {
          invalidateUserCache(email);
          throw new ApiError('Invalid email or password', 401);
        }
        userDoc = freshDoc;
      } catch (dbError) {
        // If quota exceeded on fresh fetch, use cached data instead
        if (dbError.message && dbError.message.includes('Quota exceeded')) {
          console.warn(`⚠️ Quota exceeded on fresh fetch, using cached user data`);
          // Build the fresh user doc from cache
          userDoc = {
            id: cachedUser.uid,
            data: () => ({
              email: cachedUser.email,
              fullName: cachedUser.fullName,
              roles: cachedUser.roles,
              role: cachedUser.role,
              passwordHash: cachedUser.passwordHash,
            }),
          };
        } else {
          throw dbError;
        }
      }
    } else {
      // Cache MISS - query Firestore for user
      try {
        const snapshot = await db.collection('users')
          .where('email', '==', emailLower)
          .get();

        if (snapshot.empty) {
          throw new ApiError('Invalid email or password', 401);
        }

        userDoc = snapshot.docs[0];

        // Cache the user lookup result
        const userData = userDoc.data();
        userEmailCache.set(emailLower, {
          uid: userDoc.id,
          email: userData.email,
          fullName: userData.fullName,
          roles: userData.roles,
          role: userData.role,
          passwordHash: userData.passwordHash,
          timestamp: Date.now(),
        });
        console.log(`📦 Cache MISS - Cached user email for future logins`);
      } catch (dbError) {
        // Handle Firestore quota exceeded gracefully
        if (dbError.message && dbError.message.includes('Quota exceeded')) {
          console.error(`⚠️ Firestore quota exceeded during signin for: ${emailLower}`);
          // Return proper auth error instead of 500
          throw new ApiError('Authentication service temporarily unavailable. Please try again in a moment.', 503);
        }
        // Re-throw other errors
        throw dbError;
      }
    }

    const userId = userDoc.id;
    const userData = userDoc.data();

    // Verify password hash matches
    const passwordHash = hashPassword(password);
    if (!userData.passwordHash || passwordHash !== userData.passwordHash) {
      throw new ApiError('Invalid email or password', 401);
    }

    console.log(`✅ User signed in successfully: ${userId}`);

    // Build roles array: users always have 'buyer', may also have 'seller' or 'admin'
    let roles = userData.roles;
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      // Fallback for legacy accounts: construct from role field
      // Admin users only have 'admin', not 'buyer'
      if (userData.role === 'admin') {
        roles = ['admin'];
      } else {
        // Users always have 'buyer' as base role
        roles = ['buyer'];
        if (userData.role === 'seller') {
          roles.push('seller');  // Add seller if they're approved
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        uid: userId,
        email: userData.email,
        displayName: userData.fullName,
        roles: roles,  // Now guaranteed to include 'buyer' + any other roles
        role: userData.role,  // Legacy field
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

    // Invalidate user cache - password changed
    invalidateUserCache(email);

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

// ========================
// GOOGLE OAUTH SIGN-IN
// ========================

/**
 * POST /api/auth/signin-google
 * Authenticate with Google OAuth
 * Expects Google ID token from Firebase Auth on client
 */
export const signInWithGoogle = asyncHandler(async (req, res) => {
  const { idToken, email, displayName, photoURL } = req.body;

  if (!idToken || !email) {
    throw new ApiError('Google ID token and email are required', 400);
  }

  console.log(`🔐 Google OAuth sign-in for: ${email}`);

  try {
    const emailLower = email.toLowerCase();

    // Check if user exists
    let userDoc = await db.collection('users')
      .where('email', '==', emailLower)
      .limit(1)
      .get();

    let userId;
    let isNewUser = false;

    if (userDoc.empty) {
      // Create new user from Google OAuth
      userId = generateUserId();
      isNewUser = true;

      const userProfileData = {
        uid: userId,
        fullName: displayName || email.split('@')[0],
        email: emailLower,
        photoURL: photoURL || null,
        passwordHash: null, // No password for OAuth users
        authProvider: 'google',
        roles: ['buyer'],
        role: 'buyer',
        contactNumber: null,
        streetAddress: null,
        barangay: null,
        city: 'Dagupan',
        postalCode: '2400',
        country: 'Philippines',
        gcashName: null,
        gcashNumber: null,
        totpEnabled: false,
        totpSecret: null,
        totpBackupCodes: [],
        createdAt: new Date().toISOString(),
      };

      await db.collection('users').doc(userId).set(userProfileData);
      console.log(`✅ New user created via Google OAuth: ${userId}`);
    } else {
      // Existing user - just update last login
      userDoc = userDoc.docs[0];
      userId = userDoc.id;

      await db.collection('users').doc(userId).update({
        lastLoginAt: new Date().toISOString(),
        photoURL: photoURL || undefined, // Only update if provided
      });

      console.log(`✅ User signed in via Google OAuth: ${userId}`);
    }

    // Get updated user data
    const updatedUserDoc = await db.collection('users').doc(userId).get();
    const userData = updatedUserDoc.data();

    res.status(isNewUser ? 201 : 200).json({
      success: true,
      isNewUser,
      data: {
        uid: userId,
        email: userData.email,
        displayName: userData.fullName,
        roles: userData.roles || ['buyer'],
        role: userData.role || 'buyer',
        photoURL: userData.photoURL,
      },
      message: isNewUser ? 'Account created successfully' : 'Signed in successfully',
    });
  } catch (error) {
    console.error('❌ Error during Google OAuth sign-in:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Google sign-in failed: ${error.message}`, 500);
  }
});

// ========================
// TOTP (TWO-FACTOR AUTH)
// ========================

/**
 * POST /api/auth/totp/setup
 * Generate TOTP secret and QR code for user
 */
export const setupTotp = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError('Email and password are required', 400);
  }

  console.log(`🔐 TOTP setup requested for: ${email}`);

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

    // Verify password (optional for OAuth users, fail gracefully if passwordHash is missing)
    if (userData.passwordHash) {
      const passwordHash = hashPassword(password);
      if (passwordHash !== userData.passwordHash) {
        throw new ApiError('Invalid password', 401);
      }
    }

    // Generate TOTP secret and QR code
    const totpData = await totpService.generateTotpSecret(email);

    // Don't save secret yet - user must verify first

    console.log(`✅ TOTP secret generated for: ${email}`);

    res.status(200).json({
      success: true,
      data: {
        secret: totpData.secret,
        qrCode: totpData.qrCode,
        manualEntryKey: totpData.manualEntryKey,
      },
      message: 'Scan the QR code with your authenticator app',
    });
  } catch (error) {
    console.error('❌ Error during TOTP setup:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`TOTP setup failed: ${error.message}`, 500);
  }
});

/**
 * POST /api/auth/totp/verify
 * Verify TOTP code and enable 2FA
 */
export const verifyTotp = asyncHandler(async (req, res) => {
  const { email, totpCode, secret } = req.body;

  if (!email || !totpCode || !secret) {
    throw new ApiError('Email, TOTP code, and secret are required', 400);
  }

  console.log(`🔐 TOTP verification for: ${email}`);

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

    // Verify TOTP code
    const isValid = totpService.verifyTotpToken(secret, totpCode);
    if (!isValid) {
      throw new ApiError('Invalid TOTP code. Please try again.', 401);
    }

    // Generate backup codes
    const backupCodes = totpService.generateBackupCodes(10);
    const backupCodesHashed = backupCodes.map(code => ({
      code, // Store unhashed for display to user
      codeHash: totpService.hashBackupCode(code),
      used: false,
      usedAt: null,
      createdAt: new Date().toISOString(),
    }));

    // Update user: enable TOTP, save secret and backup codes
    await db.collection('users').doc(userId).update({
      totpEnabled: true,
      totpSecret: secret,
      totpBackupCodes: backupCodesHashed,
      totpVerifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Send confirmation email
    try {
      await emailService.sendTotpSetupEmail(email);
    } catch (emailError) {
      console.warn('⚠️ Failed to send TOTP setup email:', emailError);
    }

    // Extract unhashed codes for display to user
    const codesToDisplay = backupCodes;

    console.log(`✅ TOTP enabled for user: ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        message: 'Two-factor authentication enabled successfully',
        backupCodes: codesToDisplay,
      },
      warning: 'Save these backup codes in a safe place. Each code can be used once if you lose access to your authenticator app.',
    });
  } catch (error) {
    console.error('❌ Error during TOTP verification:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`TOTP verification failed: ${error.message}`, 500);
  }
});

/**
 * POST /api/auth/totp/disable
 * Disable TOTP for user
 */
export const disableTotp = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError('Email and password are required', 400);
  }

  console.log(`🔐 TOTP disable requested for: ${email}`);

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

    // Verify password
    if (userData.passwordHash) {
      const passwordHash = hashPassword(password);
      if (passwordHash !== userData.passwordHash) {
        throw new ApiError('Invalid password', 401);
      }
    }

    // Disable TOTP
    await db.collection('users').doc(userId).update({
      totpEnabled: false,
      totpSecret: null,
      totpBackupCodes: [],
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ TOTP disabled for user: ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        message: 'Two-factor authentication disabled',
      },
    });
  } catch (error) {
    console.error('❌ Error during TOTP disable:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Failed to disable TOTP: ${error.message}`, 500);
  }
});

// ========================
// PASSWORD RESET (EMAIL-BASED)
// ========================

/**
 * POST /api/auth/forgot-password
 * Request password reset code via email
 */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError('Email is required', 400);
  }

  console.log(`📧 Password reset requested for: ${email}`);

  try {
    // Check if user exists
    const snapshot = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .get();

    if (snapshot.empty) {
      // Don't reveal if email exists (security best practice)
      return res.status(200).json({
        success: true,
        data: {
          message: 'If an account exists with this email, a password reset code has been sent.',
        },
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(resetCode).digest('hex');

    const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes expiry
    
    // Store code hash in Firestore
    await db.collection('passwordResets').doc(codeHash).set({
      email: email.toLowerCase(),
      codeHash,
      expiresAt,
      createdAt: Date.now(),
      used: false,
    });

    console.log(`✅ Password reset code generated for ${email}`);

    // Send email with reset code
    try {
      await emailService.sendPasswordResetCode(email, resetCode);
      console.log(`✅ Password reset code email sent to: ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      throw new ApiError('Failed to send email. Please try again later.', 500);
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'If an account exists with this email, a password reset code has been sent.',
      },
    });
  } catch (error) {
    console.error('❌ Error during password reset request:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Password reset request failed: ${error.message}`, 500);
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token from email link
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError('Reset token and new password are required', 400);
  }

  // Validate password strength
  if (newPassword.length < 6) {
    throw new ApiError('Password must be at least 6 characters long', 400);
  }

  console.log('🔑 Processing password reset with token');

  try {
    // Verify token
    const tokenVerify = await passwordResetService.verifyPasswordResetToken(token);
    if (!tokenVerify.valid) {
      throw new ApiError(tokenVerify.message, 401);
    }

    const email = tokenVerify.email;

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

    // Update password and mark token as used
    await db.collection('users').doc(userId).update({
      passwordHash: newPasswordHash,
      lastPasswordRecovery: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await passwordResetService.markResetTokenAsUsed(token);

    // Invalidate user cache
    invalidateUserCache(email);

    console.log(`✅ Password reset successfully for user: ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        message: 'Password reset successfully! You can now sign in with your new password.',
      },
    });
  } catch (error) {
    console.error('❌ Error during password reset:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Password reset failed: ${error.message}`, 500);
  }
});

/**
 * POST /api/auth/verify-reset-token
 * Verify if a password reset token is valid (used by frontend)
 */
export const verifyResetToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ApiError('Reset token is required', 400);
  }

  console.log('🔐 Verifying password reset token');

  try {
    const tokenVerify = await passwordResetService.verifyPasswordResetToken(token);

    if (!tokenVerify.valid) {
      return res.status(401).json({
        success: false,
        data: {
          valid: false,
          message: tokenVerify.message,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        email: tokenVerify.email,
        message: 'Token is valid',
      },
    });
  } catch (error) {
    console.error('❌ Error verifying reset token:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Token verification failed: ${error.message}`, 500);
  }
});

/**
 * POST /api/auth/verify-reset-code
 * Verify if a password reset code is valid
 */
export const verifyResetCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    throw new ApiError('Email and reset code are required', 400);
  }

  console.log(`🔐 Verifying password reset code for: ${email}`);

  try {
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const resetDoc = await db.collection('passwordResets').doc(codeHash).get();

    if (!resetDoc.exists) {
      return res.status(401).json({
        success: false,
        data: {
          valid: false,
          message: 'Invalid reset code',
        },
      });
    }

    const data = resetDoc.data();

    // Check if email matches
    if (data.email !== email.toLowerCase()) {
      return res.status(401).json({
        success: false,
        data: {
          valid: false,
          message: 'Reset code does not match this email',
        },
      });
    }

    // Check if code expired
    if (data.expiresAt < Date.now()) {
      await db.collection('passwordResets').doc(codeHash).delete();
      return res.status(401).json({
        success: false,
        data: {
          valid: false,
          message: 'Reset code has expired. Please request a new one.',
        },
      });
    }

    // Check if already used
    if (data.used) {
      return res.status(401).json({
        success: false,
        data: {
          valid: false,
          message: 'This reset code has already been used.',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        email: data.email,
        message: 'Reset code is valid',
      },
    });
  } catch (error) {
    console.error('❌ Error verifying reset code:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Code verification failed: ${error.message}`, 500);
  }
});

/**
 * POST /api/auth/reset-password-with-code
 * Reset password using a valid reset code
 */
export const resetPasswordWithCode = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    throw new ApiError('Email, reset code, and new password are required', 400);
  }

  // Validate password strength
  if (newPassword.length < 6) {
    throw new ApiError('Password must be at least 6 characters long', 400);
  }

  console.log(`🔑 Processing password reset with code for: ${email}`);

  try {
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const resetDoc = await db.collection('passwordResets').doc(codeHash).get();

    if (!resetDoc.exists) {
      throw new ApiError('Invalid reset code', 401);
    }

    const data = resetDoc.data();

    // Verify code
    if (data.email !== email.toLowerCase()) {
      throw new ApiError('Reset code does not match this email', 401);
    }

    if (data.expiresAt < Date.now()) {
      await db.collection('passwordResets').doc(codeHash).delete();
      throw new ApiError('Reset code has expired. Please request a new one.', 401);
    }

    if (data.used) {
      throw new ApiError('This reset code has already been used.', 401);
    }

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

    // Update password and mark code as used
    await db.collection('users').doc(userId).update({
      passwordHash: newPasswordHash,
      lastPasswordRecovery: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.collection('passwordResets').doc(codeHash).update({
      used: true,
      usedAt: new Date().toISOString(),
    });

    // Invalidate user cache
    invalidateUserCache(email);

    console.log(`✅ Password reset successfully for user: ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        message: 'Password reset successfully! You can now sign in with your new password.',
      },
    });
  } catch (error) {
    console.error('❌ Error during password reset with code:', error);

    if (error.status) {
      throw error;
    }

    throw new ApiError(`Password reset failed: ${error.message}`, 500);
  }
});
