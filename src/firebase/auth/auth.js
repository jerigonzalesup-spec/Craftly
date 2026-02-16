
import {
  signOut,
  getAuth,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { updateDoc, collection, doc, query, where, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '..';
import { RecoveryCodeService } from '@/services/auth/recoveryCodeService';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Sign up a new user
 * @param {Object} data - User data (email, password, fullName)
 * @returns {Promise<Object>} User data from API
 */
export async function signUp(data) {
  const { email, password, fullName } = data;

  if (!email || !password || !fullName) {
    throw new Error('Email, password, and fullName are required');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        fullName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Signup failed: ${response.status}`);
    }

    const json = await response.json();
    if (json.success && json.data) {
      console.log('✅ User account created successfully');
      console.log('📊 API Response full data:', json.data);
      console.log('📊 API recoveryCodes from response:', json.data.recoveryCodes);
      console.log('📊 API recoveryCodes length:', json.data.recoveryCodes?.length);

      // Save user session to localStorage
      const userData = {
        uid: json.data.uid,
        email: json.data.email,
        displayName: json.data.displayName,
        role: json.data.role,
      };
      localStorage.setItem('craftly_user', JSON.stringify(userData));
      localStorage.setItem('craftly_user_id', userData.uid);

      // Dispatch custom event to notify other parts of the app
      window.dispatchEvent(new CustomEvent('craftly-user-changed', { detail: userData }));

      // Return user data + recovery codes for display
      const returnData = {
        ...userData,
        recoveryCodes: json.data.recoveryCodes || [],
      };
      console.log('📊 Returning to RegisterForm:', returnData);
      return returnData;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error during signup:', error);
    throw error;
  }
}

/**
 * Sign in user
 * @param {Object} data - Credentials (email, password)
 * @returns {Promise<Object>} User data from API
 */
export async function signIn(data) {
  const { email, password } = data;

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Signin failed: ${response.status}`);
    }

    const json = await response.json();
    if (json.success && json.data) {
      console.log('✅ User signed in successfully');

      // Save user session to localStorage
      const userData = {
        uid: json.data.uid,
        email: json.data.email,
        displayName: json.data.displayName,
        role: json.data.role,
      };
      localStorage.setItem('craftly_user', JSON.stringify(userData));
      localStorage.setItem('craftly_user_id', userData.uid);

      // Dispatch custom event to notify other parts of the app
      window.dispatchEvent(new CustomEvent('craftly-user-changed', { detail: userData }));

      return userData;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error during signin:', error);
    throw error;
  }
}

/**
 * Sign out user
 * Clears localStorage session
 */
export async function signOutUser() {
  console.log('👋 Signing out user');
  localStorage.removeItem('craftly_user');
  localStorage.removeItem('craftly_user_id');

  // Dispatch custom event to notify other parts of the app
  window.dispatchEvent(new CustomEvent('craftly-user-changed', { detail: null }));

  return Promise.resolve();
}

export async function updateUserProfile(data) {
  const { app, firestore } = initializeFirebase();
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in.');

  const { fullName } = data;

  await updateProfile(user, { displayName: fullName });

  const userDocRef = doc(firestore, 'users', user.uid);
  updateDoc(userDocRef, { fullName: fullName }).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: userDocRef.path,
      operation: 'update',
      requestResourceData: { fullName },
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  });
}

export async function sendPasswordReset(email) {
    const { app } = initializeFirebase();
    const auth = getAuth(app);
    return sendPasswordResetEmail(auth, email);
}

/**
 * Change password for logged-in user
 * Sends request to API which handles password verification and hashing
 * @param {Object} data - {email, currentPassword, newPassword}
 */
export async function reauthenticateAndChangePassword(data) {
  const { email, currentPassword, newPassword } = data;

  if (!email || !currentPassword || !newPassword) {
    throw new Error('Email, current password, and new password are required');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        currentPassword,
        newPassword,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      // API returned an error - throw with the error message from API
      throw new Error(json.error || `Password change failed: ${response.status}`);
    }

    if (json.success) {
      console.log('✅ Password changed successfully');
      return json.data;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error during password change:', error);
    throw error;
  }
}

/**
 * Recover password using recovery code
 * @param {String} email - User's email
 * @param {String} recoveryCode - Single recovery code entered by user
 * @param {String} newPassword - New password to set
 * @returns {Promise<Object>} { success: boolean, message: string, remainingCodes: number }
 */
export async function recoverPasswordWithCodes(email, recoveryCode, newPassword) {
  if (!email || !recoveryCode || !newPassword) {
    throw new Error('Email, recovery code, and new password are required.');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/verify-recovery-code-and-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        recoveryCode,
        newPassword,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      // API returned an error
      throw new Error(json.error || `Password recovery failed: ${response.status}`);
    }

    if (json.success) {
      console.log('✅ Password recovered successfully');
      return json.data;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error during password recovery:', error);
    throw error;
  }
}

/**
 * View user's recovery codes with password verification
 * @param {String} email - User's email
 * @param {String} password - User's password for verification
 * @returns {Promise<Object>} { recoveryCodes, codesRemaining }
 */
export async function viewRecoveryCodesWithPassword(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/view-recovery-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error || `Failed to retrieve codes: ${response.status}`);
    }

    if (json.success) {
      console.log('✅ Recovery codes retrieved successfully');
      return json.data;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error retrieving recovery codes:', error);
    throw error;
  }
}
