// controllers/ventasController.js
const { getPool } = require('../db');

exports.getAllVentas = (req, res) => {
    // Placeholder: en esta versión no persistimos ventas, solo devolvemos estático
    res.json([]);
};

// POST /api/ventas
// Payload esperado { items: [{ id, cantidad }] }
exports.processSale = async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ message: 'No hay items en la venta' });
    // Normalizar
    const normalized = items.map(it => ({ id: Number(it.id || it.productId), cantidad: Number(it.cantidad || it.qty || 0) }))
        .filter(it => it.id > 0 && it.cantidad > 0);
    if (!normalized.length) return res.status(400).json({ message: 'Items inválidos' });

    const pool = getPool();
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const updated = [];
        let totalVenta = 0;
        const itemsDetallados = [];
        for (const it of normalized) {
            const [rows] = await conn.execute('SELECT id, nombre, stock, precio FROM productos WHERE id = ? FOR UPDATE', [it.id]);
            if (!rows.length) {
                throw Object.assign(new Error(`Producto ${it.id} no encontrado`), { status: 404 });
            }
            const prod = rows[0];
            if (Number(prod.stock) < it.cantidad) {
                throw Object.assign(new Error(`Stock insuficiente para ${prod.nombre} (disp: ${prod.stock}, req: ${it.cantidad})`), { status: 400 });
            }
            const nuevo = Number(prod.stock) - it.cantidad;
            await conn.execute('UPDATE productos SET stock = ? WHERE id = ?', [nuevo, it.id]);
            const precio = Number(prod.precio) || 0;
            const subtotal = precio * Number(it.cantidad);
            totalVenta += subtotal;
            updated.push({ id: it.id, nombre: prod.nombre, stock: nuevo });
            itemsDetallados.push({ id: Number(it.id), nombre: prod.nombre, precio, cantidad: Number(it.cantidad), subtotal });
        }

        // Guardar un log simple de la venta para reportes
        const empId = Number(req.body?.empleado_id) || null;
        const empNombre = req.body?.empleado_nombre || null;
        const mesaId = Number(req.body?.mesa_id) || null;
        const mesaCodigo = req.body?.mesa_codigo || (mesaId ? `Mesa ${mesaId}` : null);
        const payload = {
            empleado_id: empId,
            empleado_nombre: empNombre,
            mesa_id: mesaId,
            mesa_codigo: mesaCodigo,
            cliente_nombre: req.body?.cliente_nombre || null,
            metodo_pago: req.body?.metodo_pago || 'efectivo',
            total: Number(req.body?.total) || totalVenta,
            items: itemsDetallados
        };
        try {
            await conn.execute(
                'INSERT INTO ventas_log (empleado_id, empleado_nombre, mesa_id, mesa_codigo, cliente_nombre, metodo_pago, total, items_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                , [payload.empleado_id, payload.empleado_nombre, payload.mesa_id, payload.mesa_codigo, payload.cliente_nombre, payload.metodo_pago, payload.total, JSON.stringify(payload.items)]
            );
        } catch (_) {
            // no detener la venta si el log falla
        }

        await conn.commit();
        res.json({ success: true, updated });
    } catch (err) {
        if (conn) try { await conn.rollback(); } catch {}
        const status = err.status || 500;
        res.status(status).json({ message: err.message || 'Error al procesar la venta' });
    } finally {
        if (conn) conn.release();
    }
};
