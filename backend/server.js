// server.js - Configuración básica de Express para servir el frontend y API
require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const { initPool } = require('./db');
const cron = require('node-cron');
const fs = require('fs');

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
const restauranteRoutes = require('./routes/restaurante');
const backupRoutes = require('./routes/backup');

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
app.use('/api/restaurante', restauranteRoutes);
app.use('/api/backup', backupRoutes);

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
    // Iniciar cron de backups (simple)
    try {
        const schedulePath = path.join(__dirname, 'backups', 'schedule.json');
        const loadExpr = () => {
            try {
                const cfg = JSON.parse(fs.readFileSync(schedulePath,'utf8'));
                // Mapear frecuencia a cron
                const f = (cfg.frequency || 'semanal');
                if (f === 'diario') return '0 2 * * *'; // diario 02:00
                if (f === 'mensual') return '0 3 1 * *'; // mensual día 1 a las 03:00
                return '0 2 * * 1'; // semanal lunes 02:00
            } catch { return '0 2 * * 1'; }
        };
        let expr = loadExpr();
        cron.schedule(expr, async () => {
            try {
                const { createNow } = require('./controllers/backupController');
                // Llamar a createNow con objetos falsos (simulación simple)
                await new Promise((resolve, reject) => {
                    const req = {};
                    const res = { json: () => resolve(), status: () => ({ json: reject }) };
                    createNow(req, res).catch(reject);
                });
                console.log('[backup] Backup automático ejecutado');
            } catch (e) {
                console.warn('[backup] Error en backup automático:', e?.message);
            }
        });
    } catch (_) {}
});
