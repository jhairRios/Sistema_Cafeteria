// backend/scripts/clear-mesas.js
// Limpia todas las mesas y reinicia el autoincrement
const { getPool } = require('../db');

(async () => {
  const pool = getPool();
  try {
    await pool.query('DELETE FROM mesas');
    await pool.query('ALTER TABLE mesas AUTO_INCREMENT = 1');
    console.log('Todas las mesas eliminadas y autoincrement reiniciado.');
    process.exit(0);
  } catch (e) {
    console.error('Error al limpiar mesas:', e);
    process.exit(1);
  }
})();
