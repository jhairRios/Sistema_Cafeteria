const { getPool } = require('../db');

exports.login = async (req, res) => {
  const { correo, contrasena } = req.body;
  if (!correo || !contrasena) {
    return res.status(400).json({ success: false, message: 'Faltan credenciales' });
  }
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT e.id, e.nombre, e.usuario, e.correo, e.contrasena, r.nombre AS rol_nombre, r.id AS rol_id
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
    // Obtener permisos por rol
    const [perms] = await pool.execute(
      `SELECT p.clave FROM permisos p
       JOIN roles_permisos rp ON rp.permiso_id = p.id
       WHERE rp.role_id = ?
       ORDER BY p.clave ASC`,
      [user.rol_id]
    );
    delete user.contrasena;
    user.rol = { id: user.rol_id, nombre: user.rol_nombre };
    delete user.rol_id; delete user.rol_nombre;
    res.json({ success: true, user, permisos: perms.map(p => p.clave) });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};
