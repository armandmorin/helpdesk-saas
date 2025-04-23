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

    const path = event.path.replace('/.netlify/functions/tickets/', '');
    const body = JSON.parse(event.body || '{}');
    const queryParams = event.queryStringParameters || {};

    // Route handling
    switch (true) {
      // Create ticket
      case path === 'create' && event.httpMethod === 'POST': {
        const { title, description, status, priority, category, organizationId, createdBy, assignedTo } = body;
        
        const { data, error } = await supabase
          .from('tickets')
          .insert([{
            title,
            description,
            status: status || 'open',
            priority: priority || 'medium',
            category: category || 'General',
            created_by: createdBy || user.id,
            assigned_to: assignedTo,
            organization_id: organizationId
          }])
          .select();
        
        if (error) throw error;
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(data[0])
        };
      }
      
      // Get tickets for organization
      case path === 'organization' && event.httpMethod === 'GET': {
        const {
          organizationId,
          status,
          priority,
          category,
          assignedTo,
          createdBy,
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
          .from('tickets')
          .select('*, created_by(*), assigned_to(*)', { count: 'exact' })
          .eq('organization_id', organizationId);
        
        // Apply filters
        if (status) {
          query = query.eq('status', status);
        }
        
        if (priority) {
          query = query.eq('priority', priority);
        }
        
        if (category) {
          query = query.eq('category', category);
        }
        
        if (assignedTo) {
          query = query.eq('assigned_to', assignedTo);
        }
        
        if (createdBy) {
          query = query.eq('created_by', createdBy);
        }
        
        if (search) {
          query = query.textSearch('search_vector', search);
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
            tickets: data,
            totalCount: count,
            page: pageNum,
            limit: limitNum
          })
        };
      }
      
      // Get ticket by ID
      case /^[0-9a-fA-F-]+$/.test(path) && event.httpMethod === 'GET': {
        const ticketId = path;
        
        const { data, error } = await supabase
          .from('tickets')
          .select(`
            *,
            created_by(*),
            assigned_to(*),
            ticket_responses(*)
          `)
          .eq('id', ticketId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Ticket not found' })
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
      
      // Update ticket
      case /^[0-9a-fA-F-]+$/.test(path) && event.httpMethod === 'PUT': {
        const ticketId = path;
        const { title, description, status, priority, category, assignedTo } = body;
        
        const { data, error } = await supabase
          .from('tickets')
          .update({
            title,
            description,
            status,
            priority,
            category,
            assigned_to: assignedTo,
            updated_at: new Date()
          })
          .eq('id', ticketId)
          .select();
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data[0])
        };
      }
      
      // Add response to ticket
      case path.endsWith('/responses') && event.httpMethod === 'POST': {
        const ticketId = path.split('/')[0];
        const { content, isInternal, createdBy, createdByName, createdByRole, updateStatus } = body;
        
        const { data, error } = await supabase
          .from('ticket_responses')
          .insert([{
            ticket_id: ticketId,
            content,
            is_internal: isInternal || false,
            created_by: createdBy || user.id,
            created_by_name: createdByName,
            created_by_role: createdByRole
          }])
          .select();
        
        if (error) throw error;
        
        // Update ticket status if provided
        if (updateStatus) {
          await supabase
            .from('tickets')
            .update({
              status: updateStatus,
              updated_at: new Date()
            })
            .eq('id', ticketId);
        }
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(data[0])
        };
      }
      
      // Delete ticket
      case /^[0-9a-fA-F-]+$/.test(path) && event.httpMethod === 'DELETE': {
        const ticketId = path;
        
        const { error } = await supabase
          .from('tickets')
          .delete()
          .eq('id', ticketId);
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        };
      }
      
      // Search tickets
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
          .from('tickets')
          .select('*', { count: 'exact' })
          .textSearch('search_vector', searchTerm);
        
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
            tickets: data,
            totalCount: count,
            page: pageNum,
            limit: limitNum
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
    console.error('Tickets function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
