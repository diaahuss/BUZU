const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// ====================== SERVER SETUP ====================== //
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000 // 25 seconds
});

app.use(express.static(path.join(__dirname)));

// ====================== DATA STORES ====================== //
const userGroups = {}; // { groupName: [socketIds] }
const userSockets = {}; // { userId: socketId } for faster lookups

// ====================== SOCKET HANDLERS ====================== //
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // ===== GROUP MANAGEMENT ===== //
  socket.on('joinGroup', (groupName, userId) => {
    if (!groupName || typeof groupName !== 'string') {
      console.error('Invalid group name:', groupName);
      return;
    }

    console.log(`User ${userId} joined group: ${groupName}`);
    
    // Initialize group if not exists
    if (!userGroups[groupName]) {
      userGroups[groupName] = new Set();
    }
    
    // Track user's socket and group membership
    userGroups[groupName].add(socket.id);
    userSockets[userId] = socket.id;
    socket.join(groupName);
  });

  // ===== BUZZ HANDLER ===== //
  socket.on('buzz', (data, callback) => {
    try {
      // Validate incoming data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }

      const { groupId, sender, senderName } = data;
      if (!groupId || !sender || !senderName) {
        throw new Error('Missing required fields');
      }

      console.log(`Valid buzz from ${senderName} to ${groupId}`);
      
      // Broadcast to group
      socket.to(groupId).emit('buzz', {
        groupId,
        sender,
        senderName,
        timestamp: new Date().toISOString()
      });

      // Send acknowledgement
      callback({ status: 'success' });

    } catch (error) {
      console.error('Buzz error:', error.message);
      callback({ status: 'error', message: error.message });
    }
  });

  // ===== DISCONNECTION HANDLER ===== //
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Clean up group memberships
    for (const [groupName, members] of Object.entries(userGroups)) {
      if (members.delete(socket.id) && members.size === 0) {
        delete userGroups[groupName];
      }
    }
    
    // Clean up user socket mapping
    for (const [userId, socketId] of Object.entries(userSockets)) {
      if (socketId === socket.id) {
        delete userSockets[userId];
        break;
      }
    }
  });
});

// ====================== GRACEFUL SHUTDOWN ====================== //
const shutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force shutdown after 5 seconds
  setTimeout(() => {
    console.error('Forcing shutdown...');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ====================== SERVER START ====================== //
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
