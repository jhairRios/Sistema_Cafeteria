-- Esquema para Roles, Permisos y Catálogos (departamentos, turnos, cargos)

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS permisos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(150) NOT NULL UNIQUE, -- p.ej. view.productos, action.empleados.create
  nombre VARCHAR(150) NOT NULL,
  tipo ENUM('vista','accion') DEFAULT 'accion',
  descripcion VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS roles_permisos (
  role_id INT NOT NULL,
  permiso_id INT NOT NULL,
  PRIMARY KEY (role_id, permiso_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================
--  MIGRACIÓN ESTRUCTURAL (para esquemas previos)
-- ============================
-- Roles: garantizar columna nombre
ALTER TABLE roles ADD COLUMN IF NOT EXISTS descripcion VARCHAR(255) NULL;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS nombre VARCHAR(100) NULL AFTER id;
UPDATE roles SET nombre = COALESCE(nombre, descripcion) WHERE nombre IS NULL OR nombre = '';
-- Hacer NOT NULL y único (si falla por índice existente, continuar)
ALTER TABLE roles MODIFY COLUMN nombre VARCHAR(100) NOT NULL;
CREATE UNIQUE INDEX uq_roles_nombre ON roles(nombre);

-- Permisos: garantizar columnas requeridas
ALTER TABLE permisos ADD COLUMN IF NOT EXISTS clave VARCHAR(150) NULL;
ALTER TABLE permisos ADD COLUMN IF NOT EXISTS nombre VARCHAR(150) NULL;
ALTER TABLE permisos ADD COLUMN IF NOT EXISTS tipo ENUM('vista','accion') NULL;
ALTER TABLE permisos ADD COLUMN IF NOT EXISTS descripcion VARCHAR(255) NULL;
-- Defaults y restricciones
UPDATE permisos SET tipo = COALESCE(tipo, 'accion');
ALTER TABLE permisos MODIFY COLUMN clave VARCHAR(150) NOT NULL;
ALTER TABLE permisos MODIFY COLUMN nombre VARCHAR(150) NOT NULL;
ALTER TABLE permisos MODIFY COLUMN tipo ENUM('vista','accion') NOT NULL DEFAULT 'accion';
CREATE UNIQUE INDEX uq_permisos_clave ON permisos(clave);

-- roles_permisos: garantizar columnas y llaves
ALTER TABLE roles_permisos ADD COLUMN IF NOT EXISTS permiso_id INT NOT NULL AFTER role_id;
-- Asegurar PK compuesta
ALTER TABLE roles_permisos ADD PRIMARY KEY (role_id, permiso_id);
-- Re-crear FKs (si ya existen, los errores pueden ignorarse)
ALTER TABLE roles_permisos ADD CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
ALTER TABLE roles_permisos ADD CONSTRAINT fk_rp_perm FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS departamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  activo TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS turnos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  activo TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cargos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  activo TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Semillas
INSERT INTO roles (id, nombre, descripcion) VALUES
  (1, 'Administrador', 'Acceso total'),
  (2, 'Cajero', 'Ventas y cajas'),
  (3, 'Mesero', 'Atención al cliente')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion);

INSERT INTO permisos (clave, nombre, tipo, descripcion) VALUES
  ('view.home', 'Ver Inicio', 'vista', 'Acceso a Inicio'),
  ('view.productos', 'Ver Productos', 'vista', 'Acceso a productos'),
  ('view.empleados', 'Ver Empleados', 'vista', 'Acceso a empleados'),
  ('view.ventas-rapidas', 'Ver Ventas Rápidas', 'vista', 'Acceso a venta rápida'),
  ('view.mesas', 'Ver Mesas', 'vista', 'Acceso a mesas'),
  ('view.ajustes', 'Ver Ajustes', 'vista', 'Acceso a ajustes'),
  ('view.reportes', 'Ver Reportes', 'vista', 'Acceso a reportes'),
  ('action.roles.create', 'Crear Rol', 'accion', 'Puede crear roles'),
  ('action.roles.update', 'Editar Rol', 'accion', 'Puede editar roles'),
  ('action.roles.delete', 'Eliminar Rol', 'accion', 'Puede eliminar roles'),
  ('action.departamentos.crud', 'CRUD Departamentos', 'accion', 'Gestiona departamentos'),
  ('action.turnos.crud', 'CRUD Turnos', 'accion', 'Gestiona turnos'),
  ('action.cargos.crud', 'CRUD Cargos', 'accion', 'Gestiona cargos'),
  ('action.empleados.crud', 'CRUD Empleados', 'accion', 'Gestiona empleados'),
  ('action.productos.crud', 'CRUD Productos', 'accion', 'Gestiona productos')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), tipo = VALUES(tipo), descripcion = VALUES(descripcion);

