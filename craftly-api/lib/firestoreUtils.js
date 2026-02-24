/**
 * Firestore Utilities for Data Conversion
 * Converts Firestore data types to JSON-serializable formats
 */

/**
 * Convert Firestore Timestamp to ISO string
 * @param {*} value - The value to check and convert
 * @returns {string|*} ISO string if Timestamp, otherwise original value
 */
export function convertTimestamp(value) {
  if (!value) return value;
  
  // Check if it's a Firestore Timestamp object (has _seconds property)
  if (value._seconds !== undefined || (typeof value === 'object' && value.toDate && typeof value.toDate === 'function')) {
    try {
      // If it has toDate method (admin SDK), use it
      if (typeof value.toDate === 'function') {
        return value.toDate().toISOString();
      }
      // If it has _seconds (REST API format), convert manually
      if (value._seconds !== undefined) {
        const ms = (value._seconds * 1000) + (value._nanoseconds ? Math.floor(value._nanoseconds / 1000000) : 0);
        return new Date(ms).toISOString();
      }
    } catch (e) {
      console.error('Failed to convert timestamp:', e);
      return value;
    }
  }
  
  return value;
}

/**
 * Recursively convert all Firestore Timestamps in an object's createdAt/updatedAt fields
 * @param {Object} obj - The object to convert
 * @returns {Object} New object with timestamps converted
 */
export function convertFirestoreDocToJSON(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertFirestoreDocToJSON(item));
  }

  // Handle Firestore timestamp objects
  if (obj._seconds !== undefined || (obj.toDate && typeof obj.toDate === 'function')) {
    return convertTimestamp(obj);
  }

  const converted = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      // Convert known timestamp fields
      if ((key === 'createdAt' || key === 'updatedAt' || key === 'deletedAt') && value) {
        converted[key] = convertTimestamp(value);
      } else if (Array.isArray(value)) {
        converted[key] = value.map(item => convertFirestoreDocToJSON(item));
      } else if (value && typeof value === 'object') {
        converted[key] = convertFirestoreDocToJSON(value);
      } else {
        converted[key] = value;
      }
    }
  }

  return converted;
}

/**
 * Convert batch of Firestore documents
 * @param {Array} docs - Array of Firestore documents
 * @returns {Array} Converted documents
 */
export function convertFirestoreDocsToJSON(docs) {
  if (!Array.isArray(docs)) {
    return convertFirestoreDocToJSON(docs);
  }
  return docs.map(doc => convertFirestoreDocToJSON(doc));
}
