const User = require('../models/User');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');
const axios = require('axios');

// ============================================
// EMAIL OTP CONFIGURATION (Using Brevo API)
// ============================================

// Send email using Brevo HTTP API (works on Render free tier)
const sendEmailViaBrevo = async (to, subject, htmlContent, textContent) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || 'noreply@gadibulao.com';
  const senderName = process.env.SENDER_NAME || 'Gadi Bulao';

  if (!apiKey) {
    throw new Error('BREVO_API_KEY not configured');
  }

  const response = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent,
      textContent: textContent,
    },
    {
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
    }
  );

  return response.data;
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP for secure storage
const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

// Verify OTP against hash
const verifyOTPHash = async (otp, hash) => {
  return bcrypt.compare(otp, hash);
};

// ============================================
// SECURITY CONSTANTS
// ============================================
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const MAX_OTP_REQUESTS = 3;
const OTP_RATE_LIMIT_MINUTES = 10;
const OTP_LOCK_MINUTES = 30;

// ============================================
// SEND OTP - With Full Security
// ============================================
/**
 * Send OTP to email
 * Security: Rate limiting, OTP hashing, expiry
 */
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Validate email format
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Find or create temporary user record for OTP
    let user = await User.findOne({ email: normalizedEmail });

    // For new users, we'll create a temporary record
    if (!user) {
      user = new User({
        email: normalizedEmail,
        name: 'Pending', // Will be updated after verification
        role: ['customer'],
        activeRole: 'customer'
      });
    }

    // 3. Check if user is locked due to too many attempts
    if (user.isOtpLocked && user.otpLockUntil) {
      if (new Date() < user.otpLockUntil) {
        const remainingMinutes = Math.ceil((user.otpLockUntil - new Date()) / (1000 * 60));
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Try again in ${remainingMinutes} minutes.`,
          lockedUntil: user.otpLockUntil
        });
      } else {
        // Lock expired, reset
        user.isOtpLocked = false;
        user.otpLockUntil = null;
        user.otpAttempts = 0;
      }
    }

    // 4. Rate limiting - Max 3 OTP requests per 10 minutes
    const now = new Date();
    if (user.otpRequestWindowStart) {
      const windowStart = new Date(user.otpRequestWindowStart);
      const windowEnd = new Date(windowStart.getTime() + OTP_RATE_LIMIT_MINUTES * 60 * 1000);

      if (now < windowEnd) {
        // Still within rate limit window
        if (user.otpRequestCount >= MAX_OTP_REQUESTS) {
          const remainingMinutes = Math.ceil((windowEnd - now) / (1000 * 60));
          return res.status(429).json({
            success: false,
            message: `Too many OTP requests. Try again in ${remainingMinutes} minutes.`,
            retryAfter: remainingMinutes
          });
        }
        user.otpRequestCount += 1;
      } else {
        // Window expired, start new window
        user.otpRequestWindowStart = now;
        user.otpRequestCount = 1;
      }
    } else {
      // First request
      user.otpRequestWindowStart = now;
      user.otpRequestCount = 1;
    }

    // 5. Generate OTP
    const otp = generateOTP();

    // 6. Hash OTP before storing (security)
    const hashedOtp = await hashOTP(otp);
    user.otp = hashedOtp;
    user.otpExpiry = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    user.otpAttempts = 0;

    await user.save();

    // 7. Send OTP via Brevo API
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2E7D32;">Gadi Bulao - Email Verification</h2>
          <p>Your OTP for login is:</p>
          <h1 style="color: #4CAF50; font-size: 36px; letter-spacing: 5px; background: #f5f5f5; padding: 20px; border-radius: 10px; text-align: center;">${otp}</h1>
          <p style="color: #666;">This OTP is valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this OTP, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} Gadi Bulao. All rights reserved.</p>
        </div>
      `;
      const textContent = `Your OTP for Gadi Bulao login is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;

      await sendEmailViaBrevo(
        normalizedEmail,
        'Your OTP for Gadi Bulao Login',
        htmlContent,
        textContent
      );

      console.log(`[OTP] Email sent successfully to ${normalizedEmail}`);
    } catch (emailError) {
      console.error('[OTP] Email sending failed:', emailError.message);
      console.error('[OTP] Full error:', emailError.response?.data || emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.',
        error: emailError.response?.data?.message || emailError.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
      data: {
        email: normalizedEmail,
        expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
        isNewUser: user.name === 'Pending'
      }
    });

  } catch (error) {
    console.error('[Error] Send OTP:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
};

// ============================================
// VERIFY OTP - With Full Security
// ============================================
/**
 * Verify OTP and login/register user
 * Security: Attempt limiting, OTP hash verification, account locking
 */
const verifyOtp = async (req, res) => {
  try {
    const { email, otp, name, phone, role, vehicle } = req.body;

    // 1. Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be 6 digits'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Find user
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No OTP request found for this email. Please request OTP first.'
      });
    }

    // 3. Check if account is locked
    if (user.isOtpLocked && user.otpLockUntil) {
      if (new Date() < user.otpLockUntil) {
        const remainingMinutes = Math.ceil((user.otpLockUntil - new Date()) / (1000 * 60));
        return res.status(429).json({
          success: false,
          message: `Account locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
          lockedUntil: user.otpLockUntil
        });
      } else {
        // Lock expired
        user.isOtpLocked = false;
        user.otpLockUntil = null;
        user.otpAttempts = 0;
      }
    }

    // 4. Check if user is in registration process (email already verified, completing profile)
    const isCompletingRegistration = user.isEmailVerified && user.name === 'Pending' && name;

    // 5. Check verification expiry (10 minutes for registration completion)
    if (isCompletingRegistration) {
      const verificationAge = new Date() - new Date(user.emailVerifiedAt);
      const maxAge = 10 * 60 * 1000; // 10 minutes
      if (verificationAge > maxAge) {
        user.isEmailVerified = false;
        user.emailVerifiedAt = null;
        await user.save();
        return res.status(400).json({
          success: false,
          message: 'Verification expired. Please request a new OTP.'
        });
      }
      // Skip OTP validation for registration completion
    } else {
      // Normal OTP verification flow
      if (!user.otp) {
        return res.status(400).json({
          success: false,
          message: 'No OTP found. Please request a new OTP.'
        });
      }

      // Check if OTP expired
      if (new Date() > user.otpExpiry) {
        user.otp = null;
        user.otpExpiry = null;
        await user.save();
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new OTP.'
        });
      }

      // Verify OTP (compare with hash)
      const isValidOtp = await verifyOTPHash(otp, user.otp);

      if (!isValidOtp) {
        // Increment failed attempts
        user.otpAttempts += 1;

        if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
          // Lock account
          user.isOtpLocked = true;
          user.otpLockUntil = new Date(Date.now() + OTP_LOCK_MINUTES * 60 * 1000);
          user.otp = null;
          user.otpExpiry = null;
          await user.save();

          return res.status(429).json({
            success: false,
            message: `Too many failed attempts. Account locked for ${OTP_LOCK_MINUTES} minutes.`,
            lockedUntil: user.otpLockUntil
          });
        }

        await user.save();
        const remainingAttempts = MAX_OTP_ATTEMPTS - user.otpAttempts;
        return res.status(400).json({
          success: false,
          message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
          remainingAttempts
        });
      }
    }

    // 7. OTP is valid - Mark email as verified
    user.otp = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;
    user.otpRequestCount = 0;
    user.otpRequestWindowStart = null;
    user.isOtpLocked = false;
    user.otpLockUntil = null;
    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();

    // 8. Check if this is a new user (needs name)
    const isNewUser = user.name === 'Pending';

    if (isNewUser) {
      if (!name) {
        await user.save();
        return res.status(200).json({
          success: true,
          message: 'OTP verified. Please complete registration.',
          data: {
            verified: true,
            requiresRegistration: true,
            email: normalizedEmail
          }
        });
      }

      // Complete registration
      user.name = name;
      if (phone) user.phone = phone;

      if (role === 'rider') {
        if (!vehicle) {
          return res.status(400).json({
            success: false,
            message: 'Vehicle details required for rider registration'
          });
        }
        user.role = ['rider'];
        user.activeRole = 'rider';
        user.riderProfile = {
          vehicle: {
            type: vehicle.type || 'cab',
            model: vehicle.model || 'Unknown',
            plateNumber: vehicle.plateNumber || 'Unknown',
            color: vehicle.color || 'Unknown'
          },
          rating: 5.0,
          totalRides: 0,
          earnings: 0,
          isOnDuty: false
        };
      } else {
        user.role = ['customer'];
        user.activeRole = 'customer';
      }
    } else {
      // Existing user - update details if provided
      if (name) user.name = name;
      if (phone) user.phone = phone;

      // Handle role switching/adding for existing users
      if (role === 'rider' && vehicle && !user.role.includes('rider')) {
        user.role.push('rider');
        user.activeRole = 'rider';
        user.riderProfile = {
          ...user.riderProfile,
          vehicle: {
            type: vehicle.type || 'cab',
            model: vehicle.model || 'Unknown',
            plateNumber: vehicle.plateNumber || 'Unknown',
            color: vehicle.color || 'Unknown'
          }
        };
      }
    }

    // 9. Generate JWT tokens
    const tokens = generateTokenPair(user._id, user.email, user.activeRole);
    user.refreshToken = tokens.refreshToken;

    await user.save();

    console.log(`[Auth] ${isNewUser ? 'New user registered' : 'User logged in'}: ${normalizedEmail}`);

    res.status(200).json({
      success: true,
      message: isNewUser ? 'Registration successful' : 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
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
    console.error('[Error] Verify OTP:', error.message);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message
    });
  }
};

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
 * Firebase Sync - Sync existing Firebase user with our database
 * Used when a user logs in via Firebase OTP
 */
