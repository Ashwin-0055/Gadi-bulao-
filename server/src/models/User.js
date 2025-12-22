const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    type: String,
    trim: true,
    match: /^[0-9]{10,15}$/
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  // OTP fields for email verification (with security)
  otp: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  otpAttempts: {
    type: Number,
    default: 0
  },
  otpRequestCount: {
    type: Number,
    default: 0
  },
  otpRequestWindowStart: {
    type: Date,
    default: null
  },
  isOtpLocked: {
    type: Boolean,
    default: false
  },
  otpLockUntil: {
    type: Date,
    default: null
  },
  role: [{
    type: String,
    enum: ['customer', 'rider'],
    default: ['customer']
  }],
  activeRole: {
    type: String,
    enum: ['customer', 'rider'],
    default: 'customer'
  },

  // Rider-specific fields
  riderProfile: {
    vehicle: {
      type: {
        type: String,
        enum: ['bike', 'auto', 'cab']
      },
      model: String,
      plateNumber: String,
      color: String
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    isOnDuty: {
      type: Boolean,
      default: false
    },
    currentZone: {
      type: String,
      default: null
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5
    },
    totalRides: {
      type: Number,
      default: 0
    },
    earnings: {
      type: Number,
      default: 0
    }
  },

  // Customer-specific fields
  customerProfile: {
    savedLocations: [{
      name: String,
      address: String,
      coordinates: {
        type: [Number], // [longitude, latitude]
      }
    }],
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5
    },
    totalRides: {
      type: Number,
      default: 0
    }
  },

  // Auth tokens
  refreshToken: {
    type: String,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create 2dsphere index for geospatial queries
userSchema.index({ 'riderProfile.location': '2dsphere' });

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ 'riderProfile.isOnDuty': 1 });
userSchema.index({ 'riderProfile.currentZone': 1 });

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to check if user is a rider
userSchema.methods.isRider = function() {
  return this.role.includes('rider');
};

// Instance method to check if user is a customer
userSchema.methods.isCustomer = function() {
  return this.role.includes('customer');
};

const User = mongoose.model('User', userSchema);

module.exports = User;
