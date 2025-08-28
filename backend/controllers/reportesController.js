// controllers/reportesController.js
const { getPool } = require('../db');

function parseRange({ rango, desde, hasta }) {
    const now = new Date();
    let start, end;
    switch ((rango||'hoy')) {
        case 'ayer': {
            const d = new Date(now); d.setDate(d.getDate()-1);
            start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0);
            end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59);
            break;
        }
        case 'semana': {
            const day = (now.getDay()+6)%7; // lunes=0
            const monday = new Date(now); monday.setDate(now.getDate()-day);
            start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(),0,0,0);
            end = now;
            break;
        }
        case 'mes': {
            start = new Date(now.getFullYear(), now.getMonth(), 1,0,0,0);
            end = now; break;
        }
        case 'trimestre': {
            const m = now.getMonth(); const qStart = m - (m%3);
            start = new Date(now.getFullYear(), qStart, 1,0,0,0);
            end = now; break;
        }
        case 'anio': {
            start = new Date(now.getFullYear(),0,1,0,0,0);
            end = now; break;
        }
        case 'personalizado': {
            start = desde ? new Date(desde+'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), now.getDate(),0,0,0);
            end = hasta ? new Date(hasta+'T23:59:59') : now; break;
        }
        default: {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate(),0,0,0);
            end = now; break;
        }
    }
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    return { start: fmt(start), end: fmt(end) };
}

function buildFilters(q) {
    const filtros = [];
    const params = [];
    // empleado: acepta id numérico o nombre exacto
    if (q.empleado) {
        if (!isNaN(Number(q.empleado))) { filtros.push('empleado_id = ?'); params.push(Number(q.empleado)); }
        else { filtros.push('empleado_nombre = ?'); params.push(String(q.empleado)); }
    }
    // mesa: mesa_id
    if (q.mesa) { filtros.push('mesa_id = ?'); params.push(Number(q.mesa)); }
    // mesaCodigo: exacto
    if (q.mesaCodigo) { filtros.push('mesa_codigo = ?'); params.push(String(q.mesaCodigo)); }
    // producto: ventas que contienen ese id de producto
    if (q.producto) { filtros.push("JSON_CONTAINS(items_json, JSON_OBJECT('id', ?), '$')"); params.push(Number(q.producto)); }
    // categoria: usar JSON_TABLE y join con productos (MySQL 8+)
    const categoria = q.categoria ? String(q.categoria) : '';
    return { filtros, params, categoria };
}

exports.getResumen = async (req, res) => {
    try {
        const pool = getPool();
        const { start, end } = parseRange({ rango: req.query.rango, desde: req.query.desde, hasta: req.query.hasta });
        const { filtros, params, categoria } = buildFilters(req.query);
        const where = ['fecha BETWEEN ? AND ?', ...filtros];
        const baseParams = [start, end, ...params];
        // categoria: filtrar con EXISTS
        const catExists = categoria ? ` AND EXISTS (
            SELECT 1 FROM JSON_TABLE(ventas_log.items_json, '$[*]' COLUMNS(prod_id INT PATH '$.id')) jt
            JOIN productos p ON p.id = jt.prod_id
            WHERE p.categoria = ?
        )` : '';
        const baseWhere = where.join(' AND ') + catExists;
        const [r1] = await pool.query(`SELECT COUNT(*) ventas, IFNULL(SUM(total),0) total FROM ventas_log WHERE ${baseWhere}`, categoria ? [...baseParams, categoria] : baseParams);
        const [r2] = await pool.query(`SELECT COUNT(DISTINCT cliente_nombre) clientes FROM ventas_log WHERE ${baseWhere} AND cliente_nombre IS NOT NULL AND cliente_nombre<>""`, categoria ? [...baseParams, categoria] : baseParams);
        const [r3] = await pool.query(`SELECT IFNULL(AVG(total),0) promedio FROM ventas_log WHERE ${baseWhere}`, categoria ? [...baseParams, categoria] : baseParams);
        return res.json({
            rango: { inicio: start, fin: end },
            totalVentas: Number(r1[0]?.total||0),
            conteoVentas: Number(r1[0]?.ventas||0),
            totalClientes: Number(r2[0]?.clientes||0),
            promedioVenta: Number(r3[0]?.promedio||0)
        });
    } catch (e) {
        return res.status(500).json({ error: 'Error obteniendo resumen', detail: e?.message });
    }
};

exports.getVentas = async (req, res) => {
    try {
        const pool = getPool();
        const { start, end } = parseRange({ rango: req.query.rango, desde: req.query.desde, hasta: req.query.hasta });
        const { filtros, params, categoria } = buildFilters(req.query);
        const where = ['fecha BETWEEN ? AND ?', ...filtros];
        const catExists = categoria ? ` AND EXISTS (
            SELECT 1 FROM JSON_TABLE(ventas_log.items_json, '$[*]' COLUMNS(prod_id INT PATH '$.id')) jt
            JOIN productos p ON p.id = jt.prod_id
            WHERE p.categoria = ?
        )` : '';
        const sql = `SELECT id, fecha, mesa_codigo, empleado_nombre, cliente_nombre, metodo_pago, total, items_json
                     FROM ventas_log WHERE ${where.join(' AND ')}${catExists}
                     ORDER BY fecha DESC LIMIT 500`;
        const [rows] = await pool.query(sql, categoria ? [start, end, ...params, categoria] : [start, end, ...params]);
        return res.json(rows);
    } catch (e) {
        return res.status(500).json({ error: 'Error obteniendo ventas', detail: e?.message });
    }
};

