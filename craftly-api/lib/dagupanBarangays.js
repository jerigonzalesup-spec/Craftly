/**
 * Dagupan City Barangays - Pangasinan, Philippines
 * Official list of all 31 barangays in Dagupan City
 */

export const DAGUPAN_BARANGAYS = [
  'Acubans',
  'Andaya',
  'Bacayao',
  'Bonuan',
  'Bonuan-Binacayan',
  'Bolosan',
  'Burgos',
  'Camuning',
  'Central',
  'Chumabol',
  'Coloma',
  'Cruces',
  'Culat',
  'Dewey',
  'Dinalaahan',
  'Dorongan',
  'Espino',
  'Famy',
  'Gat-Agao',
  'Gila',
  'Guinobatan',
  'Herrera',
  'Javellana',
  'La Paz',
  'Lusoc',
  'Magsaysay',
  'Malacabang',
  'Malasipit',
  'Malasugui',
  'Pantal',
  'Tangos',
];

/**
 * Validate if a barangay name is valid (must be from Dagupan)
 * @param {String} barangay - Barangay name to validate
 * @returns {Boolean} True if barangay is in the official list
 */
export function isValidBarangay(barangay) {
  if (!barangay || typeof barangay !== 'string') {
    return false;
  }
  return DAGUPAN_BARANGAYS.some(
    (b) => b.toLowerCase() === barangay.trim().toLowerCase()
  );
}

/**
 * Get barangay suggestions based on search term
 * @param {String} searchTerm - Search term to filter barangays
 * @returns {Array} Filtered barangays matching search term
 */
export function getBarangayMatches(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return DAGUPAN_BARANGAYS;
  }

  const term = searchTerm.toLowerCase().trim();
  return DAGUPAN_BARANGAYS.filter((b) =>
    b.toLowerCase().includes(term)
  );
}
