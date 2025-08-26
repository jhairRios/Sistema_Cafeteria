const { getPool } = require('../db');

exports.getAll = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT id, nombre FROM roles ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) {
    console.error('getAll roles error:', err);
    res.status(500).json({ message: 'Error al obtener roles' });
  }
};