exports.getTopProductos = async (req, res) => {
    try {
        const pool = getPool();
        const { start, end } = parseRange({ rango: req.query.rango, desde: req.query.desde, hasta: req.query.hasta });
        const { filtros, params, categoria } = buildFilters(req.query);
        const where = ['fecha BETWEEN ? AND ?', ...filtros];
        const catExists = categoria ? ` AND EXISTS (
            SELECT 1 FROM JSON_TABLE(ventas_log.items_json, '$[*]' COLUMNS(prod_id INT PATH '$.id')) jt
            JOIN productos p ON p.id = jt.prod_id
            WHERE p.categoria = ?
        )` : '';
        const [rows] = await pool.query(`SELECT items_json FROM ventas_log WHERE ${where.join(' AND ')}${catExists}`, categoria ? [start, end, ...params, categoria] : [start, end, ...params]);
        const map = new Map();
        for (const r of rows) {
            try { const items = JSON.parse(r.items_json || '[]'); items.forEach(it => { const k=String(it.id); map.set(k, (map.get(k)||0)+Number(it.cantidad||0)); }); } catch {}
        }
        // Traer nombres (y categoría) desde productos
        let prodInfo = new Map();
        try {
            const [prods] = await pool.query('SELECT id, nombre, categoria FROM productos');
            prodInfo = new Map(prods.map(p => [String(p.id), { nombre: p.nombre, categoria: p.categoria }]));
        } catch {}
        let arr = Array.from(map.entries()).map(([id, cantidad]) => ({ id: Number(id), nombre: prodInfo.get(String(id))?.nombre || `Producto ${id}`, categoria: prodInfo.get(String(id))?.categoria || null, cantidad }));
        if (categoria) arr = arr.filter(x => x.categoria === categoria);
        arr.sort((a,b)=>b.cantidad-a.cantidad);
        return res.json(arr.slice(0,20));
    } catch (e) {
        return res.status(500).json({ error: 'Error obteniendo top productos', detail: e?.message });
    }
};

exports.getUsoMesas = async (req, res) => {
    try {
        const pool = getPool();
        const { start, end } = parseRange({ rango: req.query.rango, desde: req.query.desde, hasta: req.query.hasta });
        const { filtros, params, categoria } = buildFilters(req.query);
        const where = ['fecha BETWEEN ? AND ?', ...filtros];
        const catExists = categoria ? ` AND EXISTS (
            SELECT 1 FROM JSON_TABLE(ventas_log.items_json, '$[*]' COLUMNS(prod_id INT PATH '$.id')) jt
            JOIN productos p ON p.id = jt.prod_id
            WHERE p.categoria = ?
        )` : '';
        const [rows] = await pool.query(`SELECT mesa_codigo, COUNT(*) usos, IFNULL(SUM(total),0) total FROM ventas_log WHERE ${where.join(' AND ')}${catExists} GROUP BY mesa_codigo ORDER BY total DESC`, categoria ? [start, end, ...params, categoria] : [start, end, ...params]);
        return res.json(rows);
    } catch (e) {
        return res.status(500).json({ error: 'Error obteniendo uso de mesas', detail: e?.message });
    }
};

exports.getDesempenoEmpleados = async (req, res) => {
    try {
        const pool = getPool();
        const { start, end } = parseRange({ rango: req.query.rango, desde: req.query.desde, hasta: req.query.hasta });
        const { filtros, params, categoria } = buildFilters(req.query);
        const where = ['fecha BETWEEN ? AND ?', ...filtros];
        const catExists = categoria ? ` AND EXISTS (
            SELECT 1 FROM JSON_TABLE(ventas_log.items_json, '$[*]' COLUMNS(prod_id INT PATH '$.id')) jt
            JOIN productos p ON p.id = jt.prod_id
            WHERE p.categoria = ?
        )` : '';
        const [rows] = await pool.query(`SELECT empleado_nombre, COUNT(*) ventas, IFNULL(SUM(total),0) total FROM ventas_log WHERE ${where.join(' AND ')}${catExists} GROUP BY empleado_nombre ORDER BY total DESC`, categoria ? [start, end, ...params, categoria] : [start, end, ...params]);
        return res.json(rows);
    } catch (e) {
        return res.status(500).json({ error: 'Error obteniendo desempeño de empleados', detail: e?.message });
    }
};

exports.getClientesFrecuentes = async (req, res) => {
    try {
        const pool = getPool();
        const { start, end } = parseRange({ rango: req.query.rango, desde: req.query.desde, hasta: req.query.hasta });
        const { filtros, params, categoria } = buildFilters(req.query);
        const where = ['fecha BETWEEN ? AND ?', ...filtros, 'cliente_nombre IS NOT NULL AND cliente_nombre<>""'];
        const catExists = categoria ? ` AND EXISTS (
            SELECT 1 FROM JSON_TABLE(ventas_log.items_json, '$[*]' COLUMNS(prod_id INT PATH '$.id')) jt
            JOIN productos p ON p.id = jt.prod_id
            WHERE p.categoria = ?
        )` : '';
        const [rows] = await pool.query(`SELECT cliente_nombre, COUNT(*) visitas, IFNULL(SUM(total),0) total FROM ventas_log WHERE ${where.join(' AND ')}${catExists} GROUP BY cliente_nombre ORDER BY visitas DESC LIMIT 50`, categoria ? [start, end, ...params, categoria] : [start, end, ...params]);
        return res.json(rows);
    } catch (e) {
        return res.status(500).json({ error: 'Error obteniendo clientes frecuentes', detail: e?.message });
    }
};
