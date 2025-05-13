const mongoose = require('mongoose');

const sorteoSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  nombre_completo: { type: String, required: true },
  telefono: { type: String, required: true },
  fecha_verificacion: { type: String }
});

module.exports = mongoose.model('Sorteo', sorteoSchema);