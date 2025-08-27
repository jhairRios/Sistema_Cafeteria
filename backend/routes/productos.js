const express = require('express');
const router = express.Router();
const productos = require('../controllers/productosController');

router.get('/', productos.getAll);
router.get('/:id', productos.getById);
router.post('/', productos.create);
router.put('/:id', productos.update);
router.delete('/:id', productos.remove);

module.exports = router;
