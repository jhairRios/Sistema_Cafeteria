const { getPool } = require('../db');

exports.login = async (req, res) => {
  const { correo, contrasena } = req.body;
  if (!correo || !contrasena) {
    return res.status(400).json({ success: false, message: 'Faltan credenciales' });
  }
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT e.id, e.nombre, e.usuario, e.correo, e.contrasena, r.rol
       FROM empleados e
       JOIN roles r ON e.rol_id = r.id
       WHERE e.correo = ? LIMIT 1`,
      [correo]
    );
    if (!rows.length) return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos' });
    const user = rows[0];
    if (String(user.contrasena) !== String(contrasena)) {
      return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos' });
    }
    delete user.contrasena;
    res.json({ success: true, user });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};
