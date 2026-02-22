import crypto from 'crypto';
import { getFirestore } from '../config/firebase.js';

const db = getFirestore();
const PASSWORD_RESET_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Generate a password reset token
 * @param {string} email - User email
 * @returns {object} { token, expiryTime }
 */
export const generatePasswordResetToken = async (email) => {
  try {
    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = Date.now() + PASSWORD_RESET_EXPIRY;
    const createdAt = Date.now();

    // Store token hash in Firestore (not the plain token)
    const resetDoc = {
      email,
      tokenHash,
      expiresAt,
      createdAt,
      used: false,
    };

    // Store in passwordResets collection with tokenHash as document ID
    await db.collection('passwordResets').doc(tokenHash).set(resetDoc);

    console.log('✅ Password reset token generated for', email);

    return {
      success: true,
      token, // Send this to user via email (never store plain token)
      expiryTime: expiresAt,
    };
  } catch (error) {
    console.error('❌ Error generating password reset token:', error);
    throw new Error(`Failed to generate reset token: ${error.message}`);
  }
};

/**
 * Verify password reset token
 * @param {string} token - Plain text token from user
 * @returns {object} { valid, email, message }
 */
export const verifyPasswordResetToken = async (token) => {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetDocRef = db.collection('passwordResets').doc(tokenHash);
    const resetDoc = await resetDocRef.get();

    if (!resetDoc.exists) {
      return {
        valid: false,
        message: 'Invalid or expired reset token',
      };
    }

    const data = resetDoc.data();

    // Check if token expired
    if (data.expiresAt < Date.now()) {
      await resetDocRef.delete();
      return {
        valid: false,
        message: 'Reset token has expired. Please request a new one.',
      };
    }

    // Check if already used
    if (data.used) {
      return {
        valid: false,
        message: 'This reset token has already been used.',
      };
    }

    return {
      valid: true,
      email: data.email,
      message: 'Token is valid',
    };
  } catch (error) {
    console.error('❌ Error verifying password reset token:', error);
    return {
      valid: false,
      message: 'Error verifying token',
    };
  }
};

/**
 * Mark password reset token as used
 * @param {string} token - Plain text token
 */
export const markResetTokenAsUsed = async (token) => {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await db.collection('passwordResets').doc(tokenHash).update({
      used: true,
      usedAt: Date.now(),
    });

    console.log('✅ Reset token marked as used');
  } catch (error) {
    console.error('❌ Error marking token as used:', error);
    throw error;
  }
};

/**
 * Clean up expired password reset tokens
 * (Should be called periodically via a cron job or Cloud Function)
 */
export const cleanupExpiredTokens = async () => {
  try {
    const expiredDocs = await db
      .collection('passwordResets')
      .where('expiresAt', '<', Date.now())
      .get();

    let deletedCount = 0;
    for (const docSnapshot of expiredDocs.docs) {
      await docSnapshot.ref.delete();
      deletedCount++;
    }

    console.log(`✅ Cleaned up ${deletedCount} expired password reset tokens`);
    return { deletedCount };
  } catch (error) {
    console.error('❌ Error cleaning up expired tokens:', error);
    throw error;
  }
};

export default {
  generatePasswordResetToken,
  verifyPasswordResetToken,
  markResetTokenAsUsed,
  cleanupExpiredTokens,
};
