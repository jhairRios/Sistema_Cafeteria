const { getPool } = require('../db');

async function getAll() {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM mesas WHERE activo=1 ORDER BY numero ASC');
  return rows;
}

async function create({ codigo, numero, nombre, capacidad, ubicacion = 'interior', estado = 'disponible', detalle = null }) {
  const pool = getPool();
  const [res] = await pool.query(
    'INSERT INTO mesas (codigo, numero, nombre, capacidad, ubicacion, estado, detalle) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [codigo, numero, nombre, capacidad, ubicacion, estado, detalle ? JSON.stringify(detalle) : null]
  );
  const [rows] = await pool.query('SELECT * FROM mesas WHERE id=?', [res.insertId]);
  return rows[0];
}

async function getById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM mesas WHERE id=? AND activo=1', [id]);
  return rows[0];
}

async function update(id, { nombre, capacidad, ubicacion, estado, detalle }) {
  const pool = getPool();
  await pool.query(
    'UPDATE mesas SET nombre=COALESCE(?, nombre), capacidad=COALESCE(?, capacidad), ubicacion=COALESCE(?, ubicacion), estado=COALESCE(?, estado), detalle=COALESCE(?, detalle), updated_at=NOW() WHERE id=? AND activo=1',
    [nombre ?? null, capacidad ?? null, ubicacion ?? null, estado ?? null, detalle ? JSON.stringify(detalle) : null, id]
  );
  const [rows] = await pool.query('SELECT * FROM mesas WHERE id=?', [id]);
  return rows[0];
}

async function remove(id) {
  const pool = getPool();
  await pool.query('UPDATE mesas SET activo=0, updated_at=NOW() WHERE id=?', [id]);
}

async function setEstado(id, estado, detalle = null) {
  const pool = getPool();
  await pool.query('UPDATE mesas SET estado=?, detalle=?, updated_at=NOW() WHERE id=? AND activo=1', [estado, detalle ? JSON.stringify(detalle) : null, id]);
  const [rows] = await pool.query('SELECT * FROM mesas WHERE id=?', [id]);
  return rows[0];
}

async function clearAll() {
  const pool = getPool();
  await pool.query('DELETE FROM mesas');
}

function buildCodigo(n) {
  return `MESA-${String(n).padStart(3, '0')}`;
}

async function bulkGenerate({ total, dist = { '2': 0, '4': 0, '6': 0, '8': 0 }, ubicaciones = [], reset = false, startNumber = 1 }) {
  const pool = getPool();

  // Reset "suave": no usamos TRUNCATE para evitar errores por claves foráneas.
  if (reset) {
    await pool.query('UPDATE mesas SET activo=0, updated_at=NOW()');
  }

  const created = [];
  const caps = [];
  const d2 = Number(dist['2'] || 0), d4 = Number(dist['4'] || 0), d6 = Number(dist['6'] || 0), d8 = Number(dist['8'] || 0);
  let sum = d2 + d4 + d6 + d8;
  const needed = Number(total) || sum;
  if (sum === 0 && needed > 0) {
    // default: todas de 4 si no hay distribución
    for (let i = 0; i < needed; i++) caps.push(4);
  } else {
    for (let i = 0; i < d2; i++) caps.push(2);
    for (let i = 0; i < d4; i++) caps.push(4);
    for (let i = 0; i < d6; i++) caps.push(6);
    for (let i = 0; i < d8; i++) caps.push(8);
    // si total > sum, completar con 4
    while (caps.length < needed) caps.push(4);
  }

  // upsert secuencial por codigo (reactiva/actualiza si existe, crea si no)
  for (let idx = 0; idx < caps.length; idx++) {
    const numero = startNumber + idx;
    const codigo = buildCodigo(numero);
    const nombre = `Mesa ${numero}`;
    const capacidad = caps[idx];
    const ubicacion = ubicaciones[idx % (ubicaciones.length || 1)] || 'interior';

    const [existRows] = await pool.query('SELECT id FROM mesas WHERE codigo=? LIMIT 1', [codigo]);
    const existente = existRows && existRows[0];
    if (existente) {
      await pool.query(
        'UPDATE mesas SET numero=?, nombre=?, capacidad=?, ubicacion=?, estado=?, detalle=?, activo=1, updated_at=NOW() WHERE id=?',
        [numero, nombre, capacidad, ubicacion, 'disponible', null, existente.id]
      );
      // no lo contamos como "creado", mantenemos semántica original
      continue;
    }

    const mesa = await create({ codigo, numero, nombre, capacidad, ubicacion, estado: 'disponible', detalle: null });
    created.push(mesa);
  }
  return created;
}

module.exports = { getAll, getById, create, update, remove, setEstado, bulkGenerate };
