const User = require('../models/User');
const Ride = require('../models/Ride');
const zoneManager = require('./zoneManager');
const { calculateFare } = require('../utils/fareCalculator');
const { calculateDistance } = require('../utils/geospatial');

/**
 * Socket Service - Handles all real-time socket events
 */
class SocketService {
  constructor() {
    this.io = null;
    // Map of userId -> socketId for quick lookup
    this.userSockets = new Map();
    // Map of rideId -> { customerSocketId, riderSocketId }
    this.activeRides = new Map();

    // SocketService initialized
  }

  /**
   * Initialize Socket.io instance
   */
  initialize(io) {
    this.io = io;
    // Socket.io instance attached
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    const isAdmin = socket.user?.isAdmin === true;

    if (isAdmin) {
      console.log(`[Socket] Admin panel connected: ${socket.id}`);
    } else {
      console.log(`[Socket] User connected: ${socket.id} (${socket.user.userId})`);
      // Store socket mapping only for regular users
      this.userSockets.set(socket.user.userId, socket.id);
    }

    // Register event handlers
    this.registerEventHandlers(socket);

    // Send connection acknowledgment
    socket.emit('connected', {
      message: 'Connected to server',
      userId: socket.user.userId,
      socketId: socket.id,
      isAdmin: isAdmin
    });
  }

  /**
   * Register all socket event handlers
   */
  registerEventHandlers(socket) {
    // Driver events
    socket.on('goOnDuty', (data) => this.handleGoOnDuty(socket, data));
    socket.on('goOffDuty', () => this.handleGoOffDuty(socket));
    socket.on('subscribeToZone', (data) => this.handleSubscribeToZone(socket, data));
    socket.on('rideAccepted', (data) => this.handleRideAccepted(socket, data));
    socket.on('rideArrived', (data) => this.handleRideArrived(socket, data));
    socket.on('rideStarted', (data) => this.handleRideStarted(socket, data));
    socket.on('rideCompleted', (data) => this.handleRideCompleted(socket, data));
    socket.on('updateLocation', (data) => this.handleUpdateLocation(socket, data));

    // Customer events
    socket.on('requestRide', (data) => this.handleRequestRide(socket, data));
    socket.on('cancelRide', (data) => this.handleCancelRide(socket, data));
    socket.on('submitRating', (data) => this.handleSubmitRating(socket, data));

    // Admin events - for driver simulation
    socket.on('admin:updateDriverLocation', (data) => this.handleAdminUpdateDriverLocation(socket, data));
    socket.on('admin:updateRideStatus', (data) => this.handleAdminUpdateRideStatus(socket, data));

    // Disconnect
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  /**
   * Handle driver going on duty
   */
  async handleGoOnDuty(socket, data) {
    try {
      const { latitude, longitude, vehicleType } = data;

      if (!latitude || !longitude) {
        return socket.emit('error', { message: 'Location is required' });
      }

      // Update user in database
      const user = await User.findById(socket.user.userId);

      if (!user || !user.isRider()) {
        return socket.emit('error', { message: 'User is not registered as a rider' });
      }

      user.riderProfile.isOnDuty = true;
      user.riderProfile.location = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };

      if (vehicleType) {
        user.riderProfile.vehicle.type = vehicleType;
      }

      await user.save();

      // Get the vehicle type from user profile or request
      const driverVehicleType = vehicleType || user.riderProfile?.vehicle?.type;

      // Automatically subscribe rider to their zone so they can receive ride requests
      const zoneResult = zoneManager.subscribeToZone(socket, { latitude, longitude }, driverVehicleType);

      if (zoneResult.success) {
        // Update user's current zone in database
        user.riderProfile.currentZone = zoneResult.zone;
        await user.save();

        console.log(`[Driver] ${socket.user.userId} on duty, zone: ${zoneResult.zone}`);
      } else {
        console.log(`[Driver] ${socket.user.userId} on duty (zone subscription failed)`);
      }

      socket.emit('dutyStatusChanged', {
        isOnDuty: true,
        location: { latitude, longitude },
        zone: zoneResult.success ? zoneResult.zone : null
      });

      // Also emit zoneSubscribed event so client knows they're in a zone
      if (zoneResult.success) {
        socket.emit('zoneSubscribed', {
          zone: zoneResult.zone,
          driversInZone: zoneResult.driversInZone
        });
      }

    } catch (error) {
      console.error('[Error] GoOnDuty:', error.message);
      socket.emit('error', { message: 'Failed to go on duty', error: error.message });
    }
  }

