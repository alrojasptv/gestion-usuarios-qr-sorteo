const socketIo = require('socket.io');

let io;

function initialize(server) {
  io = socketIo(server);
  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    socket.on('disconnect', () => console.log('Cliente desconectado:', socket.id));
  });
  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO no está inicializado. Llama a initialize primero.');
  }
  return io;
}

module.exports = { initialize, getIO };