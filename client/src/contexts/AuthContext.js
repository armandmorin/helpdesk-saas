import { createContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import config from '../config';

// Create Supabase client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

// Create auth context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await fetch(`${config.API_URL}/auth/me`, {
            headers: {
              'x-auth-token': token
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Token invalid or expired
            localStorage.removeItem('token');
            setToken(null);
          }
        } catch (error) {
          console.error('Error loading user:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      
      setLoading(false);
    };
    
    loadUser();
  }, [token]);

  // Register user
  const register = async (userData) => {
    try {
      const response = await fetch(`${config.API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        return { success: true };
      } else {
        return { success: false, error: data.msg || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Server error' };
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      const response = await fetch(`${config.API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        return { success: true };
      } else {
        return { success: false, error: data.msg || 'Invalid credentials' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Server error' };
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Create subuser
  const createSubuser = async (userData) => {
    try {
      const response = await fetch(`${config.API_URL}/auth/subuser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return { success: true, userId: data.userId };
      } else {
        return { success: false, error: data.msg || 'Failed to create subuser' };
      }
    } catch (error) {
      console.error('Subuser creation error:', error);
      return { success: false, error: 'Server error' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        register,
        login,
        logout,
        createSubuser,
        isAuthenticated: !!token,
        isAdmin: user?.role === 'admin',
        isAgent: user?.role === 'agent' || user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
