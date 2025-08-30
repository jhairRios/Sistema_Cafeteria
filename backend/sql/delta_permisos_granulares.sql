-- Delta: permisos granulares y asignaciones por rol
-- Ejecutar en la BD sistema_cafeteria ya existente

-- Crear permisos granulares (idempotente)
INSERT INTO permisos (clave, nombre, tipo, descripcion) VALUES
('action.empleados.add','Agregar Empleado','accion','Puede crear empleados'),
('action.empleados.edit','Editar Empleado','accion','Puede editar empleados'),
('action.empleados.delete','Eliminar Empleado','accion','Puede eliminar empleados'),
('action.productos.add','Agregar Producto','accion','Puede crear productos'),
('action.productos.edit','Editar Producto','accion','Puede editar productos'),
('action.productos.delete','Eliminar Producto','accion','Puede eliminar productos'),
('action.mesas.ocupar','Ocupar mesa','accion','Puede ocupar mesas'),
('action.mesas.cerrar','Cerrar mesa','accion','Puede cerrar mesas'),
('action.mesas.delete','Eliminar mesa','accion','Puede eliminar mesas'),
('action.reportes.generar','Generar reportes','accion','Puede generar reportes'),
('action.reportes.export.pdf','Exportar PDF','accion','Puede exportar reportes a PDF'),
('action.reportes.export.excel','Exportar Excel','accion','Puede exportar reportes a Excel'),
('action.reportes.filtros','Usar filtros avanzados','accion','Puede usar filtros avanzados en reportes'),
('action.ventas.agregar','Agregar al carrito','accion','Puede agregar productos al carrito'),
('action.ventas.limpiar','Limpiar carrito','accion','Puede limpiar el carrito'),
('action.ventas.cancelar','Cancelar venta','accion','Puede cancelar ventas'),
('action.ventas.procesar','Procesar venta','accion','Puede procesar ventas')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), tipo=VALUES(tipo), descripcion=VALUES(descripcion);

-- Asignaciones por rol (idempotentes)
-- Cajero (2): ventas y mesas
INSERT IGNORE INTO roles_permisos (role_id, permiso_id)
SELECT 2, p.id FROM permisos p WHERE p.clave IN (
  'action.ventas.agregar','action.ventas.limpiar','action.ventas.cancelar','action.ventas.procesar',
  'action.mesas.ocupar','action.mesas.cerrar'
);

-- Mesero (3): mesas y agregar/limpiar carrito
INSERT IGNORE INTO roles_permisos (role_id, permiso_id)
SELECT 3, p.id FROM permisos p WHERE p.clave IN (
  'action.mesas.ocupar','action.mesas.cerrar','action.ventas.agregar','action.ventas.limpiar'
);

-- Supervisor (4): reportes completos, ventas y mesas
INSERT IGNORE INTO roles_permisos (role_id, permiso_id)
SELECT 4, p.id FROM permisos p WHERE p.clave IN (
  'action.reportes.generar','action.reportes.export.pdf','action.reportes.export.excel','action.reportes.filtros',
  'action.ventas.agregar','action.ventas.limpiar','action.ventas.cancelar','action.ventas.procesar',
  'action.mesas.ocupar','action.mesas.cerrar','action.mesas.delete'
);

-- Admin (1): incluir eliminar mesa explícitamente
INSERT IGNORE INTO roles_permisos (role_id, permiso_id)
SELECT 1, p.id FROM permisos p WHERE p.clave IN (
  'action.mesas.delete'
);
