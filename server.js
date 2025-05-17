const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// ====================== INITIALIZATION ====================== //
const app = express();
const server = http.createServer(app);

// Fix 1: Serve files from root directory (since no 'public' folder)
app.use(express.static(__dirname)); // Changed from path.join(__dirname, 'public')

// Fix 2: Add Railway-required health check
app.get('/health', (req, res) => {
  res.status(200).send('OK'); // Simple response for Railway health checks
});

// Fix 3: Configure Socket.IO for flat directory structure
const io = socketIo(server, {
  pingTimeout: 60000,
  pingInterval: 25000,
  cors: {
    origin: "*", // Allow all origins (adjust for production)
    methods: ["GET", "POST"]
  },
  // Critical for Railway:
  transports: ['websocket', 'polling'],
  allowEIO3: true // For Socket.IO v2/v3 compatibility
});

// Fix 4: Ensure all routes fall back to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ====================== CONFIGURATION ====================== //
const PORT = process.env.PORT || 8080;
const ENV = process.env.NODE_ENV || 'development';
const SHUTDOWN_TIMEOUT = 5000;

// ====================== DATA STORES ====================== //
const groups = new Map();       // groupName → Set<socketId>
const userConnections = new Map(); // userId → socketId

// ====================== MIDDLEWARE ====================== //
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// ====================== SOCKET.IO HANDLERS ====================== //
const setupSocketHandlers = (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Group Management
  socket.on('joinGroup', (groupName, userId) => {
    if (!groupName || !userId) {
      return socket.emit('error', 'Invalid group/user ID');
    }

    if (!groups.has(groupName)) {
      groups.set(groupName, new Set());
    }

    groups.get(groupName).add(socket.id);
    userConnections.set(userId, socket.id);
    socket.join(groupName);
    
    console.log(`${userId} joined ${groupName}`);
  });

  // Buzz Handling
  socket.on('buzz', ({ groupId, userId, userName }, callback) => {
    try {
      if (!groupId || !userId || !userName) {
        throw new Error('Missing required fields');
      }

      const timestamp = new Date().toISOString();
      io.to(groupId).emit('buzz', { groupId, userId, userName, timestamp });
      
      callback({ status: 'success', timestamp });
    } catch (error) {
      console.error('Buzz failed:', error.message);
      callback({ status: 'error', message: error.message });
    }
  });

  // Cleanup on Disconnect
  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    
    // Remove from groups
    groups.forEach((members, groupName) => {
      if (members.delete(socket.id) {
        if (members.size === 0) {
          groups.delete(groupName);
        }
      }
    });
    
    // Remove user mapping
    userConnections.forEach((socketId, userId) => {
      if (socketId === socket.id) {
        userConnections.delete(userId);
      }
    });
  });
};

io.on('connection', setupSocketHandlers);

// ====================== GRACEFUL SHUTDOWN ====================== //
const gracefulShutdown = () => {
  console.log('\nStarting graceful shutdown...');
  
  // Disconnect all sockets
  io.sockets.sockets.forEach(socket => {
    socket.disconnect(true);
  });

  // Close Socket.IO
  io.close(() => {
    console.log('Socket.IO closed');
  });

  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force exit if hanging
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

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
  console.log(`PID: ${process.pid}`);
});
