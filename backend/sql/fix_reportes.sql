-- Crea tabla de log de ventas para alimentar reportes sin un modelo complejo
-- Ejecutar con: node backend\scripts\apply-sql.js backend\sql\fix_reportes.sql

CREATE TABLE IF NOT EXISTS ventas_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  empleado_id INT NULL,
  empleado_nombre VARCHAR(150) NULL,
  mesa_id INT NULL,
  mesa_codigo VARCHAR(50) NULL,
  cliente_nombre VARCHAR(150) NULL,
  metodo_pago VARCHAR(30) NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  items_json JSON NOT NULL,
  INDEX idx_fecha (fecha),
  INDEX idx_empleado (empleado_id),
  INDEX idx_mesa (mesa_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
