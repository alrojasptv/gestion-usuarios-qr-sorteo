const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellidos: { type: String, required: true },
  telefono: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('Usuario', usuarioSchema);