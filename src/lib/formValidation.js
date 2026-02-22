/**
 * Form Validation & Error Messages
 * Provides consistent, short, and clear validation rules and error messages
 */

import * as z from 'zod';

// Common regex patterns
export const PATTERNS = {
  name: /^[a-zA-Z\s'-]+$/,
  email: /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|outlook|hotmail|aol|protonmail|icloud|mail|zoho)\.com$/,
  phoneNumber: /^(09|\+639)\d{9}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  hasLetter: /[a-zA-Z]/,
  hasNumber: /\d/,
};

// Common validation messages - SHORT but clear
export const MESSAGES = {
  // Names
  nameMin: 'Min 2 characters',
  nameMax: 'Max 50 characters',
  nameInvalid: 'Letters only (no numbers)',

  // Email
  emailInvalid: 'Valid email required',

  // Phone
  phoneInvalid: 'Valid PH number needed (09xxxxxxxxx)',

  // Addresses
  addressMin: 'At least 5 characters',
  addressInvalid: 'Include both # and street (e.g., 123 Main St)',

  // Price/Numbers
  pricePositive: 'Must be positive',
  priceMax: 'Must be < ₱1M',
  
  // Stock
  stockMin: 'Cannot be negative',
  stockMax: 'Max 10,000 items',

  // Product fields
  productNameMin: 'Min 3 characters',
  productNameMax: 'Max 80 characters',
  descriptionMin: 'Min 10 characters',
  descriptionMax: 'Max 200 characters',
  categoryMin: 'Min 3 characters',
  categoryMax: 'Max 30 characters',
  materialsMin: 'Min 3 characters',
  materialsMax: 'Max 50 characters',

  // Barangay
  barangayInvalid: 'Invalid barangay selected',

  // File
  fileRequired: 'File required',
  imageRequired: 'Image required',

  // GCash
  gcashNameMin: 'Min 2 characters',
  receiptRequired: 'Receipt needed for GCash',
};

// Reusable Zod schemas
export const SCHEMAS = {
  // Name fields
  firstName: z.string()
    .min(2, MESSAGES.nameMin)
    .max(50, MESSAGES.nameMax)
    .regex(PATTERNS.name, MESSAGES.nameInvalid),

  lastName: z.string()
    .min(2, MESSAGES.nameMin)
    .max(50, MESSAGES.nameMax)
    .regex(PATTERNS.name, MESSAGES.nameInvalid),

  // Email
  email: z.string().regex(PATTERNS.email, MESSAGES.emailInvalid),

  // Phone
  phoneNumber: z.string().regex(PATTERNS.phoneNumber, MESSAGES.phoneInvalid),

  // Optional phone
  phoneNumberOptional: z.string().regex(PATTERNS.phoneNumber, MESSAGES.phoneInvalid).optional().or(z.literal('')),

  // Address
  address: z.string().min(5, MESSAGES.addressMin).refine(
    val => PATTERNS.hasNumber.test(val) && PATTERNS.hasLetter.test(val),
    MESSAGES.addressInvalid
  ),

  // Optional address
  addressOptional: z.string()
    .refine(
      val => !val || (PATTERNS.hasNumber.test(val) && PATTERNS.hasLetter.test(val)),
      MESSAGES.addressInvalid
    )
    .optional()
    .or(z.literal('')),

  // Barangay
  barangay: (isValidBarangay) => z.string().refine(
    val => !val || isValidBarangay(val),
    MESSAGES.barangayInvalid
  ).optional().or(z.literal('')),

  // Barangay - REQUIRED
  barangayRequired: (isValidBarangay) => z.string()
    .min(1, 'Barangay is required')
    .refine(val => isValidBarangay(val), MESSAGES.barangayInvalid),

  // Price
  price: z.coerce.number()
    .positive(MESSAGES.pricePositive)
    .max(1000000, MESSAGES.priceMax),

  // Stock
  stock: z.coerce.number()
    .int()
    .min(0, MESSAGES.stockMin)
    .max(10000, MESSAGES.stockMax),

  // Product name
  productName: z.string()
    .min(3, MESSAGES.productNameMin)
    .max(80, MESSAGES.productNameMax),

  // Description
  description: z.string()
    .min(10, MESSAGES.descriptionMin)
    .max(200, MESSAGES.descriptionMax)
    .regex(PATTERNS.hasLetter, 'Use letters, not just numbers'),

  // Category
  category: z.string()
    .min(3, MESSAGES.categoryMin)
    .max(30, MESSAGES.categoryMax)
    .regex(PATTERNS.hasLetter, MESSAGES.nameInvalid),

  // Materials
  materialsUsed: z.string()
    .min(3, MESSAGES.materialsMin)
    .max(50, MESSAGES.materialsMax)
    .regex(PATTERNS.hasLetter, MESSAGES.nameInvalid),

  // Image URL
  imageUrl: z.string().url(MESSAGES.imageRequired),

  // File
  file: z.instanceof(File).optional(),
};

/**
 * Helper: Apply address validation
 */
export function validateAddressFormat(address) {
  if (!address) return true;
  return PATTERNS.hasNumber.test(address) && PATTERNS.hasLetter.test(address);
}

/**
 * Helper: Get validation helper text (display under input)
 */
export const HELPERS = {
  phoneNumber: 'Example: 09123456789 or +639123456789',
  address: 'Include house # and street name (e.g., 123 Main St)',
  email: 'Gmail, Yahoo, Outlook, etc.',
  price: 'Maximum ₱1,000,000',
  stock: 'Maximum 10,000 items',
  productName: '3-80 characters',
  description: '10-200 characters',
  category: '3-30 characters',
  materials: '3-50 characters',
  firstName: '2-50 characters',
  lastName: '2-50 characters',
  gcashNumber: 'PH mobile number format',
  gcashName: '2+ characters',
};
