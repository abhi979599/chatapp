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
    try {
      if (user && user.roomId === roomId) {
        socket.broadcast.to(roomId).emit('receive', { message: message, name: user.name });
      }
    } catch (error) {
    }
 
  });

  socket.on('send-image', (image,roomId) => {
    const user = users[socket.id];
    try {
      if (user && user.roomId === roomId) {
        socket.broadcast.to(roomId).emit('receive-image', { message: image, name: user.name });
      }
    } catch (error) {
    }
 
  });

  socket.on('offer', (offer, roomKey) => {

    try {
      const user = users[socket.id];
    if(user.name!=null){
      socket.broadcast.to(roomKey).emit('offer', offer,user.name);

    }
    } catch (error) {
    }
   
  });

  socket.on('user-typing', (roomKey) => {
   
    try {
      const user = users[socket.id];
    if(user.name!=null){
      socket.broadcast.to(roomKey).emit('user-typinglisten',user.name);
    }

    } catch (error) {
    }

  });

  socket.on('answer', (answer,roomKey) => {
    
    try {
      const user = users[socket.id];
    console.log(answer);
    if (user.name !== undefined && user.name !== null) {
      socket.broadcast.to(roomKey).emit('answer', answer, user.name);
    }
    
    } catch (error) {
    }

  });

  socket.on('end', ( roomKey) => {
   

    try {
      const user = users[socket.id];
    if(user.name!=null){
      socket.broadcast.to(roomKey).emit('end',user.name);
    }
    
    } catch (error) {
    }

  });

  socket.on('ice-candidate', (candidate,roomKey) => {    

    try {
      const user = users[socket.id];
      console.log(candidate);
      if (user.name !== undefined && user.name !== null) {
        socket.broadcast.to(roomKey).emit('ice-candidate', candidate, user.name);
      }
    
    } catch (error) {
    }


  });

  socket.on('reject-call', (roomKey) => {
    
    try {
      const user = users[socket.id];
      if (user.name !== undefined && user.name !== null) {
        socket.broadcast.to(roomKey).emit('reject-call', user.name);
      }
    
    } catch (error) {
    }

  });
  
  socket.on('disconnect', () => {

    try {
      const user = users[socket.id];
      if (user) {
        socket.to(user.roomId).emit('left', user.name);
        delete users[socket.id];
      }
    
    } catch (error) {
    }

  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
