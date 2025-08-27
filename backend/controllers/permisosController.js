const { getPool } = require('../db');

exports.getAll = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT id, clave, nombre, tipo, descripcion FROM permisos ORDER BY clave ASC');
    res.json(rows);
  } catch (err) {
    console.error('getAll permisos error:', err);
    res.status(500).json({ message: 'Error al obtener permisos' });
  }
};

exports.create = async (req, res) => {
  const { clave, nombre, tipo, descripcion } = req.body || {};
  if (!clave || !nombre) return res.status(400).json({ message: 'Clave y nombre son requeridos' });
  try {
    const pool = getPool();
    const [dup] = await pool.execute('SELECT id FROM permisos WHERE LOWER(clave) = LOWER(?) LIMIT 1', [clave]);
    if (dup.length) return res.status(409).json({ message: 'La clave de permiso ya existe' });
    const [r] = await pool.execute('INSERT INTO permisos (clave, nombre, tipo, descripcion) VALUES (?, ?, ?, ?)', [clave, nombre, tipo || 'accion', descripcion || null]);
    const id = r.insertId;
    const [row] = await pool.execute('SELECT id, clave, nombre, tipo, descripcion FROM permisos WHERE id = ?', [id]);
    res.status(201).json(row[0]);
  } catch (err) {
    console.error('create permiso error:', err);
    res.status(500).json({ message: 'Error al crear permiso' });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM roles_permisos WHERE permiso_id = ?', [id]);
    await pool.execute('DELETE FROM permisos WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('remove permiso error:', err);
    res.status(500).json({ message: 'Error al eliminar permiso' });
  }
};