  /**
   * Handle driver going off duty
   */
  async handleGoOffDuty(socket) {
    try {
      // Update user in database
      const user = await User.findById(socket.user.userId);

      if (user) {
        user.riderProfile.isOnDuty = false;
        user.riderProfile.currentZone = null;
        await user.save();
      }

      // Unsubscribe from zone
      zoneManager.unsubscribeFromZone(socket);

      console.log(`[Driver] ${socket.user.userId} off duty`);

      socket.emit('dutyStatusChanged', {
        isOnDuty: false
      });

    } catch (error) {
      console.error('[Error] GoOffDuty:', error.message);
      socket.emit('error', { message: 'Failed to go off duty', error: error.message });
    }
  }

  /**
   * Handle zone subscription
   */
  async handleSubscribeToZone(socket, data) {
    try {
      const { latitude, longitude, vehicleType } = data;

      if (!latitude || !longitude) {
        return socket.emit('error', { message: 'Location is required' });
      }

      // Get user's vehicle type from database if not provided
      let driverVehicleType = vehicleType;
      if (!driverVehicleType) {
        const user = await User.findById(socket.user.userId);
        driverVehicleType = user?.riderProfile?.vehicle?.type;
      }

      // Subscribe to zone with vehicle type
      const result = zoneManager.subscribeToZone(socket, { latitude, longitude }, driverVehicleType);

      if (result.success) {
        // Update user's current zone in database
        await User.findByIdAndUpdate(socket.user.userId, {
          'riderProfile.currentZone': result.zone,
          'riderProfile.location': {
            type: 'Point',
            coordinates: [longitude, latitude]
          }
        });

        socket.emit('zoneSubscribed', {
          zone: result.zone,
          driversInZone: result.driversInZone
        });
      } else {
        socket.emit('error', { message: 'Failed to subscribe to zone', error: result.error });
      }

    } catch (error) {
      console.error('[Error] SubscribeToZone:', error.message);
      socket.emit('error', { message: 'Failed to subscribe to zone', error: error.message });
    }
  }

