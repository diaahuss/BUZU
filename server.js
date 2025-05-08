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
  });

  // When a buzz is triggered for a specific group
  socket.on('buzz', (data) => {
    const { group } = data;
    console.log(`Buzz sent to group: ${group}`);
    if (userGroups[group]) {
      // Emit the buzz only to the group members
      userGroups[group].forEach(socketId => {
        io.to(socketId).emit('buzz'); // Send the buzz to each member in the group
      });
    }
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
