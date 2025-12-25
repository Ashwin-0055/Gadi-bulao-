/**
 * Security Middleware
 * Production-grade security implementations for rate limiting, CORS, and headers
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

/**
 * Rate limit configuration from environment variables with sensible defaults
 */
const RATE_LIMIT_CONFIG = {
  // General API limits
  GENERAL_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
  GENERAL_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // Auth endpoints (stricter - prevent brute force)
  AUTH_WINDOW_MS: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  AUTH_MAX_REQUESTS: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5,

  // OTP endpoints (very strict - prevent OTP flooding)
  OTP_WINDOW_MS: parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
  OTP_MAX_REQUESTS: parseInt(process.env.OTP_RATE_LIMIT_MAX_REQUESTS) || 3,

  // Admin endpoints
  ADMIN_WINDOW_MS: parseInt(process.env.ADMIN_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  ADMIN_MAX_REQUESTS: parseInt(process.env.ADMIN_RATE_LIMIT_MAX_REQUESTS) || 50,
};

/**
 * Standard rate limit response with proper headers
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
    retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
  });
};

/**
 * General API rate limiter
 * 100 requests per minute per IP
 * Uses default key generator which handles IPv6 properly
 */
const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.GENERAL_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.GENERAL_MAX_REQUESTS,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP (prevents brute force)
 */
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.AUTH_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.AUTH_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      retryAfter: Math.ceil(RATE_LIMIT_CONFIG.AUTH_WINDOW_MS / 1000),
    });
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Very strict rate limiter for OTP endpoints
 * 3 requests per minute per IP (prevents OTP flooding)
 */
const otpLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.OTP_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.OTP_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many OTP requests. Please wait 1 minute before requesting again.',
      retryAfter: 60,
    });
  },
});

/**
 * Admin panel rate limiter
 * 50 requests per minute
 */
const adminLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.ADMIN_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.ADMIN_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

/**
 * Get allowed origins from environment variables
 * Supports comma-separated list of origins
 */
const getAllowedOrigins = () => {
  const envOrigins = process.env.ALLOWED_ORIGINS;

  // Default origins based on environment
  const defaultOrigins = process.env.NODE_ENV === 'production'
    ? [
        'https://gadi-bulao-backend.onrender.com',
        // Add your mobile app's origin if using web views
      ]
    : [
        'http://localhost:3000',
        'http://localhost:8081',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8081',
        'exp://localhost:8081',
      ];

  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }

  return defaultOrigins;
};

/**
 * CORS configuration object
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    // This is safe because we still require authentication on protected routes
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow localhost with any port
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('exp://')) {
        return callback(null, true);
      }
    }

    // Check for Render.com origins (for admin panel)
    if (origin.includes('render.com') || origin.includes('onrender.com')) {
      return callback(null, true);
    }

    // Reject other origins
    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],

  exposedHeaders: [
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
  ],

  credentials: true,

  maxAge: 86400, // 24 hours - cache preflight requests

  preflightContinue: false,

  optionsSuccessStatus: 204,
};

/**
 * Socket.io CORS configuration
 */
const socketCorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow development origins
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    // Allow Render.com origins
    if (origin.includes('render.com') || origin.includes('onrender.com')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: true,
};

// ============================================================================
// SECURITY HEADERS (Helmet)
// ============================================================================

/**
 * Helmet configuration for security headers
 */
const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.socket.io', 'unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'unpkg.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:', 'https:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // Prevent clickjacking
  frameguard: { action: 'deny' },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // Prevent MIME type sniffing
  noSniff: true,

  // XSS Protection (legacy browsers)
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// ============================================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Admin API key authentication
 * For admin panel access without user login
 */
const adminApiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-admin-api-key'] || req.query.apiKey;
  const adminApiKey = process.env.ADMIN_API_KEY;

  // If no admin API key is configured, allow access (for backwards compatibility)
  // In production, you should ALWAYS set ADMIN_API_KEY
  if (!adminApiKey) {
    console.warn('[Security] ADMIN_API_KEY not set. Admin routes are unprotected!');
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'Admin API key required',
    });
  }

  if (apiKey !== adminApiKey) {
    return res.status(403).json({
      success: false,
      message: 'Invalid admin API key',
    });
  }

  // Mark request as admin-authenticated
  req.isAdmin = true;
  next();
};

/**
 * Require admin role for authenticated users
 */
const requireAdmin = (req, res, next) => {
  // Check if request is admin-authenticated via API key
  if (req.isAdmin) {
    return next();
  }

  // Check if user has admin role
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Admin access required',
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Rate limiters
  generalLimiter,
  authLimiter,
  otpLimiter,
  adminLimiter,

  // CORS
  corsOptions,
  socketCorsOptions,

  // Security headers
  helmetConfig,

  // Admin auth
  adminApiKeyAuth,
  requireAdmin,

  // Config (for reference)
  RATE_LIMIT_CONFIG,
};
