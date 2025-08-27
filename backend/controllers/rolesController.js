const { getPool } = require('../db');

// Roles: CRUD básico + asignación de permisos
exports.getAll = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT id, nombre, descripcion FROM roles ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) {
    console.error('getAll roles error:', err);
    res.status(500).json({ message: 'Error al obtener roles' });
  }
};

exports.getById = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT id, nombre, descripcion FROM roles WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Rol no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('getById role error:', err);
    res.status(500).json({ message: 'Error al obtener el rol' });
  }
};

exports.create = async (req, res) => {
  const { nombre, descripcion } = req.body || {};
  if (!nombre) return res.status(400).json({ message: 'Nombre es requerido' });
  try {
    const pool = getPool();
    const [dup] = await pool.execute('SELECT id FROM roles WHERE LOWER(nombre) = LOWER(?) LIMIT 1', [nombre]);
    if (dup.length) return res.status(409).json({ message: 'El rol ya existe' });
    const [r] = await pool.execute('INSERT INTO roles (nombre, descripcion) VALUES (?, ?)', [nombre, descripcion || null]);
    const id = r.insertId;
    const [row] = await pool.execute('SELECT id, nombre, descripcion FROM roles WHERE id = ?', [id]);
    res.status(201).json(row[0]);
  } catch (err) {
    console.error('create role error:', err);
    res.status(500).json({ message: 'Error al crear el rol' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body || {};
  if (!nombre) return res.status(400).json({ message: 'Nombre es requerido' });
  try {
    const pool = getPool();
    const [dup] = await pool.execute('SELECT id FROM roles WHERE LOWER(nombre) = LOWER(?) AND id <> ? LIMIT 1', [nombre, id]);
    if (dup.length) return res.status(409).json({ message: 'Ya existe un rol con ese nombre' });
    await pool.execute('UPDATE roles SET nombre = ?, descripcion = ? WHERE id = ?', [nombre, descripcion || null, id]);
    const [row] = await pool.execute('SELECT id, nombre, descripcion FROM roles WHERE id = ?', [id]);
    if (!row.length) return res.status(404).json({ message: 'Rol no encontrado' });
    res.json(row[0]);
  } catch (err) {
    console.error('update role error:', err);
    res.status(500).json({ message: 'Error al actualizar el rol' });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM roles_permisos WHERE role_id = ?', [id]);
    await pool.execute('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('remove role error:', err);
    res.status(500).json({ message: 'Error al eliminar el rol' });
  }
};

// Permisos por rol
exports.getPermisos = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT p.id, p.clave, p.nombre, p.tipo
       FROM permisos p
       JOIN roles_permisos rp ON rp.permiso_id = p.id
       WHERE rp.role_id = ?
       ORDER BY p.clave ASC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('getPermisos role error:', err);
    res.status(500).json({ message: 'Error al obtener permisos' });
  }
};

exports.setPermisos = async (req, res) => {
  const { id } = req.params;
  const { permisos } = req.body || {}; // array de claves o ids
  if (!Array.isArray(permisos)) return res.status(400).json({ message: 'Lista de permisos inválida' });
  try {
    const pool = getPool();
    // Convertir claves a ids si vienen como claves
    const claves = permisos.filter(p => typeof p === 'string');
    const ids = permisos.filter(p => Number.isFinite(p));
    let finalIds = [...ids];
    if (claves.length) {
      const [rows] = await pool.query('SELECT id, clave FROM permisos WHERE clave IN (?)', [claves]);
      finalIds.push(...rows.map(r => r.id));
    }
    // Limpiar existentes y volver a insertar
    await pool.execute('DELETE FROM roles_permisos WHERE role_id = ?', [id]);
    if (finalIds.length) {
      const values = finalIds.map(pid => [id, pid]);
      await pool.query('INSERT INTO roles_permisos (role_id, permiso_id) VALUES ?', [values]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('setPermisos role error:', err);
    res.status(500).json({ message: 'Error al asignar permisos' });
  }
};
