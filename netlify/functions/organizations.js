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

    const path = event.path.replace('/.netlify/functions/organizations/', '');
    const body = JSON.parse(event.body || '{}');
    const queryParams = event.queryStringParameters || {};

    // Route handling
    switch (true) {
      // Create organization
      case path === 'create' && event.httpMethod === 'POST': {
        const { name, adminId, status, subdomain, customUrl, maxUsers } = body;
        
        const { data, error } = await supabase
          .from('organizations')
          .insert([{
            name,
            admin_id: adminId,
            status: status || 'active',
            subdomain,
            custom_url: customUrl,
            max_users: maxUsers || 5,
            current_users: 1
          }])
          .select();
        
        if (error) throw error;
        
        // Create default branding for the organization
        await supabase
          .from('organization_branding')
          .insert([{
            organization_id: data[0].id
          }]);
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(data[0])
        };
      }
      
      // Get organization by ID
      case /^[0-9a-fA-F-]+$/.test(path) && event.httpMethod === 'GET': {
        const orgId = path;
        
        const { data, error } = await supabase
          .from('organizations')
          .select(`
            *,
            organization_branding(*)
          `)
          .eq('id', orgId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Organization not found' })
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
      
      // Get organization by subdomain
      case path.startsWith('subdomain/') && event.httpMethod === 'GET': {
        const subdomain = path.replace('subdomain/', '');
        
        const { data, error } = await supabase
          .from('organizations')
          .select(`
            *,
            organization_branding(*)
          `)
          .eq('subdomain', subdomain)
          .eq('status', 'active')
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Organization not found' })
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
      
      // Get organization by custom URL
      case path.startsWith('custom-url/') && event.httpMethod === 'GET': {
        const customUrl = path.replace('custom-url/', '');
        
        const { data, error } = await supabase
          .from('organizations')
          .select(`
            *,
            organization_branding(*)
          `)
          .eq('custom_url', customUrl)
          .eq('status', 'active')
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Organization not found' })
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
      
      // Update organization
      case /^[0-9a-fA-F-]+$/.test(path) && event.httpMethod === 'PUT': {
        const orgId = path;
        const { name, status, subdomain, customUrl, maxUsers, currentUsers } = body;
        
        const { data, error } = await supabase
          .from('organizations')
          .update({
            name,
            status,
            subdomain,
            custom_url: customUrl,
            max_users: maxUsers,
            current_users: currentUsers,
            updated_at: new Date()
          })
          .eq('id', orgId)
          .select();
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data[0])
        };
      }
      
      // Update organization branding
      case path.endsWith('/branding') && event.httpMethod === 'PUT': {
        const orgId = path.split('/')[0];
        const { backgroundColor, sidebarColor, contentFontColor, sidebarFontColor, buttonColor, linkColor, logoUrl, faviconUrl } = body;
        
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
      
      // Get all organizations (for superadmin)
      case path === 'all' && event.httpMethod === 'GET': {
        const {
          status,
          search,
          page = '1',
          limit = '10',
          sortBy = 'created_at',
          sortOrder = 'desc'
        } = queryParams;
        
        // Check if user is superadmin
        const { data: superAdminData } = await supabase
          .from('super_admins')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (!superAdminData) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden' })
          };
        }
        
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
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        
        // Apply sorting
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        
        // Execute query with pagination
        const { data, error, count } = await query.range(from, to);
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            organizations: data,
            totalCount: count,
            page: pageNum,
            limit: limitNum
          })
        };
      }
      
      // Upload organization logo
      case path.endsWith('/logo') && event.httpMethod === 'POST': {
        const orgId = path.split('/')[0];
        
        // This would typically handle file uploads, but in Netlify Functions
        // we'd need to use a different approach like pre-signed URLs
        // For now, we'll just update the logo URL if provided
        const { logoUrl } = body;
        
        if (!logoUrl) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Logo URL is required' })
          };
        }
        
        const { data, error } = await supabase
          .from('organization_branding')
          .update({
            logo_url: logoUrl,
            updated_at: new Date()
          })
          .eq('organization_id', orgId)
          .select();
        
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
    console.error('Organizations function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