  /**
   * Handle ride request from customer
   */
  async handleRequestRide(socket, data) {
    try {
      const { pickup, dropoff, vehicleType } = data;

      if (!pickup || !dropoff || !vehicleType) {
        return socket.emit('error', { message: 'Pickup, dropoff, and vehicle type are required' });
      }

      // Calculate distance and fare
      const distanceKm = calculateDistance(
        pickup.latitude,
        pickup.longitude,
        dropoff.latitude,
        dropoff.longitude
      );

      const fareDetails = calculateFare(vehicleType, distanceKm);

      // Create ride in database
      const ride = new Ride({
        customer: socket.user.userId,
        pickup: {
          coordinates: {
            type: 'Point',
            coordinates: [pickup.longitude, pickup.latitude]
          },
          address: pickup.address
        },
        dropoff: {
          coordinates: {
            type: 'Point',
            coordinates: [dropoff.longitude, dropoff.latitude]
          },
          address: dropoff.address
        },
        vehicleType,
        status: 'SEARCHING',
        fare: {
          distanceKm: fareDetails.distanceKm,
          pricePerKm: fareDetails.pricePerKm,
          totalAmount: fareDetails.totalAmount,
          paymentMethod: 'cash'
        }
      });

      await ride.save();

      // Get customer info for the ride request
      const customer = await User.findById(socket.user.userId).select('name phone customerProfile');

      console.log(`[Ride] New request: ${ride._id}, type: ${vehicleType}`);

      // Get ALL drivers within 10km radius of pickup location (sorted by distance)
      const driversWithinRadius = zoneManager.getDriversWithinRadius(
        { latitude: pickup.latitude, longitude: pickup.longitude },
        vehicleType,
        10 // 10km radius
      );

      // If no drivers within 10km, try 20km radius
      let matchingDrivers = driversWithinRadius;
      if (matchingDrivers.length === 0) {
        matchingDrivers = zoneManager.getDriversWithinRadius(
          { latitude: pickup.latitude, longitude: pickup.longitude },
          vehicleType,
          20 // 20km radius as fallback
        );
        console.log(`[Ride] Expanded search to 20km radius`);
      }

      // Send ride request to each driver with their distance from pickup
      matchingDrivers.forEach(({ socketId, distance, driverInfo }) => {
        const rideData = {
          _id: ride._id.toString(),
          rideId: ride._id,
          customer: {
            name: customer?.name || 'Customer',
            phone: customer?.phone || '',
            rating: customer?.customerProfile?.rating || 5.0
          },
          pickup: {
            latitude: pickup.latitude,
            longitude: pickup.longitude,
            address: pickup.address
          },
          dropoff: {
            latitude: dropoff.latitude,
            longitude: dropoff.longitude,
            address: dropoff.address
          },
          vehicleType: vehicleType.toUpperCase(),
          estimatedFare: fareDetails.totalAmount,
          fare: fareDetails,
          distance: fareDetails.distanceKm * 1000, // Ride distance in meters
          timestamp: new Date(),
          // Distance from driver's current location to pickup
          pickupDistanceKm: Math.round(distance * 10) / 10, // Round to 1 decimal
          // Show warning if pickup is more than 5km away
          isPickupFar: distance > 5
        };

        this.io.to(socketId).emit('newRideRequest', rideData);
      });

      console.log(`[Ride] Notified ${matchingDrivers.length} ${vehicleType} drivers`);

      // Send confirmation to customer
      socket.emit('rideRequested', {
        rideId: ride._id,
        status: 'SEARCHING',
        fare: fareDetails,
        driversNotified: matchingDrivers.length
      });

    } catch (error) {
      console.error('[Error] RequestRide:', error.message);
      socket.emit('error', { message: 'Failed to request ride', error: error.message });
    }
  }

