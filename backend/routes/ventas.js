// routes/ventas.js
const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');

router.get('/', ventasController.getAllVentas);

module.exports = router;
