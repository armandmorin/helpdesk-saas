import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import supabase from '../utils/supabaseClient';

// Create context
const OrganizationContext = createContext(null);

// Provider component
export const OrganizationProvider = ({ children }) => {
  const { getToken, profile, role, isSuperAdmin, isAdmin } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load organization data if user is authenticated
  useEffect(() => {
    if (profile && profile.organization_id) {
      getOrganizationById(profile.organization_id);
      getOrganizationBranding(profile.organization_id);
    }
  }, [profile]);

  // Create a new organization
  const createOrganization = async (orgData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch('/.netlify/functions/organizations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: orgData.name,
          adminId: orgData.adminId,
          status: orgData.status || 'active',
          subdomain: orgData.subdomain,
          customUrl: orgData.customUrl,
          maxUsers: orgData.maxUsers || 5
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create organization');
      }
      
      const newOrg = await response.json();
      
      // Update local state if superadmin
      if (isSuperAdmin) {
        setOrganizations(prevOrgs => [...prevOrgs, newOrg]);
      }
      
      return { success: true, organization: newOrg };
    } catch (error) {
      console.error('Create organization error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Get organization by ID
  const getOrganizationById = async (orgId) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch(`/.netlify/functions/organizations/${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch organization');
      }
      
      const org = await response.json();
      setOrganization(org);
      
      return org;
    } catch (error) {
      console.error('Get organization error:', error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get organization branding
  const getOrganizationBranding = async (orgId) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch(`/.netlify/functions/branding/organization/${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch branding');
      }
      
      const brandingData = await response.json();
      setBranding(brandingData);
      
      return brandingData;
    } catch (error) {
      console.error('Get branding error:', error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update organization branding
  const updateOrganizationBranding = async (orgId, brandingData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch(`/.netlify/functions/branding/organization/${orgId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          backgroundColor: brandingData.backgroundColor,
          sidebarColor: brandingData.sidebarColor,
          contentFontColor: brandingData.contentFontColor,
          sidebarFontColor: brandingData.sidebarFontColor,
          buttonColor: brandingData.buttonColor,
          linkColor: brandingData.linkColor,
          logoUrl: brandingData.logoUrl,
          faviconUrl: brandingData.faviconUrl
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update branding');
      }
      
      const updatedBranding = await response.json();
      setBranding(updatedBranding);
      
      return { success: true, branding: updatedBranding };
    } catch (error) {
      console.error('Update branding error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Get all organizations (for superadmin)
  const getAllOrganizations = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!isSuperAdmin) {
        throw new Error('Unauthorized: Only superadmins can access all organizations');
      }
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      // Build query string
      const queryParams = new URLSearchParams(params).toString();
      
      const response = await fetch(`/.netlify/functions/organizations/all?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch organizations');
      }
      
      const data = await response.json();
      setOrganizations(data.organizations);
      
      return data;
    } catch (error) {
      console.error('Get organizations error:', error);
      setError(error.message);
      return { organizations: [], totalCount: 0 };
    } finally {
      setLoading(false);
    }
  };

  // Update organization
  const updateOrganization = async (orgId, updateData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch(`/.netlify/functions/organizations/${orgId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update organization');
      }
      
      const updatedOrg = await response.json();
      
      // Update local state
      if (organization && organization.id === orgId) {
        setOrganization(updatedOrg);
      }
      
      if (isSuperAdmin) {
        setOrganizations(prevOrgs => 
          prevOrgs.map(org => 
            org.id === orgId ? updatedOrg : org
          )
        );
      }
      
      return { success: true, organization: updatedOrg };
    } catch (error) {
      console.error('Update organization error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Upload organization logo
  const uploadOrganizationLogo = async (orgId, logoUrl) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch(`/.netlify/functions/organizations/${orgId}/logo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ logoUrl })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload logo');
      }
      
      const result = await response.json();
      
      // Update branding with new logo URL
      if (branding) {
        setBranding({
          ...branding,
          logo_url: result.url
        });
      }
      
      return { success: true, url: result.url };
    } catch (error) {
      console.error('Upload logo error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Get platform branding (superadmin only)
  const getPlatformBranding = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!isSuperAdmin) {
        throw new Error('Unauthorized: Only superadmins can access platform branding');
      }
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch('/.netlify/functions/branding/platform', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch platform branding');
      }
      
      const platformBranding = await response.json();
      
      return platformBranding;
    } catch (error) {
      console.error('Get platform branding error:', error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update platform branding (superadmin only)
  const updatePlatformBranding = async (brandingData) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!isSuperAdmin) {
        throw new Error('Unauthorized: Only superadmins can update platform branding');
      }
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch('/.netlify/functions/branding/platform', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          backgroundColor: brandingData.backgroundColor,
          sidebarColor: brandingData.sidebarColor,
          contentFontColor: brandingData.contentFontColor,
          sidebarFontColor: brandingData.sidebarFontColor,
          buttonColor: brandingData.buttonColor,
          linkColor: brandingData.linkColor,
          logoUrl: brandingData.logoUrl,
          faviconUrl: brandingData.faviconUrl
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update platform branding');
      }
      
      const updatedBranding = await response.json();
      
      return { success: true, branding: updatedBranding };
    } catch (error) {
      console.error('Update platform branding error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    organization,
    organizations,
    branding,
    loading,
    error,
    createOrganization,
    getOrganizationById,
    getOrganizationBranding,
    updateOrganizationBranding,
    getAllOrganizations,
    updateOrganization,
    uploadOrganizationLogo,
    getPlatformBranding,
    updatePlatformBranding
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
};

// Custom hook to use the organization context
export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

export default OrganizationContext;
