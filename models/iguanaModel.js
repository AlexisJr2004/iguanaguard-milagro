// Modelo de datos para voluntarios (Defensores de las Iguanas)
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'iguanas.json');
const DEFAULT_IMAGE_URL = '/image/default_user.webp';
const MAX_PER_IP = 20;

// Valida los campos del formulario (obligatorios, formato y limites)
function validateFields(data) {
  const campos = [
    { field: 'nombres', max: 50, pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, msg: 'solo letras' },
    { field: 'apellidos', max: 50, pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, msg: 'solo letras' },
    { field: 'direccion', max: 100, pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s,#.-]+$/, msg: 'caracteres no validos' },
  ];
  for (const { field, max, pattern, msg } of campos) {
    const value = data[field];
    if (!value || !String(value).trim()) {
      throw new Error(`El campo ${field} no puede estar vacio.`);
    }
    if (String(value).trim().length > max) {
      throw new Error(`El campo ${field} excede el maximo de ${max} caracteres.`);
    }
    if (!pattern.test(String(value).trim())) {
      throw new Error(`El campo ${field} permite ${msg}.`);
    }
  }
}

// Valida una cedula ecuatoriana usando el algoritmo Modulo 10
function validateCedula(value) {
  const cedula = String(value);
  if (!/^\d+$/.test(cedula)) {
    throw new Error('La cedula debe contener solo numeros.');
  }
  if (cedula.length !== 10) {
    throw new Error('Cantidad de digitos incorrecta.');
  }
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let total = 0;
  for (let i = 0; i < 9; i++) {
    let producto = parseInt(cedula[i], 10) * coeficientes[i];
    if (producto > 9) {
      producto -= 9;
    }
    total += producto;
  }
  const digitoVerificador = (total * 9) % 10;
  if (digitoVerificador !== parseInt(cedula[9], 10)) {
    throw new Error('La cedula no es valida.');
  }
}

// Estructura de campos requeridos para cada voluntario
const VOLUNTARIO_FIELDS = [
  'id',
  'nombres',
  'apellidos',
  'cedula',
  'direccion',
  'imagenUrl',
  'ipCreador',
  'fechaRegistro',
];

// Lee el archivo JSON y retorna el array de voluntarios
function readData() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Escribe el array de voluntarios en el archivo JSON
function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Retorna todos los voluntarios
function getAll() {
  return readData();
}

// Busca un voluntario por su ID
function getById(id) {
  const data = readData();
  return data.find((v) => v.id === id) || null;
}

// Cuenta cuantos registros tiene una IP
function countByIp(ip) {
  const voluntarios = readData();
  return voluntarios.filter((v) => v.ipCreador === ip).length;
}

// Crea un nuevo voluntario con los campos de la estructura base
function create(data) {
  validateFields(data);
  validateCedula(data.cedula);
  if (countByIp(data.ipCreador) >= MAX_PER_IP) {
    throw new Error(`Limite de ${MAX_PER_IP} registros por IP alcanzado.`);
  }
  const voluntarios = readData();
  if (voluntarios.some((v) => v.cedula === data.cedula)) {
    throw new Error('Ya existe un voluntario registrado con esta cédula.');
  }
  const nuevo = {
    id: data.id,
    nombres: data.nombres.toUpperCase(),
    apellidos: data.apellidos.toUpperCase(),
    cedula: data.cedula,
    direccion: data.direccion.toUpperCase(),
    imagenUrl: data.imagenUrl || DEFAULT_IMAGE_URL,
    ipCreador: data.ipCreador,
    fechaRegistro: data.fechaRegistro || new Date().toISOString(),
  };
  voluntarios.push(nuevo);
  writeData(voluntarios);
  return nuevo;
}

// Actualiza un voluntario existente por su ID
function update(id, data) {
  const voluntarios = readData();
  const index = voluntarios.findIndex((v) => v.id === id);
  if (index === -1) return null;
  if (data.cedula && voluntarios.some((v, i) => i !== index && v.cedula === data.cedula)) {
    throw new Error('Ya existe un voluntario registrado con esta cédula.');
  }
  if (data.nombres) data.nombres = data.nombres.toUpperCase();
  if (data.apellidos) data.apellidos = data.apellidos.toUpperCase();
  if (data.direccion) data.direccion = data.direccion.toUpperCase();
  voluntarios[index] = { ...voluntarios[index], ...data };
  writeData(voluntarios);
  return voluntarios[index];
}

// Elimina un voluntario por su ID
function remove(id) {
  const voluntarios = readData();
  const index = voluntarios.findIndex((v) => v.id === id);
  if (index === -1) return false;
  voluntarios.splice(index, 1);
  writeData(voluntarios);
  return true;
}

// Aplica filtros avanzados a la lista de voluntarios (fecha, sector, cédula)
// Reutilizable por el dashboard, los reportes exportables y el mapa de calor.
function applyFilters(voluntarios, filtros = {}) {
  const { fechaInicio, fechaFin, sector, cedula } = filtros;
  return voluntarios.filter((v) => {
    if (fechaInicio) {
      const fecha = (v.fechaRegistro || '').slice(0, 10);
      if (fecha < fechaInicio) return false;
    }
    if (fechaFin) {
      const fecha = (v.fechaRegistro || '').slice(0, 10);
      if (fecha > fechaFin) return false;
    }
    if (sector) {
      const sectorVoluntario = (v.direccion || '').split(',')[0].trim();
      if (sectorVoluntario.toLowerCase() !== sector.toLowerCase()) return false;
    }
    if (cedula) {
      if (!v.cedula || !v.cedula.includes(cedula.trim())) return false;
    }
    return true;
  });
}

// Calcula las estadísticas para el dashboard (total, sector top, línea de tiempo)
// Acepta filtros opcionales: { fechaInicio, fechaFin, sector, cedula }
function getStats(filtros = {}) {
  const todos = readData();
  const voluntarios = applyFilters(todos, filtros);

  const total = voluntarios.length;

  // Sector = primer segmento de la dirección (antes de la primera coma), igual que en index.ejs
  const porSector = {};
  voluntarios.forEach((v) => {
    const sector = (v.direccion || '').split(',')[0].trim() || 'Sin sector';
    porSector[sector] = (porSector[sector] || 0) + 1;
  });

  let sectorTop = null;
  Object.keys(porSector).forEach((sector) => {
    if (!sectorTop || porSector[sector] > sectorTop.total) {
      sectorTop = { sector, total: porSector[sector] };
    }
  });

  // Registros por fecha (día), ordenados cronológicamente
  const porFecha = {};
  voluntarios.forEach((v) => {
    const fecha = (v.fechaRegistro || '').slice(0, 10); // YYYY-MM-DD
    if (!fecha) return;
    porFecha[fecha] = (porFecha[fecha] || 0) + 1;
  });

  const timeline = Object.keys(porFecha)
    .sort()
    .map((fecha) => ({ fecha, total: porFecha[fecha] }));

  // Sectores disponibles en TODO el dataset (sin filtrar), para poblar el <select> del filtro
  const sectoresDisponibles = [...new Set(
    todos.map((v) => (v.direccion || '').split(',')[0].trim() || 'Sin sector')
  )].sort((a, b) => a.localeCompare(b));

  return {
    total,
    sectorTop,
    sectores: Object.keys(porSector)
      .map((sector) => ({ sector, total: porSector[sector] }))
      .sort((a, b) => b.total - a.total),
    timeline,
    sectoresDisponibles,
    filtrosActivos: !!(filtros.fechaInicio || filtros.fechaFin || filtros.sector || filtros.cedula),
  };
}

// Retorna los voluntarios que cumplen los filtros (para reportes exportables y mapa de calor)
function getFiltered(filtros = {}) {
  return applyFilters(readData(), filtros);
}

module.exports = {
  VOLUNTARIO_FIELDS,
  getStats,
  applyFilters,
  getFiltered,
  DEFAULT_IMAGE_URL,
  MAX_PER_IP,
  validateCedula,
  validateFields,
  countByIp,
  getAll,
  getById,
  create,
  update,
  remove,
};