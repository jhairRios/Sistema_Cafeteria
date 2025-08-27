const express = require('express');
const router = express.Router();
const { departamentos, turnos, cargos } = require('../controllers/catalogosController');

function crud(r, ctrl) {
  r.get('/', ctrl.list);
  r.get('/:id', ctrl.get);
  r.post('/', ctrl.create);
  r.put('/:id', ctrl.update);
  r.delete('/:id', ctrl.remove);
}

const dep = express.Router();
crud(dep, departamentos);
router.use('/departamentos', dep);

const tur = express.Router();
crud(tur, turnos);
router.use('/turnos', tur);

const car = express.Router();
crud(car, cargos);
router.use('/cargos', car);

module.exports = router;
