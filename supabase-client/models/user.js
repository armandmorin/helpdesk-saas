import supabase from '../supabase';

/**
 * User service for Supabase
 */
export const UserService = {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise} - Created user
   */
  async createUser(userData) {
    try {
      // First create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });
      
      if (authError) throw authError;
      
      // Then create user profile
      const { data, error } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role || 'customer',
          organization_id: userData.organizationId,
          created_by: userData.createdBy,
          status: userData.status || 'active'
        }])
        .select();
      
      if (error) throw error;
      
      // Update organization user count
      if (userData.organizationId) {
        await supabase.rpc('increment_organization_users', {
          org_id: userData.organizationId
        });
      }
      
      return data[0];
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  },
  
  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise} - User details
   */
  async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  },
  
  /**
   * Get users by organization
   * @param {Object} params - Query parameters
   * @returns {Promise} - Users and count
   */
  async getUsersByOrganization(params) {
    try {
      const {
        organizationId,
        role,
        status,
        search,
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = params;
      
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId);
      
      // Apply filters
      if (role) {
        query = query.eq('role', role);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      
      // Execute query with pagination
      const { data, error, count } = await query.range(from, to);
      
      if (error) throw error;
      
      return {
        users: data,
        totalCount: count,
        page,
        limit
      };
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  },
  
  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise} - Updated user
   */
  async updateUser(userId, updateData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: updateData.firstName,
          last_name: updateData.lastName,
          role: updateData.role,
          status: updateData.status,
          updated_at: new Date()
        })
        .eq('id', userId)
        .select();
      
      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },
  
  /**
   * Delete user
   * @param {string} userId - User ID
   * @returns {Promise} - Deletion result
   */
  async deleteUser(userId) {
    try {
      // Get user to check organization
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userId)
        .single();
      
      // Delete user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      // Update organization user count
      if (userData?.organization_id) {
        await supabase.rpc('decrement_organization_users', {
          org_id: userData.organization_id
        });
      }
      
      // Delete auth user
      await supabase.auth.admin.deleteUser(userId);
      
      return { success: true };
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  },
  
  /**
   * Search users
   * @param {Object} params - Search parameters
   * @returns {Promise} - Search results
   */
  async searchUsers(params) {
    try {
      const {
        organizationId,
        searchTerm,
        page = 1,
        limit = 10
      } = params;
      
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      
      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const { data, error, count } = await query.range(from, to);
      
      if (error) throw error;
      
      return {
        users: data,
        totalCount: count,
        page,
        limit
      };
    } catch (error) {
      console.error('Search users error:', error);
      throw error;
    }
  }
};

export default UserService;
