const Ride = require('../models/Ride');
const User = require('../models/User');
const { calculateFare, calculateAllFares } = require('../utils/fareCalculator');
const { calculateDistance } = require('../utils/geospatial');
const axios = require('axios');

/**
 * Calculate fare estimate for a route
 */
const calculateFareEstimate = async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType } = req.body;

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and dropoff coordinates are required'
      });
    }

    // Calculate straight-line distance as fallback
    const distanceKm = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);

    // Get Google Maps Directions API data (if API key is configured)
    let routeData = null;
    if (process.env.GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY !== 'your-google-maps-api-key-here') {
      try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
          params: {
            origin: `${pickupLat},${pickupLng}`,
            destination: `${dropoffLat},${dropoffLng}`,
            mode: 'driving',
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });

        if (response.data.status === 'OK' && response.data.routes.length > 0) {
          const route = response.data.routes[0];
          const leg = route.legs[0];

          routeData = {
            distanceKm: leg.distance.value / 1000, // Convert meters to km
            durationMin: Math.ceil(leg.duration.value / 60), // Convert seconds to minutes
            polyline: route.overview_polyline.points
          };
        }
      } catch (error) {
        console.warn('⚠️  Google Maps API call failed, using fallback distance:', error.message);
      }
    }

    const finalDistance = routeData ? routeData.distanceKm : distanceKm;

    // Calculate fares
    let fares;
    if (vehicleType) {
      // Single vehicle type
      fares = [calculateFare(vehicleType, finalDistance)];
    } else {
      // All vehicle types
      fares = calculateAllFares(finalDistance);
    }

    res.status(200).json({
      success: true,
      data: {
        distance: {
          km: parseFloat(finalDistance.toFixed(2)),
          meters: parseFloat((finalDistance * 1000).toFixed(0))
        },
        duration: routeData ? routeData.durationMin : Math.ceil(finalDistance * 2), // Estimate: 30 km/h avg
        polyline: routeData ? routeData.polyline : null,
        fares
      }
    });

  } catch (error) {
    console.error('❌ Fare calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate fare',
      error: error.message
    });
  }
};

/**
 * Get ride history for current user
 */
const getRideHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { role, status, limit = 20, page = 1 } = req.query;

    const query = {};

    // Filter by role (customer or rider)
    if (role === 'customer') {
      query.customer = userId;
    } else if (role === 'rider') {
      query.rider = userId;
    } else {
      // Get all rides (both as customer and rider)
      query.$or = [{ customer: userId }, { rider: userId }];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const rides = await Ride.find(query)
      .populate('customer', 'name phone')
      .populate('rider', 'name phone riderProfile.vehicle')
      .sort({ 'timestamps.requestedAt': -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Ride.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        rides,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Get ride history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ride history',
      error: error.message
    });
  }
};

/**
 * Get ride details by ID
 */
const getRideById = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.userId;

    const ride = await Ride.findById(rideId)
      .populate('customer', 'name phone')
      .populate('rider', 'name phone riderProfile.vehicle');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Verify user is part of this ride
    if (ride.customer._id.toString() !== userId && (!ride.rider || ride.rider._id.toString() !== userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: { ride }
    });

  } catch (error) {
    console.error('❌ Get ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ride',
      error: error.message
    });
  }
};

/**
 * Get all active rides (for admin panel)
 */
