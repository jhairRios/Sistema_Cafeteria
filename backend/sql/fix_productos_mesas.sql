-- Fix idempotente para asegurar tablas y columnas requeridas por /api/productos y /api/mesas
-- Ejecutar con: node backend\scripts\apply-sql.js backend\sql\fix_productos_mesas.sql

-- =============================
--  TABLA: productos
-- =============================
CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  categoria VARCHAR(100) NULL,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 0,
  descripcion TEXT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Asegurar columnas (idempotente)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock INT NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_minimo INT NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descripcion TEXT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP;

-- =============================
--  TABLA: mesas
-- =============================
CREATE TABLE IF NOT EXISTS mesas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL,
  numero INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  capacidad INT NOT NULL DEFAULT 4,
  ubicacion VARCHAR(50) NOT NULL DEFAULT 'interior',
  estado VARCHAR(20) NOT NULL DEFAULT 'disponible',
  detalle TEXT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mesas_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Asegurar columnas (idempotente)
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) NOT NULL;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS numero INT NOT NULL;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS nombre VARCHAR(100) NOT NULL;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS capacidad INT NOT NULL DEFAULT 4;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(50) NOT NULL DEFAULT 'interior';
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'disponible';
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS detalle TEXT NULL;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS activo TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS uq_mesas_codigo ON mesas(codigo);

-- Semillas opcionales (idempotentes)
INSERT IGNORE INTO productos (id, nombre, categoria, precio, stock, stock_minimo, descripcion)
VALUES
  (1, 'Café Americano', 'Bebidas', 20.00, 100, 10, 'Café negro'),
  (2, 'Sandwich', 'Comidas', 35.00, 50, 5, 'Sandwich clásico');

-- =============================
--  NORMALIZACIÓN DE DATOS EXISTENTES EN MESAS
-- =============================
-- Rellenar codigo y nombre faltantes basado en numero
UPDATE mesas
SET codigo = CONCAT('MESA-', LPAD(numero, 3, '0'))
WHERE (codigo IS NULL OR codigo = '') AND numero IS NOT NULL;

UPDATE mesas
SET nombre = CONCAT('Mesa ', numero)
WHERE (nombre IS NULL OR nombre = '') AND numero IS NOT NULL;

-- Intentar de nuevo crear índice único (por si falló antes por duplicados vacíos)
CREATE UNIQUE INDEX IF NOT EXISTS uq_mesas_codigo ON mesas(codigo);
