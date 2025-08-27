const { getPool } = require('../db');

// Controlador genérico para catálogos simples: departamentos, turnos, cargos
// Cada tabla tiene: id (PK AI), nombre (UNIQUE), descripcion (NULLABLE), activo (TINYINT 1)

function factory(table) {
  return {
    list: async (req, res) => {
      try {
        const pool = getPool();
        const [rows] = await pool.execute(`SELECT id, nombre, descripcion, activo FROM ${table} ORDER BY nombre ASC`);
        res.json(rows);
      } catch (err) {
        console.error(`list ${table} error:`, err);
        res.status(500).json({ message: `Error al obtener ${table}` });
      }
    },
    get: async (req, res) => {
      try {
        const pool = getPool();
        const [rows] = await pool.execute(`SELECT id, nombre, descripcion, activo FROM ${table} WHERE id = ? LIMIT 1`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'No encontrado' });
        res.json(rows[0]);
      } catch (err) {
        console.error(`get ${table} error:`, err);
        res.status(500).json({ message: `Error al obtener ${table}` });
      }
    },
    create: async (req, res) => {
      const { nombre, descripcion, activo } = req.body || {};
      if (!nombre) return res.status(400).json({ message: 'Nombre es requerido' });
      try {
        const pool = getPool();
        const [dup] = await pool.execute(`SELECT id FROM ${table} WHERE LOWER(nombre) = LOWER(?) LIMIT 1`, [nombre]);
        if (dup.length) return res.status(409).json({ message: 'Ya existe un registro con ese nombre' });
        const [r] = await pool.execute(`INSERT INTO ${table} (nombre, descripcion, activo) VALUES (?, ?, ?)`, [nombre, descripcion || null, activo != null ? Number(activo) : 1]);
        const id = r.insertId;
        const [rows] = await pool.execute(`SELECT id, nombre, descripcion, activo FROM ${table} WHERE id = ?`, [id]);
        res.status(201).json(rows[0]);
      } catch (err) {
        console.error(`create ${table} error:`, err);
        res.status(500).json({ message: `Error al crear en ${table}` });
      }
    },
    update: async (req, res) => {
      const { id } = req.params;
      const { nombre, descripcion, activo } = req.body || {};
      if (!nombre) return res.status(400).json({ message: 'Nombre es requerido' });
      try {
        const pool = getPool();
        const [dup] = await pool.execute(`SELECT id FROM ${table} WHERE LOWER(nombre) = LOWER(?) AND id <> ? LIMIT 1`, [nombre, id]);
        if (dup.length) return res.status(409).json({ message: 'Ya existe un registro con ese nombre' });
        await pool.execute(`UPDATE ${table} SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?`, [nombre, descripcion || null, activo != null ? Number(activo) : 1, id]);
        const [rows] = await pool.execute(`SELECT id, nombre, descripcion, activo FROM ${table} WHERE id = ?`, [id]);
        if (!rows.length) return res.status(404).json({ message: 'No encontrado' });
        res.json(rows[0]);
      } catch (err) {
        console.error(`update ${table} error:`, err);
        res.status(500).json({ message: `Error al actualizar en ${table}` });
      }
    },
    remove: async (req, res) => {
      const { id } = req.params;
      try {
        const pool = getPool();
        await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
        res.json({ success: true });
      } catch (err) {
        console.error(`remove ${table} error:`, err);
        res.status(500).json({ message: `Error al eliminar en ${table}` });
      }
    },
  };
}

exports.departamentos = factory('departamentos');
exports.turnos = factory('turnos');
exports.cargos = factory('cargos');
