const { getPool } = require('../db');

// Nota de esquema sugerido (crear en MySQL si no existe):
// CREATE TABLE IF NOT EXISTS productos (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   nombre VARCHAR(150) NOT NULL,
//   categoria VARCHAR(100) NULL,
//   precio DECIMAL(10,2) NOT NULL DEFAULT 0,
//   stock INT NOT NULL DEFAULT 0,
//   stock_minimo INT NOT NULL DEFAULT 0,
//   descripcion TEXT NULL,
//   creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

function mapProducto(row) {
  const estado = row.stock <= 0 ? 'Agotado' : (row.stock < row.stock_minimo ? 'Bajo Stock' : 'Disponible');
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    precio: Number(row.precio),
    stock: row.stock,
    stock_minimo: row.stock_minimo,
    descripcion: row.descripcion,
    estado
  };
}

exports.getAll = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT id, nombre, categoria, precio, stock, stock_minimo, descripcion
       FROM productos
       ORDER BY id DESC`
    );
    res.json(rows.map(mapProducto));
  } catch (err) {
    console.error('getAll productos error:', err);
    res.status(500).json({ message: 'Error al obtener productos' });
  }
};

exports.getById = async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT id, nombre, categoria, precio, stock, stock_minimo, descripcion
       FROM productos WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(mapProducto(rows[0]));
  } catch (err) {
    console.error('getById producto error:', err);
    res.status(500).json({ message: 'Error al obtener el producto' });
  }
};

exports.create = async (req, res) => {
  const { nombre, categoria, precio, stock, stock_minimo, descripcion } = req.body || {};
  if (!nombre) return res.status(400).json({ message: 'El nombre es requerido' });
  try {
    const pool = getPool();
    const p = Number(precio) || 0;
    const s = Number(stock) || 0;
    const smin = Number(stock_minimo) || 0;
    const [result] = await pool.execute(
      `INSERT INTO productos (nombre, categoria, precio, stock, stock_minimo, descripcion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, categoria || null, p, s, smin, descripcion || null]
    );
    const id = result.insertId;
    const [rows] = await pool.execute(
      `SELECT id, nombre, categoria, precio, stock, stock_minimo, descripcion FROM productos WHERE id = ?`,
      [id]
    );
    res.status(201).json(mapProducto(rows[0]));
  } catch (err) {
    console.error('create producto error:', err);
    res.status(500).json({ message: 'Error al crear el producto' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { nombre, categoria, precio, stock, stock_minimo, descripcion } = req.body || {};
  try {
    const pool = getPool();
    await pool.execute(
      `UPDATE productos SET nombre = ?, categoria = ?, precio = ?, stock = ?, stock_minimo = ?, descripcion = ?
       WHERE id = ?`,
      [nombre, categoria || null, Number(precio) || 0, Number(stock) || 0, Number(stock_minimo) || 0, descripcion || null, id]
    );
    const [rows] = await pool.execute(
      `SELECT id, nombre, categoria, precio, stock, stock_minimo, descripcion FROM productos WHERE id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(mapProducto(rows[0]));
  } catch (err) {
    console.error('update producto error:', err);
    res.status(500).json({ message: 'Error al actualizar el producto' });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    await pool.execute(`DELETE FROM productos WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('delete producto error:', err);
    res.status(500).json({ message: 'Error al eliminar el producto' });
  }
};
