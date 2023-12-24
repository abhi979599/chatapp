const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

let users = {};

io.on('connection', (socket) => {
  socket.on('join-room', (roomId, name) => {
    socket.join(roomId);
    users[socket.id] = { roomId, name };
    socket.to(roomId).emit('user-joined', name);
    socket.emit('welcome', `Welcome, ${name}!`);
  });

  socket.on('send', (data) => {
    const { message, roomId } = data;
    const user = users[socket.id];
    if (user && user.roomId === roomId) {
      socket.broadcast.to(roomId).emit('receive', { message: message, name: user.name });
    }
  });

  socket.on('offer', (offer, roomKey) => {
    const user = users[socket.id];
    if(user.name!=null){
      socket.broadcast.to(roomKey).emit('offer', offer,user.name);

    }
  });

  socket.on('answer', (answer,roomKey) => {
    // Broadcast the answer to everyone in the room
    const user = users[socket.id];
    console.log(answer);
    if (user.name !== undefined && user.name !== null) {
      socket.broadcast.to(roomKey).emit('answer', answer, user.name);
    }

  });

  socket.on('end', ( roomKey) => {
    const user = users[socket.id];
    if(user.name!=null){
      socket.broadcast.to(roomKey).emit('end',user.name);
    }
  });

  socket.on('ice-candidate', (candidate,roomKey) => {
    // Broadcast the ICE candidate to everyone in the room
    const user = users[socket.id];
    console.log(candidate);
    if (user.name !== undefined && user.name !== null) {
      socket.broadcast.to(roomKey).emit('ice-candidate', candidate, user.name);
    }

  });

  socket.on('reject-call', (roomKey) => {
    const user = users[socket.id];
    if (user.name !== undefined && user.name !== null) {
      socket.broadcast.to(roomKey).emit('reject-call', user.name);
    }

  });
  
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      socket.to(user.roomId).emit('left', user.name);
      delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
