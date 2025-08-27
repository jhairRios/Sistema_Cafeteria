// server.js - Configuración básica de Express para servir el frontend y API
require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const { initPool } = require('./db');

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas API
const authRoutes = require('./routes/auth');
const clienteRoutes = require('./routes/clientes');
const productoRoutes = require('./routes/productos');
const ventaRoutes = require('./routes/ventas');
const reporteRoutes = require('./routes/reportes');
const empleadoRoutes = require('./routes/empleados');
const rolesRoutes = require('./routes/roles');
const catalogosRoutes = require('./routes/catalogos');
const permisosRoutes = require('./routes/permisos');
const mesasRoutes = require('./routes/mesas');
const reservasRoutes = require('./routes/reservas');

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/empleados', empleadoRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/permisos', permisosRoutes);
// Endpoint de reservas eliminado: responder 410 Gone explícitamente
app.use('/api/reservas', reservasRoutes);

// 404 JSON para cualquier otra ruta /api no existente
app.use('/api', (req, res) => {
    res.status(404).json({ message: 'Endpoint no encontrado' });
});

// Endpoint de salud para verificar conectividad a BD y disponibilidad del servidor
app.get('/api/health', async (req, res) => {
    try {
        // intentar un ping usando initPool/getConnection
        const { getPool } = require('./db');
        const pool = getPool();
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        res.json({ ok: true, db: 'up' });
    } catch (e) {
        res.status(503).json({ ok: false, db: 'down', error: e && e.message });
    }
});

// Fallback para SPA (solo rutas no-API y navegaciones HTML, no archivos estáticos)
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    // Si parece una solicitud de archivo (tiene punto) o Accept no es HTML, no aplicar fallback
    const isFile = req.path.includes('.');
    const accept = req.headers['accept'] || '';
    if (isFile || !accept.includes('text/html')) return res.status(404).send('Not Found');
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
initPool().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
});
