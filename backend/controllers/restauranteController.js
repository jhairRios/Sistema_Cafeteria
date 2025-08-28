const { getPool } = require('../db');

exports.getConfig = async (_req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM restaurante_config WHERE id=1');
    const row = rows[0] || {};
    // Asegurar defaults
    row.horarios = row.horarios ? JSON.parse(row.horarios) : [];
    res.json(row);
  } catch (e) {
    console.error('getConfig restaurante error:', e);
    res.status(500).json({ message: 'Error al obtener configuración' });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const pool = getPool();
    const { nombre, direccion, telefono, email, iva_porcentaje, propina_automatica, incluir_iva, horarios } = req.body || {};
    const horariosJson = horarios ? JSON.stringify(horarios) : null;
    await pool.query(
      `UPDATE restaurante_config SET nombre=COALESCE(?,nombre), direccion=COALESCE(?,direccion), telefono=COALESCE(?,telefono), email=COALESCE(?,email), iva_porcentaje=COALESCE(?,iva_porcentaje), propina_automatica=COALESCE(?,propina_automatica), incluir_iva=COALESCE(?,incluir_iva), horarios=COALESCE(?,horarios) WHERE id=1`,
      [nombre ?? null, direccion ?? null, telefono ?? null, email ?? null, iva_porcentaje ?? null, propina_automatica ?? null, (incluir_iva===0||incluir_iva===1)? incluir_iva : null, horariosJson]
    );
    const [rows] = await pool.query('SELECT * FROM restaurante_config WHERE id=1');
    const row = rows[0] || {};
    row.horarios = row.horarios ? JSON.parse(row.horarios) : [];
    res.json(row);
  } catch (e) {
    console.error('updateConfig restaurante error:', e);
    res.status(500).json({ message: 'Error al actualizar configuración' });
  }
};
