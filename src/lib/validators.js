/**
 * Frontend Validation Utilities
 * Reusable validation functions for forms
 */

import { SORTED_BARANGAYS } from '@/lib/dagupanBarangays';

/**
 * Validate if a barangay is valid
 * @param {String} barangay - Barangay name to validate
 * @returns {Boolean} True if valid
 */
export function isValidBarangay(barangay) {
  if (!barangay || typeof barangay !== 'string') {
    return false;
  }
  return SORTED_BARANGAYS.some(b => b.toLowerCase() === barangay.toLowerCase());
}

/**
 * Validate if a phone number is valid (Philippine format)
 * @param {String} phoneNumber - Phone number to validate
 * @returns {Boolean} True if valid
 */
export function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) return false;
  return /^(09|\+639)\d{9}$/.test(phoneNumber);
}

/**
 * Validate if an address has both number and letters
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
 * Validate full name format
 * @param {String} fullName - Full name to validate
 * @returns {Boolean} True if valid
 */
export function isValidFullName(fullName) {
  if (!fullName || fullName.length < 2 || fullName.length > 50) return false;
  return /^[a-zA-Z\s'-]+$/.test(fullName);
}

/**
 * Validate email format
 * @param {String} email - Email to validate
 * @returns {Boolean} True if valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|outlook|hotmail|aol|protonmail|icloud|mail|zoho)\.com$/;
  return emailRegex.test(email);
}

/**
 * Validate postal code format (Philippine)
 * @param {String} postalCode - Postal code to validate
 * @returns {Boolean} True if valid
 */
export function isValidPostalCode(postalCode) {
  if (!postalCode) return false;
  return /^\d{4}$/.test(postalCode.trim());
}
