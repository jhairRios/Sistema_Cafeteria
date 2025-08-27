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
        for (const it of normalized) {
            const [rows] = await conn.execute('SELECT id, nombre, stock FROM productos WHERE id = ? FOR UPDATE', [it.id]);
            if (!rows.length) {
                throw Object.assign(new Error(`Producto ${it.id} no encontrado`), { status: 404 });
            }
            const prod = rows[0];
            if (Number(prod.stock) < it.cantidad) {
                throw Object.assign(new Error(`Stock insuficiente para ${prod.nombre} (disp: ${prod.stock}, req: ${it.cantidad})`), { status: 400 });
            }
            const nuevo = Number(prod.stock) - it.cantidad;
            await conn.execute('UPDATE productos SET stock = ? WHERE id = ?', [nuevo, it.id]);
            updated.push({ id: it.id, nombre: prod.nombre, stock: nuevo });
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
