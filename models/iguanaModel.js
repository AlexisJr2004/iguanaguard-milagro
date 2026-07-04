// Modelo de datos para voluntarios (Defensores de las Iguanas)
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'iguanas.json');
const DEFAULT_IMAGE_URL = '/image/default_user.webp';
const MAX_PER_IP = 3;

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
  const nuevo = {
    id: data.id,
    nombres: data.nombres,
    apellidos: data.apellidos,
    cedula: data.cedula,
    direccion: data.direccion,
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

module.exports = {
  VOLUNTARIO_FIELDS,
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
