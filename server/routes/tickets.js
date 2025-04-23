const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Ticket = require('../models/Ticket');
const TicketResponse = require('../models/TicketResponse');
const { auth, authorize } = require('../middleware/auth');

// @route   POST api/tickets
// @desc    Create a new ticket
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('priority', 'Priority must be valid').optional().isIn(['low', 'medium', 'high', 'urgent']),
      check('category', 'Category is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, description, priority, category } = req.body;

      const newTicket = new Ticket({
        title,
        description,
        priority: priority || 'medium',
        category,
        createdBy: req.user.id,
        organizationId: req.user.organizationId
      });

      const ticket = await newTicket.save();

      res.json(ticket);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/tickets
// @desc    Get all tickets for organization
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = { organizationId: req.user.organizationId };
    
    // If user is a customer, only show their tickets
    if (req.user.role === 'customer') {
      query.createdBy = req.user.id;
    }
    
    // Filter by status if provided
    if (req.query.status && ['open', 'in_progress', 'on_hold', 'pending', 'resolved', 'archived'].includes(req.query.status)) {
      query.status = req.query.status;
    }
    
    // Search functionality
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }
    
    const tickets = await Ticket.find(query)
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');
    
    res.json(tickets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/tickets/:id
// @desc    Get ticket by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');
    
    if (!ticket) {
      return res.status(404).json({ msg: 'Ticket not found' });
    }
    
    // Check if user has access to this ticket
    if (
      ticket.organizationId.toString() !== req.user.organizationId.toString() ||
      (req.user.role === 'customer' && ticket.createdBy.toString() !== req.user.id)
    ) {
      return res.status(403).json({ msg: 'Not authorized to access this ticket' });
    }
    
    // Get ticket responses
    const responses = await TicketResponse.find({ ticketId: ticket._id })
      .sort({ createdAt: 1 })
      .populate('userId', 'firstName lastName email role');
    
    // Filter out internal notes for non-agents
    const filteredResponses = req.user.role === 'customer'
      ? responses.filter(response => !response.isInternal)
      : responses;
    
    res.json({ ticket, responses: filteredResponses });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Ticket not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/tickets/:id
// @desc    Update ticket
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('title', 'Title is required').optional().not().isEmpty(),
      check('description', 'Description is required').optional().not().isEmpty(),
      check('status', 'Status must be valid').optional().isIn(['open', 'in_progress', 'on_hold', 'pending', 'resolved', 'archived']),
      check('priority', 'Priority must be valid').optional().isIn(['low', 'medium', 'high', 'urgent']),
      check('assignedTo', 'Invalid user ID').optional().isMongoId()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const ticket = await Ticket.findById(req.params.id);
      
      if (!ticket) {
        return res.status(404).json({ msg: 'Ticket not found' });
      }
      
      // Check if user has access to this ticket
      if (ticket.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ msg: 'Not authorized to update this ticket' });
      }
      
      // Customers can only update their own tickets and only certain fields
      if (req.user.role === 'customer') {
        if (ticket.createdBy.toString() !== req.user.id) {
          return res.status(403).json({ msg: 'Not authorized to update this ticket' });
        }
        
        // Customers can only update title, description, and category
        const { title, description, category } = req.body;
        if (title) ticket.title = title;
        if (description) ticket.description = description;
        if (category) ticket.category = category;
      } else {
        // Agents and admins can update all fields
        const { title, description, status, priority, category, assignedTo } = req.body;
        
        if (title) ticket.title = title;
        if (description) ticket.description = description;
        if (status) {
          ticket.status = status;
          
          // If status changed to resolved, set resolvedAt
          if (status === 'resolved' && ticket.status !== 'resolved') {
            ticket.resolvedAt = Date.now();
          } else if (status !== 'resolved') {
            ticket.resolvedAt = null;
          }
        }
        if (priority) ticket.priority = priority;
        if (category) ticket.category = category;
        if (assignedTo) ticket.assignedTo = assignedTo;
      }
      
      ticket.updatedAt = Date.now();
      
      await ticket.save();
      
      res.json(ticket);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Ticket not found' });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/tickets/:id/responses
// @desc    Add response to ticket
// @access  Private
router.post(
  '/:id/responses',
  [
    auth,
    [
      check('content', 'Content is required').not().isEmpty(),
      check('isInternal', 'isInternal must be a boolean').optional().isBoolean()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const ticket = await Ticket.findById(req.params.id);
      
      if (!ticket) {
        return res.status(404).json({ msg: 'Ticket not found' });
      }
      
      // Check if user has access to this ticket
      if (
        ticket.organizationId.toString() !== req.user.organizationId.toString() ||
        (req.user.role === 'customer' && ticket.createdBy.toString() !== req.user.id)
      ) {
        return res.status(403).json({ msg: 'Not authorized to respond to this ticket' });
      }
      
      const { content, isInternal } = req.body;
      
      // Only agents can create internal notes
      const isInternalNote = isInternal && ['admin', 'agent'].includes(req.user.role);
      
      const newResponse = new TicketResponse({
        ticketId: ticket._id,
        userId: req.user.id,
        content,
        isInternal: isInternalNote
      });
      
      const response = await newResponse.save();
      
      // Update ticket status if it's currently resolved or archived
      if (['resolved', 'archived'].includes(ticket.status)) {
        ticket.status = 'open';
        ticket.resolvedAt = null;
        ticket.updatedAt = Date.now();
        await ticket.save();
      }
      
      // Populate user info for response
      await response.populate('userId', 'firstName lastName email role').execPopulate();
      
      res.json(response);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Ticket not found' });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   DELETE api/tickets/:id
// @desc    Delete ticket
// @access  Private (Admin only)
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ msg: 'Ticket not found' });
    }
    
    // Check if ticket belongs to user's organization
    if (ticket.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ msg: 'Not authorized to delete this ticket' });
    }
    
    // Delete ticket responses
    await TicketResponse.deleteMany({ ticketId: ticket._id });
    
    // Delete ticket
    await ticket.remove();
    
    res.json({ msg: 'Ticket removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Ticket not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;
