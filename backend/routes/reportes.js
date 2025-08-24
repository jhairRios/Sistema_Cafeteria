// routes/reportes.js
const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');

router.get('/', reportesController.getReportes);

module.exports = router;
