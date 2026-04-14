require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, '../client')));

app.get('/sales', (req, res) => res.sendFile(path.join(__dirname, '../client/sales.html')));
app.get('/display', (req, res) => res.sendFile(path.join(__dirname, '../client/display.html')));
app.get('/', (req, res) => res.redirect('/sales'));

const roomDisplays = {};

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentRole = null;

  socket.on('join', ({ role, room }) => {
    currentRoom = room || 'default';
    currentRole = role;
    socket.join(currentRoom);

    if (role === 'display') {
      if (!roomDisplays[currentRoom]) roomDisplays[currentRoom] = new Set();
      roomDisplays[currentRoom].add(socket.id);
    }

    const displayCount = roomDisplays[currentRoom]?.size || 0;
    io.to(currentRoom).emit('client:count', { displays: displayCount });

    console.log(`[${currentRoom}] ${role} connected (${socket.id})`);
  });

  socket.on('spot:change', (payload) => {
    if (!currentRoom) return;
    console.log(`[${currentRoom}] spot:change → spot ${payload.spotId}`);
    socket.to(currentRoom).emit('spot:change', payload);
  });

  socket.on('disconnect', () => {
    if (currentRole === 'display' && currentRoom) {
      roomDisplays[currentRoom]?.delete(socket.id);
      const displayCount = roomDisplays[currentRoom]?.size || 0;
      io.to(currentRoom).emit('client:count', { displays: displayCount });
    }
    console.log(`[${currentRoom}] ${currentRole} disconnected`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`View360 running → http://localhost:${PORT}`));
