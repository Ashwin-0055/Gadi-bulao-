const express = require('express');
const router = express.Router();
const {
  phoneLogin,
  refreshToken,
  switchRole,
  registerRider,
  getProfile
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/auth/login
 * @desc    Phone-based login (creates user if not exists)
 * @access  Public
 */
router.post('/login', phoneLogin);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', refreshToken);

/**
 * @route   POST /api/auth/switch-role
 * @desc    Switch between customer and rider role
 * @access  Private
 */
router.post('/switch-role', authenticate, switchRole);

/**
 * @route   POST /api/auth/register-rider
 * @desc    Register as a rider (add rider role and vehicle details)
 * @access  Private
 */
router.post('/register-rider', authenticate, registerRider);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, getProfile);

module.exports = router;
