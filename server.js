const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// ====================== INITIALIZATION ====================== //
const app = express();
const server = http.createServer(app);

// Serve static files from root (single folder structure)
app.use(express.static(__dirname));

// Railway health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Enhanced Socket.IO config for Railway
const io = socketIo(server, {
  pingTimeout: 60000,
  pingInterval: 25000,
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-app-name.up.railway.app'] 
      : '*',
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// Route fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ====================== CONFIGURATION ====================== //
const PORT = process.env.PORT || 8080;
const ENV = process.env.NODE_ENV || 'development';

// ====================== DATA STORES ====================== //
const groups = new Map();
const userConnections = new Map();

// ====================== SOCKET.IO HANDLERS ====================== //
const setupSocketHandlers = (socket) => {
  console.log(`New connection: ${socket.id}`);

  socket.on('joinGroup', (groupName, userId) => {
    if (!groupName || !userId) return socket.emit('error', 'Invalid group/user ID');
    
    if (!groups.has(groupName)) groups.set(groupName, new Set());
    
    groups.get(groupName).add(socket.id);
    userConnections.set(userId, socket.id);
    socket.join(groupName);
    console.log(`${userId} joined ${groupName}`);
  });

  socket.on('buzz', ({ groupId, userId, userName }, callback) => {
    try {
      if (!groupId || !userId || !userName) throw new Error('Missing required fields');
      
      const timestamp = new Date().toISOString();
      io.to(groupId).emit('buzz', { groupId, userId, userName, timestamp });
      callback({ status: 'success', timestamp });
    } catch (error) {
      console.error('Buzz failed:', error.message);
      callback({ status: 'error', message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    
    groups.forEach((members, groupName) => {
      if (members.delete(socket.id) && members.size === 0) {
        groups.delete(groupName);
      }
    });
    
    userConnections.forEach((socketId, userId) => {
      if (socketId === socket.id) userConnections.delete(userId);
    });
  });
};

io.on('connection', setupSocketHandlers);

// ====================== ERROR HANDLER ====================== //
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ====================== GRACEFUL SHUTDOWN ====================== //
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  
  io.sockets.sockets.forEach(socket => socket.disconnect(true));
  
  io.close(() => {
    server.close(() => {
      console.log('Server terminated');
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ====================== SERVER START ====================== //
server.listen(PORT, () => {
  console.log(`
  ██████╗ ██╗   ██╗███████╗██╗   ██╗
  ██╔══██╗██║   ██║╚══███╔╝██║   ██║
  ██████╔╝██║   ██║  ███╔╝ ██║   ██║
  ██╔══██╗██║   ██║ ███╔╝  ██║   ██║
  ██████╔╝╚██████╔╝███████╗╚██████╔╝
  ╚═════╝  ╚═════╝ ╚══════╝ ╚═════╝ 
  `);
  console.log(`BUZU Server v1.0.0`);
  console.log(`Environment: ${ENV}`);
  console.log(`Listening on port ${PORT}`);
});
