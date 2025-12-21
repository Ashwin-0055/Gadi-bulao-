const express = require('express');
const router = express.Router();
const {
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

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (Admin)
 * @access  Public (for admin panel - should be protected in production)
 */
router.get('/users', getAllUsers);

/**
 * @route   GET /api/auth/drivers
 * @desc    Get all drivers (Admin)
 * @access  Public (for admin panel)
 */
router.get('/drivers', getAllDrivers);

/**
 * @route   GET /api/auth/users/:userId
 * @desc    Get user by ID (Admin)
 * @access  Public (for admin panel)
 */
router.get('/users/:userId', getUserById);

/**
 * @route   PATCH /api/auth/users/:userId
 * @desc    Update user by ID (Admin)
 * @access  Public (for admin panel)
 */
router.patch('/users/:userId', updateUserById);

/**
 * @route   DELETE /api/auth/users/:userId
 * @desc    Delete user by ID (Admin)
 * @access  Public (for admin panel)
 */
router.delete('/users/:userId', deleteUserById);

/**
 * @route   POST /api/auth/login
 * @desc    Phone-based login (creates user if not exists)
 * @access  Public
 */
router.post('/login', phoneLogin);

/**
 * @route   POST /api/auth/firebase-sync
 * @desc    Sync existing Firebase user with database (login)
 * @access  Public
 */
router.post('/firebase-sync', firebaseSync);

/**
 * @route   POST /api/auth/firebase-register
 * @desc    Register new user via Firebase
 * @access  Public
 */
router.post('/firebase-register', firebaseRegister);

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
