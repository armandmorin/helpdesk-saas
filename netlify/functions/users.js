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

    const path = event.path.replace('/.netlify/functions/users/', '');
    const body = JSON.parse(event.body || '{}');
    const queryParams = event.queryStringParameters || {};

    // Route handling
    switch (true) {
      // Create user
      case path === 'create' && event.httpMethod === 'POST': {
        const { email, password, firstName, lastName, role, organizationId, createdBy, status } = body;
        
        // First create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        });
        
        if (authError) throw authError;
        
        // Then create user profile
        const { data, error } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            email,
            first_name: firstName,
            last_name: lastName,
            role: role || 'customer',
            organization_id: organizationId,
            created_by: createdBy || user.id,
            status: status || 'active'
          }])
          .select();
        
        if (error) throw error;
        
        // Update organization user count
        if (organizationId) {
          await supabase.rpc('increment_organization_users', {
            org_id: organizationId
          });
        }
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(data[0])
        };
      }
      
      // Get user by ID
      case /^[0-9a-fA-F-]+$/.test(path) && event.httpMethod === 'GET': {
        const userId = path;
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'User not found' })
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
      
      // Get users by organization
      case path === 'organization' && event.httpMethod === 'GET': {
        const {
          organizationId,
          role,
          status,
          search,
          page = '1',
          limit = '10',
          sortBy = 'created_at',
          sortOrder = 'desc'
        } = queryParams;
        
        if (!organizationId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Organization ID is required' })
          };
        }
        
        let query = supabase
          .from('users')
          .select('*', { count: 'exact' })
          .eq('organization_id', organizationId);
        
        // Apply filters
        if (role) {
          query = query.eq('role', role);
        }
        
        if (status) {
          query = query.eq('status', status);
        }
        
        if (search) {
          query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
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
            users: data,
            totalCount: count,
            page: pageNum,
            limit: limitNum
          })
        };
      }
      
      // Update user
      case /^[0-9a-fA-F-]+$/.test(path) && event.httpMethod === 'PUT': {
        const userId = path;
        const { firstName, lastName, role, status } = body;
        
        const { data, error } = await supabase
          .from('users')
          .update({
            first_name: firstName,
            last_name: lastName,
            role,
            status,
            updated_at: new Date()
          })
          .eq('id', userId)
          .select();
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data[0])
        };
      }
      
      // Delete user
      case /^[0-9a-fA-F-]+$/.test(path) && event.httpMethod === 'DELETE': {
        const userId = path;
        
        // Get user to check organization
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', userId)
          .single();
        
        // Delete user
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);
        
        if (error) throw error;
        
        // Update organization user count
        if (userData?.organization_id) {
          await supabase.rpc('decrement_organization_users', {
            org_id: userData.organization_id
          });
        }
        
        // Delete auth user
        await supabase.auth.admin.deleteUser(userId);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }
      
      // Search users
      case path === 'search' && event.httpMethod === 'GET': {
        const {
          organizationId,
          searchTerm,
          page = '1',
          limit = '10'
        } = queryParams;
        
        if (!searchTerm) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Search term is required' })
          };
        }
        
        let query = supabase
          .from('users')
          .select('*', { count: 'exact' })
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        
        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }
        
        // Apply pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        
        const { data, error, count } = await query.range(from, to);
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            users: data,
            totalCount: count,
            page: pageNum,
            limit: limitNum
          })
        };
      }
      
      // Get current user profile
      case path === 'me' && event.httpMethod === 'GET': {
        const userId = user.id;
        
        // Check if user is a superadmin
        const { data: superAdminData } = await supabase
          .from('super_admins')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (superAdminData) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              user, 
              profile: superAdminData, 
              role: 'superadmin'
            })
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
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              user, 
              profile: adminData, 
              role: 'admin'
            })
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
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              user, 
              profile: userData, 
              role: userData.role
            })
          };
        }
        
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User profile not found' })
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
    console.error('Users function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
