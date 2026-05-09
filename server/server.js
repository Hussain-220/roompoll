require('express-async-errors');

// Load dotenv only in development (local machine)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const questionRoutes = require('./routes/questions');
const voteRoutes = require('./routes/votes');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// Middleware
const corsOptions = {
  origin: process.env.CLIENT_URL,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

console.log('CORS configured for origin:', corsOptions.origin);
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/votes', voteRoutes);

// Health check
app.get('/api/health', (req, res) => {
  console.log('📍 Health check called');
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

// Socket.io
socketHandler(io);

// ==========================================
// DIAGNOSTICS BLOCK (Railway Debugging)
// ==========================================
const PORT = process.env.PORT || 5000;
const uri = process.env.MONGO_URI;

console.log("\n================ DIAGNOSTICS ================");
console.log("--> NODE_ENV is:", process.env.NODE_ENV);
console.log("--> URI Type:", typeof uri);
console.log("--> Railway sees URI as:", uri ? uri.substring(0, 45) + "..." : "UNDEFINED! VARIABLE MISSING.");
console.log("=============================================\n");

// Connect to MongoDB and start server
mongoose
  .connect(uri)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});