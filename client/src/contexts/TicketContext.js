import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import supabase from '../utils/supabaseClient';

// Create context
const TicketContext = createContext(null);

// Provider component
export const TicketProvider = ({ children }) => {
  const { getToken, profile, role } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create a new ticket
  const createTicket = async (ticketData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch('/.netlify/functions/tickets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: ticketData.title,
          description: ticketData.description,
          status: ticketData.status || 'open',
          priority: ticketData.priority || 'medium',
          category: ticketData.category || 'General',
          organizationId: profile.organization_id,
          createdBy: profile.id,
          assignedTo: ticketData.assignedTo
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ticket');
      }
      
      const newTicket = await response.json();
      
      // Update local state
      setTickets(prevTickets => [...prevTickets, newTicket]);
      
      return { success: true, ticket: newTicket };
    } catch (error) {
      console.error('Create ticket error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Get tickets for organization
  const getTickets = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      // Build query string
      const queryParams = new URLSearchParams({
        organizationId: profile.organization_id,
        ...params
      }).toString();
      
      const response = await fetch(`/.netlify/functions/tickets/organization?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tickets');
      }
      
      const data = await response.json();
      
      // Update local state
      setTickets(data.tickets);
      
      return data;
    } catch (error) {
      console.error('Get tickets error:', error);
      setError(error.message);
      return { tickets: [], totalCount: 0 };
    } finally {
      setLoading(false);
    }
  };

  // Get ticket by ID
  const getTicketById = async (ticketId) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch(`/.netlify/functions/tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch ticket');
      }
      
      const ticket = await response.json();
      
      return ticket;
    } catch (error) {
      console.error('Get ticket error:', error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update ticket
  const updateTicket = async (ticketId, updateData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch(`/.netlify/functions/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update ticket');
      }
      
      const updatedTicket = await response.json();
      
      // Update local state
      setTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === ticketId ? updatedTicket : ticket
        )
      );
      
      return { success: true, ticket: updatedTicket };
    } catch (error) {
      console.error('Update ticket error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Add response to ticket
  const addTicketResponse = async (ticketId, responseData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch(`/.netlify/functions/tickets/${ticketId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: responseData.content,
          isInternal: responseData.isInternal || false,
          createdBy: profile.id,
          createdByName: `${profile.first_name} ${profile.last_name}`,
          createdByRole: role,
          updateStatus: responseData.updateStatus
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add response');
      }
      
      const newResponse = await response.json();
      
      return { success: true, response: newResponse };
    } catch (error) {
      console.error('Add response error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Delete ticket
  const deleteTicket = async (ticketId) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch(`/.netlify/functions/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete ticket');
      }
      
      // Update local state
      setTickets(prevTickets => 
        prevTickets.filter(ticket => ticket.id !== ticketId)
      );
      
      return { success: true };
    } catch (error) {
      console.error('Delete ticket error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Search tickets
  const searchTickets = async (searchTerm, params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('Authentication required');
      
      // Build query string
      const queryParams = new URLSearchParams({
        organizationId: profile.organization_id,
        searchTerm,
        ...params
      }).toString();
      
      const response = await fetch(`/.netlify/functions/tickets/search?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search tickets');
      }
      
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error('Search tickets error:', error);
      setError(error.message);
      return { tickets: [], totalCount: 0 };
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    tickets,
    loading,
    error,
    createTicket,
    getTickets,
    getTicketById,
    updateTicket,
    addTicketResponse,
    deleteTicket,
    searchTickets
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
