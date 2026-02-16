/**
 * User Profile Service
 * Handles user profile data and API calls
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export class UserProfileService {
  /**
   * Get user profile
   * @param {String} userId - User ID
   * @returns {Promise<Object>} User profile data
   */
  static async getUserProfile(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const response = await fetch(`${API_URL}/api/profile/${userId}`, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch profile: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && json.data) {
        console.log('✅ User profile loaded');
        return json.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {String} userId - User ID
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated profile data
   */
  static async updateUserProfile(userId, profileData) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!profileData || typeof profileData !== 'object') {
      throw new Error('Profile data is required');
    }

    try {
      const response = await fetch(`${API_URL}/api/profile/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update profile: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && json.data) {
        console.log('✅ User profile updated');
        return json.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
}

/**
 * Create UserProfileService instance
 * @returns {UserProfileService} Service class (static)
 */
export function createUserProfileService() {
  return UserProfileService;
}
