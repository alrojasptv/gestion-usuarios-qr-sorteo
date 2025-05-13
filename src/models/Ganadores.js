const mongoose = require('mongoose');

const ganadorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  nombre_completo: { type: String, required: true },
  telefono: { type: String, required: true },
  fecha_sorteo: { type: String, required: true }
});

module.exports = mongoose.model('Ganador', ganadorSchema);