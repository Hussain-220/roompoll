require('express-async-errors');

// Load dotenv only in development (local machine)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');

console.log('🔨 Starting server...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

const PORT = process.env.PORT || 5000;
const uri = process.env.MONGO_URI;

const app = express();
const server = http.createServer(app);

// Middleware - MINIMAL
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

console.log('✅ Middleware loaded');

// Request logging - FIRST middleware
app.use((req, res, next) => {
  console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes - MINIMAL
app.get('/', (req, res) => {
  console.log('✅ GET / handler called');
  res.json({ message: 'Server is alive!' });
});

app.get('/ping', (req, res) => {
  console.log('✅ GET /ping handler called');
  res.json({ pong: true });
});

app.get('/api/health', (req, res) => {
  console.log('✅ GET /api/health handler called');
  res.json({ status: 'ok' });
});

// Load routes immediately (don't wait for MongoDB)
try {
  const authRoutes = require('./routes/auth');
  const roomRoutes = require('./routes/rooms');
  const questionRoutes = require('./routes/questions');
  const voteRoutes = require('./routes/votes');

  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/questions', questionRoutes);
  app.use('/api/votes', voteRoutes);
  console.log('✅ All routes loaded successfully');
} catch (err) {
  console.error('❌ Error loading routes:', err.message);
}

// Global error handler (before 404 handler)
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ message: err.message });
});

// Catch-all 404 handler (LAST)
app.use((req, res) => {
  console.log(`⚠️ No route found for: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not found' });
});

console.log('✅ Routes configured');

// START SERVER IMMEDIATELY (don't wait for MongoDB)
const listener = server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Listening at:`, listener.address());
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// MongoDB connection (can happen in background)
console.log('🔗 Connecting to MongoDB...');
console.log('MongoDB URI:', uri ? uri.substring(0, 40) + '...' : 'MISSING');

mongoose
  .connect(uri, { 
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    
    // Initialize Socket.io only after DB is ready
    const socketHandler = require('./socket/socketHandler');
    const { Server } = require('socket.io');
    
    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      },
    });
    
    socketHandler(io);
    console.log('✅ Socket.io initialized');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Running in degraded mode - some features may not work');
  });

// Error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});