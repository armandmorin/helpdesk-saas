import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Get token from Authorization header
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    const path = event.path.replace('/.netlify/functions/branding/', '');
    const body = JSON.parse(event.body || '{}');
    const queryParams = event.queryStringParameters || {};

    // Route handling
    switch (true) {
      // Get platform branding (superadmin only)
      case path === 'platform' && event.httpMethod === 'GET': {
        // Check if user is a superadmin
        const { data: superAdminData } = await supabase
          .from('super_admins')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (!superAdminData) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden: Only superadmins can access platform branding' })
          };
        }
        
        const { data, error } = await supabase
          .from('platform_branding')
          .select('*')
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            // No branding exists yet, return default branding
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                background_color: '#ffffff',
                sidebar_color: '#f8f9fa',
                content_font_color: '#333333',
                sidebar_font_color: '#333333',
                button_color: '#4a6cf7',
                link_color: '#4a6cf7'
              })
            };
          }
          throw error;
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data)
        };
      }
      
      // Update platform branding (superadmin only)
      case path === 'platform' && event.httpMethod === 'PUT': {
        // Check if user is a superadmin
        const { data: superAdminData } = await supabase
          .from('super_admins')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (!superAdminData) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden: Only superadmins can update platform branding' })
          };
        }
        
        const { 
          backgroundColor, 
          sidebarColor, 
          contentFontColor, 
          sidebarFontColor, 
          buttonColor, 
          linkColor,
          logoUrl,
          faviconUrl
        } = body;
        
        // Check if branding exists
        const { data: existingBranding } = await supabase
          .from('platform_branding')
          .select('id')
          .single();
        
        let data, error;
        
        if (existingBranding) {
          // Update existing branding
          const result = await supabase
            .from('platform_branding')
            .update({
              background_color: backgroundColor,
              sidebar_color: sidebarColor,
              content_font_color: contentFontColor,
              sidebar_font_color: sidebarFontColor,
              button_color: buttonColor,
              link_color: linkColor,
              logo_url: logoUrl,
              favicon_url: faviconUrl,
              updated_at: new Date()
            })
            .eq('id', existingBranding.id)
            .select();
          
          data = result.data;
          error = result.error;
        } else {
          // Create new branding
          const result = await supabase
            .from('platform_branding')
            .insert([{
              background_color: backgroundColor,
              sidebar_color: sidebarColor,
              content_font_color: contentFontColor,
              sidebar_font_color: sidebarFontColor,
              button_color: buttonColor,
              link_color: linkColor,
              logo_url: logoUrl,
              favicon_url: faviconUrl
            }])
            .select();
          
          data = result.data;
          error = result.error;
        }
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data[0])
        };
      }
      
      // Get organization branding
      case /^organization\/[0-9a-fA-F-]+$/.test(path) && event.httpMethod === 'GET': {
        const orgId = path.split('/')[1];
        
        // Check if user has access to this organization
        const hasAccess = await checkOrganizationAccess(user.id, orgId);
        if (!hasAccess) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden: No access to this organization' })
          };
        }
        
        const { data, error } = await supabase
          .from('organization_branding')
          .select('*')
          .eq('organization_id', orgId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            // No branding exists yet, get platform defaults
            const { data: platformData } = await supabase
              .from('platform_branding')
              .select('*')
              .single();
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(platformData || {
                background_color: '#ffffff',
                sidebar_color: '#f8f9fa',
                content_font_color: '#333333',
                sidebar_font_color: '#333333',
                button_color: '#4a6cf7',
                link_color: '#4a6cf7'
              })
            };
          }
          throw error;
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data)
        };
      }
      
      // Update organization branding
      case /^organization\/[0-9a-fA-F-]+$/.test(path) && event.httpMethod === 'PUT': {
        const orgId = path.split('/')[1];
        
        // Check if user has admin access to this organization
        const hasAdminAccess = await checkOrganizationAdminAccess(user.id, orgId);
        if (!hasAdminAccess) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden: Admin access required' })
          };
        }
        
        const { 
          backgroundColor, 
          sidebarColor, 
          contentFontColor, 
          sidebarFontColor, 
          buttonColor, 
          linkColor,
          logoUrl,
          faviconUrl
        } = body;
        
        // Check if branding exists
        const { data: existingBranding } = await supabase
          .from('organization_branding')
          .select('*')
          .eq('organization_id', orgId)
          .single();
        
        let data, error;
        
        if (existingBranding) {
          // Update existing branding
          const result = await supabase
            .from('organization_branding')
            .update({
              background_color: backgroundColor,
              sidebar_color: sidebarColor,
              content_font_color: contentFontColor,
              sidebar_font_color: sidebarFontColor,
              button_color: buttonColor,
              link_color: linkColor,
              logo_url: logoUrl,
              favicon_url: faviconUrl,
              updated_at: new Date()
            })
            .eq('organization_id', orgId)
            .select();
          
          data = result.data;
          error = result.error;
        } else {
          // Create new branding
          const result = await supabase
            .from('organization_branding')
            .insert([{
              organization_id: orgId,
              background_color: backgroundColor,
              sidebar_color: sidebarColor,
              content_font_color: contentFontColor,
              sidebar_font_color: sidebarFontColor,
              button_color: buttonColor,
              link_color: linkColor,
              logo_url: logoUrl,
              favicon_url: faviconUrl
            }])
            .select();
          
          data = result.data;
          error = result.error;
        }
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data[0])
        };
      }
      
      // Upload logo
      case /^upload\/[0-9a-fA-F-]+\/logo$/.test(path) && event.httpMethod === 'POST': {
        const orgId = path.split('/')[1];
        
        // Check if user has admin access to this organization
        const hasAdminAccess = await checkOrganizationAdminAccess(user.id, orgId);
        if (!hasAdminAccess) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden: Admin access required' })
          };
        }
        
        // For file uploads, we'd typically use pre-signed URLs
        // This is a simplified version that just updates the URL
        const { logoUrl } = body;
        
        if (!logoUrl) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Logo URL is required' })
          };
        }
        
        // Check if branding exists
        const { data: existingBranding } = await supabase
          .from('organization_branding')
          .select('*')
          .eq('organization_id', orgId)
          .single();
        
        let data, error;
        
        if (existingBranding) {
          // Update existing branding
          const result = await supabase
            .from('organization_branding')
            .update({
              logo_url: logoUrl,
              updated_at: new Date()
            })
            .eq('organization_id', orgId)
            .select();
          
          data = result.data;
          error = result.error;
        } else {
          // Create new branding with logo
          const result = await supabase
            .from('organization_branding')
            .insert([{
              organization_id: orgId,
              logo_url: logoUrl
            }])
            .select();
          
          data = result.data;
          error = result.error;
        }
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            url: logoUrl
          })
        };
      }
      
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Not Found' })
        };
    }
  } catch (error) {
    console.error('Branding function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Helper function to check if user has access to an organization
async function checkOrganizationAccess(userId, orgId) {
  // Check if user is a superadmin
  const { data: superAdminData } = await supabase
    .from('super_admins')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (superAdminData) {
    return true;
  }
  
  // Check if user is an admin of this organization
  const { data: adminData } = await supabase
    .from('admins')
    .select('*')
    .eq('id', userId)
    .eq('organization_id', orgId)
    .single();
    
  if (adminData) {
    return true;
  }
  
  // Check if user belongs to this organization
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .eq('organization_id', orgId)
    .single();
    
  return !!userData;
}

// Helper function to check if user has admin access to an organization
async function checkOrganizationAdminAccess(userId, orgId) {
  // Check if user is a superadmin
  const { data: superAdminData } = await supabase
    .from('super_admins')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (superAdminData) {
    return true;
  }
  
  // Check if user is an admin of this organization
  const { data: adminData } = await supabase
    .from('admins')
    .select('*')
    .eq('id', userId)
    .eq('organization_id', orgId)
    .single();
    
  return !!adminData;
}
