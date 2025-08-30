const Mesas = require('../models/mesa');

exports.list = async (req, res) => {
  try {
    const rows = await Mesas.getAll();
    res.json(rows);
  } catch (e) {
    console.error(e); res.status(500).json({ message: 'Error al listar mesas' });
  }
};

exports.create = async (req, res) => {
  try {
    const mesa = await Mesas.create(req.body || {});
    res.status(201).json(mesa);
  } catch (e) {
  // Log completo del error para depuración
  console.error('Error creando mesa:', e);
  // Mostrar mensaje real de error si existe
  const msg = e?.sqlMessage || e?.message || 'Error al crear mesa';
  res.status(500).json({ message: msg });
  }
};

exports.update = async (req, res) => {
  try {
    const mesa = await Mesas.update(req.params.id, req.body || {});
    res.json(mesa);
  } catch (e) {
    console.error(e); res.status(500).json({ message: 'Error al actualizar mesa' });
  }
};

exports.remove = async (req, res) => {
  try {
    await Mesas.remove(req.params.id);
  // Emitir cambio global de mesas para refrescar clientes
  try { req.app?.locals?.io?.emit('mesas:changed', { mesaId: String(req.params.id), estado: 'eliminada' }); } catch {}
  res.json({ message: 'Mesa eliminada' });
  } catch (e) {
    console.error(e); res.status(500).json({ message: 'Error al eliminar mesa' });
  }
};

exports.setEstado = async (req, res) => {
  try {
    const { estado, detalle } = req.body || {};
    if (!estado) return res.status(400).json({ message: 'estado requerido' });
    const mesa = await Mesas.setEstado(req.params.id, estado, detalle || null);
  try { req.app?.locals?.io?.emit('mesas:changed', { mesaId: String(req.params.id), estado: mesa.estado, detalle: mesa.detalle }); } catch {}
    // Si pasa a disponible, liberar lock si existía
    try {
      if (String(estado) === 'disponible') {
        const locks = req.app?.locals?.mesaLocks; const io = req.app?.locals?.io;
        if (locks && locks.has(String(req.params.id))) {
          locks.delete(String(req.params.id));
          io && io.emit('mesas:unlocked', { mesaId: String(req.params.id) });
        }
      }
    } catch {}
  res.json(mesa);
  } catch (e) {
    console.error(e); res.status(500).json({ message: 'Error al cambiar estado' });
  }
};

exports.bulkGenerate = async (req, res) => {
  try {
    const created = await Mesas.bulkGenerate(req.body || {});
    res.json({ created: created.length, mesas: created });
  } catch (e) {
    console.error(e); res.status(500).json({ message: 'Error al generar mesas' });
  }
};
