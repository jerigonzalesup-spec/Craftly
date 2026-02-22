
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
 * @param {Object} data - User data (email, password, firstName, lastName, fullName)
 * @returns {Promise<Object>} User data from API
 */
export async function signUp(data) {
  const { email, password, firstName, lastName, fullName } = data;

  // Support both new format (firstName/lastName) and legacy format (fullName)
  const nameToUse = fullName || (firstName && lastName ? `${firstName} ${lastName}` : null);

  if (!email || !password || !nameToUse) {
    throw new Error('Email, password, and full name are required');
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
        fullName: nameToUse,
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
        roles: json.data.roles || [json.data.role] || ['buyer'],  // Support both new and legacy
        role: json.data.role,  // Keep legacy field
      };
      localStorage.setItem('craftly_user', JSON.stringify(userData));
      localStorage.setItem('craftly_user_id', userData.uid);
      localStorage.setItem('user_roles', JSON.stringify(userData.roles));  // Store roles separately

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
        roles: json.data.roles || [json.data.role] || ['buyer'],  // Support both new and legacy
        role: json.data.role,  // Keep legacy field
      };
      localStorage.setItem('craftly_user', JSON.stringify(userData));
      localStorage.setItem('craftly_user_id', userData.uid);
      localStorage.setItem('user_roles', JSON.stringify(userData.roles));  // Store roles separately

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
  await updateDoc(userDocRef, { fullName: fullName }).catch((serverError) => {
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

// ========================
// GOOGLE OAUTH
// ========================

/**
 * Sign in with Google OAuth
 * @param {string} idToken - Google ID token from Firebase Auth
 * @param {Object} userInfo - User info (email, displayName, photoURL)
 * @returns {Promise<Object>} User data from API
 */
export async function signInWithGoogle(idToken, userInfo) {
  const { email, displayName, photoURL } = userInfo;

  if (!idToken || !email) {
    throw new Error('Google ID token and email are required');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/signin-google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken,
        email,
        displayName,
        photoURL,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error || `Google sign-in failed: ${response.status}`);
    }

    if (json.success && json.data) {
      console.log('✅ Google sign-in successful');
      return json.data;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error during Google sign-in:', error);
    throw error;
  }
}

// ========================
// TOTP (Two-Factor Authentication)
// ========================

/**
 * Setup TOTP - Generate QR code
 * @param {string} email - User email
 * @param {string} password - User password for verification
 * @returns {Promise<Object>} TOTP secret and QR code
 */
export async function setupTotp(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/totp/setup`, {
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
      throw new Error(json.error || `TOTP setup failed: ${response.status}`);
    }

    if (json.success && json.data) {
      console.log('✅ TOTP secret generated');
      return json.data;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error during TOTP setup:', error);
    throw error;
  }
}

/**
 * Verify TOTP code and enable 2FA
 * @param {string} email - User email
 * @param {string} totpCode - 6-digit TOTP code
 * @param {string} secret - TOTP secret from setup
 * @returns {Promise<Object>} Backup codes
 */
export async function verifyTotp(email, totpCode, secret) {
  if (!email || !totpCode || !secret) {
    throw new Error('Email, TOTP code, and secret are required');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/totp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        totpCode,
        secret,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error || `TOTP verification failed: ${response.status}`);
    }

    if (json.success && json.data) {
      console.log('✅ TOTP verified and enabled');
      return json.data;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error during TOTP verification:', error);
    throw error;
  }
}

/**
 * Disable TOTP for user
 * @param {string} email - User email
 * @param {string} password - User password for verification
 * @returns {Promise<Object>} Success message
 */
export async function disableTotp(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/totp/disable`, {
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
      throw new Error(json.error || `Failed to disable TOTP: ${response.status}`);
    }

    if (json.success) {
      console.log('✅ TOTP disabled');
      return json.data;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error disabling TOTP:', error);
    throw error;
  }
}

// ========================
// PASSWORD RESET (Email-based)
// ========================

/**
 * Request password reset link via email
 * @param {string} email - User email
 * @returns {Promise<Object>} Success message
 */
export async function requestPasswordReset(email) {
  if (!email) {
    throw new Error('Email is required');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error || `Failed to send reset email: ${response.status}`);
    }

    if (json.success) {
      console.log('✅ Password reset email sent');
      return json.data;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error requesting password reset:', error);
    throw error;
  }
}

/**
 * Verify password reset token
 * @param {string} token - Reset token from email link
 * @returns {Promise<Object>} Validity and email
 */
export async function verifyResetToken(token) {
  if (!token) {
    throw new Error('Reset token is required');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/verify-reset-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
      }),
    });

    const json = await response.json();

    if (json.success && json.data) {
      console.log('✅ Reset token verified');
      return json.data;
    } else {
      return {
        valid: false,
        message: json.data?.message || 'Invalid or expired token',
      };
    }
  } catch (error) {
    console.error('Error verifying reset token:', error);
    throw error;
  }
}

/**
 * Reset password with token
 * @param {string} token - Reset token from email link
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success message
 */
export async function resetPassword(token, newPassword) {
  if (!token || !newPassword) {
    throw new Error('Reset token and new password are required');
  }

  if (newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        newPassword,
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error || `Password reset failed: ${response.status}`);
    }

    if (json.success) {
      console.log('✅ Password reset successful');
      return json.data;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
}
