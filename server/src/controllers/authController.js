const User = require('../models/User');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { createClerkClient } = require('@clerk/clerk-sdk-node');

// Initialize Clerk
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

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
      console.log(`[Auth] New user: ${phone}`);
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
      console.log(`[Auth] Login: ${phone}`);
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
          customerProfile: user.customerProfile,
          riderProfile: user.riderProfile
        },
        tokens
      }
    });

  } catch (error) {
    console.error('[Error] Login:', error.message);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Clerk Sync - Sync existing Clerk user with our database
 * Used when a user logs in via Clerk OTP
 */
const clerkSync = async (req, res) => {
  try {
    const { phone, role, clerkToken } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Verify Clerk token if provided
    if (clerkToken) {
      try {
        await clerk.verifyToken(clerkToken);
      } catch (err) {
        console.log('[Auth] Clerk token verification failed:', err.message);
        // Continue anyway - token might be session-based
      }
    }

    // Find existing user
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.',
        requiresRegistration: true
      });
    }

    // Update active role if provided
    if (role && user.role.includes(role)) {
      user.activeRole = role;
    }

    // Generate tokens
    const tokens = generateTokenPair(user._id, user.phone, user.activeRole);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    console.log('[Auth] Clerk sync successful:', phone);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          activeRole: user.activeRole,
          customerProfile: user.customerProfile,
          riderProfile: user.riderProfile
        },
        tokens
      }
    });

  } catch (error) {
    console.error('[Error] Clerk sync:', error.message);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Clerk Register - Register new user via Clerk
 * Used when a new user signs up via Clerk OTP
 */
const clerkRegister = async (req, res) => {
  try {
    const { phone, name, role, clerkToken, vehicle } = req.body;

    if (!phone || !name) {
      return res.status(400).json({
        success: false,
        message: 'Phone and name are required'
      });
    }

    // Verify Clerk token if provided
    if (clerkToken) {
      try {
        await clerk.verifyToken(clerkToken);
      } catch (err) {
        console.log('[Auth] Clerk token verification failed:', err.message);
        // Continue anyway - token might be session-based
      }
    }

    // Check if user already exists
    let user = await User.findOne({ phone });

    if (user) {
      // User exists - update if needed and return tokens
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

        if (!user.role.includes('rider')) {
          user.role.push('rider');
        }
        user.activeRole = 'rider';
      }

      const tokens = generateTokenPair(user._id, user.phone, user.activeRole);
      user.refreshToken = tokens.refreshToken;
      await user.save();

      console.log('[Auth] Clerk user updated:', phone);

      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: {
          user: {
            id: user._id,
            phone: user.phone,
            name: user.name,
            role: user.role,
            activeRole: user.activeRole,
            customerProfile: user.customerProfile,
            riderProfile: user.riderProfile
          },
          tokens
        }
      });
    }

    // Validate vehicle details for riders
    if (role === 'rider' && !vehicle) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle details are required for riders'
      });
    }

    // Create new user
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

    // Generate tokens
    const tokens = generateTokenPair(user._id, user.phone, user.activeRole);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    console.log('[Auth] Clerk new user registered:', phone);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          activeRole: user.activeRole,
          customerProfile: user.customerProfile,
          riderProfile: user.riderProfile
        },
        tokens
      }
    });

  } catch (error) {
    console.error('[Error] Clerk register:', error.message);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
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
    console.error('[Error] Token refresh:', error.message);
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
    console.error('[Error] Role switch:', error.message);
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
    console.error('[Error] Rider registration:', error.message);
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
    console.error('[Error] Get profile:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * Get all users (Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, role, search } = req.query;

    const query = {};
    if (role) {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select('-refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users: users.map(u => ({
          id: u._id,
          phone: u.phone,
          name: u.name,
          role: u.role,
          activeRole: u.activeRole,
          createdAt: u.createdAt,
          customerProfile: u.customerProfile,
          riderProfile: u.riderProfile
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('[Error] Get all users:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

/**
 * Get all drivers (Admin)
 */
const getAllDrivers = async (req, res) => {
  try {
    const { page = 1, limit = 50, onDuty, vehicleType } = req.query;

    const query = { role: 'rider' };

    if (onDuty !== undefined) {
      query['riderProfile.isOnDuty'] = onDuty === 'true';
    }
    if (vehicleType) {
      query['riderProfile.vehicle.type'] = vehicleType;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const drivers = await User.find(query)
      .select('-refreshToken')
      .sort({ 'riderProfile.earnings': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    // Get summary stats
    const stats = await User.aggregate([
      { $match: { role: 'rider' } },
      {
        $group: {
          _id: null,
          totalDrivers: { $sum: 1 },
          totalEarnings: { $sum: '$riderProfile.earnings' },
          totalRides: { $sum: '$riderProfile.totalRides' },
          onDutyCount: {
            $sum: { $cond: ['$riderProfile.isOnDuty', 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        drivers: drivers.map(d => ({
          id: d._id,
          phone: d.phone,
          name: d.name,
          createdAt: d.createdAt,
          vehicle: d.riderProfile?.vehicle,
          isOnDuty: d.riderProfile?.isOnDuty || false,
          earnings: d.riderProfile?.earnings || 0,
          totalRides: d.riderProfile?.totalRides || 0,
          rating: d.riderProfile?.rating || 5.0,
          currentZone: d.riderProfile?.currentZone
        })),
        stats: stats[0] || {
          totalDrivers: 0,
          totalEarnings: 0,
          totalRides: 0,
          onDutyCount: 0
        },
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('[Error] Get all drivers:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drivers',
      error: error.message
    });
  }
};

/**
 * Get user by ID (Admin)
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-refreshToken');

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
    console.error('[Error] Get user by ID:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

/**
 * Update user by ID (Admin)
 */
const updateUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Prevent updating sensitive fields
    delete updates.refreshToken;
    delete updates._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select('-refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('[Error] Update user:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

/**
 * Delete user by ID (Admin)
 */
const deleteUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('[Error] Delete user:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

module.exports = {
  phoneLogin,
  clerkSync,
  clerkRegister,
  refreshToken,
  switchRole,
  registerRider,
  getProfile,
  getAllUsers,
  getAllDrivers,
  getUserById,
  updateUserById,
  deleteUserById
};
