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
    userGroups[groupName].push(socket.id); // Add socket ID to the group's list
    socket.join(groupName); // NEW: Join Socket.IO room
  });

  // When a buzz is triggered for a specific group 
  socket.on('buzz', (data) => {
    if (!data || !data.group) {
      console.error('Invalid buzz data:', data);
      return;
    }

    const { group, sender, senderName } = data;
    console.log(`Buzz from ${senderName} to group: ${group}`);
    
    // Send to all in group except sender
    socket.to(group).emit('buzz', { 
      group,
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

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
