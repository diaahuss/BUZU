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

  // Group Management
  socket.on('joinGroup', (groupName, userId, callback) => {
    try {
      if (!groupName || !userId) {
        throw new Error('Invalid group/user ID');
      }

      if (!groups.has(groupName)) {
        groups.set(groupName, new Set());
      }

      groups.get(groupName).add(socket.id);
      userConnections.set(userId, socket.id);
      socket.join(groupName);
      
      console.log(`${userId} joined ${groupName}`);
      if (callback) callback({ status: 'success', groupName });
      
    } catch (error) {
      console.error('Join group error:', error.message);
      if (callback) callback({ status: 'error', message: error.message });
      socket.emit('error', error.message);
    }
  });

  // Buzz Handling
  socket.on('buzz', (data, callback) => {
    try {
      if (!data?.groupId || !data?.userId || !data?.userName) {
        throw new Error('Missing required fields');
      }

      if (!groups.has(data.groupId)) {
        throw new Error('Group does not exist');
      }

      const timestamp = new Date().toISOString();
      const buzzData = {
        ...data,
        timestamp,
        socketId: socket.id
      };

      // Broadcast to all in group except sender
      socket.to(data.groupId).emit('buzz', buzzData);
      
      console.log(`Buzz from ${data.userId} to ${data.groupId}`);
      if (callback) callback({ status: 'success', timestamp });
      
    } catch (error) {
      console.error('Buzz error:', error.message);
      if (callback) callback({ status: 'error', message: error.message });
    }
  });

  // Cleanup on Disconnect
  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    
    // Remove from groups
    groups.forEach((members, groupName) => {
      if (members.delete(socket.id)) {
        if (members.size === 0) {
          groups.delete(groupName);
          console.log(`Group ${groupName} emptied and removed`);
        }
      }
    });
    
    // Remove user mapping
    userConnections.forEach((socketId, userId) => {
      if (socketId === socket.id) {
        userConnections.delete(userId);
        console.log(`User ${userId} disconnected`);
      }
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
