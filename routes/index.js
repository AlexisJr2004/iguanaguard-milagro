// Rutas del CRUD
const express = require('express');
const router = express.Router();
const iguanaModel = require('../models/iguanaModel');

// Ruta de salud, usada por el ping externo para evitar que el servicio se duerma
router.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Ruta principal - listar y buscar voluntarios
router.get('/', (req, res) => {
  const { search } = req.query;
  let voluntarios = iguanaModel.getAll();

  if (search) {
    const term = search.toLowerCase();
    voluntarios = voluntarios.filter(
      (v) =>
        v.nombres.toLowerCase().includes(term) ||
        v.direccion.toLowerCase().includes(term)
    );
  }

  const userCount = iguanaModel.countByIp(req.ip);

  res.render('index', {
    voluntarios,
    searchTerm: search || '',
    userIp: req.ip,
    userCount,
    maxPerIp: iguanaModel.MAX_PER_IP,
  });
});

// Ruta del dashboard de estadísticas (Versión 2)
router.get('/dashboard', (req, res) => {
  const stats = iguanaModel.getStats();
  res.render('dashboard', { stats });
});

// Guardar un nuevo voluntario
router.post('/guardar', (req, res) => {
  try {
    const voluntario = iguanaModel.create({
      id: Date.now().toString(),
      nombres: req.body.nombres,
      apellidos: req.body.apellidos,
      cedula: req.body.cedula,
      direccion: req.body.direccion,
      imagenUrl: req.body.imagenUrl || '',
      ipCreador: req.ip,
    });
    res.status(201).json({ success: true, voluntario });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Editar un voluntario (solo si pertenece a la IP solicitante)
router.put('/editar/:id', (req, res) => {
  try {
    const voluntario = iguanaModel.getById(req.params.id);
    if (!voluntario) {
      return res.status(404).json({ success: false, error: 'Voluntario no encontrado.' });
    }
    if (voluntario.ipCreador !== req.ip) {
      return res.status(403).json({ success: false, error: 'No puedes editar un registro que no te pertenece.' });
    }
    iguanaModel.validateFields(req.body);
    iguanaModel.validateCedula(req.body.cedula);
    const actualizado = iguanaModel.update(req.params.id, {
      nombres: req.body.nombres,
      apellidos: req.body.apellidos,
      cedula: req.body.cedula,
      direccion: req.body.direccion,
      imagenUrl: req.body.imagenUrl || voluntario.imagenUrl,
    });
    res.json({ success: true, voluntario: actualizado });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Eliminar un voluntario (solo si pertenece a la IP solicitante)
router.delete('/eliminar/:id', (req, res) => {
  const voluntario = iguanaModel.getById(req.params.id);
  if (!voluntario) {
    return res.status(404).json({ success: false, error: 'Voluntario no encontrado.' });
  }
  if (voluntario.ipCreador !== req.ip) {
    return res.status(403).json({ success: false, error: 'No puedes eliminar un registro que no te pertenece.' });
  }
  iguanaModel.remove(req.params.id);
  res.json({ success: true });
});

module.exports = router;