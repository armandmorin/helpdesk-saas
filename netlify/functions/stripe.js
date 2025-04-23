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
        body: JSON.stringify({ error: 'Forbidden: Only superadmins can access this endpoint' })
      };
    }

    const path = event.path.replace('/.netlify/functions/stripe/', '');
    const body = JSON.parse(event.body || '{}');
    const queryParams = event.queryStringParameters || {};

    // Route handling
    switch (true) {
      // Get Stripe configuration
      case path === 'config' && event.httpMethod === 'GET': {
        const { data, error } = await supabase
          .from('platform_stripe_config')
          .select('*')
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            // No config exists yet, return empty config
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                test_mode: true,
                enabled: false
              })
            };
          }
          throw error;
        }
        
        // Don't return secret keys to the frontend
        const safeConfig = {
          id: data.id,
          test_mode: data.test_mode,
          test_publishable_key: data.test_publishable_key,
          live_publishable_key: data.live_publishable_key,
          enabled: data.enabled,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(safeConfig)
        };
      }
      
      // Update Stripe configuration
      case path === 'config' && event.httpMethod === 'PUT': {
        const { 
          testMode, 
          testPublishableKey, 
          testSecretKey, 
          livePublishableKey, 
          liveSecretKey, 
          webhookSecret,
          enabled 
        } = body;
        
        // Check if config exists
        const { data: existingConfig } = await supabase
          .from('platform_stripe_config')
          .select('id')
          .single();
        
        let data, error;
        
        if (existingConfig) {
          // Update existing config
          const result = await supabase
            .from('platform_stripe_config')
            .update({
              test_mode: testMode,
              test_publishable_key: testPublishableKey,
              test_secret_key: testSecretKey,
              live_publishable_key: livePublishableKey,
              live_secret_key: liveSecretKey,
              webhook_secret: webhookSecret,
              enabled: enabled,
              updated_at: new Date()
            })
            .eq('id', existingConfig.id)
            .select();
          
          data = result.data;
          error = result.error;
        } else {
          // Create new config
          const result = await supabase
            .from('platform_stripe_config')
            .insert([{
              test_mode: testMode,
              test_publishable_key: testPublishableKey,
              test_secret_key: testSecretKey,
              live_publishable_key: livePublishableKey,
              live_secret_key: liveSecretKey,
              webhook_secret: webhookSecret,
              enabled: enabled
            }])
            .select();
          
          data = result.data;
          error = result.error;
        }
        
        if (error) throw error;
        
        // Don't return secret keys to the frontend
        const safeConfig = {
          id: data[0].id,
          test_mode: data[0].test_mode,
          test_publishable_key: data[0].test_publishable_key,
          live_publishable_key: data[0].live_publishable_key,
          enabled: data[0].enabled,
          created_at: data[0].created_at,
          updated_at: data[0].updated_at
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(safeConfig)
        };
      }
      
      // Create pricing plan
      case path === 'plans' && event.httpMethod === 'POST': {
        const { name, description, price, billingCycle, features, maxUsers, isActive } = body;
        
        const { data, error } = await supabase
          .from('pricing_plans')
          .insert([{
            name,
            description,
            price,
            billing_cycle: billingCycle,
            features: features || [],
            max_users: maxUsers,
            is_active: isActive !== undefined ? isActive : true
          }])
          .select();
        
        if (error) throw error;
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(data[0])
        };
      }
      
      // Get all pricing plans
      case path === 'plans' && event.httpMethod === 'GET': {
        const { data, error } = await supabase
          .from('pricing_plans')
          .select('*')
          .order('price', { ascending: true });
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data)
        };
      }
      
      // Update pricing plan
      case /^plans\/[0-9a-fA-F-]+$/.test(path) && event.httpMethod === 'PUT': {
        const planId = path.split('/')[1];
        const { name, description, price, billingCycle, features, maxUsers, isActive } = body;
        
        const { data, error } = await supabase
          .from('pricing_plans')
          .update({
            name,
            description,
            price,
            billing_cycle: billingCycle,
            features: features || [],
            max_users: maxUsers,
            is_active: isActive,
            updated_at: new Date()
          })
          .eq('id', planId)
          .select();
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data[0])
        };
      }
      
      // Delete pricing plan
      case /^plans\/[0-9a-fA-F-]+$/.test(path) && event.httpMethod === 'DELETE': {
        const planId = path.split('/')[1];
        
        const { error } = await supabase
          .from('pricing_plans')
          .delete()
          .eq('id', planId);
        
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
    console.error('Stripe function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
