# Frontend (SPA) – Guía de módulos

Este frontend está modularizado con ES Modules. Cada vista tiene su propio archivo en `js/views`, y las utilidades compartidas residen en `js/core`.

## Estructura

- js/main.js
  - Punto de entrada del SPA. Configura:
    - Header (usuario, dropdown, logout)
    - Sidebar responsive (toggle, overlay, resize)
    - Navegación entre vistas (botones `.nav-btn`)
    - Cargador de vistas con import dinámico.

- js/core/dom.js
  - loadViewHtml(viewName): carga el HTML de `views/{viewName}.html` en `#main-content` con spinner y manejo de errores.
  - enhanceAllSelects(root): mejora `select.form-select` a dropdowns custom; ignora `data-no-enhance="true"`.
  - enhanceSelect(selectEl): mejora un select individual.
  - refreshEnhancedSelect(selectEl) y refreshAllEnhancedSelects(root): refrescan dropdowns custom si cambian las opciones del `<select>` nativo.

- js/core/api.js
  - api: cliente HTTP (get, post, put, del) con manejo de errores.
  - Roles: `all()`
  - Empleados: `list()`, `get(id)`, `create(data)`, `update(id, data)`, `remove(id)`

- js/views/home.js
  - initHome(): placeholder para lógica del dashboard.

- js/views/productos.js
  - initProductos(): manejo del modal para agregar/editar, placeholder para persistencia.

- js/views/empleados.js
  - initEmpleados(): CRUD completo con backend; roles dinámicos desde `/api/roles`.
  - Datalists dinámicos para Departamento/Turno/Estado basados en datos de empleados.
  - Filtros superiores dinámicos (Departamento/Turno/Estado) y búsqueda por texto.
  - Manejo de error 409 (correo duplicado) mostrando mensaje del backend.
  - Modal amplio: credenciales y rol habilitados solo al crear.

- js/views/ventas-rapidas.js
  - initVentasRapidas(): lógica de carrito, pagos (efectivo), impresión de factura y ticket de cocina, filtros por categoría y búsqueda de productos.

- js/views/mesas.js
  - initMesas(): estados de mesa (disponible/ocupada/reservada), modales de ocupar y reservar, persistencia con localStorage, navegación a Venta Rápida.

- js/views/reservaciones.js
  - initReservaciones(): navegación por días, filtros, creación de reservas (simulado) y acciones básicas.

- js/views/ajustes.js
  - initAjustes(): navegación de secciones, guardado simulado y vista previa de color primario.

- js/views/reportes.js
  - initReportes(): generación simulada de reportes con progreso, métricas y exportación placeholder.

## Cómo agregar una vista nueva
1. Crea `views/nueva-vista.html` con el markup.
2. Crea `js/views/nueva-vista.js` exportando `initNuevaVista()`.
3. En `js/main.js`, añade un case al switch de `loadView`:
   - `case 'nueva-vista': { const mod = await import('./views/nueva-vista.js'); mod.initNuevaVista(); break; }`
4. Añade un botón en el sidebar: `<button class="nav-btn" data-view="nueva-vista">…</button>`.

## Notas
- Autenticación: `auth.js` redirige a login si no hay sesión. Se ejecuta antes del SPA.
- Monolítico legado: `app.js` se conserva por referencia, pero está deshabilitado en `index.html`.
- Selects mejorados: si un select no debe convertirse a dropdown custom, añade `data-no-enhance="true"`.

## Troubleshooting
- Si un select con opciones dinámicas no refleja cambios visuales, llama a `refreshEnhancedSelect(selectEl)` después de cambiar sus `<option>`.
- Errores HTTP muestran mensaje del backend si existe (`{ message }`).
