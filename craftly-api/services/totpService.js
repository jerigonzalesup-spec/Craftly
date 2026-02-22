import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * Generate TOTP secret and QR code
 * @param {string} email - User email (used in QR code label)
 * @param {string} appName - App name (default: 'Craftly')
 * @returns {object} { secret, qrCode (base64 data URL), manualEntryKey }
 */
export const generateTotpSecret = async (email, appName = 'Craftly') => {
  try {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${appName} (${email})`,
      issuer: appName,
      length: 32, // Standard length for TOTP
    });

    // Generate QR code as data URL
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    return {
      success: true,
      secret: secret.base32, // Base32 encoded secret for manual entry
      qrCode, // Data URL for QR code display
      manualEntryKey: secret.base32, // Same as secret, for manual entry
    };
  } catch (error) {
    console.error('❌ Error generating TOTP secret:', error);
    throw new Error(`Failed to generate TOTP secret: ${error.message}`);
  }
};

/**
 * Verify TOTP code
 * @param {string} secret - Base32 encoded TOTP secret
 * @param {string} token - 6-digit TOTP code from authenticator app
 * @returns {boolean} True if valid, false otherwise
 */
export const verifyTotpToken = (secret, token) => {
  try {
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1, // Allow 1 window (30 seconds) drift
    });

    return verified || false;
  } catch (error) {
    console.error('❌ Error verifying TOTP token:', error);
    return false;
  }
};

/**
 * Generate backup codes (single-use recovery codes)
 * @param {number} count - Number of codes to generate (default: 10)
 * @returns {array} Array of backup codes
 */
export const generateBackupCodes = (count = 10) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate 12-character alphanumeric code: XXX-XXX-XXX format for readability
    const code = crypto
      .randomBytes(9)
      .toString('hex')
      .toUpperCase()
      .slice(0, 12);

    // Format: "ABC-DEF-GHI"
    const formatted = `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6, 9)}`;
    codes.push(formatted);
  }
  return codes;
};

/**
 * Hash a backup code for storage
 * @param {string} code - Backup code
 * @returns {string} SHA-256 hash
 */
export const hashBackupCode = (code) => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

/**
 * Verify backup code
 * @param {string} code - Unhashed backup code
 * @param {string} hash - Stored hash
 * @returns {boolean} True if code matches hash
 */
export const verifyBackupCode = (code, hash) => {
  const codeHash = hashBackupCode(code);
  return codeHash === hash;
};

export default {
  generateTotpSecret,
  verifyTotpToken,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
};
