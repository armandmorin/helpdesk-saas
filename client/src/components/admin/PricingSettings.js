import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import config from '../../config';

const PricingSettings = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddPlanForm, setShowAddPlanForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    billingCycle: 'monthly',
    maxUsers: 5,
    features: '',
    isActive: true
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeMode, setStripeMode] = useState('test');
  
  const { token } = useContext(AuthContext);
  
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${config.API_URL}/admin/pricing`, {
          headers: {
            'x-auth-token': token
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPlans(data.plans);
          setStripeConnected(data.stripeConnected);
          setStripeMode(data.stripeMode || 'test');
        } else {
          const data = await response.json();
          setError(data.msg || 'Failed to fetch pricing plans');
        }
      } catch (err) {
        console.error('Error fetching pricing plans:', err);
        setError('Server error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlans();
  }, [token]);
  
  const handleInputChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };
  
  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    
    try {
      const planData = {
        ...formData,
        price: parseFloat(formData.price),
        maxUsers: parseInt(formData.maxUsers),
        features: formData.features.split('\n').filter(f => f.trim() !== '')
      };
      
      const response = await fetch(`${config.API_URL}/admin/pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(planData)
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlans([...plans, data]);
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          price: '',
          billingCycle: 'monthly',
          maxUsers: 5,
          features: '',
          isActive: true
        });
        
        // Hide form
        setShowAddPlanForm(false);
      } else {
        const data = await response.json();
        setFormError(data.msg || 'Failed to create pricing plan');
      }
    } catch (err) {
      console.error('Error creating pricing plan:', err);
      setFormError('Server error');
    } finally {
      setFormLoading(false);
    }
  };
  
  const handleTogglePlanStatus = async (planId, currentStatus) => {
    try {
      const response = await fetch(`${config.API_URL}/admin/pricing/${planId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          isActive: !currentStatus
        })
      });
      
      if (response.ok) {
        const updatedPlan = await response.json();
        setPlans(plans.map(plan => 
          plan._id === planId ? updatedPlan : plan
        ));
      } else {
        const data = await response.json();
        setError(data.msg || 'Failed to update pricing plan');
      }
    } catch (err) {
      console.error('Error updating pricing plan:', err);
      setError('Server error');
    }
  };
  
  const handleStripeConnect = async () => {
    try {
      const response = await fetch(`${config.API_URL}/admin/stripe/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          mode: stripeMode
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          setStripeConnected(true);
        }
      } else {
        const data = await response.json();
        setError(data.msg || 'Failed to connect to Stripe');
      }
    } catch (err) {
      console.error('Error connecting to Stripe:', err);
      setError('Server error');
    }
  };
  
  const handleToggleStripeMode = async () => {
    const newMode = stripeMode === 'test' ? 'live' : 'test';
    
    try {
      const response = await fetch(`${config.API_URL}/admin/stripe/mode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          mode: newMode
        })
      });
      
      if (response.ok) {
        setStripeMode(newMode);
      } else {
        const data = await response.json();
        setError(data.msg || 'Failed to update Stripe mode');
      }
    } catch (err) {
      console.error('Error updating Stripe mode:', err);
      setError('Server error');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pricing Settings</h1>
        <button
          onClick={() => setShowAddPlanForm(!showAddPlanForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
        >
          {showAddPlanForm ? 'Cancel' : 'Add Plan'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
        <h2 className="text-xl font-semibold mb-4">Stripe Integration</h2>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-700 mb-2">
              Status: <span className={`font-semibold ${stripeConnected ? 'text-green-600' : 'text-red-600'}`}>
                {stripeConnected ? 'Connected' : 'Not Connected'}
              </span>
            </p>
            <p className="text-gray-700">
              Mode: <span className={`font-semibold ${stripeMode === 'live' ? 'text-green-600' : 'text-yellow-600'}`}>
                {stripeMode === 'live' ? 'Live' : 'Test'}
              </span>
            </p>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={handleToggleStripeMode}
              className={`px-4 py-2 rounded font-bold ${
                stripeMode === 'live' 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              Switch to {stripeMode === 'live' ? 'Test' : 'Live'} Mode
            </button>
            
            <button
              onClick={handleStripeConnect}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
            >
              {stripeConnected ? 'Reconnect Stripe' : 'Connect Stripe'}
            </button>
          </div>
        </div>
      </div>
      
      {showAddPlanForm && (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Pricing Plan</h2>
          
          {formError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{formError}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Plan Name
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Basic, Professional, Enterprise"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="price">
                  Price
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="price"
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="e.g., 9.99"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="billingCycle">
                  Billing Cycle
                </label>
                <select
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="billingCycle"
                  name="billingCycle"
                  value={formData.billingCycle}
                  onChange={handleInputChange}
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="maxUsers">
                  Max Users
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="maxUsers"
                  type="number"
                  name="maxUsers"
                  value={formData.maxUsers}
                  onChange={handleInputChange}
                  placeholder="e.g., 5"
                  min="1"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                  Description
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="description"
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of the plan"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="features">
                  Features (one per line)
                </label>
                <textarea
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="features"
                  name="features"
                  value={formData.features}
                  onChange={handleInputChange}
                  placeholder="e.g., Unlimited tickets&#10;5 agents&#10;Email integration"
                  rows="4"
                  required
                ></textarea>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700 text-sm font-bold">Active</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                {formLoading ? 'Creating...' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <h2 className="text-xl font-semibold mb-4">Pricing Plans</h2>
      
      {plans.length === 0 ? (
        <div className="bg-gray-100 p-6 rounded text-center">
          <p className="text-gray-700">No pricing plans found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan._id} className={`bg-white shadow-md rounded-lg overflow-hidden ${!plan.isActive && 'opacity-60'}`}>
              <div className="px-6 py-4 bg-indigo-600 text-white">
                <div className="font-bold text-xl mb-1">{plan.name}</div>
                <p className="text-sm">{plan.description}</p>
              </div>
              <div className="px-6 py-4">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  ${plan.price}
                  <span className="text-sm font-normal text-gray-600">/{plan.billingCycle}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">Up to {plan.maxUsers} users</p>
                
                <ul className="text-sm text-gray-700 mb-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start mb-2">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    plan.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                  
                  <button
                    onClick={() => handleTogglePlanStatus(plan._id, plan.isActive)}
                    className={`text-sm ${
                      plan.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                    }`}
                  >
                    {plan.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PricingSettings;
