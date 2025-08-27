// Controlador de Reservas eliminado. Deja respuestas 410 para cualquier acción.
const gone = (req, res) => res.status(410).json({ error: 'Reservas eliminado' });
exports.list = gone;
exports.create = gone;
exports.update = gone;
exports.setEstado = gone;
exports.remove = gone;
