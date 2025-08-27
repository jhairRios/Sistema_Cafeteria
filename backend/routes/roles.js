const express = require('express');
const router = express.Router();
const roles = require('../controllers/rolesController');

router.get('/', roles.getAll);
router.get('/:id', roles.getById);
router.post('/', roles.create);
router.put('/:id', roles.update);
router.delete('/:id', roles.remove);

// Permisos por rol
router.get('/:id/permisos', roles.getPermisos);
router.post('/:id/permisos', roles.setPermisos);

module.exports = router;
