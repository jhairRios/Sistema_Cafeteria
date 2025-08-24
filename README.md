# Sistema Web SPA (Restaurante)

Sistema web responsive tipo SPA para gestión de restaurante: header fijo, sidebar colapsable, navegación por vistas, y componentes listos para flujo de trabajo (productos, empleados, mesas, reservaciones, reportes y venta rápida). Backend Express básico para servir el frontend y exponer rutas de ejemplo.

## Estructura del proyecto

```
Sistema/
├─ backend/
│  ├─ controllers/
│  │  ├─ clientesController.js
│  │  ├─ ventasController.js
│  │  └─ reportesController.js
│  ├─ models/
│  │  ├─ cliente.js
│  │  ├─ venta.js
│  │  └─ reporte.js
│  ├─ routes/
│  │  ├─ clientes.js
│  │  ├─ ventas.js
│  │  └─ reportes.js
│  ├─ package.json
│  └─ server.js
└─ frontend/
   ├─ index.html         # Shell SPA: header, sidebar, main-content
   ├─ styles.css         # Estilos globales y por vista (con variables en :root)
   ├─ app.js             # Lógica SPA: layout, navegación, carga de vistas y scripts
   ├─ login.html/.css/.js
   └─ views/
      ├─ home.html
      ├─ productos.html
      ├─ empleados.html
      ├─ ventas-rapidas.html
      ├─ mesas.html
      ├─ reservaciones.html
      ├─ reportes.html
      └─ ajustes.html
```

## Cómo ejecutar (Windows PowerShell)

- Requisitos: Node.js 18+.
- Instalar dependencias del backend:
  - Abrir una terminal en `backend/` y ejecutar:
    - `npm install`
    - `npm start`
- Abrir el navegador en: http://localhost:3000

Notas:
- El backend sirve el frontend desde `frontend/` y expone rutas demo:
  - GET /api/clientes
  - GET /api/ventas
  - GET /api/reportes
- El enrutado del frontend es cliente (SPA): los botones del sidebar cargan `frontend/views/*.html` vía fetch.

## Frontend

- Header fijo con dropdown de usuario y botón hamburguesa en móviles.
- Sidebar colapsable en tablet/desktop y “drawer” en móviles con overlay.
- Main content dinámico (#main-content) que inyecta vistas HTML desde `views/`.
- Estilos con variables CSS en `:root` para colores y medidas.
- Breakpoints: 1024, 768, 600, 480, 360 y ajuste por altura.

Vistas incluidas y hooks en `app.js`:
- home -> initHomeView
- productos -> initProductosView
- empleados -> initEmpleadosView
- ventas-rapidas -> initVentaRapidaView
- mesas -> initMesasView
- reservaciones -> initReservacionesView
- ajustes -> initAjustesView
- reportes -> initReportesView

## Backend (Express)

- `server.js` sirve estáticos del frontend y define fallback SPA a `index.html`.
- Rutas de ejemplo en `routes/` con controladores de mock en `controllers/`.
- Listo para evolucionar a una API real (agregar persistencia en `models/`).

## Personalización rápida

- Colores y dimensiones en `frontend/styles.css` (bloque `:root`).
- Ancho del sidebar: `--sidebar-width`, `--sidebar-width-collapsed`.
- Altura del header: `--header-height`.

## Desarrollo y mantenimiento

- `app.js` y `styles.css` incluyen un encabezado documental con tabla de contenido y convenciones.
- Sugerencia futura: modularizar CSS y JS por vista/componente y empaquetar.
- Al agregar una vista:
  1) Crear `frontend/views/<vista>.html`
  2) Añadir botón `<button class="nav-btn" data-view="<vista>">...` en `index.html`
  3) Crear `init<Vista>View()` en `app.js` si requiere lógica propia

## Seguridad y producción

- Este repo es una base UI + servidor Express simple (sin auth real).
- Para producción: añadir autenticación, validación de entradas, manejo de errores, logs, y un proxy inverso.

## Licencia

MIT
# Sistema_Cafeteria
