require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const socketService = require('./services/socketService');
const { authenticateSocket } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/ride');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // In production, specify your mobile app's origin
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Stats API for admin panel
app.get('/api/stats', (req, res) => {
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
