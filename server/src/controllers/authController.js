const User = require('../models/User');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');

/**
 * Phone-based login/signup
 * In production, this should send OTP for verification
 * For now, simplified version without OTP
 */
const phoneLogin = async (req, res) => {
  try {
    const { phone, name, role, vehicle } = req.body;

    // Validate input
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Check if user exists
    let user = await User.findOne({ phone });

    if (!user) {
      // Create new user
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name is required for new users'
        });
      }

      // Validate vehicle details for riders
      if (role === 'rider' && !vehicle) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle details are required for riders'
        });
      }

      user = new User({
        phone,
        name,
        role: role ? [role] : ['customer'],
        activeRole: role || 'customer'
      });

      // Add vehicle details for riders
      if (role === 'rider' && vehicle) {
        user.riderProfile = {
          vehicle: {
            type: vehicle.type || 'cab',
            model: vehicle.model || 'Unknown',
            plateNumber: vehicle.plateNumber || 'Unknown',
            color: vehicle.color || 'Unknown'
          },
          rating: 5.0,
          totalRides: 0,
          isAvailable: false
        };
      }

      await user.save();
      console.log(`✅ New user created: ${phone} (${role || 'customer'})`);
    } else {
      // Existing user - update vehicle details if provided and role is rider
      if (role === 'rider' && vehicle) {
        user.riderProfile = {
          ...user.riderProfile,
          vehicle: {
            type: vehicle.type || user.riderProfile?.vehicle?.type || 'cab',
            model: vehicle.model || user.riderProfile?.vehicle?.model || 'Unknown',
            plateNumber: vehicle.plateNumber || user.riderProfile?.vehicle?.plateNumber || 'Unknown',
            color: vehicle.color || user.riderProfile?.vehicle?.color || 'Unknown'
          }
        };

        // Add rider role if not present
        if (!user.role.includes('rider')) {
          user.role.push('rider');
        }
        user.activeRole = 'rider';
      }
      console.log(`✅ Existing user logged in: ${phone}`);
    }

    // Generate tokens
    const tokens = generateTokenPair(user._id, user.phone, user.activeRole);

    // Store refresh token in database
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: user ? 'Login successful' : 'User created successfully',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          activeRole: user.activeRole,
          riderProfile: user.riderProfile
        },
        tokens
      }
    });

  } catch (error) {
    console.error('❌ Phone login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const { valid, decoded, error } = verifyRefreshToken(refreshToken);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        error
      });
    }

    // Find user and verify stored token matches
    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new token pair
    const tokens = generateTokenPair(user._id, user.phone, user.activeRole);

    // Update stored refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens }
    });

  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: error.message
    });
  }
};

/**
 * Switch role (customer <-> rider)
 */
const switchRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.user.userId;

    if (!['customer', 'rider'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "customer" or "rider"'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has this role
    if (!user.role.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `You don't have ${role} role. Please register as ${role} first.`
      });
    }

    // Update active role
    user.activeRole = role;
    await user.save();

    // Generate new tokens with updated role
    const tokens = generateTokenPair(user._id, user.phone, role);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Switched to ${role} mode`,
      data: {
        activeRole: role,
        tokens
      }
    });

  } catch (error) {
    console.error('❌ Role switch error:', error);
    res.status(500).json({
      success: false,
      message: 'Role switch failed',
      error: error.message
    });
  }
};

/**
 * Register as rider (add rider role and vehicle details)
 */
const registerRider = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { vehicleType, vehicleModel, plateNumber, color } = req.body;

    if (!vehicleType || !vehicleModel || !plateNumber) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle details are required (type, model, plateNumber)'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add rider role if not present
    if (!user.role.includes('rider')) {
      user.role.push('rider');
    }

    // Set rider profile
    user.riderProfile.vehicle = {
      type: vehicleType,
      model: vehicleModel,
      plateNumber,
      color: color || 'black'
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Registered as rider successfully',
      data: {
        role: user.role,
        riderProfile: user.riderProfile
      }
    });

  } catch (error) {
    console.error('❌ Rider registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Rider registration failed',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

module.exports = {
  phoneLogin,
  refreshToken,
  switchRole,
  registerRider,
  getProfile
};
