const express = require('express');
const router = express.Router();
const {
  sendOtp,
  verifyOtp,
  phoneLogin,
  firebaseSync,
  firebaseRegister,
  refreshToken,
  switchRole,
  registerRider,
  getProfile,
  getAllUsers,
  getAllDrivers,
  getUserById,
  updateUserById,
  deleteUserById
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const {
  otpLimiter,
  authLimiter,
  adminLimiter,
  adminApiKeyAuth
} = require('../middleware/security');

// ============================================================================
// ADMIN ROUTES (Protected with API key or rate limited)
// ============================================================================

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (Admin)
 * @access  Admin (API key recommended in production)
 */
router.get('/users', adminLimiter, adminApiKeyAuth, getAllUsers);

/**
 * @route   GET /api/auth/drivers
 * @desc    Get all drivers (Admin)
 * @access  Admin (API key recommended in production)
 */
router.get('/drivers', adminLimiter, adminApiKeyAuth, getAllDrivers);

/**
 * @route   GET /api/auth/users/:userId
 * @desc    Get user by ID (Admin)
 * @access  Admin (API key recommended in production)
 */
router.get('/users/:userId', adminLimiter, adminApiKeyAuth, getUserById);

/**
 * @route   PATCH /api/auth/users/:userId
 * @desc    Update user by ID (Admin)
 * @access  Admin (API key recommended in production)
 */
router.patch('/users/:userId', adminLimiter, adminApiKeyAuth, updateUserById);

/**
 * @route   DELETE /api/auth/users/:userId
 * @desc    Delete user by ID (Admin)
 * @access  Admin (API key recommended in production)
 */
router.delete('/users/:userId', adminLimiter, adminApiKeyAuth, deleteUserById);

// ============================================================================
// PUBLIC AUTH ROUTES (Rate limited)
// ============================================================================

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to email for verification
 * @access  Public
 * @security Strict rate limiting (3 requests/minute)
 */
router.post('/send-otp', otpLimiter, sendOtp);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and login/register user
 * @access  Public
 * @security Strict rate limiting (5 requests/15 min)
 */
router.post('/verify-otp', authLimiter, verifyOtp);

/**
 * @route   POST /api/auth/login
 * @desc    Phone-based login (creates user if not exists)
 * @access  Public
 * @security Rate limited (5 requests/15 min)
 */
router.post('/login', authLimiter, phoneLogin);

/**
 * @route   POST /api/auth/firebase-sync
 * @desc    Sync existing Firebase user with database (login)
 * @access  Public
 * @security Rate limited (5 requests/15 min)
 */
router.post('/firebase-sync', authLimiter, firebaseSync);

/**
 * @route   POST /api/auth/firebase-register
 * @desc    Register new user via Firebase
 * @access  Public
 * @security Rate limited (5 requests/15 min)
 */
router.post('/firebase-register', authLimiter, firebaseRegister);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @security Rate limited
 */
router.post('/refresh', authLimiter, refreshToken);

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
