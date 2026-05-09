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

// Routes - MINIMAL
app.get('/', (req, res) => {
  console.log('📨 GET / called');
  res.json({ message: 'Server is alive!' });
});

app.get('/ping', (req, res) => {
  console.log('📨 GET /ping called');
  res.send('pong');
});

app.get('/api/health', (req, res) => {
  console.log('📨 GET /api/health called');
  res.json({ status: 'ok' });
});

console.log('✅ Routes loaded');

// MongoDB connection
console.log('🔗 Connecting to MongoDB...');
mongoose
  .connect(uri, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log('✅ MongoDB connected');
    
    // Now attach complex routes and socket.io
    const authRoutes = require('./routes/auth');
    const roomRoutes = require('./routes/rooms');
    const questionRoutes = require('./routes/questions');
    const voteRoutes = require('./routes/votes');
    const socketHandler = require('./socket/socketHandler');
    const { Server } = require('socket.io');

    app.use('/api/auth', authRoutes);
    app.use('/api/rooms', roomRoutes);
    app.use('/api/questions', questionRoutes);
    app.use('/api/votes', voteRoutes);
    
    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      },
    });
    
    socketHandler(io);
    console.log('✅ Socket.io and complex routes initialized');

    // Error handler
    app.use((err, req, res, next) => {
      console.error('❌ Error:', err.message);
      res.status(500).json({ message: err.message });
    });

    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
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