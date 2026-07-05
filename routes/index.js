// Rutas del CRUD
const express = require('express');
const router = express.Router();
const iguanaModel = require('../models/iguanaModel');
const PDFDocument = require('pdfkit');

// Extrae los filtros de fecha/sector/cédula desde el query string (reutilizable)
function extraerFiltros(req) {
  return {
    fechaInicio: req.query.fechaInicio || '',
    fechaFin: req.query.fechaFin || '',
    sector: req.query.sector || '',
    cedula: req.query.cedula || '',
  };
}

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
  const filtros = extraerFiltros(req);
  const stats = iguanaModel.getStats(filtros);
  res.render('dashboard', { stats, filtros });
});

// Exportar reporte de voluntarios (filtrado) en formato CSV
router.get('/dashboard/exportar/csv', (req, res) => {
  const filtros = extraerFiltros(req);
  const voluntarios = iguanaModel.getFiltered(filtros);

  const headers = ['Nombres', 'Apellidos', 'Cedula', 'Direccion', 'Fecha de registro'];
  const escapar = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;

  const filas = voluntarios.map((v) =>
    [v.nombres, v.apellidos, v.cedula, v.direccion, v.fechaRegistro].map(escapar).join(',')
  );
  const csv = [headers.map(escapar).join(','), ...filas].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte_voluntarios.csv"');
  res.send('\uFEFF' + csv); // BOM para que Excel reconozca UTF-8 correctamente
});

// Exportar reporte de voluntarios (filtrado) en formato PDF
router.get('/dashboard/exportar/pdf', (req, res) => {
  const filtros = extraerFiltros(req);
  const voluntarios = iguanaModel.getFiltered(filtros);
  const stats = iguanaModel.getStats(filtros);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte_voluntarios.pdf"');

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(18).fillColor('#173428').text('IguanaGuard Milagro', { align: 'left' });
  doc.fontSize(12).fillColor('#3f7d5e').text('Reporte de Voluntarios - Defensores de las Iguanas');
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#666').text(`Generado: ${new Date().toLocaleString('es-EC')}`);

  const filtrosTexto = [];
  if (filtros.fechaInicio) filtrosTexto.push(`Desde: ${filtros.fechaInicio}`);
  if (filtros.fechaFin) filtrosTexto.push(`Hasta: ${filtros.fechaFin}`);
  if (filtros.sector) filtrosTexto.push(`Sector: ${filtros.sector}`);
  if (filtros.cedula) filtrosTexto.push(`Cédula contiene: ${filtros.cedula}`);
  if (filtrosTexto.length) {
    doc.fontSize(9).fillColor('#666').text(`Filtros aplicados: ${filtrosTexto.join(' | ')}`);
  }
  doc.moveDown(1);

  doc.fontSize(11).fillColor('#173428').text(`Total de voluntarios: ${stats.total}`);
  if (stats.sectorTop) {
    doc.text(`Sector con más registros: ${stats.sectorTop.sector} (${stats.sectorTop.total})`);
  }
  doc.moveDown(1);

  // Tabla simple de voluntarios
  const colX = { nombre: 40, cedula: 220, direccion: 320, fecha: 470 };
  const rowHeight = 20;
  let y = doc.y;

  doc.fontSize(9).fillColor('#fff');
  doc.rect(40, y, 515, rowHeight).fill('#3f7d5e');
  doc.fillColor('#fff');
  doc.text('Nombre completo', colX.nombre + 4, y + 5, { width: 170 });
  doc.text('Cédula', colX.cedula + 4, y + 5, { width: 90 });
  doc.text('Sector', colX.direccion + 4, y + 5, { width: 145 });
  doc.text('Fecha', colX.fecha + 4, y + 5, { width: 80 });
  y += rowHeight;

  voluntarios.forEach((v, i) => {
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    if (i % 2 === 0) {
      doc.rect(40, y, 515, rowHeight).fill('#f2f7f4');
    }
    doc.fillColor('#173428').fontSize(8.5);
    doc.text(`${v.nombres} ${v.apellidos}`, colX.nombre + 4, y + 5, { width: 170 });
    doc.text(v.cedula, colX.cedula + 4, y + 5, { width: 90 });
    doc.text((v.direccion || '').split(',')[0].trim(), colX.direccion + 4, y + 5, { width: 145 });
    doc.text((v.fechaRegistro || '').slice(0, 10), colX.fecha + 4, y + 5, { width: 80 });
    y += rowHeight;
  });

  if (voluntarios.length === 0) {
    doc.fontSize(10).fillColor('#999').text('No hay voluntarios que coincidan con los filtros aplicados.', 40, y + 10);
  }

  doc.end();
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