  /**
   * Handle ride acceptance by driver
   */
  async handleRideAccepted(socket, data) {
    try {
      const { rideId } = data;

      // Atomic update to prevent race condition (multiple drivers accepting)
      const ride = await Ride.findOneAndUpdate(
        {
          _id: rideId,
          status: 'SEARCHING'
        },
        {
          $set: {
            rider: socket.user.userId,
            status: 'ACCEPTED',
            'timestamps.acceptedAt': new Date()
          }
        },
        { new: true }
      ).populate('rider', 'name phone riderProfile.vehicle riderProfile.location');

      if (!ride) {
        return socket.emit('error', { message: 'Ride already accepted or not found' });
      }

      // Update driver status
      await User.findByIdAndUpdate(socket.user.userId, {
        'riderProfile.isOnDuty': false
      });

      // Store active ride mapping - get customer ID from original ride document
      const customerId = ride.customer.toString();
      const customerSocketId = this.userSockets.get(customerId);

      // Log for debugging
      console.log(`[Ride] ${rideId} accepted by driver ${socket.user.userId}`);
      console.log(`[Ride] Customer ID: ${customerId}, Socket ID: ${customerSocketId || 'NOT FOUND'}`);
      console.log(`[Ride] Active user sockets: ${this.userSockets.size}`);

      this.activeRides.set(rideId, {
        customerSocketId,
        riderSocketId: socket.id,
        customerId: customerId,
        riderId: socket.user.userId
      });

      // Generate OTPs for ride start and completion
      const startOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const endOtp = Math.floor(1000 + Math.random() * 9000).toString();

      // Store OTPs in ride document
      await Ride.findByIdAndUpdate(rideId, {
        'otp.startOtp': startOtp,
        'otp.endOtp': endOtp
      });

      // Notify customer with full ride details including OTPs
      // Try to find customer socket again if not found initially
      let finalCustomerSocketId = customerSocketId;
      if (!finalCustomerSocketId) {
        // Try different formats of customer ID
        for (const [userId, socketId] of this.userSockets.entries()) {
          if (userId === customerId || userId.toString() === customerId) {
            finalCustomerSocketId = socketId;
            console.log(`[Ride] Found customer socket via iteration: ${socketId}`);
            break;
          }
        }
      }

      if (finalCustomerSocketId) {
        console.log(`[Ride] Sending rideAccepted to customer socket: ${finalCustomerSocketId}`);
        this.io.to(finalCustomerSocketId).emit('rideAccepted', {
          rideId: ride._id,
          status: 'ACCEPTED',
          pickup: {
            latitude: ride.pickup.coordinates.coordinates[1],
            longitude: ride.pickup.coordinates.coordinates[0],
            address: ride.pickup.address
          },
          dropoff: {
            latitude: ride.dropoff.coordinates.coordinates[1],
            longitude: ride.dropoff.coordinates.coordinates[0],
            address: ride.dropoff.address
          },
          rider: {
            id: ride.rider._id,
            name: ride.rider.name,
            phone: ride.rider.phone,
            vehicle: ride.rider.riderProfile.vehicle,
            rating: ride.rider.riderProfile.rating || 5.0,
            location: {
              latitude: ride.rider.riderProfile.location.coordinates[1],
              longitude: ride.rider.riderProfile.location.coordinates[0]
            }
          },
          fare: ride.fare,
          vehicleType: ride.vehicleType,
          otp: {
            startOtp: startOtp,
            endOtp: endOtp
          }
        });
      } else {
        console.log(`[Ride] WARNING: Customer socket not found for ride ${rideId}`);
      }

      // Notify driver
      socket.emit('rideAcceptedConfirm', {
        rideId: ride._id,
        status: 'ACCEPTED'
      });

      // Broadcast to other drivers that ride is no longer available
      const zones = zoneManager.getRelevantZones({
        latitude: ride.pickup.coordinates.coordinates[1],
        longitude: ride.pickup.coordinates.coordinates[0]
      });

      zones.forEach(zone => {
        this.io.to(`zone:${zone}`).emit('rideUnavailable', { rideId: ride._id });
      });

    } catch (error) {
      console.error('[Error] RideAccepted:', error.message);
      socket.emit('error', { message: 'Failed to accept ride', error: error.message });
    }
  }

  /**
   * Handle driver arrived at pickup
   */
  async handleRideArrived(socket, data) {
    try {
      const { rideId } = data;

      const ride = await Ride.findByIdAndUpdate(
        rideId,
        {
          status: 'ARRIVED',
          'timestamps.arrivedAt': new Date()
        },
        { new: true }
      );

      if (!ride) {
        return socket.emit('error', { message: 'Ride not found' });
      }

      const rideMapping = this.activeRides.get(rideId);
      if (rideMapping && rideMapping.customerSocketId) {
        this.io.to(rideMapping.customerSocketId).emit('rideStatusUpdate', {
          rideId,
          status: 'ARRIVED'
        });
      }

      socket.emit('rideStatusUpdateConfirm', { rideId, status: 'ARRIVED' });

    } catch (error) {
      console.error('[Error] RideArrived:', error.message);
      socket.emit('error', { message: 'Failed to update ride status', error: error.message });
    }
  }

