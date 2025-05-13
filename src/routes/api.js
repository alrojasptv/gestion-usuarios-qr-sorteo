const express = require('express');
const { v4: uuidv4 } = require('uuid');
const csv = require('csv-parse/sync');
const Usuarios = require('../models/Usuarios');
const QRs = require('../models/QRs');
const Verificados = require('../models/Verificados');
const Sorteo = require('../models/Sorteo');
const Ganadores = require('../models/Ganadores');
const { io } = require('../server');
const upload = require('../config/multer');

const router = express.Router();

// Cargar CSV de usuarios
router.post('/upload-csv', upload.single('csv'), async (req, res) => {
  try {
    const records = csv.parse(req.file.buffer.toString(), { columns: true, skip_empty_lines: true, trim: true });
    const usuarios = records.map(record => ({
      nombre: record.nombre,
      apellidos: record.apellidos,
      telefono: record.telefono
    })).filter(u => u.nombre && u.apellidos && u.telefono);

    if (usuarios.length === 0) {
      return res.status(400).json({ error: 'No se encontraron datos válidos en el CSV' });
    }

    await Usuarios.deleteMany({});
    await Usuarios.insertMany(usuarios);
    io.emit('updateUsuarios');
    res.json({ message: 'Usuarios cargados correctamente', usuarios });
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar el CSV' });
  }
});

// Obtener usuarios
router.get('/usuarios', async (req, res) => {
  const usuarios = await Usuarios.find();
  res.json({ usuarios });
});

// Exportar usuarios como JSON
router.get('/export-usuarios', async (req, res) => {
  const usuarios = await Usuarios.find();
  res.json({ usuarios });
});

// Verificar teléfono y generar QR
router.post('/verificar-telefono', async (req, res) => {
  const { telefono } = req.body;
  const usuario = await Usuarios.findOne({ telefono });
  const qrExistente = await QRs.findOne({ telefono });

  if (!usuario || qrExistente) {
    return res.status(400).json({ error: 'Usuario no encontrado o ya verificado' });
  }

  const id = uuidv4();
  const nombre_completo = `${usuario.nombre} ${usuario.apellidos}`;
  const qr = new QRs({ id, nombre_completo, telefono });
  await qr.save();
  io.emit('updateQRs');
  res.json({ id, nombre_completo, telefono });
});

// Cargar CSV de QRs
router.post('/upload-qrs', upload.single('csv'), async (req, res) => {
  try {
    const records = csv.parse(req.file.buffer.toString(), { columns: true, skip_empty_lines: true, trim: true });
    const qrs = records.map(record => ({
      id: record.id,
      nombre_completo: record.nombre_completo,
      telefono: record.telefono
    })).filter(q => q.id && q.nombre_completo && q.telefono);

    if (qrs.length === 0) {
      return res.status(400).json({ error: 'No se encontraron datos válidos en el CSV' });
    }

    await QRs.deleteMany({});
    await QRs.insertMany(qrs);
    io.emit('updateQRs');
    res.json({ message: 'QRs cargados correctamente', qrs });
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar el CSV' });
  }
});

// Obtener QRs
router.get('/qrs', async (req, res) => {
  const qrs = await QRs.find();
  res.json({ qrs });
});

// Exportar QRs como JSON
router.get('/export-qrs', async (req, res) => {
  const qrs = await QRs.find();
  res.json({ qrs });
});

// Verificar QR
router.post('/verificar-qr', async (req, res) => {
  const { id } = req.body;
  const qr = await QRs.findOne({ id });
  if (!qr) {
    return res.status(400).json({ error: 'QR no encontrado' });
  }

  const verificado = await Verificados.findOne({ id });
  if (verificado) {
    return res.status(400).json({ error: 'Este QR ya ha sido verificado', qr });
  }

  const verificacion = new Verificados({
    id,
    nombre_completo: qr.nombre_completo,
    telefono: qr.telefono,
    fecha_verificacion: new Date().toLocaleString()
  });
  await verificacion.save();
  io.emit('updateVerificados');
  res.json({ message: 'Usuario verificado correctamente', verificacion });
});

// Obtener usuarios verificados
router.get('/verificados', async (req, res) => {
  const verificados = await Verificados.find();
  res.json(verificados);
});

// Cargar CSV de sorteo
router.post('/upload-sorteo', upload.single('csv'), async (req, res) => {
  try {
    const records = csv.parse(req.file.buffer.toString(), { columns: true, skip_empty_lines: true, trim: true });
    const sorteoUsuarios = records.map(record => ({
      id: record.id,
      nombre_completo: record.nombre_completo,
      telefono: record.telefono,
      fecha_verificacion: record.fecha_verificacion
    })).filter(u => u.id && u.nombre_completo && u.telefono);

    if (sorteoUsuarios.length === 0) {
      return res.status(400).json({ error: 'No se encontraron datos válidos en el CSV' });
    }

    await Sorteo.deleteMany({});
    await Sorteo.insertMany(sorteoUsuarios);
    io.emit('updateSorteo');
    res.json({ message: 'Usuarios de sorteo cargados correctamente', sorteoUsuarios });
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar el CSV' });
  }
});

// Obtener usuarios de sorteo
router.get('/sorteo', async (req, res) => {
  const sorteoUsuarios = await Sorteo.find();
  res.json(sorteoUsuarios);
});

// Realizar sorteo
router.post('/sorteo', async (req, res) => {
  const sorteoUsuarios = await Sorteo.find();
  if (sorteoUsuarios.length === 0) {
    return res.status(400).json({ error: 'No hay usuarios para el sorteo' });
  }

  const indice = Math.floor(Math.random() * sorteoUsuarios.length);
  const ganador = sorteoUsuarios[indice];
  const ganadorConFecha = {
    id: ganador.id,
    nombre_completo: ganador.nombre_completo,
    telefono: ganador.telefono,
    fecha_sorteo: new Date().toLocaleString()
  };

  await Ganadores.create(ganadorConFecha);
  await Sorteo.deleteOne({ id: ganador.id });
  io.emit('updateSorteo');
  io.emit('updateGanadores');
  res.json({ message: 'Sorteo realizado', ganador: ganadorConFecha, sorteoUsuarios: await Sorteo.find() });
});

// Obtener ganadores
router.get('/ganadores', async (req, res) => {
  const ganadores = await Ganadores.find();
  res.json(ganadores);
});

// Borrar todos los datos
router.delete('/borrar-datos', async (req, res) => {
  await Usuarios.deleteMany({});
  await QRs.deleteMany({});
  await Verificados.deleteMany({});
  await Sorteo.deleteMany({});
  await Ganadores.deleteMany({});
  io.emit('updateUsuarios');
  io.emit('updateQRs');
  io.emit('updateVerificados');
  io.emit('updateSorteo');
  io.emit('updateGanadores');
  res.json({ message: 'Todos los datos han sido borrados' });
});

module.exports = router;