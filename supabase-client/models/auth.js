import supabase from '../supabase';

/**
 * Authentication service for Supabase
 */
export const AuthService = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise} - Registration result
   */
  async register(userData) {
    const { email, password, firstName, lastName, role, organizationId } = userData;
    
    try {
      // Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (authError) throw authError;
      
      // Create user profile based on role
      if (role === 'admin') {
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .insert([
            {
              id: authData.user.id,
              email,
              first_name: firstName,
              last_name: lastName,
              organization_name: userData.organizationName,
              organization_id: organizationId,
              created_by: userData.createdBy || null,
              status: 'active'
            }
          ]);
          
        if (adminError) throw adminError;
        
        return { user: authData.user, profile: adminData[0] };
      } else {
        // Regular user (customer or agent)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email,
              first_name: firstName,
              last_name: lastName,
              role: role || 'customer',
              organization_id: organizationId,
              created_by: userData.createdBy,
              status: 'active'
            }
          ]);
          
        if (userError) throw userError;
        
        return { user: authData.user, profile: userData[0] };
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  /**
   * Login a user
   * @param {Object} credentials - Login credentials
   * @returns {Promise} - Login result
   */
  async login(credentials) {
    const { email, password } = credentials;
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Get user profile based on role
      const userId = data.user.id;
      
      // Check if user is a superadmin
      const { data: superAdminData } = await supabase
        .from('super_admins')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (superAdminData) {
        return { 
          user: data.user, 
          profile: superAdminData, 
          role: 'superadmin',
          session: data.session
        };
      }
      
      // Check if user is an admin
      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (adminData) {
        return { 
          user: data.user, 
          profile: adminData, 
          role: 'admin',
          session: data.session
        };
      }
      
      // Must be a regular user
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (userData) {
        return { 
          user: data.user, 
          profile: userData, 
          role: userData.role,
          session: data.session
        };
      }
      
      throw new Error('User profile not found');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  /**
   * Logout the current user
   * @returns {Promise} - Logout result
   */
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
  
  /**
   * Get the current user session
   * @returns {Promise} - Current session
   */
  async getCurrentSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  },
  
  /**
   * Get the current user with profile
   * @returns {Promise} - Current user with profile
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) return null;
      
      // Get user profile based on role
      const userId = user.id;
      
      // Check if user is a superadmin
      const { data: superAdminData } = await supabase
        .from('super_admins')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (superAdminData) {
        return { 
          user, 
          profile: superAdminData, 
          role: 'superadmin'
        };
      }
      
      // Check if user is an admin
      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (adminData) {
        return { 
          user, 
          profile: adminData, 
          role: 'admin'
        };
      }
      
      // Must be a regular user
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (userData) {
        return { 
          user, 
          profile: userData, 
          role: userData.role
        };
      }
      
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },
  
  /**
   * Reset password
   * @param {string} email - User email
   * @returns {Promise} - Password reset result
   */
  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  },
  
  /**
   * Update password
   * @param {string} newPassword - New password
   * @returns {Promise} - Password update result
   */
  async updatePassword(newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      throw error;
    }
  }
};

export default AuthService;
