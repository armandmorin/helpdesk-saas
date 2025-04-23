const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

// @route   GET api/users
// @desc    Get all users for organization
// @access  Private (Admin only)
router.get('/', [auth, authorize('admin')], async (req, res) => {
  try {
    const users = await User.find({ organizationId: req.user.organizationId }).select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private (Admin only)
router.get('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Ensure user belongs to same organization
    if (user.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ msg: 'Not authorized to access this user' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put(
  '/:id',
  [
    auth,
    authorize('admin'),
    [
      check('firstName', 'First name is required').optional().not().isEmpty(),
      check('lastName', 'Last name is required').optional().not().isEmpty(),
      check('role', 'Invalid role').optional().isIn(['admin', 'agent', 'customer']),
      check('isActive', 'isActive must be a boolean').optional().isBoolean()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      
      // Ensure user belongs to same organization
      if (user.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ msg: 'Not authorized to update this user' });
      }
      
      // Update fields
      const { firstName, lastName, role, isActive } = req.body;
      
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (role) user.role = role;
      if (isActive !== undefined) user.isActive = isActive;
      
      user.updatedAt = Date.now();
      
      await user.save();
      
      res.json(user);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'User not found' });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Ensure user belongs to same organization
    if (user.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ msg: 'Not authorized to delete this user' });
    }
    
    // Prevent deleting the main admin account
    if (!user.parentUserId) {
      return res.status(400).json({ msg: 'Cannot delete the main admin account' });
    }
    
    await user.remove();
    
    res.json({ msg: 'User removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;
