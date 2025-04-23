import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import config from '../../config';

const TicketDetail = ({ history }) => {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responseContent, setResponseContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState('');
  
  const { token, user, isAgent } = useContext(AuthContext);
  
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await fetch(`${config.API_URL}/tickets/${id}`, {
          headers: {
            'x-auth-token': token
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setTicket(data.ticket);
          setResponses(data.responses);
          setStatusUpdate(data.ticket.status);
        } else {
          const data = await response.json();
          setError(data.msg || 'Failed to fetch ticket');
        }
      } catch (err) {
        console.error('Error fetching ticket:', err);
        setError('Server error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTicket();
  }, [id, token]);
  
  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    
    if (!responseContent.trim()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`${config.API_URL}/tickets/${id}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          content: responseContent,
          isInternal
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setResponses([...responses, data]);
        setResponseContent('');
        setIsInternal(false);
        
        // If ticket was resolved or archived, update status to reflect reopening
        if (['resolved', 'archived'].includes(ticket.status)) {
          setTicket({
            ...ticket,
            status: 'open'
          });
          setStatusUpdate('open');
        }
      } else {
        const data = await response.json();
        setError(data.msg || 'Failed to add response');
      }
    } catch (err) {
      console.error('Error adding response:', err);
      setError('Server error');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatusUpdate(newStatus);
    
    try {
      const response = await fetch(`${config.API_URL}/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          status: newStatus
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTicket({
          ...ticket,
          status: data.status,
          resolvedAt: data.resolvedAt
        });
      } else {
        const data = await response.json();
        setError(data.msg || 'Failed to update status');
        setStatusUpdate(ticket.status); // Reset to original status
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Server error');
      setStatusUpdate(ticket.status); // Reset to original status
    }
  };
  
  const getPriorityClass = priority => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusClass = status => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
        <button
          onClick={() => history.push('/tickets')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to Tickets
        </button>
      </div>
    );
  }
  
  if (!ticket) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">Ticket not found</span>
        </div>
        <button
          onClick={() => history.push('/tickets')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to Tickets
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/tickets"
          className="text-indigo-600 hover:text-indigo-800"
        >
          &larr; Back to Tickets
        </Link>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Ticket #{ticket._id.substring(ticket._id.length - 6)}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Created on {formatDate(ticket.createdAt)}
            </p>
          </div>
          
          {isAgent && (
            <div className="flex items-center">
              <label htmlFor="status" className="mr-2 text-sm font-medium text-gray-700">
                Status:
              </label>
              <select
                id="status"
                name="status"
                className={`${getStatusClass(statusUpdate)} border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                value={statusUpdate}
                onChange={handleStatusChange}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Title
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {ticket.title}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Category
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {ticket.category}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Priority
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityClass(ticket.priority)}`}>
                  {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                </span>
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Status
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(ticket.status)}`}>
                  {ticket.status.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              </dd>
            </div>
            {isAgent && ticket.createdBy && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Created By
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.createdBy.firstName} {ticket.createdBy.lastName} ({ticket.createdBy.email})
                </dd>
              </div>
            )}
            {isAgent && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Assigned To
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Unassigned'}
                </dd>
              </div>
            )}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Description
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-line">
                {ticket.description}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Responses
          </h3>
        </div>
        <div className="border-t border-gray-200">
          {responses.length === 0 ? (
            <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
              No responses yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {responses.map(response => (
                <li key={response._id} className={`px-4 py-5 sm:px-6 ${response.isInternal ? 'bg-yellow-50' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {response.userId.firstName} {response.userId.lastName}
                        {response.userId.role !== 'customer' && (
                          <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            {response.userId.role}
                          </span>
                        )}
                        {response.isInternal && (
                          <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Internal Note
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(response.createdAt)}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                    {response.content}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Add Response
          </h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmitResponse}>
            <div className="mb-4">
              <label htmlFor="responseContent" className="sr-only">
                Response
              </label>
              <textarea
                id="responseContent"
                name="responseContent"
                rows="4"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Type your response here..."
                value={responseContent}
                onChange={e => setResponseContent(e.target.value)}
                required
              ></textarea>
            </div>
            
            {isAgent && (
              <div className="mb-4 flex items-center">
                <input
                  id="isInternal"
                  name="isInternal"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={isInternal}
                  onChange={e => setIsInternal(e.target.checked)}
                />
                <label htmlFor="isInternal" className="ml-2 block text-sm text-gray-900">
                  Internal note (only visible to agents)
                </label>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !responseContent.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Response'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
