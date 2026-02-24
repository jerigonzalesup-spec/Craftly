/**
 * Error Message Converter
 * Converts technical errors into short, user-friendly messages
 */

/**
 * Convert error to user-friendly message
 * @param {Error|string} error - The error object or message
 * @returns {Object} { title, message } - User-friendly error
 */
export function getUserFriendlyError(error) {
  const errorMsg = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';
  
  // Firestore permission errors
  if (errorMsg.includes('permission') || errorMsg.includes('permission-denied')) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to do this.',
      code: 'PERMISSION_DENIED'
    };
  }

  // Network/server errors
  if (errorMsg.includes('network') || errorMsg.includes('offline')) {
    return {
      title: 'Connection Error',
      message: 'Check your internet connection and try again.',
      code: 'NETWORK_ERROR'
    };
  }

  // Authentication errors
  if (errorMsg.includes('auth') || errorMsg.includes('unauthenticated')) {
    return {
      title: 'Login Required',
      message: 'Please log in to continue.',
      code: 'AUTH_ERROR'
    };
  }

  // Validation errors
  if (errorMsg.includes('invalid') || errorMsg.includes('must')) {
    return {
      title: 'Invalid Input',
      message: error.message || 'Check your entries and try again.',
      code: 'VALIDATION_ERROR'
    };
  }

  // Duplicate/conflict errors
  if (errorMsg.includes('already') || errorMsg.includes('conflict') || errorMsg.includes('duplicate')) {
    return {
      title: 'Already Exists',
      message: 'This item already exists.',
      code: 'CONFLICT_ERROR'
    };
  }

  // Not found errors
  if (errorMsg.includes('not found') || errorMsg.includes('notfound')) {
    return {
      title: 'Not Found',
      message: 'The item you\'re looking for doesn\'t exist.',
      code: 'NOT_FOUND'
    };
  }

  // Quota errors
  if (errorMsg.includes('quota') || errorMsg.includes('limit')) {
    return {
      title: 'Limit Reached',
      message: 'Too many requests. Please wait a moment and try again.',
      code: 'QUOTA_ERROR'
    };
  }

  // File errors
  if (errorMsg.includes('file') || errorMsg.includes('upload') || errorMsg.includes('image')) {
    return {
      title: 'File Error',
      message: 'Failed to upload file. Try a different file.',
      code: 'FILE_ERROR'
    };
  }

  // Default error
  return {
    title: 'Something Went Wrong',
    message: 'Please try again. If it persists, refresh and retry.',
    code: 'UNKNOWN_ERROR'
  };
}

/**
 * Convert API error response to user-friendly message
 * @param {Object} errorData - Error data from API response
 * @returns {string} User-friendly message
 */
