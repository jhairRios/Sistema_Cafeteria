const { getPool } = require('../db');

// Campos previstos en la UI; ajusta según tu esquema real
// id, nombre, correo, telefono, departamento, posicion, turno, salario, estado, direccion

exports.getAll = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT id, nombre, correo, telefono, departamento, posicion, turno, salario, estado, direccion
       FROM empleados
       ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('getAll empleados error:', err);
    res.status(500).json({ message: 'Error al obtener empleados' });
  }
};

exports.getById = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT id, nombre, correo, telefono, departamento, posicion, turno, salario, estado, direccion
       FROM empleados WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('getById empleado error:', err);
    res.status(500).json({ message: 'Error al obtener el empleado' });
  }
};

exports.create = async (req, res) => {
  const { nombre, usuario, correo, contrasena, rol_id, telefono, departamento, posicion, turno, salario, estado, direccion } = req.body || {};
  if (!nombre || !correo) return res.status(400).json({ message: 'Nombre y correo son requeridos' });
  try {
    const pool = getPool();
    const correoNorm = String(correo).trim().toLowerCase();
    const derivedUsuario = usuario || (correoNorm ? String(correoNorm).split('@')[0] : (String(nombre).split(' ')[0] || 'user')).toLowerCase();
    const pwd = contrasena || '1234';
    const rolId = Number.isFinite(Number(rol_id)) ? Number(rol_id) : 1; // por defecto 1

    const [result] = await pool.execute(
      `INSERT INTO empleados (nombre, usuario, correo, contrasena, rol_id, telefono, departamento, posicion, turno, salario, estado, direccion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, derivedUsuario, correoNorm, pwd, rolId, telefono || null, departamento || null, posicion || null, turno || null, salario || 0, estado || 'activo', direccion || null]
    );
    const id = result.insertId;
    const [rows] = await pool.execute(
      `SELECT id, nombre, correo, telefono, departamento, posicion, turno, salario, estado, direccion
       FROM empleados WHERE id = ?`,
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }
    console.error('create empleado error:', err);
    res.status(500).json({ message: 'Error al crear el empleado' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, telefono, departamento, posicion, turno, salario, estado, direccion } = req.body || {};
  try {
    const pool = getPool();
    const correoNorm = correo != null ? String(correo).trim().toLowerCase() : null;
    await pool.execute(
      `UPDATE empleados SET nombre = ?, correo = ?, telefono = ?, departamento = ?, posicion = ?, turno = ?, salario = ?, estado = ?, direccion = ?
       WHERE id = ?`,
      [nombre, correoNorm, telefono || null, departamento || null, posicion || null, turno || null, salario || 0, estado || 'activo', direccion || null, id]
    );
    const [rows] = await pool.execute(
      `SELECT id, nombre, correo, telefono, departamento, posicion, turno, salario, estado, direccion
       FROM empleados WHERE id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }
    console.error('update empleado error:', err);
    res.status(500).json({ message: 'Error al actualizar el empleado' });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    await pool.execute(`DELETE FROM empleados WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('delete empleado error:', err);
    res.status(500).json({ message: 'Error al eliminar el empleado' });
  }
};
