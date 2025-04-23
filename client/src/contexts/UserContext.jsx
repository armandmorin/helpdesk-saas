import React, { createContext, useState, useEffect, useContext } from 'react';
import supabase from '../utils/supabaseClient';
import { useAuth } from './AuthContext.jsx';
import { useOrganization } from './OrganizationContext.jsx';

// Create context
const UserContext = createContext(null);

// Provider component
export const UserProvider = ({ children }) => {
  const { user, role, profile } = useAuth();
  const { organization } = useOrganization();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch users based on role and organization
  useEffect(() => {
    if (user && (role === 'admin' || role === 'superadmin')) {
      if (role === 'admin' && organization) {
        fetchOrganizationUsers(organization.id);
      } else if (role === 'superadmin') {
        // Superadmin can see all admins
        fetchAdmins();
      }
    }
  }, [user, role, organization]);

  // Fetch users for an organization
  const fetchOrganizationUsers = async (organizationId, page = 1, size = 10, search = '') => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate range for pagination
      const from = (page - 1) * size;
      const to = from + size - 1;
      
      // Start building query
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId);
      
      // Apply search filter if provided
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      // Apply pagination
      query = query.range(from, to).order('created_at', { ascending: false });
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setUsers(data || []);
      setTotalCount(count || 0);
      
      return { success: true, users: data, totalCount: count };
    } catch (error) {
      console.error('Fetch organization users error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Fetch all admins (superadmin only)
  const fetchAdmins = async (page = 1, size = 10, search = '') => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate range for pagination
      const from = (page - 1) * size;
      const to = from + size - 1;
      
      // Start building query
      let query = supabase
        .from('admins')
        .select('*', { count: 'exact' });
      
      // Apply search filter if provided
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,organization_name.ilike.%${search}%`);
      }
      
      // Apply pagination
      query = query.range(from, to).order('created_at', { ascending: false });
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setUsers(data || []);
      setTotalCount(count || 0);
      
      return { success: true, admins: data, totalCount: count };
    } catch (error) {
      console.error('Fetch admins error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Create a new user
  const createUser = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const { email, password, firstName, lastName, role, organizationId } = userData;
      
      // Register user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Create user profile
      const { data: userData2, error: userError } = await supabase
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
        ])
        .select();
      
      if (userError) throw userError;
      
      // Refresh users list
      if (organizationId) {
        fetchOrganizationUsers(organizationId);
      }
      
      return { success: true, user: userData2[0] };
    } catch (error) {
      console.error('Create user error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Create a new admin (superadmin only)
  const createAdmin = async (adminData) => {
    try {
      setLoading(true);
      setError(null);
      
      const { email, password, firstName, lastName, organizationName } = adminData;
      
      // Register admin with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([
          {
            name: organizationName,
            admin_id: data.user.id,
            status: 'active'
          }
        ])
        .select();
      
      if (orgError) throw orgError;
      
      // Create admin profile
      const { data: adminData2, error: adminError } = await supabase
        .from('admins')
        .insert([
          {
            id: data.user.id,
            email,
            first_name: firstName,
            last_name: lastName,
            organization_name: organizationName,
            organization_id: orgData[0].id,
            status: 'active'
          }
        ])
        .select();
      
      if (adminError) throw adminError;
      
      // Refresh admins list
      fetchAdmins();
      
      return { success: true, admin: adminData2[0], organization: orgData[0] };
    } catch (error) {
      console.error('Create admin error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Update a user
  const updateUser = async (userId, updateData) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select();
      
      if (error) throw error;
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...updateData } : user
      ));
      
      return { success: true, user: data[0] };
    } catch (error) {
      console.error('Update user error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Update an admin (superadmin only)
  const updateAdmin = async (adminId, updateData) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('admins')
        .update(updateData)
        .eq('id', adminId)
        .select();
      
      if (error) throw error;
      
      // Update local state
      setUsers(users.map(admin => 
        admin.id === adminId ? { ...admin, ...updateData } : admin
      ));
      
      return { success: true, admin: data[0] };
    } catch (error) {
      console.error('Update admin error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Get agents for an organization
  const getOrganizationAgents = async (organizationId) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('role', 'agent')
        .eq('status', 'active');
      
      if (error) throw error;
      
      return { success: true, agents: data };
    } catch (error) {
      console.error('Get organization agents error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    users,
    loading,
    error,
    totalCount,
    fetchOrganizationUsers,
    fetchAdmins,
    createUser,
    createAdmin,
    updateUser,
    updateAdmin,
    getOrganizationAgents
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook to use the user context
export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
