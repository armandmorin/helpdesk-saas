import supabase from '../supabase';

/**
 * Ticket service for Supabase
 */
export const TicketService = {
  /**
   * Create a new ticket
   * @param {Object} ticketData - Ticket data
   * @returns {Promise} - Created ticket
   */
  async createTicket(ticketData) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert([{
          title: ticketData.title,
          description: ticketData.description,
          status: ticketData.status || 'open',
          priority: ticketData.priority || 'medium',
          category: ticketData.category || 'General',
          created_by: ticketData.createdBy,
          assigned_to: ticketData.assignedTo,
          organization_id: ticketData.organizationId
        }])
        .select();
      
      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Create ticket error:', error);
      throw error;
    }
  },
  
  /**
   * Get tickets for an organization with filtering and pagination
   * @param {Object} params - Query parameters
   * @returns {Promise} - Tickets and count
   */
  async getTickets(params) {
    try {
      const {
        organizationId,
        status,
        priority,
        category,
        assignedTo,
        createdBy,
        search,
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = params;
      
      let query = supabase
        .from('tickets')
        .select('*, created_by(*), assigned_to(*)', { count: 'exact' });
      
      // Apply filters
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      
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
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      
      // Execute query with pagination
      const { data, error, count } = await query.range(from, to);
      
      if (error) throw error;
      
      return {
        tickets: data,
        totalCount: count,
        page,
        limit
      };
    } catch (error) {
      console.error('Get tickets error:', error);
      throw error;
    }
  },
  
  /**
   * Get a ticket by ID
   * @param {string} ticketId - Ticket ID
   * @returns {Promise} - Ticket details
   */
  async getTicketById(ticketId) {
    try {
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
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Get ticket error:', error);
      throw error;
    }
  },
  
  /**
   * Update a ticket
   * @param {string} ticketId - Ticket ID
   * @param {Object} updateData - Data to update
   * @returns {Promise} - Updated ticket
   */
  async updateTicket(ticketId, updateData) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .update({
          title: updateData.title,
          description: updateData.description,
          status: updateData.status,
          priority: updateData.priority,
          category: updateData.category,
          assigned_to: updateData.assignedTo,
          updated_at: new Date()
        })
        .eq('id', ticketId)
        .select();
      
      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Update ticket error:', error);
      throw error;
    }
  },
  
  /**
   * Add a response to a ticket
   * @param {Object} responseData - Response data
   * @returns {Promise} - Created response
   */
  async addTicketResponse(responseData) {
    try {
      const { data, error } = await supabase
        .from('ticket_responses')
        .insert([{
          ticket_id: responseData.ticketId,
          content: responseData.content,
          is_internal: responseData.isInternal || false,
          created_by: responseData.createdBy,
          created_by_name: responseData.createdByName,
          created_by_role: responseData.createdByRole
        }])
        .select();
      
      if (error) throw error;
      
      // Update ticket status if provided
      if (responseData.updateStatus) {
        await this.updateTicket(responseData.ticketId, {
          status: responseData.updateStatus
        });
      }
      
      return data[0];
    } catch (error) {
      console.error('Add response error:', error);
      throw error;
    }
  },
  
  /**
   * Delete a ticket
   * @param {string} ticketId - Ticket ID
   * @returns {Promise} - Deletion result
   */
  async deleteTicket(ticketId) {
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Delete ticket error:', error);
      throw error;
    }
  },
  
  /**
   * Search tickets
   * @param {Object} params - Search parameters
   * @returns {Promise} - Search results
   */
  async searchTickets(params) {
    try {
      const {
        organizationId,
        searchTerm,
        page = 1,
        limit = 10
      } = params;
      
      let query = supabase
        .from('tickets')
        .select('*', { count: 'exact' })
        .textSearch('search_vector', searchTerm);
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      
      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const { data, error, count } = await query.range(from, to);
      
      if (error) throw error;
      
      return {
        tickets: data,
        totalCount: count,
        page,
        limit
      };
    } catch (error) {
      console.error('Search tickets error:', error);
      throw error;
    }
  }
};

export default TicketService;
