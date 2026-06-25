// Modelo de datos para voluntarios (Defensores de las Iguanas)
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'iguanas.json');

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

// Crea un nuevo voluntario con los campos de la estructura base
function create(data) {
  validateCedula(data.cedula);
  const voluntarios = readData();
  const nuevo = {
    id: data.id,
    nombres: data.nombres,
    apellidos: data.apellidos,
    cedula: data.cedula,
    direccion: data.direccion,
    imagenUrl: data.imagenUrl || '',
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
  validateCedula,
  getAll,
  getById,
  create,
  update,
  remove,
};
