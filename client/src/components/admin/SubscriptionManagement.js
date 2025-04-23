import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import config from '../../config';

const SubscriptionManagement = () => {
  const [subscription, setSubscription] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  const { token } = useContext(AuthContext);
  
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        // Fetch current subscription
        const subResponse = await fetch(`${config.API_URL}/subscriptions/current`, {
          headers: {
            'x-auth-token': token
          }
        });
        
        if (subResponse.ok) {
          const subData = await subResponse.json();
          setSubscription(subData);
        }
        
        // Fetch available plans
        const plansResponse = await fetch(`${config.API_URL}/subscriptions/plans`, {
          headers: {
            'x-auth-token': token
          }
        });
        
        if (plansResponse.ok) {
          const plansData = await plansResponse.json();
          setAvailablePlans(plansData);
        } else {
          const data = await plansResponse.json();
          setError(data.msg || 'Failed to fetch plans');
        }
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        setError('Server error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscriptionData();
  }, [token]);
  
  const handleSubscribe = async (planId) => {
    setCheckoutLoading(true);
    
    try {
      const response = await fetch(`${config.API_URL}/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ planId })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.url) {
          // Redirect to Stripe checkout
          window.location.href = data.url;
        } else {
          // Subscription created without Stripe (demo mode)
          setSubscription(data);
        }
      } else {
        const data = await response.json();
        setError(data.msg || 'Failed to create subscription');
      }
    } catch (err) {
      console.error('Error creating subscription:', err);
      setError('Server error');
    } finally {
      setCheckoutLoading(false);
    }
  };
  
  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }
    
    try {
      const response = await fetch(`${config.API_URL}/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      } else {
        const data = await response.json();
        setError(data.msg || 'Failed to cancel subscription');
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
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
      <h1 className="text-2xl font-bold mb-6">Subscription Management</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {subscription ? (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
          
          <div className="mb-4">
            <p className="text-gray-700 mb-2">
              <span className="font-semibold">Plan:</span> {subscription.plan.name}
            </p>
            <p className="text-gray-700 mb-2">
              <span className="font-semibold">Price:</span> ${subscription.plan.price}/{subscription.plan.billingCycle}
            </p>
            <p className="text-gray-700 mb-2">
              <span className="font-semibold">Status:</span> 
              <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                subscription.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : subscription.status === 'cancelled' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
              }`}>
                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </span>
            </p>
            <p className="text-gray-700 mb-2">
              <span className="font-semibold">Start Date:</span> {new Date(subscription.startDate).toLocaleDateString()}
            </p>
            {subscription.endDate && (
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">End Date:</span> {new Date(subscription.endDate).toLocaleDateString()}
              </p>
            )}
          </div>
          
          {subscription.status === 'active' && (
            <button
              onClick={handleCancelSubscription}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      ) : (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">You don't have an active subscription. Choose a plan below to subscribe.</span>
        </div>
      )}
      
      <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
      
      {availablePlans.length === 0 ? (
        <div className="bg-gray-100 p-6 rounded text-center">
          <p className="text-gray-700">No pricing plans available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availablePlans.map(plan => (
            <div key={plan._id} className="bg-white shadow-md rounded-lg overflow-hidden">
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
                
                <button
                  onClick={() => handleSubscribe(plan._id)}
                  disabled={checkoutLoading || (subscription && subscription.status === 'active' && subscription.plan._id === plan._id)}
                  className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    (checkoutLoading || (subscription && subscription.status === 'active' && subscription.plan._id === plan._id)) 
                      ? 'opacity-50 cursor-not-allowed' 
                      : ''
                  }`}
                >
                  {checkoutLoading 
                    ? 'Processing...' 
                    : (subscription && subscription.status === 'active' && subscription.plan._id === plan._id)
                      ? 'Current Plan'
                      : 'Subscribe'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