export function convertApiErrorMessage(errorData) {
  if (!errorData) return 'An error occurred. Please try again.';

  const errorMsg = errorData.error || errorData.message || '';
  const msg = errorMsg.toLowerCase();

  // Email verification errors
  if (msg.includes('verification code') && msg.includes('expired')) return 'Your verification code has expired. Please request a new one.';
  if (msg.includes('verification code') && msg.includes('invalid')) return 'The code you entered is incorrect. Please try again.';
  if (msg.includes('too many') && msg.includes('attempts')) return 'Too many failed attempts. Please request a new code.';
  if (msg.includes('verification code') && msg.includes('found')) return 'No verification code found. Please request a new one.';
  if (msg.includes('name') && msg.includes('already') && msg.includes('exists')) return 'An account with this name already exists. Please use a different name.';
  if (msg.includes('email') && msg.includes('already') && msg.includes('use')) return 'This email is already registered. Try signing in instead.';

  // Authentication errors
  if (msg.includes('password') && msg.includes('incorrect')) return 'Incorrect password. Please try again.';
  if (msg.includes('email') && msg.includes('already')) return 'This email is already registered. Try signing in instead.';
  if (msg.includes('email') && msg.includes('not found')) return 'No account found with this email. Please sign up first.';
  if (msg.includes('user') && msg.includes('not found')) return 'Account not found. Please check your email.';
  if (msg.includes('current password') && msg.includes('incorrect')) return 'Your current password is incorrect.';
  
  // TOTP errors
  if (msg.includes('totp') && msg.includes('invalid')) return 'The code you entered is incorrect. Please try again.';
  if (msg.includes('totp not enabled')) return 'Two-factor authentication is not enabled.';
  
  // Password reset errors
  if (msg.includes('reset token') && msg.includes('expired')) return 'This password reset link has expired. Please request a new one.';
  if (msg.includes('reset token') && msg.includes('invalid')) return 'This password reset link is invalid. Please request a new one.';
  if (msg.includes('reset') && msg.includes('failed')) return 'Failed to reset password. Please try again.';
  
  // Recovery code errors
  if (msg.includes('recovery code') && msg.includes('invalid')) return 'This recovery code is invalid or already used.';
  if (msg.includes('recovery code') && msg.includes('no')) return 'No recovery codes available. Contact support for help.';
  
  // Email errors
  if (msg.includes('password reset') && msg.includes('email')) return 'Email address not found. Please check and try again.';
  if (msg.includes('send') && msg.includes('email')) return 'Unable to send email. Please try again later.';
  
  // General validation errors
  if (msg.includes('required')) return 'Please fill in all required fields.';
  if (msg.includes('at least 6')) return 'Password must be at least 6 characters.';
  if (msg.includes('at least 8')) return 'Password must be at least 8 characters.';
  if (msg.includes('different')) return 'New password must be different from your current password.';
  if (msg.includes('letters')) return 'Full name can only contain letters, spaces, hyphens, and apostrophes.';
  if (msg.includes('valid email')) return 'Please enter a valid email address.';
  if (msg.includes('email domain')) return 'Please use a valid email provider.';
  
  // OAuth errors
  if (msg.includes('popup') && msg.includes('closed')) return 'Sign-in window was closed. Please try again.';
  if (msg.includes('google') && msg.includes('failed')) return 'Unable to sign in with Google. Please try again.';
  if (msg.includes('unauthorized')) return 'Google authentication is not configured. Contact support.';
  
  // Server/Service errors
  if (msg.includes('quota')) return 'Service is temporarily busy. Please try again in a moment.';
  if (msg.includes('temporarily unavailable')) return 'Service is busy. Please try again in a moment.';
  if (msg.includes('network')) return 'Network error. Check your connection and try again.';
  if (msg.includes('timeout')) return 'Request timed out. Please try again.';
  if (msg.includes('permission')) return 'You don\'t have permission for this.';
  if (msg.includes('server')) return 'Server error. Please try again later.';
  
  // Firebase errors
  if (msg.includes('firebase') && msg.includes('error')) return 'An error occurred. Please try again.';
  if (msg.includes('module does not provide')) return 'Configuration error. Please contact support.';
  
  // Default fallbacks
  if (msg.includes('invalid')) return 'Invalid information. Please check and try again.';
  if (msg.includes('error')) return 'Something went wrong. Please try again.';
  
  return errorMsg || 'An error occurred. Please try again.';
}

/**
 * Format Firestore error for display
 * @param {Error} firebaseError - Firebase/Firestore error
 * @returns {Object} { title, message }
 */
export function formatFirebaseError(firebaseError) {
  const code = firebaseError?.code || '';
  const msg = firebaseError?.message || '';

  const errorMap = {
    'permission-denied': {
      title: 'Access Denied',
      message: 'You don\'t have permission to do this.'
    },
    'unauthenticated': {
      title: 'Login Required',
      message: 'Please log in first.'
    },
    'not-found': {
      title: 'Not Found',
      message: 'This item doesn\'t exist.'
    },
    'unavailable': {
      title: 'Temporarily Unavailable',
      message: 'Service is down. Try again in a moment.'
    },
    'resource-exhausted': {
      title: 'Too Many Requests',
      message: 'You\'re doing this too much. Wait a moment.'
    },
    'invalid-argument': {
      title: 'Invalid Input',
      message: 'Check your information and try again.'
    },
  };

  return errorMap[code] || getUserFriendlyError(msg);
}

/**
 * Get short error label for form fields
 * @param {string} errorMessage - Full error message
 * @returns {string} Short error label
 */
export function getShortError(errorMessage) {
  if (!errorMessage) return '';
  
  // Keep it under 30 chars for form display
  const msg = errorMessage.toLowerCase();
  
  if (msg.includes('required')) return 'Required';
  if (msg.includes('min')) return 'Too short';
  if (msg.includes('max')) return 'Too long';
  if (msg.includes('invalid')) return 'Invalid format';
  if (msg.includes('positive')) return 'Must be positive';
  if (msg.includes('letters')) return 'Letters only';
  if (msg.includes('number')) return 'Numbers only';
  
  // Return first 25 chars
  return errorMessage.substring(0, 25);
}
