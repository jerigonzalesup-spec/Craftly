import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

/**
 * Recovery Code Firebase Service
 * Handles Firestore operations for recovery codes
 * This is part of the Model layer in MVVM architecture
 */

export class RecoveryCodeFirebaseService {
  constructor(firestore) {
    this.firestore = firestore;
  }

  /**
   * Save recovery codes to user's Firestore profile
   * @param {String} userId - User ID
   * @param {Array<Object>} codes - Recovery codes to save
   * @returns {Promise<void>}
   */
  async saveRecoveryCodes(userId, codes) {
    if (!this.firestore || !userId || !codes) {
      throw new Error('Firestore, userId, or codes not provided');
    }

    const userDocRef = doc(this.firestore, 'users', userId);

    try {
      await updateDoc(userDocRef, {
        recoveryCodes: codes,
        recoveryCodesUpdatedAt: new Date().toISOString(),
      });
    } catch (serverError) {
      const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'update',
        requestResourceData: { recoveryCodes: 'recovery codes' },
      });
      errorEmitter.emit('permission-error', permissionError);
      throw serverError;
    }
  }

  /**
   * Get user's recovery codes from Firestore
   * @param {String} userId - User ID
   * @returns {Promise<Array<Object>>} Recovery codes array
   */
  async getRecoveryCodes(userId) {
    if (!this.firestore || !userId) {
      throw new Error('Firestore or userId not provided');
    }

    const userDocRef = doc(this.firestore, 'users', userId);

    try {
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      return userData.recoveryCodes || [];
    } catch (error) {
      console.error('Error fetching recovery codes:', error);
      throw error;
    }
  }

  /**
   * Check if user exists by email
   * @param {String} email - User email
   * @returns {Promise<{ exists: boolean, userId: string | null }>}
   */
  async getUserIdByEmail(email, usersCollection) {
    if (!email) {
      throw new Error('Email not provided');
    }

    try {
      // Note: This is a simple approach. In production, you might want to use
      // Firestore query to find user by email for better performance.
      // For now, we assume userId = email or use a separate email-to-uid mapping.
      return { exists: false, userId: null };
    } catch (error) {
      console.error('Error checking user by email:', error);
      throw error;
    }
  }

  /**
   * Update recovery codes after one is used
   * @param {String} userId - User ID
   * @param {Array<Object>} updatedCodes - Updated codes array with marked as used
   * @returns {Promise<void>}
   */
  async markCodeAsUsedInFirebase(userId, updatedCodes) {
    if (!this.firestore || !userId || !updatedCodes) {
      throw new Error('Firestore, userId, or updatedCodes not provided');
    }

    const userDocRef = doc(this.firestore, 'users', userId);

    try {
      await updateDoc(userDocRef, {
        recoveryCodes: updatedCodes,
      });
    } catch (serverError) {
      const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'update',
        requestResourceData: { recoveryCodes: 'updated codes' },
      });
      errorEmitter.emit('permission-error', permissionError);
      throw serverError;
    }
  }
}

/**
 * Create a RecoveryCodeFirebaseService instance
 * @param {Object} firestore - Firestore instance
 * @returns {RecoveryCodeFirebaseService} Service instance
 */
export function createRecoveryCodeFirebaseService(firestore) {
  return new RecoveryCodeFirebaseService(firestore);
}
