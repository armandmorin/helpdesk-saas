import React, { createContext, useState, useEffect, useContext } from 'react';
import supabase from '../utils/supabaseClient';

// Create context
const TicketContext = createContext(null);

// Provider component
export const TicketProvider = ({ children }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    status: null,
    priority: null,
    search: '',
    organizationId: null,
    assignedToId: null
  });

  // Fetch tickets based on filters and pagination
  const fetchTickets = async (page = 1, size = 10, newFilters = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Update state if new values provided
      if (page !== currentPage) setCurrentPage(page);
      if (size !== pageSize) setPageSize(size);
      if (newFilters) setFilters({ ...filters, ...newFilters });
      
      // Use provided values or state values
      const currentFilters = newFilters || filters;
      
      // Calculate range for pagination
      const from = (page - 1) * size;
      const to = from + size - 1;
      
      // Start building query
      let query = supabase
        .from('tickets')
        .select('*, assigned_to:users(*), created_by:users(*)', { count: 'exact' });
      
      // Apply filters
      if (currentFilters.status) {
        query = query.eq('status', currentFilters.status);
      }
      
      if (currentFilters.priority) {
        query = query.eq('priority', currentFilters.priority);
      }
      
      if (currentFilters.organizationId) {
        query = query.eq('organization_id', currentFilters.organizationId);
      }
      
      if (currentFilters.assignedToId) {
        query = query.eq('assigned_to_id', currentFilters.assignedToId);
      }
      
      if (currentFilters.search) {
        query = query.or(`title.ilike.%${currentFilters.search}%,description.ilike.%${currentFilters.search}%`);
      }
      
      // Apply pagination
      query = query.range(from, to).order('created_at', { ascending: false });
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setTickets(data || []);
      setTotalCount(count || 0);
      
      return { tickets: data, totalCount: count };
    } catch (error) {
      console.error('Fetch tickets error:', error);
      setError(error.message);
      return { tickets: [], totalCount: 0, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Create a new ticket
  const createTicket = async (ticketData) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('tickets')
        .insert([ticketData])
        .select();
      
      if (error) throw error;
      
      // Refresh tickets list
      fetchTickets(currentPage, pageSize, filters);
      
      return { success: true, ticket: data[0] };
    } catch (error) {
      console.error('Create ticket error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Get a single ticket by ID
  const getTicket = async (ticketId) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('tickets')
        .select('*, assigned_to:users(*), created_by:users(*), responses:ticket_responses(*)')
        .eq('id', ticketId)
        .single();
      
      if (error) throw error;
      
      return { success: true, ticket: data };
    } catch (error) {
      console.error('Get ticket error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Update a ticket
  const updateTicket = async (ticketId, updateData) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId)
        .select();
      
      if (error) throw error;
      
      // Update local state
      setTickets(tickets.map(ticket => 
        ticket.id === ticketId ? { ...ticket, ...updateData } : ticket
      ));
      
      return { success: true, ticket: data[0] };
    } catch (error) {
      console.error('Update ticket error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Add a response to a ticket
  const addTicketResponse = async (responseData) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('ticket_responses')
        .insert([responseData])
        .select();
      
      if (error) throw error;
      
      return { success: true, response: data[0] };
    } catch (error) {
      console.error('Add ticket response error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Get responses for a ticket
  const getTicketResponses = async (ticketId) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('ticket_responses')
        .select('*, user:users(*)')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return { success: true, responses: data };
    } catch (error) {
      console.error('Get ticket responses error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Change ticket status
  const changeTicketStatus = async (ticketId, status) => {
    return updateTicket(ticketId, { status });
  };

  // Assign ticket to user
  const assignTicket = async (ticketId, userId) => {
    return updateTicket(ticketId, { assigned_to_id: userId });
  };

  // Context value
  const value = {
    tickets,
    loading,
    error,
    totalCount,
    currentPage,
    pageSize,
    filters,
    fetchTickets,
    createTicket,
    getTicket,
    updateTicket,
    addTicketResponse,
    getTicketResponses,
    changeTicketStatus,
    assignTicket,
    setFilters
  };

  return <TicketContext.Provider value={value}>{children}</TicketContext.Provider>;
};

// Custom hook to use the ticket context
export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
};

export default TicketContext;
