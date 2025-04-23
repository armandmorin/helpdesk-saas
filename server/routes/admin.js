const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PricingPlan = require('../models/PricingPlan');
const Organization = require('../models/Organization');
const { auth, authorize } = require('../middleware/auth');

// @route   GET api/admin/pricing
// @desc    Get all pricing plans
// @access  Private (Admin only)
router.get('/pricing', [auth, authorize('admin')], async (req, res) => {
  try {
    const plans = await PricingPlan.find().sort({ price: 1 });
    
    // Check if Stripe is connected and get mode
    let stripeConnected = false;
    let stripeMode = 'test';
    
    const organization = await Organization.findById(req.user.organizationId);
    if (organization && organization.stripeCustomerId) {
      stripeConnected = true;
      // Determine mode based on the key used
      stripeMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'test' : 'live';
    }
    
    res.json({
      plans,
      stripeConnected,
      stripeMode
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/pricing
// @desc    Create a new pricing plan
// @access  Private (Admin only)
router.post(
  '/pricing',
  [
    auth,
    authorize('admin'),
    [
      check('name', 'Name is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('price', 'Price must be a positive number').isFloat({ min: 0 }),
      check('billingCycle', 'Billing cycle must be monthly or yearly').isIn(['monthly', 'yearly']),
      check('maxUsers', 'Max users must be a positive number').isInt({ min: 1 }),
      check('features', 'Features must be an array').isArray(),
      check('isActive', 'isActive must be a boolean').isBoolean()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description, price, billingCycle, features, maxUsers, isActive } = req.body;
      
      // Create product and price in Stripe if connected
      let stripePriceId = null;
      const organization = await Organization.findById(req.user.organizationId);
      
      if (organization && organization.stripeCustomerId) {
        try {
          // Create product
          const product = await stripe.products.create({
            name,
            description,
            metadata: {
              maxUsers: maxUsers.toString(),
              billingCycle
            }
          });
          
          // Create price
          const stripePrice = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(price * 100), // Convert to cents
            currency: 'usd',
            recurring: {
              interval: billingCycle === 'monthly' ? 'month' : 'year'
            }
          });
          
          stripePriceId = stripePrice.id;
        } catch (stripeErr) {
          console.error('Stripe error:', stripeErr);
          // Continue without Stripe integration
        }
      }
      
      const newPlan = new PricingPlan({
        name,
        description,
        price,
        billingCycle,
        features,
        maxUsers,
        stripePriceId,
        isActive
      });
      
      const plan = await newPlan.save();
      
      res.json(plan);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/admin/pricing/:id
// @desc    Update a pricing plan
// @access  Private (Admin only)
router.put(
  '/pricing/:id',
  [
    auth,
    authorize('admin')
  ],
  async (req, res) => {
    try {
      const plan = await PricingPlan.findById(req.params.id);
      
      if (!plan) {
        return res.status(404).json({ msg: 'Pricing plan not found' });
      }
      
      // Update fields
      const { name, description, price, billingCycle, features, maxUsers, isActive } = req.body;
      
      if (name !== undefined) plan.name = name;
      if (description !== undefined) plan.description = description;
      if (price !== undefined) plan.price = price;
      if (billingCycle !== undefined) plan.billingCycle = billingCycle;
      if (features !== undefined) plan.features = features;
      if (maxUsers !== undefined) plan.maxUsers = maxUsers;
      if (isActive !== undefined) plan.isActive = isActive;
      
      plan.updatedAt = Date.now();
      
      // Update in Stripe if connected
      if (plan.stripePriceId) {
        try {
          // Prices can't be updated in Stripe, so we need to create a new one
          // and archive the old one
          
          // Get product ID from price
          const stripePrice = await stripe.prices.retrieve(plan.stripePriceId);
          
          // Update product
          await stripe.products.update(stripePrice.product, {
            name,
            description,
            metadata: {
              maxUsers: maxUsers.toString(),
              billingCycle
            }
          });
          
          // Archive old price
          await stripe.prices.update(plan.stripePriceId, { active: false });
          
          // Create new price
          const newStripePrice = await stripe.prices.create({
            product: stripePrice.product,
            unit_amount: Math.round(price * 100), // Convert to cents
            currency: 'usd',
            recurring: {
              interval: billingCycle === 'monthly' ? 'month' : 'year'
            }
          });
          
          plan.stripePriceId = newStripePrice.id;
        } catch (stripeErr) {
          console.error('Stripe error:', stripeErr);
          // Continue without Stripe update
        }
      }
      
      await plan.save();
      
      res.json(plan);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Pricing plan not found' });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/admin/stripe/connect
// @desc    Connect to Stripe
// @access  Private (Admin only)
router.post(
  '/stripe/connect',
  [
    auth,
    authorize('admin')
  ],
  async (req, res) => {
    try {
      const { mode } = req.body;
      
      // In a real application, you would redirect to Stripe Connect OAuth flow
      // For this demo, we'll simulate a successful connection
      
      const organization = await Organization.findById(req.user.organizationId);
      
      if (!organization) {
        return res.status(404).json({ msg: 'Organization not found' });
      }
      
      // Simulate Stripe customer creation
      organization.stripeCustomerId = `cus_${Math.random().toString(36).substring(2, 15)}`;
      await organization.save();
      
      res.json({ success: true });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/admin/stripe/mode
// @desc    Toggle Stripe mode (test/live)
// @access  Private (Admin only)
router.put(
  '/stripe/mode',
  [
    auth,
    authorize('admin')
  ],
  async (req, res) => {
    try {
      const { mode } = req.body;
      
      if (!['test', 'live'].includes(mode)) {
        return res.status(400).json({ msg: 'Invalid mode' });
      }
      
      // In a real application, you would switch Stripe API keys
      // For this demo, we'll just return success
      
      res.json({ success: true, mode });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/admin/stripe/webhook
// @desc    Stripe webhook handler
// @access  Public
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      
      try {
        const organization = await Organization.findOne({
          stripeSubscriptionId: subscription.id
        });
        
        if (organization) {
          organization.subscriptionStatus = subscription.status === 'active' ? 'active' : 'inactive';
          await organization.save();
        }
      } catch (err) {
        console.error('Error updating subscription status:', err);
      }
      break;
      
    case 'customer.subscription.deleted':
      const canceledSubscription = event.data.object;
      
      try {
        const organization = await Organization.findOne({
          stripeSubscriptionId: canceledSubscription.id
        });
        
        if (organization) {
          organization.subscriptionStatus = 'cancelled';
          organization.stripeSubscriptionId = null;
          await organization.save();
        }
      } catch (err) {
        console.error('Error handling subscription cancellation:', err);
      }
      break;
      
    case 'invoice.payment_succeeded':
      // Handle successful payment
      break;
      
    case 'invoice.payment_failed':
      // Handle failed payment
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.json({ received: true });
});

module.exports = router;
