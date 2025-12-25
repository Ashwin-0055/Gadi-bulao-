const express = require('express');
const router = express.Router();
const {
  calculateFareEstimate,
  getRideHistory,
  getRideById,
  cancelRide,
  getActiveRides,
  updateRideStatus,
  adminCancelRide
} = require('../controllers/rideController');
const { authenticate } = require('../middleware/auth');
const { adminLimiter, adminApiKeyAuth } = require('../middleware/security');

// ============================================================================
// ADMIN ROUTES (Protected with API key)
// ============================================================================

/**
 * @route   GET /api/rides/active
 * @desc    Get all active rides (for admin panel)
 * @access  Admin (API key recommended in production)
 */
router.get('/active', adminLimiter, adminApiKeyAuth, getActiveRides);

/**
 * @route   PATCH /api/rides/:rideId/status
 * @desc    Update ride status (for admin panel)
 * @access  Admin (API key recommended in production)
 */
router.patch('/:rideId/status', adminLimiter, adminApiKeyAuth, updateRideStatus);

/**
 * @route   POST /api/rides/:rideId/cancel
 * @desc    Cancel a ride (admin)
 * @access  Admin (API key recommended in production)
 */
router.post('/:rideId/cancel', adminLimiter, adminApiKeyAuth, adminCancelRide);

// ============================================================================
// AUTHENTICATED USER ROUTES
// ============================================================================

/**
 * @route   POST /api/rides/calculate-fare
 * @desc    Calculate fare estimate for a route
 * @access  Private (requires JWT)
 */
router.post('/calculate-fare', authenticate, calculateFareEstimate);

/**
 * @route   GET /api/rides/history
 * @desc    Get ride history for current user
 * @access  Private (requires JWT)
 * @query   role (customer/rider), status, limit, page
 */
router.get('/history', authenticate, getRideHistory);

/**
 * @route   GET /api/rides/:rideId
 * @desc    Get ride details by ID
 * @access  Private (requires JWT)
 */
router.get('/:rideId', authenticate, getRideById);

module.exports = router;
