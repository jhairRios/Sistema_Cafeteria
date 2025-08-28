const fs = require('fs');
const path = require('path');
const { getPool } = require('../db');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
function ensureDir() { if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true }); }

async function dumpTables(pool) {
  const tables = ['roles','permisos','roles_permisos','departamentos','turnos','cargos','empleados','productos','mesas','restaurante_config'];
  const data = {};
  for (const t of tables) {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${t}`);
      data[t] = rows;
    } catch (e) {
      data[t] = { error: e && e.message };
    }
  }
  return data;
}

exports.createNow = async (_req, res) => {
  try {
    ensureDir();
    const pool = getPool();
    const data = await dumpTables(pool);
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    const fname = `backup-${ts}.json`;
    const full = path.join(BACKUP_DIR, fname);
    fs.writeFileSync(full, JSON.stringify({ createdAt: new Date().toISOString(), data }, null, 2));
    res.json({ ok: true, file: fname });
  } catch (e) {
    console.error('create backup error:', e);
    res.status(500).json({ message: 'Error creando backup' });
  }
};

exports.list = async (_req, res) => {
  try {
    ensureDir();
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
    const items = files.map(f => {
      const full = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(full);
      return { file: f, size: stat.size, mtime: stat.mtime };
    }).sort((a,b)=> b.mtime - a.mtime);
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: 'Error listando backups' });
  }
};

exports.download = async (req, res) => {
  ensureDir();
  const f = req.params.file;
  const full = path.join(BACKUP_DIR, f);
  if (!full.startsWith(BACKUP_DIR)) return res.status(400).end();
  if (!fs.existsSync(full)) return res.status(404).end();
  res.download(full);
};

async function clearAndInsert(pool, table, rows) {
  await pool.query(`DELETE FROM ${table}`);
  if (!rows || !rows.length) return;
  // Inserción simple por columnas directas
  const cols = Object.keys(rows[0]||{});
  if (!cols.length) return;
  const placeholders = '(' + cols.map(()=> '?').join(',') + ')';
  const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES ${rows.map(()=> placeholders).join(',')}`;
  const vals = [];
  rows.forEach(r => cols.forEach(c => vals.push(r[c])));
  await pool.query(sql, vals);
}

exports.restore = async (req, res) => {
  try {
    ensureDir();
    const { file } = req.body || {};
    if (!file) return res.status(400).json({ message: 'Archivo requerido' });
    const full = path.join(BACKUP_DIR, file);
    if (!full.startsWith(BACKUP_DIR) || !fs.existsSync(full)) return res.status(404).json({ message: 'No existe el archivo' });
    const json = JSON.parse(fs.readFileSync(full, 'utf8'));
    const data = json.data || {};
    const pool = getPool();
    // Orden para respetar FKs básicas
    await clearAndInsert(pool, 'roles', data.roles);
    await clearAndInsert(pool, 'permisos', data.permisos);
    await clearAndInsert(pool, 'roles_permisos', data.roles_permisos);
    await clearAndInsert(pool, 'departamentos', data.departamentos);
    await clearAndInsert(pool, 'turnos', data.turnos);
    await clearAndInsert(pool, 'cargos', data.cargos);
    await clearAndInsert(pool, 'empleados', data.empleados);
    await clearAndInsert(pool, 'productos', data.productos);
    await clearAndInsert(pool, 'mesas', data.mesas);
    if (data.restaurante_config) {
      // upsert id=1
      const row = data.restaurante_config[0] || { id: 1 };
      const payload = {
        id: 1,
        nombre: row.nombre || 'Mi Restaurante',
        direccion: row.direccion || null,
        telefono: row.telefono || null,
        email: row.email || null,
        iva_porcentaje: row.iva_porcentaje || 16,
        propina_automatica: row.propina_automatica || 10,
        incluir_iva: row.incluir_iva ?? 1,
        horarios: row.horarios || null,
      };
      await pool.query(`REPLACE INTO restaurante_config (id,nombre,direccion,telefono,email,iva_porcentaje,propina_automatica,incluir_iva,horarios) VALUES (1,?,?,?,?,?,?,?,?)`,
        [payload.nombre, payload.direccion, payload.telefono, payload.email, payload.iva_porcentaje, payload.propina_automatica, payload.incluir_iva, payload.horarios]);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('restore backup error:', e);
    res.status(500).json({ message: 'Error al restaurar backup' });
  }
};

exports.restoreDefaults = async (_req, res) => {
  try {
    // Reaplicar nuestros esquemas/seeds principales
    const fs = require('fs');
    const path = require('path');
    const { initPool, getPool } = require('../db');
    const apply = require('child_process');
    // Simpler: ejecutamos los SQL via el script apply-sql
    const script = path.join(__dirname, '..', 'scripts', 'apply-sql.js');
    const schema = path.join(__dirname, '..', 'sql', 'schema_roles_permisos.sql');
    const delta = path.join(__dirname, '..', 'sql', 'delta_permisos_granulares.sql');
    const fixMesas = path.join(__dirname, '..', 'sql', 'fix_productos_mesas.sql');
    const fixRest = path.join(__dirname, '..', 'sql', 'fix_restaurante.sql');
    const node = process.execPath;
    // Ejecutar secuencialmente
    const { execFileSync } = require('child_process');
    [schema, delta, fixMesas, fixRest].forEach(f => {
      try { execFileSync(node, [script, f], { stdio: 'ignore' }); } catch (_) {}
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('restore defaults error:', e);
    res.status(500).json({ message: 'Error al restaurar valores por defecto' });
  }
};

exports.schedule = async (req, res) => {
  try {
    ensureDir();
    const { frequency } = req.body || {};
    const cfg = { frequency: frequency || 'semanal', updatedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(BACKUP_DIR, 'schedule.json'), JSON.stringify(cfg, null, 2));
    res.json({ ok: true, ...cfg });
  } catch (e) {
    res.status(500).json({ message: 'Error al programar backup' });
  }
};
