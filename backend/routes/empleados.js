const express = require('express');
const router = express.Router();
const empleados = require('../controllers/empleadosController');

router.get('/', empleados.getAll);
router.get('/:id', empleados.getById);
router.post('/', empleados.create);
router.put('/:id', empleados.update);
router.delete('/:id', empleados.remove);

module.exports = router;