-- Asignar todos al Admin
INSERT IGNORE INTO roles_permisos (role_id, permiso_id)
SELECT 1 AS role_id, p.id AS permiso_id FROM permisos p;

-- Permisos comunes para Cajero
INSERT IGNORE INTO roles_permisos (role_id, permiso_id)
SELECT 2, p.id FROM permisos p WHERE p.clave IN ('view.home','view.productos','view.ventas-rapidas','view.mesas','view.reportes');

-- Permisos comunes para Mesero
INSERT IGNORE INTO roles_permisos (role_id, permiso_id)
SELECT 3, p.id FROM permisos p WHERE p.clave IN ('view.home','view.mesas','view.ventas-rapidas');

-- Catálogos semilla
INSERT IGNORE INTO departamentos (nombre, descripcion) VALUES
('Cocina','Área de cocina'), ('Caja','Área de caja'), ('Servicio','Atención a mesas');

INSERT IGNORE INTO turnos (nombre, descripcion) VALUES
('Mañana','08:00-16:00'), ('Tarde','16:00-00:00');

INSERT IGNORE INTO cargos (nombre, descripcion) VALUES
('Cocinero','Prepara alimentos'), ('Cajero','Gestiona cobros'), ('Mesero','Atiende mesas');

-- ============================
--  NUEVO ROL: SUPERVISOR (id 4) Y SUS PERMISOS
-- ============================
INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES (4, 'Supervisor', 'Supervisa operaciones');

-- Permisos del Supervisor: todas las vistas y algunas acciones clave
INSERT IGNORE INTO roles_permisos (role_id, permiso_id)
SELECT 4, p.id FROM permisos p WHERE p.clave IN (
  'view.home','view.productos','view.empleados','view.ventas-rapidas','view.mesas','view.ajustes','view.reportes',
  'action.productos.crud','action.empleados.crud','action.departamentos.crud','action.turnos.crud','action.cargos.crud'
);

-- ============================
--  TABLA EMPLEADOS Y USUARIOS DE PRUEBA
-- ============================
CREATE TABLE IF NOT EXISTS empleados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  contrasena VARCHAR(100) NOT NULL,
  rol_id INT NOT NULL,
  telefono VARCHAR(50),
  departamento VARCHAR(120),
  posicion VARCHAR(120),
  turno VARCHAR(120),
  salario DECIMAL(10,2) DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'activo',
  direccion VARCHAR(255),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_empleados_correo (correo),
  KEY idx_empleados_usuario (usuario),
  CONSTRAINT fk_empleado_rol FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cuatro usuarios: jhair (Admin), sherill (Cajero), jorge (Mesero), diany (Supervisor)
-- Nota: contraseñas en texto plano para demo (1234). En producción, usar hash.
INSERT IGNORE INTO empleados
  (nombre, usuario, correo, contrasena, rol_id, telefono, departamento, posicion, turno, salario, estado, direccion)
VALUES
  ('Jhair',  'jhair',  'jhair@cafeteria.com',  '1234', 1, '555-0001', 'Dirección', 'Administrador', 'Mañana', 0, 'activo', '-'),
  ('Sherill','sherill','sherill@cafeteria.com','1234', 2, '555-0002', 'Caja',      'Cajero',       'Tarde',  0, 'activo', '-'),
  ('Jorge',  'jorge',  'jorge@cafeteria.com',  '1234', 3, '555-0003', 'Servicio',  'Mesero',       'Mañana', 0, 'activo', '-'),
  ('Diany',  'diany',  'diany@cafeteria.com',  '1234', 4, '555-0004', 'Operación', 'Supervisor',   'Tarde',  0, 'activo', '-');
