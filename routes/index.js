// Rutas del CRUD
const express = require('express');
const router = express.Router();

// Ruta principal
router.get('/', (req, res) => {
  res.render('index', { voluntarios: [], searchTerm: '' });
});

module.exports = router;
