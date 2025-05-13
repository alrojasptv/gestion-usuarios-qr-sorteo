const mongoose = require('mongoose');

const verificadoSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  nombre_completo: { type: String, required: true },
  telefono: { type: String, required: true },
  fecha_verificacion: { type: String, required: true }
});

module.exports = mongoose.model('Verificado', verificadoSchema);