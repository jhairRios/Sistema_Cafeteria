// backend/db.js - Conexión a MySQL usando mysql2/promise
const mysql = require('mysql2/promise');

const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || 'sistema_cafeteria',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool;

async function initPool() {
  if (!pool) {
    pool = mysql.createPool(mysqlConfig);
    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      console.log('Conectado a MySQL');
    } catch (err) {
      console.error('Error al conectar a MySQL:', err.message);
    }
  }
  return pool;
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(mysqlConfig);
  }
  return pool;
}

module.exports = { initPool, getPool };
