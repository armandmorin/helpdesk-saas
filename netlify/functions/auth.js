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
    'Access-Control-Allow-Headers': 'Content-Type',
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

  try {
    const path = event.path.replace('/.netlify/functions/auth/', '');
    const body = JSON.parse(event.body || '{}');

    // Route handling
    switch (path) {
      case 'register': {
        const { email, password, firstName, lastName, role, organizationId, organizationName, createdBy } = body;
        
        // Register user with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (authError) throw authError;
        
        // Create user profile based on role
        if (role === 'admin') {
          const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .insert([
              {
                id: authData.user.id,
                email,
                first_name: firstName,
                last_name: lastName,
                organization_name: organizationName,
                organization_id: organizationId,
                created_by: createdBy || null,
                status: 'active'
              }
            ]);
            
          if (adminError) throw adminError;
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              user: authData.user, 
              profile: adminData[0],
              token: authData.session?.access_token 
            })
          };
        } else {
          // Regular user (customer or agent)
          const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([
              {
                id: authData.user.id,
                email,
                first_name: firstName,
                last_name: lastName,
                role: role || 'customer',
                organization_id: organizationId,
                created_by: createdBy,
                status: 'active'
              }
            ]);
            
          if (userError) throw userError;
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              user: authData.user, 
              profile: userData[0],
              token: authData.session?.access_token 
            })
          };
        }
      }
      
      case 'login': {
        const { email, password } = body;
        
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
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              user: data.user, 
              profile: superAdminData, 
              role: 'superadmin',
              token: data.session.access_token
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
              user: data.user, 
              profile: adminData, 
              role: 'admin',
              token: data.session.access_token
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
              user: data.user, 
              profile: userData, 
              role: userData.role,
              token: data.session.access_token
            })
          };
        }
        
        throw new Error('User profile not found');
      }
      
      case 'logout': {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }
      
      case 'reset-password': {
        const { email } = body;
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.URL}/reset-password`,
        });
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }
      
      case 'update-password': {
        const { token, password } = body;
        
        const { error } = await supabase.auth.updateUser({
          password
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
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
    console.error('Auth function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
