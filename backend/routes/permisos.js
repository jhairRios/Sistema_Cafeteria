const express = require('express');
const router = express.Router();
const permisos = require('../controllers/permisosController');

router.get('/', permisos.getAll);
router.post('/', permisos.create);
router.delete('/:id', permisos.remove);

module.exports = router;
