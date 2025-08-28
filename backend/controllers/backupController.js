const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const zlib = require('zlib');
const crypto = require('crypto');
const { getPool } = require('../db');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
function ensureDir() { if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true }); }

function readScheduleCfg() {
  try {
    const p = path.join(BACKUP_DIR, 'schedule.json');
    if (!fs.existsSync(p)) return { frequency: 'semanal', keepLast: 7 };
    const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { frequency: cfg.frequency || 'semanal', keepLast: Number(cfg.keepLast) > 0 ? Number(cfg.keepLast) : 7 };
  } catch {
    return { frequency: 'semanal', keepLast: 7 };
  }
}

function computeChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const rs = fs.createReadStream(filePath);
    rs.on('error', reject);
    rs.on('data', chunk => hash.update(chunk));
    rs.on('end', () => resolve(hash.digest('hex')));
  });
}

function rotateBackups(keepLast) {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-') && (f.endsWith('.sql') || f.endsWith('.sql.gz') || f.endsWith('.json')))
      .map(f => ({ f, full: path.join(BACKUP_DIR, f), stat: fs.statSync(path.join(BACKUP_DIR, f)) }))
      .sort((a,b) => b.stat.mtimeMs - a.stat.mtimeMs);
    const survivors = files.slice(0, Math.max(keepLast, 1)).map(x => x.f);
    const toDelete = files.slice(Math.max(keepLast, 1));
    toDelete.forEach(x => {
      try { fs.unlinkSync(x.full); } catch {}
      // borrar checksum asociado
      const chk = x.full + '.sha256';
      try { if (fs.existsSync(chk)) fs.unlinkSync(chk); } catch {}
    });
  } catch {}
}

function getDbEnv() {
  const host = process.env.MYSQL_HOST || 'localhost';
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DB || 'sistema_cafeteria';
  const port = process.env.MYSQL_PORT ? String(process.env.MYSQL_PORT) : '3306';
  return { host, user, password, database, port };
}

function runMysqldump(destFile) {
  return new Promise((resolve, reject) => {
    const { host, user, password, database, port } = getDbEnv();
    const args = [
      '--host', host,
      '--port', String(port),
      '--user', user,
      ...(password ? [`--password=${password}`] : []),
      '--routines', '--events', '--triggers',
      '--skip-lock-tables',
      '--databases', database,
    ];
    const child = spawn('mysqldump', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const ws = fs.createWriteStream(destFile);
    // Si termina en .gz, comprimir en vuelo
    if (destFile.toLowerCase().endsWith('.gz')) {
      const gzip = zlib.createGzip({ level: 9 });
      child.stdout.pipe(gzip).pipe(ws);
    } else {
      child.stdout.pipe(ws);
    }
    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) return resolve();
      // si hubo error, eliminar archivo parcial
      try { if (fs.existsSync(destFile)) fs.unlinkSync(destFile); } catch {}
      reject(new Error(stderr || `mysqldump exited with code ${code}`));
    });
  });
}

async function createJsonFallback(ts) {
  const pool = getPool();
  const tables = ['roles','permisos','roles_permisos','departamentos','turnos','cargos','empleados','productos','mesas','restaurante_config','ventas_log'];
  const data = {};
  for (const t of tables) {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${t}`);
      data[t] = rows;
    } catch {
      data[t] = [];
    }
  }
  const payload = { type: 'logical-json', db: getDbEnv().database, createdAt: new Date().toISOString(), data };
  const fname = `backup-${ts}.json`;
  const full = path.join(BACKUP_DIR, fname);
  fs.writeFileSync(full, JSON.stringify(payload, null, 2));
  const sha = await computeChecksum(full);
  try { fs.writeFileSync(full + '.sha256', sha + '  ' + fname + '\n'); } catch {}
  const { keepLast } = readScheduleCfg();
  rotateBackups(keepLast);
  return fname;
}

exports.createNow = async (_req, res) => {
  try {
    ensureDir();
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    const sqlName = `backup-${ts}.sql.gz`;
    const sqlFull = path.join(BACKUP_DIR, sqlName);
    let fileMade = null;
    try {
      await runMysqldump(sqlFull);
      const sha = await computeChecksum(sqlFull);
      try { fs.writeFileSync(sqlFull + '.sha256', sha + '  ' + sqlName + '\n'); } catch {}
      fileMade = sqlName;
    } catch (e) {
      console.warn('mysqldump no disponible, usando fallback JSON:', e && e.message);
      fileMade = await createJsonFallback(ts);
    }
    const { keepLast } = readScheduleCfg();
    rotateBackups(keepLast);
    res.json({ ok: true, file: fileMade });
  } catch (e) {
    console.error('create backup error:', e);
    res.status(500).json({ message: 'Error creando backup', detail: e && e.message });
  }
};

exports.list = async (_req, res) => {
  try {
    ensureDir();
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json') || f.endsWith('.sql') || f.endsWith('.sql.gz'));
    const items = files.map(f => {
      const full = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(full);
      let checksum = undefined;
      try {
        const chk = full + '.sha256';
        if (fs.existsSync(chk)) {
          const content = fs.readFileSync(chk, 'utf8');
          checksum = (content.split(/\s+/)[0] || '').trim();
        }
      } catch {}
      return { file: f, size: stat.size, mtime: stat.mtime, checksum };
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

function runMysqlImport(srcFile) {
  return new Promise((resolve, reject) => {
    const { host, user, password, database, port } = getDbEnv();
    const args = [
      '--host', host,
      '--port', String(port),
      '--user', user,
      ...(password ? [`--password=${password}`] : []),
      database,
    ];
    const child = spawn('mysql', args, { stdio: ['pipe', 'ignore', 'pipe'] });
    const lower = srcFile.toLowerCase();
    const rs = fs.createReadStream(srcFile);
    if (lower.endsWith('.gz')) {
      const gunzip = zlib.createGunzip();
      rs.pipe(gunzip).pipe(child.stdin);
    } else {
      rs.pipe(child.stdin);
    }
    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(stderr || `mysql exited with code ${code}`));
    });
  });
}

exports.restore = async (req, res) => {
  try {
    ensureDir();
    const { file } = req.body || {};
    if (!file) return res.status(400).json({ message: 'Archivo requerido' });
    const full = path.join(BACKUP_DIR, file);
    if (!full.startsWith(BACKUP_DIR) || !fs.existsSync(full)) return res.status(404).json({ message: 'No existe el archivo' });

    if (file.endsWith('.sql')) {
      // Restauración completa desde dump SQL
      await runMysqlImport(full);
      return res.json({ ok: true, type: 'sql' });
    }

    // Restauración JSON (legado)
    const json = JSON.parse(fs.readFileSync(full, 'utf8'));
    const data = json.data || {};
    const pool = getPool();
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
    res.json({ ok: true, type: 'json' });
  } catch (e) {
    console.error('restore backup error:', e);
    res.status(500).json({ message: 'Error al restaurar backup', detail: e && e.message });
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
    const { frequency, keepLast } = req.body || {};
    const cfg = {
      frequency: frequency || 'semanal',
      keepLast: Number(keepLast) > 0 ? Number(keepLast) : readScheduleCfg().keepLast,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(BACKUP_DIR, 'schedule.json'), JSON.stringify(cfg, null, 2));
    res.json({ ok: true, ...cfg });
  } catch (e) {
    res.status(500).json({ message: 'Error al programar backup' });
  }
};
