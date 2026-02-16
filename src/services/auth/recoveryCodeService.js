/**
 * Recovery Code Service
 * Handles recovery code generation, validation, and management
 * Generates 7 unique hashed codes per user for secure password recovery
 */

import crypto from 'crypto';

export class RecoveryCodeService {
  /**
   * Generate 7 random hashed recovery codes
   * @returns {Array<Object>} Array of 7 unique recovery codes with hashes
   */
  static generateRecoveryCodes() {
    const codes = [];
    for (let i = 0; i < 7; i++) {
      // Generate random hash-like code (32 chars like password hash)
      const randomCode = crypto.randomBytes(16).toString('hex');
      codes.push({
        code: randomCode, // This is the UNHASHED code shown to user
        codeHash: this.hashCode(randomCode), // This is stored in database
        used: false,
        usedAt: null,
        createdAt: new Date().toISOString(),
      });
    }
    return codes;
  }

  /**
   * Hash a recovery code using SHA256
   * @param {String} code - Code to hash
   * @returns {String} SHA256 hash of code
   */
  static hashCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Validate a recovery code (checks if it's valid and unused)
   * @param {Array<Object>} userCodes - User's recovery codes array
   * @param {String} inputCode - Code entered by user
   * @returns {Object} { isValid: boolean, message: string, codeObj: Object | null }
   */
  static validateRecoveryCode(userCodes, inputCode) {
    if (!userCodes || !Array.isArray(userCodes)) {
      return {
        isValid: false,
        message: 'No recovery codes found for this account.',
        codeObj: null,
      };
    }

    // Hash the input code and compare with stored hashes
    const inputCodeHash = this.hashCode(inputCode);
    const codeObj = userCodes.find(
      c => c.codeHash === inputCodeHash && !c.used
    );

    if (!codeObj) {
      return {
        isValid: false,
        message: 'Invalid or already used recovery code.',
        codeObj: null,
      };
    }

    return {
      isValid: true,
      message: 'Recovery code verified successfully.',
      codeObj: codeObj,
    };
  }

  /**
   * Mark a recovery code as used
   * @param {Array<Object>} userCodes - User's recovery codes array
   * @param {String} codeHash - Hash of code to mark as used
   * @returns {Array<Object>} Updated codes array
   */
  static markCodeAsUsed(userCodes, codeHash) {
    return userCodes.map(c =>
      c.codeHash === codeHash
        ? { ...c, used: true, usedAt: new Date().toISOString() }
        : c
    );
  }

  /**
   * Get count of remaining (unused) codes
   * @param {Array<Object>} userCodes - User's recovery codes array
   * @returns {Number} Count of unused codes
   */
  static getUnusedCodeCount(userCodes) {
    if (!userCodes || !Array.isArray(userCodes)) {
      return 0;
    }
    return userCodes.filter(c => !c.used).length;
  }

  /**
   * Check if user has any codes remaining
   * @param {Array<Object>} userCodes - User's recovery codes array
   * @returns {Boolean} True if at least 1 code remains
   */
  static hasCodesRemaining(userCodes) {
    return this.getUnusedCodeCount(userCodes) > 0;
  }

  /**
   * Get codes with display status (for admin view)
   * @param {Array<Object>} userCodes - User's recovery codes array
   * @returns {Array<Object>} Codes with status info (hides unhashed codes)
   */
  static getCodesWithStatus(userCodes) {
    return userCodes.map(c => ({
      codeHash: c.codeHash,
      used: c.used,
      usedAt: c.usedAt,
      createdAt: c.createdAt,
      status: c.used ? 'Used' : 'Available',
    }));
  }

  /**
   * Format codes for display to user (only unhashed codes)
   * @param {Array<Object>} userCodes - User's recovery codes array
   * @returns {String} Formatted codes string (comma-separated)
   */
  static formatCodesForDisplay(userCodes) {
    return userCodes
      .map(c => c.code)
      .join(', ');
  }
}
