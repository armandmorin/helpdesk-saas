import React, { createContext, useState, useEffect, useContext } from 'react';
import supabase from '../utils/supabaseClient';
import { useAuth } from './AuthContext.jsx';

// Create context
const OrganizationContext = createContext(null);

// Provider component
export const OrganizationProvider = ({ children }) => {
  const { user, role, profile } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch organization data when user profile changes
  useEffect(() => {
    if (profile && (role === 'admin' || role === 'agent' || role === 'customer')) {
      fetchOrganization(profile.organization_id);
    } else if (profile && role === 'superadmin') {
      // Superadmins don't have a specific organization
      setOrganization(null);
      fetchPlatformBranding();
    }
  }, [profile, role]);

  // Fetch organization by ID
  const fetchOrganization = async (organizationId) => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();
      
      if (error) throw error;
      
      setOrganization(data);
      
      // Fetch organization branding
      fetchOrganizationBranding(organizationId);
      
      return { success: true, organization: data };
    } catch (error) {
      console.error('Fetch organization error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Fetch organization branding
  const fetchOrganizationBranding = async (organizationId) => {
    try {
      const { data, error } = await supabase
        .from('organization_branding')
        .select('*')
        .eq('organization_id', organizationId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        throw error;
      }
      
      if (data) {
        setBranding(data);
      } else {
        // If no organization branding, fetch platform default branding
        fetchPlatformBranding();
      }
      
      return { success: true, branding: data };
    } catch (error) {
      console.error('Fetch organization branding error:', error);
      // Fall back to platform branding
      fetchPlatformBranding();
      return { success: false, error: error.message };
    }
  };

  // Fetch platform branding (default)
  const fetchPlatformBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_branding')
        .select('*')
        .single();
      
      if (error) throw error;
      
      setBranding(data);
      
      return { success: true, branding: data };
    } catch (error) {
      console.error('Fetch platform branding error:', error);
      // Set default branding values
      setBranding({
        logo_url: null,
        background_color: '#ffffff',
        sidebar_color: '#f8f9fa',
        font_color: '#212529',
        sidebar_font_color: '#495057',
        button_color: '#0d6efd',
        link_color: '#0d6efd'
      });
      return { success: false, error: error.message };
    }
  };

  // Update organization
  const updateOrganization = async (organizationId, updateData) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organizationId)
        .select();
      
      if (error) throw error;
      
      setOrganization(data[0]);
      
      return { success: true, organization: data[0] };
    } catch (error) {
      console.error('Update organization error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Update organization branding
  const updateOrganizationBranding = async (organizationId, brandingData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if branding exists for this organization
      const { data: existingData, error: checkError } = await supabase
        .from('organization_branding')
        .select('id')
        .eq('organization_id', organizationId)
        .single();
      
      let result;
      
      if (existingData) {
        // Update existing branding
        const { data, error } = await supabase
          .from('organization_branding')
          .update(brandingData)
          .eq('organization_id', organizationId)
          .select();
        
        if (error) throw error;
        
        result = data[0];
      } else {
        // Insert new branding
        const { data, error } = await supabase
          .from('organization_branding')
          .insert([{ ...brandingData, organization_id: organizationId }])
          .select();
        
        if (error) throw error;
        
        result = data[0];
      }
      
      setBranding(result);
      
      return { success: true, branding: result };
    } catch (error) {
      console.error('Update organization branding error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Update platform branding (superadmin only)
  const updatePlatformBranding = async (brandingData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if platform branding exists
      const { data: existingData, error: checkError } = await supabase
        .from('platform_branding')
        .select('id')
        .single();
      
      let result;
      
      if (existingData) {
        // Update existing branding
        const { data, error } = await supabase
          .from('platform_branding')
          .update(brandingData)
          .eq('id', existingData.id)
          .select();
        
        if (error) throw error;
        
        result = data[0];
      } else {
        // Insert new branding
        const { data, error } = await supabase
          .from('platform_branding')
          .insert([brandingData])
          .select();
        
        if (error) throw error;
        
        result = data[0];
      }
      
      setBranding(result);
      
      return { success: true, branding: result };
    } catch (error) {
      console.error('Update platform branding error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Upload logo
  const uploadLogo = async (file, organizationId = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${organizationId || 'platform'}-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('branding')
        .upload(filePath, file);
      
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);
      
      const logoUrl = urlData.publicUrl;
      
      // Update branding with new logo URL
      if (organizationId) {
        await updateOrganizationBranding(organizationId, { logo_url: logoUrl });
      } else {
        await updatePlatformBranding({ logo_url: logoUrl });
      }
      
      return { success: true, logoUrl };
    } catch (error) {
      console.error('Upload logo error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Get all organizations (superadmin only)
  const getAllOrganizations = async (page = 1, size = 10, search = '') => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate range for pagination
      const from = (page - 1) * size;
      const to = from + size - 1;
      
      // Start building query
      let query = supabase
        .from('organizations')
        .select('*, admin:admins(*)', { count: 'exact' });
      
      // Apply search filter if provided
      if (search) {
        query = query.or(`name.ilike.%${search}%,domain.ilike.%${search}%`);
      }
      
      // Apply pagination
      query = query.range(from, to).order('created_at', { ascending: false });
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return { success: true, organizations: data, totalCount: count };
    } catch (error) {
      console.error('Get all organizations error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    organization,
    branding,
    loading,
    error,
    fetchOrganization,
    updateOrganization,
    updateOrganizationBranding,
    updatePlatformBranding,
    uploadLogo,
    getAllOrganizations
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
