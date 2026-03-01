/**
 * Admin Service
 * Handles admin API calls
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export class AdminService {
  /**
   * Get admin dashboard statistics
   * @param {String} userId - Admin user ID
   * @returns {Promise<Object>} Statistics data
   */
  static async getAdminStats(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch stats: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && json.data) {
        console.log('✅ Admin stats loaded');
        return json.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      throw error;
    }
  }

  /**
   * Get all seller applications
   * @param {String} userId - Admin user ID
   * @returns {Promise<Array>} Array of applications
   */
  static async getSellerApplications(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/applications`, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch applications: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && json.data) {
        console.log('✅ Seller applications loaded');
        return json.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error fetching seller applications:', error);
      throw error;
    }
  }

  /**
   * Approve a seller application
   * @param {String} userId - Admin user ID
   * @param {String} applicationUserId - User ID of the application
   * @returns {Promise<Object>} Response from API
   */
  static async approveApplication(userId, applicationUserId) {
    if (!userId || !applicationUserId) {
      throw new Error('User ID and application user ID are required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/applications/${applicationUserId}/approve`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to approve application: ${response.status}`);
      }

      const json = await response.json();
      if (json.success) {
        console.log('✅ Application approved');
        return json;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      throw error;
    }
  }

  /**
   * Reject a seller application
   * @param {String} userId - Admin user ID
   * @param {String} applicationUserId - User ID of the application
   * @param {String} rejectionReason - Reason for rejection
   * @returns {Promise<Object>} Response from API
   */
  static async rejectApplication(userId, applicationUserId, rejectionReason = '') {
    if (!userId || !applicationUserId) {
      throw new Error('User ID and application user ID are required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/applications/${applicationUserId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ rejectionReason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to reject application: ${response.status}`);
      }

      const json = await response.json();
      if (json.success) {
        console.log('✅ Application rejected');
        return json;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      throw error;
    }
  }

  /**
   * Get all products
   * @param {String} userId - Admin user ID
   * @returns {Promise<Array>} Array of products
   */
  static async getAdminProducts(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/products`, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch products: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && json.data) {
        console.log('✅ Products loaded');
        return json.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Archive a product
   * @param {String} userId - Admin user ID
   * @param {String} productId - Product ID
   * @param {String} reason - Reason for archiving
   * @returns {Promise<Object>} Response from API
   */
  static async archiveProduct(userId, productId, reason) {
    if (!userId || !productId || !reason) {
      throw new Error('User ID, product ID, and reason are required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/products/${productId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to archive product: ${response.status}`);
      }

      const json = await response.json();
      if (json.success) {
        console.log('✅ Product archived');
        return json;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error archiving product:', error);
      throw error;
    }
  }

  /**
   * Restore a product
   * @param {String} userId - Admin user ID
   * @param {String} productId - Product ID
   * @returns {Promise<Object>} Response from API
   */
  static async restoreProduct(userId, productId) {
    if (!userId || !productId) {
      throw new Error('User ID and product ID are required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/products/${productId}/restore`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to restore product: ${response.status}`);
      }

      const json = await response.json();
      if (json.success) {
        console.log('✅ Product restored');
        return json;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error restoring product:', error);
      throw error;
    }
  }

  /**
   * Get all users
   * @param {String} userId - Admin user ID
   * @returns {Promise<Array>} Array of users
   */
  static async getAdminUsers(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch users: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && json.data) {
        console.log('✅ Users loaded');
        return json.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Change user role
   * @param {String} userId - Admin user ID
   * @param {String} targetUserId - User ID to change
   * @param {String} newRole - New role (buyer or seller)
   * @returns {Promise<Object>} Response from API
   */
  static async changeUserRole(userId, targetUserId, newRole) {
    if (!userId || !targetUserId || !newRole) {
      throw new Error('User ID, target user ID, and new role are required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${targetUserId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to change user role: ${response.status}`);
      }

      const json = await response.json();
      if (json.success) {
        console.log('✅ User role changed');
        return json;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error changing user role:', error);
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   * @param {String} userId - Admin user ID
   * @param {String} targetUserId - User ID to delete
   * @returns {Promise<Object>} Response from API
   */
  static async deleteUser(userId, targetUserId) {
    if (!userId || !targetUserId) {
      throw new Error('User ID and target user ID are required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${targetUserId}/delete`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete user: ${response.status}`);
      }

      const json = await response.json();
      if (json.success) {
        console.log('✅ User deleted');
        return json;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Recover a deleted user account
   * @param {String} userId - Admin user ID
   * @param {String} targetUserId - User ID to recover
   * @returns {Promise<Object>} Response from API
   */
  static async recoverUser(userId, targetUserId) {
    if (!userId || !targetUserId) {
      throw new Error('User ID and target user ID are required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${targetUserId}/recover`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to recover user: ${response.status}`);
      }

      const json = await response.json();
      if (json.success) {
        console.log('✅ User recovered');
        return json;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error recovering user:', error);
      throw error;
    }
  }

  /**
   * Ban user
   * @param {String} userId - Admin user ID
   * @param {String} targetUserId - User ID to ban
   * @param {String} banReason - Reason for ban
   * @param {Number} banDuration - Duration in days (default: 30)
   * @returns {Promise<Object>} Response from API
   */
  static async banUser(userId, targetUserId, banReason, banDuration = 30) {
    if (!userId || !targetUserId || !banReason) {
      throw new Error('User ID, target user ID, and ban reason are required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${targetUserId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ banReason, banDuration }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ban user: ${response.status}`);
      }

      const json = await response.json();
      if (json.success) {
        console.log('✅ User banned');
        return json;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error banning user:', error);
      throw error;
    }
  }

  /**
   * Unban user
   * @param {String} userId - Admin user ID
   * @param {String} targetUserId - User ID to unban
   * @returns {Promise<Object>} Response from API
   */
  static async unbanUser(userId, targetUserId) {
    if (!userId || !targetUserId) {
      throw new Error('User ID and target user ID are required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/users/${targetUserId}/unban`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to unban user: ${response.status}`);
      }

      const json = await response.json();
      if (json.success) {
        console.log('✅ User unbanned');
        return json;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      throw error;
    }
  }

  /**
   * Get admin logs
   * @param {String} userId - Admin user ID
   * @returns {Promise<Array>} Array of admin logs
   */
  static async getAdminLogs(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/logs`, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch admin logs: ${response.status}`);
      }

      const json = await response.json();
      if (json.success && json.data) {
        console.log('✅ Admin logs loaded');
        return json.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      throw error;
    }
  }

  // ─── Superadmin Methods ──────────────────────────────────────────────────

  /**
   * One-time bootstrap: promote the calling admin to superadmin.
   * Only succeeds when no superadmin exists yet.
   */
  static async setupSuperAdmin(userId) {
    if (!userId) throw new Error('User ID is required');
    const response = await fetch(`${API_URL}/api/admin/setup-superadmin`, {
      method: 'POST',
      headers: { 'x-user-id': userId },
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || `Failed: ${response.status}`);
    return json;
  }

  /**
   * Get all admin / superadmin users (superadmin only)
   */
  static async getAdmins(userId) {
    if (!userId) throw new Error('User ID is required');
    const response = await fetch(`${API_URL}/api/admin/admins`, {
      headers: { 'x-user-id': userId },
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || `Failed: ${response.status}`);
    return json.data || [];
  }

  /**
   * Promote a user to admin (superadmin only)
   */
  static async promoteToAdmin(superAdminId, targetUserId) {
    if (!superAdminId || !targetUserId) throw new Error('IDs required');
    const response = await fetch(`${API_URL}/api/admin/admins/${targetUserId}/promote`, {
      method: 'POST',
      headers: { 'x-user-id': superAdminId },
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || `Failed: ${response.status}`);
    return json;
  }

  /**
   * Remove admin role from a user (superadmin only)
   */
  static async demoteAdmin(superAdminId, targetUserId) {
    if (!superAdminId || !targetUserId) throw new Error('IDs required');
    const response = await fetch(`${API_URL}/api/admin/admins/${targetUserId}/demote`, {
      method: 'POST',
      headers: { 'x-user-id': superAdminId },
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || `Failed: ${response.status}`);
    return json;
  }
}
