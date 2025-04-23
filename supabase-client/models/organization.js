import supabase from '../supabase';

/**
 * Organization service for Supabase
 */
export const OrganizationService = {
  /**
   * Create a new organization
   * @param {Object} orgData - Organization data
   * @returns {Promise} - Created organization
   */
  async createOrganization(orgData) {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert([{
          name: orgData.name,
          admin_id: orgData.adminId,
          status: orgData.status || 'active',
          subdomain: orgData.subdomain,
          custom_url: orgData.customUrl,
          max_users: orgData.maxUsers || 5,
          current_users: orgData.currentUsers || 1
        }])
        .select();
      
      if (error) throw error;
      
      // Create default branding for the organization
      await supabase
        .from('organization_branding')
        .insert([{
          organization_id: data[0].id
        }]);
      
      return data[0];
    } catch (error) {
      console.error('Create organization error:', error);
      throw error;
    }
  },
  
  /**
   * Get organization by ID
   * @param {string} orgId - Organization ID
   * @returns {Promise} - Organization details
   */
  async getOrganizationById(orgId) {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_branding(*)
        `)
        .eq('id', orgId)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Get organization error:', error);
      throw error;
    }
  },
  
  /**
   * Get organization by subdomain
   * @param {string} subdomain - Organization subdomain
   * @returns {Promise} - Organization details
   */
  async getOrganizationBySubdomain(subdomain) {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_branding(*)
        `)
        .eq('subdomain', subdomain)
        .eq('status', 'active')
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Get organization by subdomain error:', error);
      throw error;
    }
  },
  
  /**
   * Get organization by custom URL
   * @param {string} customUrl - Organization custom URL
   * @returns {Promise} - Organization details
   */
  async getOrganizationByCustomUrl(customUrl) {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_branding(*)
        `)
        .eq('custom_url', customUrl)
        .eq('status', 'active')
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Get organization by custom URL error:', error);
      throw error;
    }
  },
  
  /**
   * Update organization
   * @param {string} orgId - Organization ID
   * @param {Object} updateData - Data to update
   * @returns {Promise} - Updated organization
   */
  async updateOrganization(orgId, updateData) {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update({
          name: updateData.name,
          status: updateData.status,
          subdomain: updateData.subdomain,
          custom_url: updateData.customUrl,
          max_users: updateData.maxUsers,
          current_users: updateData.currentUsers,
          updated_at: new Date()
        })
        .eq('id', orgId)
        .select();
      
      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Update organization error:', error);
      throw error;
    }
  },
  
  /**
   * Update organization branding
   * @param {string} orgId - Organization ID
   * @param {Object} brandingData - Branding data
   * @returns {Promise} - Updated branding
   */
  async updateOrganizationBranding(orgId, brandingData) {
    try {
      // Check if branding exists
      const { data: existingBranding } = await supabase
        .from('organization_branding')
        .select('*')
        .eq('organization_id', orgId)
        .single();
      
      if (existingBranding) {
        // Update existing branding
        const { data, error } = await supabase
          .from('organization_branding')
          .update({
            background_color: brandingData.backgroundColor,
            sidebar_color: brandingData.sidebarColor,
            content_font_color: brandingData.contentFontColor,
            sidebar_font_color: brandingData.sidebarFontColor,
            button_color: brandingData.buttonColor,
            link_color: brandingData.linkColor,
            logo_url: brandingData.logoUrl,
            favicon_url: brandingData.faviconUrl,
            updated_at: new Date()
          })
          .eq('organization_id', orgId)
          .select();
        
        if (error) throw error;
        
        return data[0];
      } else {
        // Create new branding
        const { data, error } = await supabase
          .from('organization_branding')
          .insert([{
            organization_id: orgId,
            background_color: brandingData.backgroundColor,
            sidebar_color: brandingData.sidebarColor,
            content_font_color: brandingData.contentFontColor,
            sidebar_font_color: brandingData.sidebarFontColor,
            button_color: brandingData.buttonColor,
            link_color: brandingData.linkColor,
            logo_url: brandingData.logoUrl,
            favicon_url: brandingData.faviconUrl
          }])
          .select();
        
        if (error) throw error;
        
        return data[0];
      }
    } catch (error) {
      console.error('Update organization branding error:', error);
      throw error;
    }
  },
  
  /**
   * Get all organizations (for superadmin)
   * @param {Object} params - Query parameters
   * @returns {Promise} - Organizations and count
   */
  async getAllOrganizations(params) {
    try {
      const {
        status,
        search,
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = params;
      
      let query = supabase
        .from('organizations')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      
      if (search) {
        query = query.ilike('name', `%${search}%`);
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
        organizations: data,
        totalCount: count,
        page,
        limit
      };
    } catch (error) {
      console.error('Get organizations error:', error);
      throw error;
    }
  },
  
  /**
   * Upload organization logo
   * @param {string} orgId - Organization ID
   * @param {File} logoFile - Logo file
   * @returns {Promise} - Upload result with URL
   */
  async uploadOrganizationLogo(orgId, logoFile) {
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${orgId}/logo.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('organization-assets')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(fileName);
      
      // Update organization branding with logo URL
      await this.updateOrganizationBranding(orgId, {
        logoUrl: publicUrlData.publicUrl
      });
      
      return {
        success: true,
        url: publicUrlData.publicUrl
      };
    } catch (error) {
      console.error('Upload logo error:', error);
      throw error;
    }
  }
};

export default OrganizationService;