  /**
   * Handle ride started - requires OTP verification
   */
  async handleRideStarted(socket, data) {
    try {
      const { rideId, otp } = data;

      // OTP is required
      if (!otp) {
        return socket.emit('otpError', { message: 'OTP is required to start the ride' });
      }

      // Get ride to verify OTP
      const ride = await Ride.findById(rideId);

      if (!ride) {
        return socket.emit('error', { message: 'Ride not found' });
      }

      // Verify start OTP - REQUIRED
      if (!ride.otp?.startOtp) {
        return socket.emit('error', { message: 'No OTP found for this ride. Please contact support.' });
      }

      if (otp !== ride.otp.startOtp) {
        console.log(`[OTP] Invalid start OTP for ride ${rideId}`);
        return socket.emit('otpError', { message: 'Invalid OTP. Please ask the customer for the correct code.' });
      }

      // OTP verified - Update ride status
      ride.status = 'STARTED';
      ride.timestamps.startedAt = new Date();
      ride.otp.startOtpVerified = true;
      await ride.save();

      const rideMapping = this.activeRides.get(rideId);
      if (rideMapping && rideMapping.customerSocketId) {
        this.io.to(rideMapping.customerSocketId).emit('rideStatusUpdate', {
          rideId,
          status: 'STARTED'
        });
      }

      // Emit OTP verified confirmation event
      socket.emit('rideStartedConfirm', { rideId, status: 'STARTED' });
      console.log(`[Ride] ${rideId} started`);

    } catch (error) {
      console.error('[Error] RideStarted:', error.message);
      socket.emit('error', { message: 'Failed to start ride', error: error.message });
    }
  }

  /**
   * Handle ride completed - requires OTP verification
   */
  async handleRideCompleted(socket, data) {
    try {
      const { rideId, otp } = data;

      // OTP is required
      if (!otp) {
        return socket.emit('otpError', { message: 'OTP is required to complete the ride' });
      }

      // Get ride to verify OTP
      const ride = await Ride.findById(rideId);

      if (!ride) {
        return socket.emit('error', { message: 'Ride not found' });
      }

      // Verify end OTP - REQUIRED
      if (!ride.otp?.endOtp) {
        return socket.emit('error', { message: 'No OTP found for this ride. Please contact support.' });
      }

      if (otp !== ride.otp.endOtp) {
        console.log(`[OTP] Invalid end OTP for ride ${rideId}`);
        return socket.emit('otpError', { message: 'Invalid OTP. Please ask the customer for the correct code.' });
      }

      // OTP verified - Update ride status
      ride.status = 'COMPLETED';
      ride.timestamps.completedAt = new Date();
      ride.otp.endOtpVerified = true;
      await ride.save();

      // Update rider stats and earnings
      await User.findByIdAndUpdate(ride.rider, {
        $inc: {
          'riderProfile.totalRides': 1,
          'riderProfile.earnings': ride.fare.totalAmount
        },
        'riderProfile.isOnDuty': true // Back to available
      });

      // Update customer stats
      await User.findByIdAndUpdate(ride.customer, {
        $inc: { 'customerProfile.totalRides': 1 }
      });

      const rideMapping = this.activeRides.get(rideId);
      if (rideMapping && rideMapping.customerSocketId) {
        this.io.to(rideMapping.customerSocketId).emit('rideStatusUpdate', {
          rideId,
          status: 'COMPLETED',
          fare: ride.fare
        });
      }

      // Emit OTP verified confirmation event
      socket.emit('rideCompletedConfirm', {
        rideId,
        status: 'COMPLETED',
        earnings: ride.fare.totalAmount
      });

      // Clean up active ride mapping
      this.activeRides.delete(rideId);

      console.log(`[Ride] ${rideId} completed, fare: ${ride.fare.totalAmount}`);

    } catch (error) {
      console.error('[Error] RideCompleted:', error.message);
      socket.emit('error', { message: 'Failed to complete ride', error: error.message });
    }
  }

