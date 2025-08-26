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
const ventaRoutes = require('./routes/ventas');
const reporteRoutes = require('./routes/reportes');
const empleadoRoutes = require('./routes/empleados');
const rolesRoutes = require('./routes/roles');

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/empleados', empleadoRoutes);
app.use('/api/roles', rolesRoutes);

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

// Fallback para SPA (index.html)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
initPool().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
});
