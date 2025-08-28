// routes/reportes.js
const express = require('express');
const router = express.Router();
const reportes = require('../controllers/reportesController');

router.get('/resumen', reportes.getResumen);
router.get('/ventas', reportes.getVentas);
router.get('/top-productos', reportes.getTopProductos);
router.get('/uso-mesas', reportes.getUsoMesas);
router.get('/empleados', reportes.getDesempenoEmpleados);
router.get('/clientes', reportes.getClientesFrecuentes);

module.exports = router;
