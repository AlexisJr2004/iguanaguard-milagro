// Rutas del CRUD
const express = require('express');
const router = express.Router();
const iguanaModel = require('../models/iguanaModel');

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

  res.render('index', {
    voluntarios,
    searchTerm: search || '',
    userIp: req.ip,
  });
});

module.exports = router;
