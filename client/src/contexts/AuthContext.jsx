import React, { createContext, useState, useEffect, useContext } from 'react';
import supabase from '../utils/supabaseClient';

// Create context
const AuthContext = createContext(null);

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Get user profile based on role
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            setUser(user);
            
            // Check if user is a superadmin
            const { data: superAdminData } = await supabase
              .from('super_admins')
              .select('*')
              .eq('id', user.id)
              .single();
              
            if (superAdminData) {
              setProfile(superAdminData);
              setRole('superadmin');
              return;
            }
            
            // Check if user is an admin
            const { data: adminData } = await supabase
              .from('admins')
              .select('*')
              .eq('id', user.id)
              .single();
              
            if (adminData) {
              setProfile(adminData);
              setRole('admin');
              return;
            }
            
            // Must be a regular user
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .single();
              
            if (userData) {
              setProfile(userData);
              setRole(userData.role);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Get user profile based on role
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            setUser(user);
            
            // Check if user is a superadmin
            const { data: superAdminData } = await supabase
              .from('super_admins')
              .select('*')
              .eq('id', user.id)
              .single();
              
            if (superAdminData) {
              setProfile(superAdminData);
              setRole('superadmin');
              return;
            }
            
            // Check if user is an admin
            const { data: adminData } = await supabase
              .from('admins')
              .select('*')
              .eq('id', user.id)
              .single();
              
            if (adminData) {
              setProfile(adminData);
              setRole('admin');
              return;
            }
            
            // Must be a regular user
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .single();
              
            if (userData) {
              setProfile(userData);
              setRole(userData.role);
              return;
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setRole(null);
        }
      }
    );

    // Cleanup subscription
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Register a new user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const { email, password, firstName, lastName, role, organizationId, organizationName } = userData;
      
      // Register user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Create user profile based on role
      if (role === 'admin') {
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .insert([
            {
              id: data.user.id,
              email,
              first_name: firstName,
              last_name: lastName,
              organization_name: organizationName,
              organization_id: organizationId,
              status: 'active'
            }
          ]);
          
        if (adminError) throw adminError;
        
        setUser(data.user);
        setProfile(adminData[0]);
        setRole('admin');
      } else {
        // Regular user (customer or agent)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email,
              first_name: firstName,
              last_name: lastName,
              role: role || 'customer',
              organization_id: organizationId,
              status: 'active'
            }
          ]);
          
        if (userError) throw userError;
        
        setUser(data.user);
        setProfile(userData[0]);
        setRole(role || 'customer');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Login a user
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const { email, password } = credentials;
      
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
        setUser(data.user);
        setProfile(superAdminData);
        setRole('superadmin');
        return { success: true };
      }
      
      // Check if user is an admin
      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (adminData) {
        setUser(data.user);
        setProfile(adminData);
        setRole('admin');
        return { success: true };
      }
      
      // Must be a regular user
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (userData) {
        setUser(data.user);
        setProfile(userData);
        setRole(userData.role);
        return { success: true };
      }
      
      throw new Error('User profile not found');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout the current user
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      setRole(null);
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Update password
  const updatePassword = async (newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Get current session token
  const getToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  };

  // Context value
  const value = {
    user,
    profile,
    role,
    loading,
    error,
    register,
    login,
    logout,
    resetPassword,
    updatePassword,
    getToken,
    isAuthenticated: !!user,
    isSuperAdmin: role === 'superadmin',
    isAdmin: role === 'admin',
    isAgent: role === 'agent',
    isCustomer: role === 'customer',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
