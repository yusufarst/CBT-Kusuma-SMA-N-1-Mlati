require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const apiRoutes = require('./src/routes/api');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Pass io to app for access in route handlers
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRoutes);

// Socket.io Real-time Handling
io.on('connection', (socket) => {
  console.log('User connected to socket:', socket.id);

  // Proctor joins room channel
  socket.on('join-room', (roomId) => {
    socket.join(`room-${roomId}`);
    console.log(`Socket ${socket.id} joined room-${roomId}`);
  });

  // Leave room channel
  socket.on('leave-room', (roomId) => {
    socket.leave(`room-${roomId}`);
    console.log(`Socket ${socket.id} left room-${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected from socket:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  CBT KUSUMA - Server Running on http://localhost:${PORT}`);
  console.log(`  Target Sekolah: SMA Negeri 1 Mlati, Sleman`);
  console.log(`====================================================`);
});
