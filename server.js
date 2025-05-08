const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files (HTML, CSS, JS, etc.) from the current directory
app.use(express.static(path.join(__dirname)));

// In-memory store for group memberships by socket ID
const userGroups = {};

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('joinGroup', (groupName) => {
    console.log(`📢 Socket ${socket.id} joined group: ${groupName}`);
    socket.join(groupName); // Let Socket.IO handle room logic
    userGroups[socket.id] = userGroups[socket.id] || new Set();
    userGroups[socket.id].add(groupName);
  });

  socket.on('buzz', ({ group }) => {
    console.log(`🔔 Buzz requested for group: ${group}`);
    io.to(group).emit('buzz');
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
    const groups = userGroups[socket.id];
    if (groups) {
      groups.forEach(group => socket.leave(group));
      delete userGroups[socket.id];
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 BUZU server running at http://localhost:${PORT}`);
});
