/**
 * Validation Utilities
 * Centralized validation functions for the API
 */

import { isValidBarangay } from './dagupanBarangays.js';

/**
 * Validate if a phone number is valid (Philippine format)
 * @param {String} phoneNumber - Phone number to validate
 * @returns {Boolean} True if valid
 */
export function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) return false;
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  return digitsOnly.length >= 10;
}

/**
 * Validate if an email is valid (basic format)
 * @param {String} email - Email to validate
 * @returns {Boolean} True if valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate if a postal code is valid (Philippine format)
 * @param {String} postalCode - Postal code to validate
 * @returns {Boolean} True if valid
 */
export function isValidPostalCode(postalCode) {
  if (!postalCode) return false;
  // Philippine postal codes are 4 digits
  return /^\d{4}$/.test(postalCode.trim());
}

/**
 * Validate street/address format
 * Must contain both numbers and letters
 * @param {String} address - Address to validate
 * @returns {Boolean} True if valid
 */
export function isValidAddress(address) {
  if (!address || address.trim().length < 5) return false;
  const hasNumber = /\d/.test(address);
  const hasLetter = /[a-zA-Z]/.test(address);
  return hasNumber && hasLetter;
}

/**
 * Validate if a barangay name is valid
 * @param {String} barangay - Barangay name to validate
 * @returns {Boolean} True if valid
 */
export function validateBarangay(barangay) {
  return isValidBarangay(barangay);
}

/**
 * Validate profile data comprehensively
 * @param {Object} profileData - Profile data to validate
 * @returns {Object} {isValid: Boolean, errors: String[]}
 */
export function validateProfileData(profileData) {
  const errors = [];

  // Validate barangay if provided
  if (profileData.barangay && !isValidBarangay(profileData.barangay)) {
    errors.push('Invalid barangay. Please select a valid Dagupan barangay.');
  }

  // Validate shop barangay if provided
  if (profileData.shopBarangay && !isValidBarangay(profileData.shopBarangay)) {
    errors.push('Invalid shop barangay. Please select a valid Dagupan barangay.');
  }

  // Validate contact number if provided
  if (profileData.contactNumber && !isValidPhoneNumber(profileData.contactNumber)) {
    errors.push('Invalid contact number. Must be a valid Philippine phone number.');
  }

  // Validate GCash number if provided
  if (profileData.gcashNumber && !isValidPhoneNumber(profileData.gcashNumber)) {
    errors.push('Invalid GCash number. Must be a valid Philippine phone number.');
  }

  // Validate postal code if provided
  if (profileData.postalCode && !isValidPostalCode(profileData.postalCode)) {
    errors.push('Invalid postal code. Please use a 4-digit Philippine postal code.');
  }

  // Validate street address if provided and has content
  if (profileData.streetAddress && profileData.streetAddress.trim() && !isValidAddress(profileData.streetAddress)) {
    errors.push('Street address must include house/building number and street name.');
  }

  // Validate shop address if provided and has content
  if (profileData.shopAddress && profileData.shopAddress.trim() && !isValidAddress(profileData.shopAddress)) {
    errors.push('Shop address must include house/building number and street name.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
