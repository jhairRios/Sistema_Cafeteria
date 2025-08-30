-- Crear tabla de configuración del restaurante e insertar fila única si no existe

CREATE TABLE IF NOT EXISTS restaurante_config (
  id TINYINT PRIMARY KEY DEFAULT 1,
  nombre VARCHAR(150) NOT NULL DEFAULT 'Mi Restaurante',
  direccion VARCHAR(255) NULL,
  telefono VARCHAR(50) NULL,
  email VARCHAR(120) NULL,
  logo_url VARCHAR(255) NULL,
  iva_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 16.00,
  propina_automatica DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  incluir_iva TINYINT(1) NOT NULL DEFAULT 1,
  horarios JSON NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO restaurante_config (id)
VALUES (1)
ON DUPLICATE KEY UPDATE id = VALUES(id);

-- Asegurar columna logo_url en instalaciones existentes
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restaurante_config' AND COLUMN_NAME = 'logo_url';
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE restaurante_config ADD COLUMN logo_url VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
