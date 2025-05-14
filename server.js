const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Store connected users and their associated groups
const userGroups = {};

io.on('connection', (socket) => {
  console.log('A user connected');

  // When a user joins a group
  socket.on('joinGroup', (groupName) => {
    console.log(`User joined group: ${groupName}`);
    if (!userGroups[groupName]) {
      userGroups[groupName] = [];
    }
    userGroups[groupName].push(socket.id);
    socket.join(groupName);
  });

  // Fixed buzz handler - changed 'group' to 'groupId'
  socket.on('buzz', (data) => {
    if (!data || !data.groupId) {  // Changed from 'group' to 'groupId'
      console.error('Invalid buzz data:', data);
      return;
    }

    const { groupId, sender, senderName } = data;  // Changed variable name
    console.log(`Buzz from ${senderName} to group: ${groupId}`);
    
    // Send to all in group except sender
    socket.to(groupId).emit('buzz', {  // Changed from 'group' to 'groupId'
      groupId,  // Changed from 'group'
      sender, 
      senderName,
      timestamp: new Date().toISOString() 
    });
  });

  // Handle disconnect event
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    // Remove the user from all groups they were part of
    for (let group in userGroups) {
      userGroups[group] = userGroups[group].filter(socketId => socketId !== socket.id);
    }
  });
});

// Add graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
