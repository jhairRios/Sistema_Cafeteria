// routes/clientes.js
const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');

// Ejemplo de ruta GET
router.get('/', clientesController.getAllClientes);

module.exports = router;
