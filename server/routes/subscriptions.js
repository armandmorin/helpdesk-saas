const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');
const PricingPlan = require('../models/PricingPlan');
const Organization = require('../models/Organization');
const { auth } = require('../middleware/auth');

// @route   GET api/subscriptions/current
// @desc    Get current subscription
// @access  Private
router.get('/current', auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      organizationId: req.user.organizationId,
      status: { $in: ['active', 'cancelled'] }
    }).populate('planId');
    
    if (!subscription) {
      return res.status(404).json({ msg: 'No active subscription found' });
    }
    
    res.json({
      _id: subscription._id,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      plan: {
        _id: subscription.planId._id,
        name: subscription.planId.name,
        description: subscription.planId.description,
        price: subscription.planId.price,
        billingCycle: subscription.planId.billingCycle,
        maxUsers: subscription.planId.maxUsers,
        features: subscription.planId.features
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/subscriptions/plans
// @desc    Get available subscription plans
// @access  Private
router.get('/plans', auth, async (req, res) => {
  try {
    const plans = await PricingPlan.find({ isActive: true }).sort({ price: 1 });
    res.json(plans);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/subscriptions/checkout
// @desc    Create checkout session for subscription
// @access  Private
router.post('/checkout', auth, async (req, res) => {
  try {
    const { planId } = req.body;
    
    if (!planId) {
      return res.status(400).json({ msg: 'Plan ID is required' });
    }
    
    const plan = await PricingPlan.findById(planId);
    
    if (!plan || !plan.isActive) {
      return res.status(404).json({ msg: 'Plan not found or inactive' });
    }
    
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ msg: 'Organization not found' });
    }
    
    // Check if Stripe is connected
    if (organization.stripeCustomerId && plan.stripePriceId) {
      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: organization.stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin}/admin/subscription?success=true`,
        cancel_url: `${req.headers.origin}/admin/subscription?canceled=true`,
        metadata: {
          organizationId: organization._id.toString(),
          planId: plan._id.toString()
        }
      });
      
      return res.json({ url: session.url });
    } else {
      // For demo purposes, create subscription without Stripe
      // Cancel any existing subscriptions
      await Subscription.updateMany(
        { 
          organizationId: req.user.organizationId,
          status: 'active'
        },
        { 
          status: 'cancelled',
          endDate: Date.now()
        }
      );
      
      // Create new subscription
      const newSubscription = new Subscription({
        organizationId: req.user.organizationId,
        planId: plan._id,
        status: 'active',
        startDate: Date.now()
      });
      
      await newSubscription.save();
      
      // Update organization
      organization.subscriptionStatus = 'active';
      organization.subscriptionTier = plan.name.toLowerCase();
      await organization.save();
      
      return res.json({
        _id: newSubscription._id,
        status: newSubscription.status,
        startDate: newSubscription.startDate,
        plan: {
          _id: plan._id,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          billingCycle: plan.billingCycle,
          maxUsers: plan.maxUsers,
          features: plan.features
        }
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/subscriptions/cancel
// @desc    Cancel current subscription
// @access  Private
router.post('/cancel', auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      organizationId: req.user.organizationId,
      status: 'active'
    }).populate('planId');
    
    if (!subscription) {
      return res.status(404).json({ msg: 'No active subscription found' });
    }
    
    // If Stripe subscription exists, cancel it
    if (subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      } catch (stripeErr) {
        console.error('Stripe error:', stripeErr);
        // Continue with local cancellation
      }
    }
    
    // Update subscription status
    subscription.status = 'cancelled';
    subscription.endDate = Date.now();
    await subscription.save();
    
    // Update organization
    const organization = await Organization.findById(req.user.organizationId);
    if (organization) {
      organization.subscriptionStatus = 'cancelled';
      await organization.save();
    }
    
    res.json({
      _id: subscription._id,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      plan: {
        _id: subscription.planId._id,
        name: subscription.planId.name,
        description: subscription.planId.description,
        price: subscription.planId.price,
        billingCycle: subscription.planId.billingCycle,
        maxUsers: subscription.planId.maxUsers,
        features: subscription.planId.features
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
