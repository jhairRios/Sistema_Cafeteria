const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mesasController');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.patch('/:id/estado', ctrl.setEstado);
router.post('/bulk-generate', ctrl.bulkGenerate);

module.exports = router;
