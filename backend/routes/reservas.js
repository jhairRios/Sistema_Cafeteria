const express = require('express');
const router = express.Router();
// Reservas eliminado: responder 410 Gone para cualquier petición
router.all('*', (_req, res) => res.status(410).json({ error: 'Reservas eliminado' }));
module.exports = router;