const getActiveRides = async (req, res) => {
  try {
    // Find all rides that are in progress (not completed or cancelled)
    const activeStatuses = ['SEARCHING', 'ACCEPTED', 'ARRIVED', 'STARTED'];

    const rides = await Ride.find({ status: { $in: activeStatuses } })
      .populate('customer', 'name phone')
      .populate('rider', 'name phone riderProfile.vehicle riderProfile.location')
      .sort({ 'timestamps.requestedAt': -1 });

    // Transform rides into a format suitable for admin panel
    const formattedRides = rides.map(ride => ({
      rideId: ride._id.toString(),
      customerId: ride.customer?._id?.toString() || '',
      customerName: ride.customer?.name || 'Customer',
      customerPhone: ride.customer?.phone || '',
      pickup: {
        latitude: ride.pickup?.coordinates?.coordinates?.[1] || 0,
        longitude: ride.pickup?.coordinates?.coordinates?.[0] || 0,
        address: ride.pickup?.address || ''
      },
      dropoff: {
        latitude: ride.dropoff?.coordinates?.coordinates?.[1] || 0,
        longitude: ride.dropoff?.coordinates?.coordinates?.[0] || 0,
        address: ride.dropoff?.address || ''
      },
      status: ride.status,
      vehicleType: ride.vehicleType,
      fare: ride.fare,
      rider: ride.rider ? {
        id: ride.rider._id,
        name: ride.rider.name,
        phone: ride.rider.phone,
        vehicle: ride.rider.riderProfile?.vehicle,
        location: ride.rider.riderProfile?.location ? {
          latitude: ride.rider.riderProfile.location.coordinates[1],
          longitude: ride.rider.riderProfile.location.coordinates[0]
        } : null
      } : null,
      driverLocation: ride.rider?.riderProfile?.location ? {
        latitude: ride.rider.riderProfile.location.coordinates[1],
        longitude: ride.rider.riderProfile.location.coordinates[0],
        address: ''
      } : null,
      timestamps: ride.timestamps
    }));

    res.status(200).json({
      success: true,
      data: formattedRides
    });

  } catch (error) {
    console.error('❌ Get active rides error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active rides',
      error: error.message
    });
  }
};

/**
 * Cancel a ride
 */
const cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body;

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Check if ride can be cancelled
    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel ride with status: ${ride.status}`
      });
    }

    // Verify user is part of this ride
    const isCustomer = ride.customer.toString() === userId;
    const isRider = ride.rider && ride.rider.toString() === userId;

    if (!isCustomer && !isRider) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update ride status
    ride.status = 'CANCELLED';
    ride.cancelledBy = isCustomer ? 'customer' : 'rider';
    ride.cancellationReason = reason || 'No reason provided';
    ride.timestamps.cancelledAt = new Date();

    await ride.save();

    res.status(200).json({
      success: true,
      message: 'Ride cancelled successfully',
      data: { ride }
    });

  } catch (error) {
    console.error('❌ Cancel ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel ride',
      error: error.message
    });
  }
};

/**
 * Update ride status (Admin Panel)
 */
const updateRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { status } = req.body;

    const validStatuses = ['ARRIVED', 'STARTED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Update status
    ride.status = status;
    ride.timestamps[`${status.toLowerCase()}At`] = new Date();

    // If completed, update stats
    if (status === 'COMPLETED') {
      if (ride.rider) {
        await User.findByIdAndUpdate(ride.rider, {
          $inc: {
            'riderProfile.totalRides': 1,
            'riderProfile.earnings': ride.fare?.totalAmount || 0
          },
          'riderProfile.isOnDuty': true
        });
      }
      await User.findByIdAndUpdate(ride.customer, {
        $inc: { 'customerProfile.totalRides': 1 }
      });
    }

    await ride.save();

    res.status(200).json({
      success: true,
      message: `Ride status updated to ${status}`,
      data: { ride }
    });

  } catch (error) {
    console.error('❌ Update ride status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ride status',
      error: error.message
    });
  }
};

/**
 * Admin cancel ride (no auth required)
 */
const adminCancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { reason } = req.body;

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel ride with status: ${ride.status}`
      });
    }

    ride.status = 'CANCELLED';
    ride.cancelledBy = 'admin';
    ride.cancellationReason = reason || 'Cancelled by admin';
    ride.timestamps.cancelledAt = new Date();

    await ride.save();

    // Make rider available again
    if (ride.rider) {
      await User.findByIdAndUpdate(ride.rider, {
        'riderProfile.isOnDuty': true
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ride cancelled by admin',
      data: { ride }
    });

  } catch (error) {
    console.error('❌ Admin cancel ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel ride',
      error: error.message
    });
  }
};

/**
 * Delete all rides (Admin) - USE WITH CAUTION
 * Temporary function for demo/testing purposes
 */
const deleteAllRides = async (req, res) => {
  try {
    const result = await Ride.deleteMany({});

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} rides successfully`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('[Error] Delete all rides:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete all rides',
      error: error.message
    });
  }
};

module.exports = {
  calculateFareEstimate,
  getRideHistory,
  getRideById,
  cancelRide,
  getActiveRides,
  updateRideStatus,
  adminCancelRide,
  deleteAllRides
};
