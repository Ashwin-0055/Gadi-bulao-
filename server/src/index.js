require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const socketService = require('./services/socketService');
const { authenticateSocket } = require('./middleware/auth');

// Security middleware
const {
  generalLimiter,
  corsOptions,
  socketCorsOptions,
  helmetConfig,
} = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/ride');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with secure CORS
const io = new Server(server, {
  cors: socketCorsOptions,
  transports: ['websocket', 'polling']
});

// ============================================================================
// SECURITY MIDDLEWARE (Order matters!)
// ============================================================================

// 1. Security headers (Helmet)
app.use(helmetConfig);

// 2. Trust proxy (for Render, Heroku, etc.)
app.set('trust proxy', 1);

// 3. CORS configuration
app.use(cors(corsOptions));

// 4. Rate limiting (applied to all routes)
app.use(generalLimiter);

// 5. Body parsers
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Request logging (disabled in production)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    stats: socketService.getStats()
  });
});

// Admin Panel - Web Dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Stats API for admin panel (protected)
const { adminLimiter, adminApiKeyAuth } = require('./middleware/security');
app.get('/api/stats', adminLimiter, adminApiKeyAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: socketService.getStats()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Socket.io authentication middleware
io.use(authenticateSocket);

// Socket.io connection handler
io.on('connection', (socket) => {
  socketService.handleConnection(socket);
});

// Initialize socket service with io instance
socketService.initialize(io);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start server
    server.listen(PORT, () => {
      console.log('\n========================================');
      console.log('GADI BULAO SERVER');
      console.log('========================================');
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log('========================================\n');
    });

  } catch (error) {
    console.error('[Error] Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = { app, server, io };