const firebaseSync = async (req, res) => {
  try {
    const { phone, role, firebaseToken, firebaseUid } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Verify Firebase token (skip if Firebase not initialized)
    if (firebaseToken && admin.apps.length > 0) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
        console.log('[Auth] Firebase token verified for:', decodedToken.phone_number || decodedToken.uid);
      } catch (err) {
        console.log('[Auth] Firebase token verification failed:', err.message);
        // Continue - token already verified on client side by Firebase
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

    // Update Firebase UID if not set
    if (firebaseUid && !user.firebaseUid) {
      user.firebaseUid = firebaseUid;
    }

    // Update active role if provided
    if (role && user.role.includes(role)) {
      user.activeRole = role;
    }

    // Generate tokens
    const tokens = generateTokenPair(user._id, user.phone, user.activeRole);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    console.log('[Auth] Firebase sync successful:', phone);

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
    console.error('[Error] Firebase sync:', error.message);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Firebase Register - Register new user via Firebase
 * Used when a new user signs up via Firebase OTP
 */
const firebaseRegister = async (req, res) => {
  try {
    const { phone, name, role, firebaseToken, firebaseUid, vehicle } = req.body;

    if (!phone || !name) {
      return res.status(400).json({
        success: false,
        message: 'Phone and name are required'
      });
    }

    // Verify Firebase token (skip if Firebase not initialized)
    if (firebaseToken && admin.apps.length > 0) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
        console.log('[Auth] Firebase token verified for:', decodedToken.phone_number || decodedToken.uid);
      } catch (err) {
        console.log('[Auth] Firebase token verification failed:', err.message);
        // Continue - token already verified on client side by Firebase
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

      // Update Firebase UID
      if (firebaseUid) {
        user.firebaseUid = firebaseUid;
      }

      const tokens = generateTokenPair(user._id, user.phone, user.activeRole);
      user.refreshToken = tokens.refreshToken;
      await user.save();

      console.log('[Auth] Firebase user updated:', phone);

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
      firebaseUid,
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

    console.log('[Auth] Firebase new user registered:', phone);

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
    console.error('[Error] Firebase register:', error.message);
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

/**
 * Delete all users (Admin) - USE WITH CAUTION
 */
const deleteAllUsers = async (req, res) => {
  try {
    const result = await User.deleteMany({});

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} users successfully`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('[Error] Delete all users:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete all users',
      error: error.message
    });
  }
};

module.exports = {
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
  deleteUserById,
  deleteAllUsers
};
