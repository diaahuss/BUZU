const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname)));

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('buzz', () => {
    socket.broadcast.emit('buzz'); // or `io.emit('buzz')` to send to all
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
