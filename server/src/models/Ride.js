const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  pickup: {
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    address: {
      type: String,
      required: true
    }
  },

  dropoff: {
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    address: {
      type: String,
      required: true
    }
  },

  vehicleType: {
    type: String,
    enum: ['bike', 'auto', 'cab'],
    required: true
  },

  status: {
    type: String,
    enum: ['SEARCHING', 'ACCEPTED', 'ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED'],
    default: 'SEARCHING'
  },

  fare: {
    distanceKm: {
      type: Number,
      required: true
    },
    pricePerKm: {
      type: Number,
      required: true
    },
    totalAmount: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      default: 'cash'
    }
  },

  route: {
    polyline: {
      type: String,
      default: null
    },
    durationMin: {
      type: Number,
      default: null
    }
  },

  // Timestamps for ride lifecycle
  timestamps: {
    requestedAt: {
      type: Date,
      default: Date.now
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    arrivedAt: {
      type: Date,
      default: null
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    }
  },

  cancelledBy: {
    type: String,
    enum: ['customer', 'rider', null],
    default: null
  },

  cancellationReason: {
    type: String,
    default: null
  },

  // OTP for ride verification
  otp: {
    startOtp: {
      type: String,
      default: null
    },
    endOtp: {
      type: String,
      default: null
    },
    startOtpVerified: {
      type: Boolean,
      default: false
    },
    endOtpVerified: {
      type: Boolean,
      default: false
    }
  }
});

// Create geospatial indexes
rideSchema.index({ 'pickup.coordinates': '2dsphere' });
rideSchema.index({ 'dropoff.coordinates': '2dsphere' });

// Index for faster queries
rideSchema.index({ customer: 1, 'timestamps.requestedAt': -1 });
rideSchema.index({ rider: 1, 'timestamps.requestedAt': -1 });
rideSchema.index({ status: 1 });

// Instance method to calculate ETA based on distance
rideSchema.methods.calculateETA = function() {
  // Average speed: 30 km/h in city
  const avgSpeedKmh = 30;
  return Math.ceil((this.fare.distanceKm / avgSpeedKmh) * 60); // in minutes
};

const Ride = mongoose.model('Ride', rideSchema);

module.exports = Ride;