  /**
   * Handle location update from driver
   */
  async handleUpdateLocation(socket, data) {
    try {
      const { latitude, longitude, rideId } = data;

      if (!latitude || !longitude) {
        return socket.emit('error', { message: 'Location is required' });
      }

      // Update driver location in database
      await User.findByIdAndUpdate(socket.user.userId, {
        'riderProfile.location': {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      });

      // If rideId provided, send location to customer
      if (rideId) {
        const rideMapping = this.activeRides.get(rideId);
        if (rideMapping && rideMapping.customerSocketId) {
          this.io.to(rideMapping.customerSocketId).emit('driverLocationUpdate', {
            rideId,
            location: { latitude, longitude }
          });
        }
      }

    } catch (error) {
      console.error('[Error] UpdateLocation:', error.message);
      socket.emit('error', { message: 'Failed to update location', error: error.message });
    }
  }

  /**
   * Handle ride cancellation
   */
  async handleCancelRide(socket, data) {
    try {
      const { rideId, reason } = data;

      const ride = await Ride.findById(rideId);

      if (!ride) {
        return socket.emit('error', { message: 'Ride not found' });
      }

      // Check if user is authorized to cancel
      const isCustomer = ride.customer.toString() === socket.user.userId;
      const isRider = ride.rider && ride.rider.toString() === socket.user.userId;

      if (!isCustomer && !isRider) {
        return socket.emit('error', { message: 'Not authorized to cancel this ride' });
      }

      // Store previous status to check if we need to broadcast to zones
      const wasSearching = ride.status === 'SEARCHING';
      const pickupCoords = ride.pickup?.coordinates?.coordinates;

      ride.status = 'CANCELLED';
      ride.cancelledBy = isCustomer ? 'customer' : 'rider';
      ride.cancellationReason = reason || 'No reason provided';
      ride.timestamps.cancelledAt = new Date();
      await ride.save();

      // If rider assigned, make them available again
      if (ride.rider) {
        await User.findByIdAndUpdate(ride.rider, {
          'riderProfile.isOnDuty': true
        });
      }

      // If ride was still in SEARCHING status (no driver assigned yet),
      // broadcast cancellation to all drivers in relevant zones
      if (wasSearching && isCustomer && pickupCoords) {
        const zones = zoneManager.getRelevantZones({
          latitude: pickupCoords[1],
          longitude: pickupCoords[0]
        });

        // Get all drivers with matching vehicle type
        const matchingDriverSocketIds = zoneManager.getDriverSocketsByVehicleType(zones, ride.vehicleType);

        // Notify all matching drivers that this ride is no longer available
        matchingDriverSocketIds.forEach(socketId => {
          this.io.to(socketId).emit('rideUnavailable', {
            rideId: ride._id,
            reason: 'Customer cancelled the request'
          });
        });

        console.log(`[Ride] Cancellation broadcast to ${matchingDriverSocketIds.length} drivers`);
      }

      // Notify other party (if ride was accepted and driver assigned)
      const rideMapping = this.activeRides.get(rideId);
      let otherSocketId = null;

      if (isCustomer && ride.rider) {
        // Customer cancelled - notify rider
        // First try ride mapping, then fallback to userSockets
        otherSocketId = rideMapping?.riderSocketId || this.userSockets.get(ride.rider.toString());
      } else if (isRider) {
        // Rider cancelled - notify customer
        otherSocketId = rideMapping?.customerSocketId || this.userSockets.get(ride.customer.toString());
      }

      if (otherSocketId) {
        this.io.to(otherSocketId).emit('rideCancelled', {
          rideId,
          cancelledBy: isCustomer ? 'customer' : 'rider',
          reason: ride.cancellationReason
        });
        console.log(`[Ride] Cancellation sent to ${isCustomer ? 'rider' : 'customer'}`);
      }

      socket.emit('rideCancelledConfirm', { rideId });

      // Clean up active ride mapping
      this.activeRides.delete(rideId);

      console.log(`[Ride] ${rideId} cancelled by ${isCustomer ? 'customer' : 'rider'}`);

    } catch (error) {
      console.error('[Error] CancelRide:', error.message);
      socket.emit('error', { message: 'Failed to cancel ride', error: error.message });
    }
  }

  /**
   * Handle rating submission
   */
  async handleSubmitRating(socket, data) {
    try {
      const { rideId, rating, comment, ratedBy } = data;

      if (!rideId || !rating) {
        return socket.emit('error', { message: 'Ride ID and rating are required' });
      }

      if (rating < 1 || rating > 5) {
        return socket.emit('error', { message: 'Rating must be between 1 and 5' });
      }

      const ride = await Ride.findById(rideId);

      if (!ride) {
        return socket.emit('error', { message: 'Ride not found' });
      }

      // Determine who is being rated
      if (ratedBy === 'customer') {
        // Customer is rating the driver
        ride.rating = {
          ...ride.rating,
          driverRating: rating,
          driverComment: comment || ''
        };

        // Update driver's average rating
        if (ride.rider) {
          const driver = await User.findById(ride.rider);
          if (driver) {
            const totalRatings = driver.riderProfile.totalRatings || 0;
            const currentRating = driver.riderProfile.rating || 5.0;
            const newTotalRatings = totalRatings + 1;
            const newRating = ((currentRating * totalRatings) + rating) / newTotalRatings;

            await User.findByIdAndUpdate(ride.rider, {
              'riderProfile.rating': Math.round(newRating * 10) / 10,
              'riderProfile.totalRatings': newTotalRatings
            });

            console.log(`[Rating] Driver ${ride.rider}: ${rating} stars`);
          }
        }
      } else {
        // Driver is rating the customer
        ride.rating = {
          ...ride.rating,
          customerRating: rating,
          customerComment: comment || ''
        };

        // Update customer's average rating
        const customer = await User.findById(ride.customer);
        if (customer) {
          const totalRatings = customer.customerProfile?.totalRatings || 0;
          const currentRating = customer.customerProfile?.rating || 5.0;
          const newTotalRatings = totalRatings + 1;
          const newRating = ((currentRating * totalRatings) + rating) / newTotalRatings;

          await User.findByIdAndUpdate(ride.customer, {
            'customerProfile.rating': Math.round(newRating * 10) / 10,
            'customerProfile.totalRatings': newTotalRatings
          });

          console.log(`[Rating] Customer ${ride.customer}: ${rating} stars`);
        }
      }

      await ride.save();

      socket.emit('ratingSubmitted', { rideId, rating, ratedBy });

    } catch (error) {
      console.error('[Error] SubmitRating:', error.message);
      socket.emit('error', { message: 'Failed to submit rating', error: error.message });
    }
  }

  /**
   * Handle admin driver location update (for simulation)
   */
  async handleAdminUpdateDriverLocation(socket, data) {
    try {
      const { rideId, location } = data;

      if (!rideId || !location) {
        return socket.emit('error', { message: 'Ride ID and location are required' });
      }

      console.log(`[Admin] Updating driver location for ride ${rideId}`);

      // Get the ride mapping
      const rideMapping = this.activeRides.get(rideId);

      if (!rideMapping) {
        // Try to find ride in database and create mapping
        const ride = await Ride.findById(rideId);
        if (!ride) {
          return socket.emit('error', { message: 'Ride not found' });
        }

        // Get customer socket
        const customerSocketId = this.userSockets.get(ride.customer.toString());

        if (customerSocketId) {
          // Send location update to customer
          this.io.to(customerSocketId).emit('driverLocationUpdate', {
            rideId,
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              address: location.address || ''
            }
          });
          // Location sent to customer
        }
      } else {
        // Send to customer using existing mapping
        if (rideMapping.customerSocketId) {
          this.io.to(rideMapping.customerSocketId).emit('driverLocationUpdate', {
            rideId,
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              address: location.address || ''
            }
          });
          // Location sent to customer
        }
      }

      socket.emit('admin:locationUpdated', { rideId, location });

    } catch (error) {
      console.error('[Error] Admin UpdateDriverLocation:', error.message);
      socket.emit('error', { message: 'Failed to update driver location', error: error.message });
    }
  }

  /**
   * Handle admin ride status update (for simulation)
   */
  async handleAdminUpdateRideStatus(socket, data) {
    try {
      const { rideId, status } = data;

      if (!rideId || !status) {
        return socket.emit('error', { message: 'Ride ID and status are required' });
      }

      const validStatuses = ['ARRIVED', 'STARTED', 'COMPLETED'];
      if (!validStatuses.includes(status)) {
        return socket.emit('error', { message: 'Invalid status' });
      }

      console.log(`[Admin] Updating ride ${rideId} status: ${status}`);

      // Update ride in database
      const updateData = {
        status,
        [`timestamps.${status.toLowerCase()}At`]: new Date()
      };

      const ride = await Ride.findByIdAndUpdate(rideId, updateData, { new: true });

      if (!ride) {
        return socket.emit('error', { message: 'Ride not found' });
      }

      // Get customer socket and notify
      const customerSocketId = this.userSockets.get(ride.customer.toString());

      if (customerSocketId) {
        this.io.to(customerSocketId).emit('rideStatusUpdate', {
          rideId,
          status,
          ...(status === 'COMPLETED' && { fare: ride.fare })
        });
        // Status update sent to customer
      }

      // Also notify driver if connected
      const rideMapping = this.activeRides.get(rideId);
      if (rideMapping && rideMapping.riderSocketId) {
        this.io.to(rideMapping.riderSocketId).emit('rideStatusUpdate', {
          rideId,
          status
        });
      }

      // Handle completion
      if (status === 'COMPLETED') {
        // Update rider stats
        if (ride.rider) {
          await User.findByIdAndUpdate(ride.rider, {
            $inc: {
              'riderProfile.totalRides': 1,
              'riderProfile.earnings': ride.fare.totalAmount
            },
            'riderProfile.isOnDuty': true
          });
        }

        // Update customer stats
        await User.findByIdAndUpdate(ride.customer, {
          $inc: { 'customerProfile.totalRides': 1 }
        });

        // Clean up mapping
        this.activeRides.delete(rideId);
      }

      socket.emit('admin:statusUpdated', { rideId, status });

    } catch (error) {
      console.error('[Error] Admin UpdateRideStatus:', error.message);
      socket.emit('error', { message: 'Failed to update ride status', error: error.message });
    }
  }

  /**
   * Handle socket disconnect
   */
  async handleDisconnect(socket) {
    const isAdmin = socket.user?.isAdmin === true;

    if (isAdmin) {
      console.log(`[Socket] Admin panel disconnected: ${socket.id}`);
      return; // No cleanup needed for admin connections
    }

    console.log(`[Socket] User disconnected: ${socket.id} (${socket.user.userId})`);

    // Clean up zone subscriptions
    zoneManager.handleDisconnect(socket);

    // Remove from user sockets map
    this.userSockets.delete(socket.user.userId);

    // Update driver status if they were on duty
    await User.findByIdAndUpdate(socket.user.userId, {
      'riderProfile.isOnDuty': false,
      'riderProfile.currentZone': null
    });
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      connectedUsers: this.userSockets.size,
      activeRides: this.activeRides.size,
      zoneStats: zoneManager.getStats()
    };
  }
}

// Singleton instance
const socketService = new SocketService();

module.exports = socketService;
