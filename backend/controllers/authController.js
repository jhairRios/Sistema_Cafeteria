const { getPool } = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const sessions = require('../utils/sessionRegistry');

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
    // Verificar contraseña (bcrypt o texto plano de legado)
    let okPass = false;
    const stored = String(user.contrasena || '');
    if (stored.startsWith('$2')) {
      okPass = await bcrypt.compare(contrasena, stored);
    } else {
      okPass = (stored === String(contrasena));
      if (okPass) {
        // Migración silenciosa a bcrypt
        const hash = await bcrypt.hash(contrasena, 10);
        try { await pool.execute('UPDATE empleados SET contrasena=? WHERE id=?', [hash, user.id]); } catch {}
        user.contrasena = hash;
      }
    }
    if (!okPass) return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos' });

    // Sesión única
    if (sessions.isActive(user.id)) {
      return res.status(409).json({ success: false, message: 'La cuenta ya está en uso' });
    }
    const sessionId = crypto.randomUUID();
    sessions.setActive(user.id, sessionId);
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
    res.json({ success: true, user, permisos: perms.map(p => p.clave), sessionId });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

exports.logout = async (req, res) => {
  try {
    const { userId, sessionId } = req.body || {};
    if (userId && sessions.validate(userId, sessionId)) {
      sessions.clear(userId);
    }
    res.json({ success: true });
  } catch (e) {
    res.json({ success: true });
  }
};
