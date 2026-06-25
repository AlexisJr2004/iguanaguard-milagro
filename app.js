// Configuracion de Express y middlewares
const express = require('express');
const path = require('path');
const routes = require('./routes/index');

const app = express();

// Motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estaticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas
app.use('/', routes);

module.exports = app;
