const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const path = require('path');
const { initialize } = require('./config/socket');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// Initialize Socket.IO
initialize(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api', require('./routes/auth'));
app.use('/api', require('./middleware/auth'), require('./routes/api'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, '../public/login.html')));

server.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});