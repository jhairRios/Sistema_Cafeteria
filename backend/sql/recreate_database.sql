-- Recrear base de datos con todas las tablas clave y restaurante_config
-- ADVERTENCIA: Esto eliminará y volverá a crear la base de datos indicada.

SET @DB := IFNULL(@DB, DATABASE());
-- Si no se pasa explícitamente con `SET @DB='sistema_cafeteria';`, usa la actual

SET FOREIGN_KEY_CHECKS=0;
SET @drop := CONCAT('DROP DATABASE IF EXISTS `', @DB, '`');
PREPARE stmt FROM @drop; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @create := CONCAT('CREATE DATABASE `', @DB, '` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
PREPARE stmt FROM @create; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @use := CONCAT('USE `', @DB, '`');
PREPARE stmt FROM @use; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET FOREIGN_KEY_CHECKS=1;

-- Esquema y semillas
SOURCE schema_roles_permisos.sql;
SOURCE fix_productos_mesas.sql;
SOURCE fix_reportes.sql;
SOURCE fix_restaurante.sql;

-- Asegurar fila única en restaurante_config (id=1)
INSERT INTO restaurante_config (id) VALUES (1)
ON DUPLICATE KEY UPDATE id=VALUES(id);
