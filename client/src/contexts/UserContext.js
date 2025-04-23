import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import supabase from '../utils/supabaseClient';

// Create context
const UserContext = createContext(null);

// Provider component
export const UserProvider = ({ children }) => {
  const { getToken, profile, role, isSuperAdmin, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create a new user
  const createUser = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch('/.netlify/functions/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role || 'customer',
          organizationId: userData.organizationId || profile.organization_id,
          createdBy: profile.id,
          status: userData.status || 'active'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }
      
      const newUser = await response.json();
      
      // Update local state
      setUsers(prevUsers => [...prevUsers, newUser]);
      
      return { success: true, user: newUser };
    } catch (error) {
      console.error('Create user error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Get user by ID
  const getUserById = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch(`/.netlify/functions/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user');
      }
      
      const user = await response.json();
      
      return user;
    } catch (error) {
      console.error('Get user error:', error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get users by organization
  const getUsersByOrganization = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      // Build query string
      const queryParams = new URLSearchParams({
        organizationId: profile.organization_id,
        ...params
      }).toString();
      
      const response = await fetch(`/.netlify/functions/users/organization?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      
      const data = await response.json();
      
      // Update local state
      setUsers(data.users);
      
      return data;
    } catch (error) {
      console.error('Get users error:', error);
      setError(error.message);
      return { users: [], totalCount: 0 };
    } finally {
      setLoading(false);
    }
  };

  // Update user
  const updateUser = async (userId, updateData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch(`/.netlify/functions/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          role: updateData.role,
          status: updateData.status
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }
      
      const updatedUser = await response.json();
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? updatedUser : user
        )
      );
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Update user error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch(`/.netlify/functions/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.filter(user => user.id !== userId)
      );
      
      return { success: true };
    } catch (error) {
      console.error('Delete user error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Search users
  const searchUsers = async (searchTerm, params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      // Build query string
      const queryParams = new URLSearchParams({
        organizationId: profile.organization_id,
        searchTerm,
        ...params
      }).toString();
      
      const response = await fetch(`/.netlify/functions/users/search?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search users');
      }
      
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error('Search users error:', error);
      setError(error.message);
      return { users: [], totalCount: 0 };
    } finally {
      setLoading(false);
    }
  };

  // Get current user profile
  const getCurrentUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch('/.netlify/functions/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch current user');
      }
      
      const userData = await response.json();
      
      return userData;
    } catch (error) {
      console.error('Get current user error:', error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    users,
    loading,
    error,
    createUser,
    getUserById,
    getUsersByOrganization,
    updateUser,
    deleteUser,
    searchUsers,
    getCurrentUser
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
