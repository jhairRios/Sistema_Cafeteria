// Ejecuta un archivo .sql contra la BD configurada en backend/db.js
const fs = require('fs');
const path = require('path');
const { initPool, getPool } = require('../db');

async function run() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Uso: node scripts/apply-sql.js <ruta-al-archivo.sql>');
    process.exit(1);
  }
  const sqlPath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  if (!fs.existsSync(sqlPath)) {
    console.error('No existe el archivo:', sqlPath);
    process.exit(1);
  }
  let sql = fs.readFileSync(sqlPath, 'utf8');
  // Eliminar comentarios tipo '-- ...' por línea para no interferir con el split
  sql = sql.replace(/^--.*$/gm, '');
  try {
    await initPool();
    const pool = getPool();
    const statements = sql
      .split(/;\s*(?:\r?\n|$)/)
  .map(s => s.trim())
  .filter(s => s.length > 0);
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        console.log('OK ->', stmt.substring(0, Math.min(100, stmt.length)) + '...');
      } catch (e) {
        console.warn('WARN al ejecutar sentencia:', e && e.message);
      }
    }
    console.log('Aplicación SQL completa');
    process.exit(0);
  } catch (e) {
    console.error('Fallo aplicando SQL:', e);
    process.exit(2);
  }
}

run();
