const express = require('express');
const router = express.Router();
const {
  calculateFareEstimate,
  getRideHistory,
  getRideById,
  cancelRide,
  getActiveRides
} = require('../controllers/rideController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/rides/active
 * @desc    Get all active rides (for admin panel)
 * @access  Public (for testing - should be admin-only in production)
 */
router.get('/active', getActiveRides);

/**
 * @route   POST /api/rides/calculate-fare
 * @desc    Calculate fare estimate for a route
 * @access  Private
 */
router.post('/calculate-fare', authenticate, calculateFareEstimate);

/**
 * @route   GET /api/rides/history
 * @desc    Get ride history for current user
 * @access  Private
 * @query   role (customer/rider), status, limit, page
 */
router.get('/history', authenticate, getRideHistory);

/**
 * @route   GET /api/rides/:rideId
 * @desc    Get ride details by ID
 * @access  Private
 */
router.get('/:rideId', authenticate, getRideById);

/**
 * @route   POST /api/rides/:rideId/cancel
 * @desc    Cancel a ride
 * @access  Private
 */
router.post('/:rideId/cancel', authenticate, cancelRide);

module.exports = router;
