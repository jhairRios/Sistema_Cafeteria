// server.js - Configuración básica de Express para servir el frontend y API
require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
app.locals.io = io;
const sessions = require('./utils/sessionRegistry');
const onlineUsers = new Map(); // userId -> { name }
const mesaLocks = new Map(); // mesaId -> userId
app.locals.mesaLocks = mesaLocks;
const MesasModel = require('./models/mesa');
const { initPool } = require('./db');
const cron = require('node-cron');
const fs = require('fs');

// Middleware para parsear JSON
app.use(express.json());
// Sanitización básica
const { sanitizeRequest } = require('./utils/sanitize');
app.use(sanitizeRequest);

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
// Endpoint simple para usuarios online
app.get('/api/users/online', (req, res) => {
    try {
    const list = Array.from(onlineUsers.entries()).map(([id, info]) => ({ id, nombre: info?.name || `Usuario ${id}`, rol: info?.role || '' }));
        res.json(list);
    } catch (e) { res.status(500).json([]); }
});
// Servir uploads (logos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Socket.IO handlers
io.on('connection', (socket) => {
    try {
        const { userId, sessionId } = socket.handshake.auth || {};
        if (!sessions.validate(userId, sessionId)) {
            socket.emit('auth:error', { message: 'Sesión inválida' });
            return socket.disconnect(true);
        }
        sessions.addSocket(userId, socket.id);
        // Intentar inferir nombre del usuario desde handshake o sessionStorage (cliente lo manda en auth si se desea)
    const userName = socket.handshake.auth?.userName || `Usuario ${userId}`;
    const roleName = socket.handshake.auth?.roleName || '';
    onlineUsers.set(String(userId), { name: userName, role: roleName });
    io.emit('users:online', Array.from(onlineUsers.entries()).map(([id, info]) => ({ id, nombre: info?.name || `Usuario ${id}`, rol: info?.role || '' })));
        socket.on('disconnect', () => {
            sessions.removeSocket(userId, socket.id);
            // Si ya no tiene sockets, retirarlo de online
            try {
                const { socketsCount } = require('./utils/sessionRegistry');
                if (socketsCount(userId) === 0) {
                    onlineUsers.delete(String(userId));
                    io.emit('users:online', Array.from(onlineUsers.entries()).map(([id, info]) => ({ id, nombre: info?.name || `Usuario ${id}`, rol: info?.role || '' })));
                }
            } catch {}
        });

        socket.on('mesas:lock', ({ mesaId }, ack) => {
            if (!mesaId) return ack && ack({ ok: false, error: 'mesaId requerido' });
            const lockedBy = mesaLocks.get(String(mesaId));
            if (lockedBy && String(lockedBy) !== String(userId)) {
                return ack && ack({ ok: false, error: 'Mesa bloqueada por otro usuario' });
            }
            mesaLocks.set(String(mesaId), String(userId));
            io.emit('mesas:locked', { mesaId: String(mesaId), by: userId });
            return ack && ack({ ok: true });
        });

        socket.on('mesas:unlock', ({ mesaId }, ack) => {
            if (!mesaId) return ack && ack({ ok: false, error: 'mesaId requerido' });
            const lockedBy = mesaLocks.get(String(mesaId));
            if (!lockedBy || String(lockedBy) === String(userId)) {
                mesaLocks.delete(String(mesaId));
                io.emit('mesas:unlocked', { mesaId: String(mesaId) });
                return ack && ack({ ok: true });
            }
            return ack && ack({ ok: false, error: 'No autorizado' });
        });

        socket.on('mesas:setEstado', async ({ mesaId, estado, detalle }, ack) => {
            try {
                if (!mesaId || !estado) return ack && ack({ ok: false, error: 'Datos incompletos' });
                const m = await MesasModel.setEstado(mesaId, estado, detalle || null);
                io.emit('mesas:changed', { mesaId: String(mesaId), estado: m.estado, detalle: m.detalle });
                return ack && ack({ ok: true, mesa: m });
            } catch (e) {
                return ack && ack({ ok: false, error: e?.message || 'Error' });
            }
        });
    } catch (e) { try { socket.disconnect(true); } catch {} }
});

const PORT = process.env.PORT || 3000;
initPool().then(() => {
    server.listen(PORT, () => {
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
        let currentTask = null;
        const scheduleTask = () => {
            try { if (currentTask) currentTask.stop(); } catch (_) {}
            const expr = loadExpr();
            currentTask = cron.schedule(expr, async () => {
                try {
                    const { createNow } = require('./controllers/backupController');
                    await new Promise((resolve, reject) => {
                        const req = { query: { mode: 'lite' } };
                        const res = { json: () => resolve(), status: () => ({ json: reject }) };
                        createNow(req, res).catch(reject);
                    });
                    console.log('[backup] Backup automático ejecutado');
                } catch (e) {
                    console.warn('[backup] Error en backup automático:', e?.message);
                }
            });
        };
        // Programar inicial
        scheduleTask();
        // Vigilar cambios en schedule.json para reprogramar dinámicamente
        try {
            fs.watch(schedulePath, { persistent: false }, () => {
                console.log('[backup] schedule.json cambiado, reprogramando tarea');
                scheduleTask();
            });
        } catch (_) {}
    } catch (_) {}
});
