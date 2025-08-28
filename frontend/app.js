/*
============================================================
    Archivo: frontend/app.js
    Propósito: Lógica principal del SPA (layout, navegación y vistas)

    Tabla de contenido (solo documentación, sin cambios funcionales):
    [0] Metadatos y convenciones
    [1] Bootstrapping y UI global (header, dropdown de usuario, sidebar, overlay)
    [2] Configuración de navegación (listeners y estado activo)
    [3] Sistema de vistas (loadView, executeViewScripts)
    [4] Vistas: Home, Productos, Empleados, Venta Rápida, Mesas, Ajustes, Reportes
    [5] Manejo de errores globales (window.error, unhandledrejection)
    [6] Exposición de funciones globales (browser) y export (CommonJS)

    Convenciones:
    - Prefijo initNombreVista: función inicializadora por vista.
    - Los selectores dependen del markup de cada archivo en frontend/views/*.html.
    - Mantener listeners encapsulados dentro de cada init* para evitar fugas.

    Nota de mantenimiento:
    - Este archivo contiene secciones duplicadas heredadas de iteraciones previas (p.ej. banners repetidos de HOME/ERRORES/EXPORTS).
        En esta pasada solo se añade organización documental (comentarios y TOC) sin modificar la lógica existente.
============================================================
*/

// ============================
// FUNCIONALIDADES GLOBALES
// ============================

// Gestión de usuario
document.addEventListener('DOMContentLoaded', function() {
    // Header: nombre de usuario
    try {
        document.getElementById('user-name').textContent = (sessionStorage.getItem('nombreUsuario') || 'Usuario');
    } catch (_) {}
    
    // Dropdown usuario
    const userDropdownBtn = document.getElementById('userDropdownBtn');
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdownBtn && userDropdown) {
        userDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('open');
        });
        document.addEventListener('click', function(e) {
            if (!userDropdown.contains(e.target)) {
                userDropdown.classList.remove('open');
            }
        });
    }

    const verPerfilBtn = document.getElementById('verPerfilBtn');
    const cerrarSesionBtn = document.getElementById('cerrarSesionBtn');
    if (verPerfilBtn) verPerfilBtn.onclick = () => alert('Ver perfil');
    if (cerrarSesionBtn) cerrarSesionBtn.onclick = () => {
        try {
            sessionStorage.removeItem('logueado');
            sessionStorage.removeItem('nombreUsuario');
            localStorage.setItem('forceLogout', Date.now().toString());
            setTimeout(() => localStorage.removeItem('forceLogout'), 0);
        } catch (_) {}
        window.location.href = 'login.html';
    };
});

// ============================
// Sistema de vistas SPA
// ============================
async function loadView(viewName) {
    const main = document.getElementById('main-content');
    if (!main) return;
    try {
        const res = await fetch(`views/${viewName}.html`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const html = await res.text();
        main.innerHTML = html;
        executeViewScripts(viewName);
        enhanceAllSelects(main);
    } catch (error) {
        console.error('Error:', error);
        main.innerHTML = `
            <div class="content-box">
                <h1>Error</h1>
                <p>No se pudo cargar la vista: ${viewName}</p>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadView('home')">Volver al Inicio</button>
            </div>
        `;
    }
}

function executeViewScripts(viewName) {
    switch(viewName) {
        case 'home':
            initHomeView();
            break;
        case 'productos':
            initProductosView();
            break;
        case 'empleados':
            initEmpleadosView();
            break;
        case 'ventas-rapidas':
            initVentaRapidaView();
            break;
        case 'mesas':
            initMesasView();
            break;
        case 'ajustes':
            initAjustesView();
            break;
        case 'reportes':
            initReportesView?.();
            break;
        default:
            console.log(`Vista ${viewName} cargada, sin scripts específicos`);
    }
}

// ============================
// UI: ENHANCED SELECTS (COMBOBOX)
// ============================

function enhanceAllSelects(root = document) {
    // Evitar doble enlace del manejador global para cerrar dropdowns
    if (!window.__selectEnhancerBound) {
        window.addEventListener('click', () => {
            document.querySelectorAll('.select-dropdown.open').forEach(d => {
                d.classList.remove('open');
                const t = d.parentElement?.querySelector?.('.select-trigger');
                if (t) t.setAttribute('aria-expanded', 'false');
            });
        });
        window.__selectEnhancerBound = true;
    }

    const selects = Array.from(root.querySelectorAll('select.form-select'));
    selects.forEach(enhanceSelect);
}

function enhanceSelect(selectEl) {
    if (!selectEl || selectEl.dataset.enhanced === 'true') return;

    // Crear wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'select-enhanced';

    // Insertar wrapper y mover select dentro
    const parent = selectEl.parentNode;
    if (!parent) return;
    parent.insertBefore(wrapper, selectEl);
    wrapper.appendChild(selectEl);

    // Trigger visible
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.textContent = selectEl.options[selectEl.selectedIndex]?.text || 'Seleccionar';
    wrapper.appendChild(trigger);

    // Dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'select-dropdown';
    dropdown.setAttribute('role', 'listbox');
    wrapper.appendChild(dropdown);

    // Construir opciones desde el select nativo
    Array.from(selectEl.options).forEach(opt => {
        const optEl = document.createElement('div');
        optEl.className = 'select-option';
        optEl.textContent = opt.text;
        optEl.setAttribute('data-value', opt.value);
        if (opt.disabled) optEl.setAttribute('aria-disabled', 'true');
        if (opt.selected) optEl.setAttribute('aria-selected', 'true');
        dropdown.appendChild(optEl);

        optEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (opt.disabled) return;
            // Actualizar nativo
            selectEl.value = opt.value;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            // Estado visual
            dropdown.querySelectorAll('.select-option[aria-selected="true"]').forEach(el => el.removeAttribute('aria-selected'));
            optEl.setAttribute('aria-selected', 'true');
            trigger.textContent = opt.text;
            dropdown.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        });
    });

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        // Cerrar otros abiertos
        document.querySelectorAll('.select-dropdown.open').forEach(d => {
            d.classList.remove('open');
            const t = d.parentElement?.querySelector?.('.select-trigger');
            if (t) t.setAttribute('aria-expanded', 'false');
        });
        dropdown.classList.toggle('open', !isOpen);
        trigger.setAttribute('aria-expanded', String(!isOpen));
    });

    // Sincronizar si cambia el select nativo externamente
    selectEl.addEventListener('change', () => {
        const current = selectEl.options[selectEl.selectedIndex];
        if (current) {
            trigger.textContent = current.text;
            dropdown.querySelectorAll('.select-option[aria-selected="true"]').forEach(el => el.removeAttribute('aria-selected'));
            const match = dropdown.querySelector(`.select-option[data-value="${cssEscape(current.value)}"]`);
            if (match) match.setAttribute('aria-selected', 'true');
        }
    });

    selectEl.dataset.enhanced = 'true';
}

// Utilidad segura para selector CSS
function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
        return window.CSS.escape(value);
    }
    return String(value).replace(/([#.;,:*+?^$\[\]{}()|\\/\s])/g, '\\$1');
}

// ============================
// VISTA: HOME (DASHBOARD)
// ============================

function initHomeView() {
    console.log('Inicializando vista Home');
    const grid = document.getElementById('home-grid-mesas');
    const elDisp = document.getElementById('home-mesas-disponibles');
    const elOc = document.getElementById('home-mesas-ocupadas');
    // elRes eliminado

    async function cargarMesas() {
        try {
            const resp = await fetch('/api/mesas');
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            let mesas = await resp.json();
            // Normalización de estado ya no necesaria; solo 'disponible' u 'ocupada'
            // Respetar overrides locales (localStorage) para sincronizar con Mesas
            try {
                const overrides = JSON.parse(localStorage.getItem('mesasState') || '{}');
                mesas = mesas.map(m => {
                    const ov = overrides[m.id];
                    if (ov && ov.estado) {
                        const est = ov.estado;
                        return { ...m, estado: est };
                    }
                    return m;
                });
            } catch (_) {}
            if (grid) {
                grid.innerHTML = mesas.map(m => {
                    const estadoClase = m.estado === 'ocupada' ? 'mesa-ocupada' : 'mesa-disponible';
                    const estadoBadge = m.estado === 'ocupada' ? '<div class="mesa-estado estado-ocupado">Ocupada</div>' : '<div class="mesa-estado estado-disponible">Disponible</div>';
                    return `
                        <div class="mesa-card ${estadoClase}" data-id="${m.id}" data-estado="${m.estado}" data-capacidad="${m.capacidad}">
                            <div class="mesa-numero">Mesa ${m.numero}</div>
                            ${estadoBadge}
                        </div>
                    `;
                }).join('');
            }
            const disponibles = mesas.filter(m => m.estado === 'disponible').length;
            const ocupadas = mesas.filter(m => m.estado === 'ocupada').length;
            // 'reservadas' eliminado
            if (elDisp) elDisp.textContent = String(disponibles);
            if (elOc) elOc.textContent = String(ocupadas);
            // elRes eliminado
        } catch (e) {
            console.error('No se pudieron cargar mesas:', e);
            if (elDisp) elDisp.textContent = '—';
            if (elOc) elOc.textContent = '—';
            // elRes eliminado
            if (grid) grid.innerHTML = '<div class="alert alert-warning">No se pudieron cargar las mesas</div>';
        }
    }

    try {
        window.addEventListener('mesasStateChanged', () => cargarMesas());
    } catch (_) {}
    cargarMesas();
}

// ============================
// VISTA: PRODUCTOS
// ============================

function initProductosView() {
    console.log('Inicializando vista Productos');
    
    // Botón agregar producto
    const addProductBtn = document.getElementById('btn-agregar-producto');
    const modal = document.getElementById('modal-producto');
    const closeModal = document.querySelector('.close-modal');
    const cancelBtn = document.getElementById('btn-cancelar');
    const productForm = document.getElementById('form-producto');
    
    // Abrir modal para agregar producto
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            document.getElementById('modal-titulo').textContent = 'Agregar Producto';
            document.getElementById('producto-id').value = '';
            if (productForm) productForm.reset();
            if (modal) modal.style.display = 'block';
        });
    }
    
    // Cerrar modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    }
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Enviar formulario
    if (productForm) {
        productForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Aquí iría la lógica para guardar el producto
            alert('Producto guardado correctamente');
            if (modal) modal.style.display = 'none';
        });
    }
    
    // Botones de editar
    const editButtons = document.querySelectorAll('.btn-editar');
    editButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.getAttribute('data-id');
            document.getElementById('modal-titulo').textContent = 'Editar Producto';
            document.getElementById('producto-id').value = productId;
            
            // Aquí iría la lógica para cargar los datos del producto
            // Simulamos datos de ejemplo
            document.getElementById('producto-nombre').value = 'Café Americano';
            document.getElementById('producto-categoria').value = 'bebidas-calientes';
            document.getElementById('producto-precio').value = '2.50';
            document.getElementById('producto-stock').value = '45';
            document.getElementById('producto-descripcion').value = 'Café americano tradicional';
            
            if (modal) modal.style.display = 'block';
        });
    });
    
    // Botones de eliminar
    const deleteButtons = document.querySelectorAll('.btn-eliminar');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.getAttribute('data-id');
            if (confirm(`¿Estás seguro de que quieres eliminar el producto ${productId}?`)) {
                // Aquí iría la lógica para eliminar el producto
                alert(`Producto ${productId} eliminado correctamente`);
            }
        });
    });
    
    // Búsqueda y filtros
    const searchInput = document.getElementById('buscar-producto');
    const categoryFilter = document.getElementById('filtro-categoria');
    const statusFilter = document.getElementById('filtro-estado');
    
    if (searchInput) {
        searchInput.addEventListener('input', aplicarFiltros);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', aplicarFiltros);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', aplicarFiltros);
    }
    
    function aplicarFiltros() {
        // Aquí iría la lógica para filtrar la tabla
        console.log('Aplicando filtros...');
    }
}

// ============================
// VISTA: EMPLEADOS
// ============================

function initEmpleadosView() {
  console.log('Inicializando vista Empleados');

  const tbody = document.querySelector('#tabla-empleados tbody');
  const modal = document.getElementById('modal-empleado');
    // Estado local
    let empleadosCache = [];
    let rolesCache = [];

    // Helpers para UI (listas dinámicas)
    function setOptions(select, items, { valueKey = 'id', labelKey = 'nombre', placeholder = 'Seleccionar' } = {}) {
        if (!select) return;
        select.innerHTML = '';
        const ph = document.createElement('option');
        ph.value = '';
        ph.textContent = placeholder;
        select.appendChild(ph);
        items.forEach(it => {
            const opt = document.createElement('option');
            opt.value = it[valueKey];
            opt.textContent = it[labelKey];
            select.appendChild(opt);
        });
    }

    function setDatalist(listEl, values) {
        if (!listEl) return;
        listEl.innerHTML = '';
        Array.from(new Set(values.filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'})).forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            listEl.appendChild(opt);
        });
    }

    async function loadRoles() {
        if (rolesCache.length) return rolesCache;
        try {
            const res = await fetch('/api/roles');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const text = await res.text();
            const data = JSON.parse(text);
            rolesCache = Array.isArray(data) ? data : [];
            setOptions(document.getElementById('empleado-rol'), rolesCache, { placeholder: 'Selecciona un rol' });
        } catch (e) {
            console.error('Error cargando roles', e);
            // Fallback mínimo para no bloquear creación
            rolesCache = [ { id: 1, nombre: 'Administrador' }, { id: 2, nombre: 'Cajero' }, { id: 3, nombre: 'Mesero' } ];
            setOptions(document.getElementById('empleado-rol'), rolesCache, { placeholder: 'Selecciona un rol' });
        }
        return rolesCache;
    }
  const closeModal = document.querySelector('#modal-empleado .close-modal');
  const cancelBtn = document.getElementById('btn-cancelar-empleado');
  const empleadoForm = document.getElementById('form-empleado');
  const addEmpleadoBtn = document.getElementById('btn-agregar-empleado');

  // Render helpers
  function rowHtml(e) {
    const estadoBadge = e.estado === 'activo' ? 'badge-success' : (e.estado === 'inactivo' ? 'badge-danger' : 'badge-warning');
    return `
      <tr data-id="${e.id}">
        <td>${e.id}</td>
        <td>${e.nombre || ''}</td>
        <td>${e.posicion || ''}</td>
        <td>${e.departamento || ''}</td>
        <td>${e.telefono || ''}</td>
        <td>${e.turno || ''}</td>
        <td><span class="badge ${estadoBadge}">${e.estado || ''}</span></td>
        <td class="acciones">
          <button class="btn btn-sm btn-warning btn-editar" data-id="${e.id}"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger btn-eliminar" data-id="${e.id}"><i class="fas fa-trash"></i></button>
          <button class="btn btn-sm btn-info btn-ver" data-id="${e.id}"><i class="fas fa-eye"></i></button>
        </td>
      </tr>`;
  }

  function bindRowActions(tr) {
    const id = tr.getAttribute('data-id');
    tr.querySelector('.btn-editar')?.addEventListener('click', async () => {
      const res = await fetch(`/api/empleados/${id}`);
      if (!res.ok) return alert('No se pudo cargar el empleado');
      const empText = await res.text();
      let emp;
      try { emp = JSON.parse(empText); } catch { return alert('Respuesta no válida del servidor'); }
      document.getElementById('modal-titulo-empleado').textContent = 'Editar Empleado';
      document.getElementById('empleado-id').value = emp.id;
      document.getElementById('empleado-nombre').value = emp.nombre || '';
      document.getElementById('empleado-email').value = emp.correo || '';
      document.getElementById('empleado-telefono').value = emp.telefono || '';
      document.getElementById('empleado-departamento').value = emp.departamento || '';
      document.getElementById('empleado-posicion').value = emp.posicion || '';
      document.getElementById('empleado-turno').value = emp.turno || '';
      document.getElementById('empleado-salario').value = emp.salario || 0;
      document.getElementById('empleado-estado').value = emp.estado || 'activo';
      document.getElementById('empleado-direccion').value = emp.direccion || '';
      // Deshabilitar credenciales al editar (no se editan aquí)
      document.getElementById('empleado-usuario').disabled = true;
      document.getElementById('empleado-contrasena').disabled = true;
      document.getElementById('empleado-rol').disabled = true;
      if (modal) modal.style.display = 'block';
    });

    tr.querySelector('.btn-eliminar')?.addEventListener('click', async () => {
      if (!confirm('¿Eliminar empleado?')) return;
      const res = await fetch(`/api/empleados/${id}`, { method: 'DELETE' });
      if (res.ok) {
        tr.remove();
      } else {
        alert('No se pudo eliminar');
      }
    });
  }

  async function loadEmpleados() {
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';
    try {
      const res = await fetch('/api/empleados');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Respuesta no JSON recibida al cargar empleados:', text);
        throw new Error('Respuesta no válida del servidor');
      }
    if (!Array.isArray(data)) throw new Error('Formato inesperado');
    empleadosCache = data;
    tbody.innerHTML = empleadosCache.map(rowHtml).join('') || '<tr><td colspan="8">Sin registros</td></tr>';
      tbody.querySelectorAll('tr').forEach(bindRowActions);

    // Poblar datalists a partir de los empleados cargados
    setDatalist(document.getElementById('lista-departamentos'), empleadosCache.map(e => e.departamento || ''));
    setDatalist(document.getElementById('lista-turnos'), empleadosCache.map(e => e.turno || ''));
    // Estados comunes; si hay en DB, usarlos, si no, defaults
    const estadosDb = Array.from(new Set(empleadosCache.map(e => e.estado).filter(Boolean)));
    const defaultsEstado = ['activo','inactivo','vacaciones','licencia'];
    setDatalist(document.getElementById('lista-estados'), estadosDb.length ? estadosDb : defaultsEstado);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8">${e.message || 'Error al cargar'}</td></tr>`;
      console.error(e);
    }
  }

  // Crear/Actualizar
  if (empleadoForm) {
    empleadoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('empleado-id').value;
      const payload = {
        nombre: document.getElementById('empleado-nombre').value.trim(),
        correo: document.getElementById('empleado-email').value.trim().toLowerCase(),
        telefono: document.getElementById('empleado-telefono').value.trim(),
        departamento: document.getElementById('empleado-departamento').value,
        posicion: document.getElementById('empleado-posicion').value.trim(),
        turno: document.getElementById('empleado-turno').value,
        salario: parseFloat(document.getElementById('empleado-salario').value) || 0,
        estado: document.getElementById('empleado-estado').value,
        direccion: document.getElementById('empleado-direccion').value.trim()
      };
      if (!id) {
        payload.usuario = document.getElementById('empleado-usuario').value.trim();
        payload.contrasena = document.getElementById('empleado-contrasena').value.trim();
        payload.rol_id = Number(document.getElementById('empleado-rol').value) || 1;
      }
      const res = await fetch(id ? `/api/empleados/${id}` : '/api/empleados', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadEmpleados();
        if (modal) modal.style.display = 'none';
      } else {
        let msg = 'No se pudo guardar';
        try { const t = await res.text(); msg = (JSON.parse(t).message || t || msg); } catch {}
        if (res.status === 409) {
          alert(msg || 'El correo ya está registrado');
        } else {
          alert(msg);
        }
      }
    });
  }

  // Abrir modal crear
  if (addEmpleadoBtn) {
    addEmpleadoBtn.addEventListener('click', () => {
      document.getElementById('modal-titulo-empleado').textContent = 'Agregar Empleado';
      document.getElementById('empleado-id').value = '';
      empleadoForm?.reset();
      // Habilitar campos de credenciales al crear
      document.getElementById('empleado-usuario').disabled = false;
      document.getElementById('empleado-contrasena').disabled = false;
    document.getElementById('empleado-rol').disabled = false;
    // Asegurar roles cargados
    loadRoles();
      if (modal) modal.style.display = 'block';
    });
  }

  function bindRowActions(tr) {
    const id = tr.getAttribute('data-id');
    tr.querySelector('.btn-editar')?.addEventListener('click', async () => {
      const res = await fetch(`/api/empleados/${id}`);
      if (!res.ok) return alert('No se pudo cargar el empleado');
      const empText = await res.text();
      let emp;
      try { emp = JSON.parse(empText); } catch { return alert('Respuesta no válida del servidor'); }
      document.getElementById('modal-titulo-empleado').textContent = 'Editar Empleado';
      document.getElementById('empleado-id').value = emp.id;
      document.getElementById('empleado-nombre').value = emp.nombre || '';
      document.getElementById('empleado-email').value = emp.correo || '';
      document.getElementById('empleado-telefono').value = emp.telefono || '';
      document.getElementById('empleado-departamento').value = emp.departamento || '';
      document.getElementById('empleado-posicion').value = emp.posicion || '';
      document.getElementById('empleado-turno').value = emp.turno || '';
      document.getElementById('empleado-salario').value = emp.salario || 0;
      document.getElementById('empleado-estado').value = emp.estado || 'activo';
      document.getElementById('empleado-direccion').value = emp.direccion || '';
      // Deshabilitar credenciales al editar (no se editan aquí)
      document.getElementById('empleado-usuario').disabled = true;
      document.getElementById('empleado-contrasena').disabled = true;
      document.getElementById('empleado-rol').disabled = true;
      if (modal) modal.style.display = 'block';
    });
    
    tr.querySelector('.btn-eliminar')?.addEventListener('click', async () => {
      if (!confirm('¿Eliminar empleado?')) return;
      const res = await fetch(`/api/empleados/${id}`, { method: 'DELETE' });
      if (res.ok) {
        tr.remove();
      } else {
        alert('No se pudo eliminar');
      }
    });
  }

  async function loadEmpleados() {
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';
    try {
      const res = await fetch('/api/empleados');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Respuesta no JSON recibida al cargar empleados:', text);
        throw new Error('Respuesta no válida del servidor');
      }
      if (!Array.isArray(data)) throw new Error('Formato inesperado');
      tbody.innerHTML = data.map(rowHtml).join('') || '<tr><td colspan="8">Sin registros</td></tr>';
      tbody.querySelectorAll('tr').forEach(bindRowActions);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8">${e.message || 'Error al cargar'}</td></tr>`;
      console.error(e);
    }
  }

  // Crear/Actualizar
  if (empleadoForm) {
    empleadoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('empleado-id').value;
      const payload = {
        nombre: document.getElementById('empleado-nombre').value.trim(),
        correo: document.getElementById('empleado-email').value.trim().toLowerCase(),
        telefono: document.getElementById('empleado-telefono').value.trim(),
        departamento: document.getElementById('empleado-departamento').value,
        posicion: document.getElementById('empleado-posicion').value.trim(),
        turno: document.getElementById('empleado-turno').value,
        salario: parseFloat(document.getElementById('empleado-salario').value) || 0,
        estado: document.getElementById('empleado-estado').value,
        direccion: document.getElementById('empleado-direccion').value.trim()
      };
      if (!id) {
        payload.usuario = document.getElementById('empleado-usuario').value.trim();
        payload.contrasena = document.getElementById('empleado-contrasena').value.trim();
        payload.rol_id = Number(document.getElementById('empleado-rol').value) || 1;
      }
      const res = await fetch(id ? `/api/empleados/${id}` : '/api/empleados', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadEmpleados();
        if (modal) modal.style.display = 'none';
      } else {
        let msg = 'No se pudo guardar';
        try { const t = await res.text(); msg = (JSON.parse(t).message || t || msg); } catch {}
        if (res.status === 409) {
          alert(msg || 'El correo ya está registrado');
        } else {
          alert(msg);
        }
      }
    });
  }

  // Abrir modal crear
  if (addEmpleadoBtn) {
    addEmpleadoBtn.addEventListener('click', () => {
      document.getElementById('modal-titulo-empleado').textContent = 'Agregar Empleado';
      document.getElementById('empleado-id').value = '';
      empleadoForm?.reset();
      // Habilitar campos de credenciales al crear
      document.getElementById('empleado-usuario').disabled = false;
      document.getElementById('empleado-contrasena').disabled = false;
      document.getElementById('empleado-rol').disabled = false;
      if (modal) modal.style.display = 'block';
    });
  }

  function bindRowActions(tr) {
    const id = tr.getAttribute('data-id');
    tr.querySelector('.btn-editar')?.addEventListener('click', async () => {
      const res = await fetch(`/api/empleados/${id}`);
      if (!res.ok) return alert('No se pudo cargar el empleado');
      const empText = await res.text();
      let emp;
      try { emp = JSON.parse(empText); } catch { return alert('Respuesta no válida del servidor'); }
      document.getElementById('modal-titulo-empleado').textContent = 'Editar Empleado';
      document.getElementById('empleado-id').value = emp.id;
      document.getElementById('empleado-nombre').value = emp.nombre || '';
      document.getElementById('empleado-email').value = emp.correo || '';
      document.getElementById('empleado-telefono').value = emp.telefono || '';
      document.getElementById('empleado-departamento').value = emp.departamento || '';
      document.getElementById('empleado-posicion').value = emp.posicion || '';
      document.getElementById('empleado-turno').value = emp.turno || '';
      document.getElementById('empleado-salario').value = emp.salario || 0;
      document.getElementById('empleado-estado').value = emp.estado || 'activo';
      document.getElementById('empleado-direccion').value = emp.direccion || '';
      // Deshabilitar credenciales al editar (no se editan aquí)
      document.getElementById('empleado-usuario').disabled = true;
      document.getElementById('empleado-contrasena').disabled = true;
      document.getElementById('empleado-rol').disabled = true;
      if (modal) modal.style.display = 'block';
    });
    
    tr.querySelector('.btn-eliminar')?.addEventListener('click', async () => {
      if (!confirm('¿Eliminar empleado?')) return;
      const res = await fetch(`/api/empleados/${id}`, { method: 'DELETE' });
      if (res.ok) {
        tr.remove();
      } else {
        alert('No se pudo eliminar');
      }
    });
  }

  async function loadEmpleados() {
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';
    try {
      const res = await fetch('/api/empleados');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Respuesta no JSON recibida al cargar empleados:', text);
        throw new Error('Respuesta no válida del servidor');
      }
      if (!Array.isArray(data)) throw new Error('Formato inesperado');
      tbody.innerHTML = data.map(rowHtml).join('') || '<tr><td colspan="8">Sin registros</td></tr>';
      tbody.querySelectorAll('tr').forEach(bindRowActions);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8">${e.message || 'Error al cargar'}</td></tr>`;
      console.error(e);
    }
  }

  // Crear/Actualizar
  if (empleadoForm) {
    empleadoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('empleado-id').value;
      const payload = {
        nombre: document.getElementById('empleado-nombre').value.trim(),
        correo: document.getElementById('empleado-email').value.trim().toLowerCase(),
        telefono: document.getElementById('empleado-telefono').value.trim(),
        departamento: document.getElementById('empleado-departamento').value,
        posicion: document.getElementById('empleado-posicion').value.trim(),
        turno: document.getElementById('empleado-turno').value,
        salario: parseFloat(document.getElementById('empleado-salario').value) || 0,
        estado: document.getElementById('empleado-estado').value,
        direccion: document.getElementById('empleado-direccion').value.trim()
      };
      if (!id) {
        payload.usuario = document.getElementById('empleado-usuario').value.trim();
        payload.contrasena = document.getElementById('empleado-contrasena').value.trim();
        payload.rol_id = Number(document.getElementById('empleado-rol').value) || 1;
      }
      const res = await fetch(id ? `/api/empleados/${id}` : '/api/empleados', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadEmpleados();
        if (modal) modal.style.display = 'none';
      } else {
        let msg = 'No se pudo guardar';
        try { const t = await res.text(); msg = (JSON.parse(t).message || t || msg); } catch {}
        if (res.status === 409) {
          alert(msg || 'El correo ya está registrado');
        } else {
          alert(msg);
        }
      }
    });
  }

  // Abrir modal crear
  if (addEmpleadoBtn) {
    addEmpleadoBtn.addEventListener('click', () => {
      document.getElementById('modal-titulo-empleado').textContent = 'Agregar Empleado';
      document.getElementById('empleado-id').value = '';
      empleadoForm?.reset();
      // Habilitar campos de credenciales al crear
      document.getElementById('empleado-usuario').disabled = false;
      document.getElementById('empleado-contrasena').disabled = false;
      document.getElementById('empleado-rol').disabled = false;
      if (modal) modal.style.display = 'block';
    });
  }

  // Cierre modal
  closeModal?.addEventListener('click', () => (modal.style.display = 'none'));
  cancelBtn?.addEventListener('click', () => (modal.style.display = 'none'));
  window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  // Cargar inicial
    loadEmpleados();
    loadRoles();
}

// ============================
// VISTA: VENTA RÁPIDA
// ============================

function initVentaRapidaView() {
    console.log('Inicializando vista Venta Rápida');
    
    let carrito = [];
    let total = 0;
    const mesaContext = (window.appState && window.appState.currentMesa) ? window.appState.currentMesa : null;
    
    // Elementos del DOM
    const carritoVacio = document.getElementById('carrito-vacio');
    const carritoLista = document.getElementById('carrito-lista');
    const carritoItemsBody = document.getElementById('carrito-items-body');
    const cantidadItems = document.getElementById('cantidad-items');
    const subtotalElement = document.getElementById('subtotal');
    const impuestosElement = document.getElementById('impuestos');
    const totalFinalElement = document.getElementById('total-final');
    const totalVentaElement = document.getElementById('total-venta');
    const btnLimpiar = document.getElementById('btn-limpiar-venta');
    const btnCancelar = document.getElementById('btn-cancelar-venta');
    const btnProcesar = document.getElementById('btn-procesar-venta');
    const modalPago = document.getElementById('modal-pago-efectivo');
    const btnCancelarPago = document.getElementById('btn-cancelar-pago');
    const btnConfirmarPago = document.getElementById('btn-confirmar-pago');
    const montoRecibido = document.getElementById('monto-recibido');
    const pagoTotal = document.getElementById('pago-total');
    const pagoCambio = document.getElementById('pago-cambio');

    // Mostrar chip de mesa asignada en el header
    if (mesaContext) {
        const headerActions = document.querySelector('.venta-rapida-container .page-header .header-actions');
        if (headerActions && !headerActions.querySelector('.mesa-chip')) {
            const chip = document.createElement('div');
            chip.className = 'mesa-chip';
            const personasTxt = mesaContext.personas ? ` · ${mesaContext.personas} p` : '';
            chip.innerHTML = `<i class="fas fa-concierge-bell"></i> Mesa ${mesaContext.id} · ${mesaContext.cliente || 'Sin nombre'}${personasTxt}`;
            headerActions.prepend(chip);
        }
    }
    
    // Agregar productos al carrito
    const botonesAgregar = document.querySelectorAll('.btn-agregar-producto');
    botonesAgregar.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productoCard = e.target.closest('.producto-card');
            const productoId = productoCard.dataset.id;
            const productoNombre = productoCard.querySelector('h4').textContent;
            const productoPrecio = parseFloat(productoCard.dataset.precio);
            
            agregarAlCarrito(productoId, productoNombre, productoPrecio);
        });
    });
    
    // Función para agregar producto al carrito
    function agregarAlCarrito(id, nombre, precio) {
        const productoExistente = carrito.find(item => item.id === id);
        
        if (productoExistente) {
            productoExistente.cantidad += 1;
            productoExistente.subtotal = productoExistente.cantidad * precio;
        } else {
            carrito.push({
                id,
                nombre,
                precio,
                cantidad: 1,
                subtotal: precio
            });
        }
        
        actualizarCarrito();
    }
    
    // Actualizar visualización del carrito
    function actualizarCarrito() {
        // Calcular totales
        const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
        const impuestos = subtotal * 0.16;
        total = subtotal + impuestos;
        
        // Actualizar UI
        if (cantidadItems) cantidadItems.textContent = `${carrito.length} items`;
        if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
        if (impuestosElement) impuestosElement.textContent = `$${impuestos.toFixed(2)}`;
        if (totalFinalElement) totalFinalElement.textContent = `$${total.toFixed(2)}`;
        if (totalVentaElement) totalVentaElement.textContent = `$${total.toFixed(2)}`;
        if (pagoTotal) pagoTotal.textContent = `$${total.toFixed(2)}`;
        
        // Mostrar/ocultar carrito vacío
        if (carrito.length === 0) {
            if (carritoVacio) carritoVacio.style.display = 'block';
            if (carritoLista) carritoLista.style.display = 'none';
        } else {
            if (carritoVacio) carritoVacio.style.display = 'none';
            if (carritoLista) carritoLista.style.display = 'block';
            
            // Actualizar items del carrito
            if (carritoItemsBody) {
                carritoItemsBody.innerHTML = '';
                carrito.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.nombre}</td>
                        <td>
                            <div class="cantidad-control">
                                <button class="cantidad-btn" data-action="decrease" data-id="${item.id}">-</button>
                                <input type="number" class="cantidad-input" value="${item.cantidad}" min="1" data-id="${item.id}">
                                <button class="cantidad-btn" data-action="increase" data-id="${item.id}">+</button>
                            </div>
                        </td>
                        <td>$${item.precio.toFixed(2)}</td>
                        <td>$${item.subtotal.toFixed(2)}</td>
                        <td>
                            <button class="btn-eliminar-item" data-id="${item.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    carritoItemsBody.appendChild(row);
                });
                
                // Agregar event listeners a los nuevos elementos
                agregarEventListenersCarrito();
            }
        }
    }
    
    // Agregar event listeners a los elementos del carrito
    function agregarEventListenersCarrito() {
        // Botones de cantidad
        document.querySelectorAll('.cantidad-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const productId = e.target.dataset.id;
                actualizarCantidad(productId, action);
            });
        });
        
        // Inputs de cantidad
        document.querySelectorAll('.cantidad-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const productId = e.target.dataset.id;
                const nuevaCantidad = parseInt(e.target.value);
                if (nuevaCantidad > 0) {
                    actualizarCantidadManual(productId, nuevaCantidad);
                }
            });
        });
        
        // Botones de eliminar
        document.querySelectorAll('.btn-eliminar-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('button').dataset.id;
                eliminarDelCarrito(productId);
            });
        });
    }
    
    // Funciones para manipular el carrito
    function actualizarCantidad(productId, action) {
        const item = carrito.find(item => item.id === productId);
        if (item) {
            if (action === 'increase') {
                item.cantidad += 1;
            } else if (action === 'decrease' && item.cantidad > 1) {
                item.cantidad -= 1;
            }
            item.subtotal = item.cantidad * item.precio;
            actualizarCarrito();
        }
    }
    
    function actualizarCantidadManual(productId, cantidad) {
        const item = carrito.find(item => item.id === productId);
        if (item) {
            item.cantidad = cantidad;
            item.subtotal = item.cantidad * item.precio;
            actualizarCarrito();
        }
    }
    
    function eliminarDelCarrito(productId) {
        carrito = carrito.filter(item => item.id !== productId);
        actualizarCarrito();
    }
    
    // Botones de acción
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            carrito = [];
            actualizarCarrito();
        });
    }
    
    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres cancelar la venta?')) {
                carrito = [];
                actualizarCarrito();
            }
        });
    }
    
    if (btnProcesar) {
        btnProcesar.addEventListener('click', () => {
            if (carrito.length === 0) {
                alert('El carrito está vacío');
                return;
            }
            
            const metodoPago = document.getElementById('metodo-pago').value;
            
            if (metodoPago === 'efectivo') {
                if (modalPago) modalPago.style.display = 'block';
                if (montoRecibido) montoRecibido.value = '';
                if (pagoCambio) pagoCambio.textContent = '$0.00';
            } else {
                procesarVenta();
            }
        });
    }
    
    // Modal de pago
    if (montoRecibido) {
        montoRecibido.addEventListener('input', (e) => {
            const monto = parseFloat(e.target.value) || 0;
            const cambio = monto - total;
            if (pagoCambio) pagoCambio.textContent = `$${cambio >= 0 ? cambio.toFixed(2) : '0.00'}`;
        });
    }
    
    if (btnCancelarPago) {
        btnCancelarPago.addEventListener('click', () => {
            if (modalPago) modalPago.style.display = 'none';
        });
    }
    
    if (btnConfirmarPago) {
        btnConfirmarPago.addEventListener('click', () => {
            const monto = parseFloat(montoRecibido.value) || 0;
            if (monto < total) {
                alert('El monto recibido es menor que el total');
                return;
            }
            if (modalPago) modalPago.style.display = 'none';
            procesarVenta();
            // Generar factura y ticket de cocina para impresión
            try {
                imprimirFacturaYTicket(carrito, total, mesaContext);
            } catch (e) {
                console.error('Error al generar impresión:', e);
            }
        });
    }
    
    // Función para procesar la venta
    function procesarVenta() {
        // Aquí iría la lógica para procesar la venta en el backend
        alert('Venta procesada correctamente');
        carrito = [];
        actualizarCarrito();
    }

        // Construcción e impresión de factura y ticket de cocina
        function imprimirFacturaYTicket(items, totalVenta, mesaCtx) {
                const ahora = new Date();
                const folio = 'FAC-' + ahora.getTime();
                const negocio = 'Cafetería Sistema';
                const direccion = 'Calle 123, Ciudad';
                const tel = 'Tel: 555-123-4567';

                const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
                const impuestos = subtotal * 0.16;

                // Factura tamaño media carta aprox
                const mesaMeta = mesaCtx ? `<div class="meta">Mesa ${mesaCtx.id} · ${mesaCtx.cliente || 'Sin nombre'}${mesaCtx.personas ? ' · ' + mesaCtx.personas + ' persona(s)' : ''}</div>` : '';
                const facturaHtml = `
<!doctype html>
<html><head><meta charset="utf-8"><title>Factura</title>
<style>
    @page { size: A5 portrait; margin: 10mm; }
    body { font-family: Arial, sans-serif; color:#111827; }
    h1 { font-size: 16px; margin: 0 0 8px; }
    .header { text-align:center; margin-bottom: 10px; }
    .meta { font-size: 12px; color:#555; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th, td { border-bottom:1px solid #e5e7eb; padding:6px; font-size:12px; text-align:left; }
    th { background:#f9fafb; }
    .totales { margin-top:8px; }
    .totales div { display:flex; justify-content:space-between; font-size:13px; margin-top:4px; }
    .final { font-weight:700; }
    .footer { margin-top:10px; text-align:center; font-size:11px; color:#6b7280; }
    @media print { .no-print { display:none; } }
    .no-print { margin-top: 10px; }
    button { padding:6px 10px; }
</style></head>
<body>
    <div class="header">
        <h1>${negocio}</h1>
        <div class="meta">${direccion} · ${tel}</div>
        <div class="meta">Folio: ${folio} · ${ahora.toLocaleString()}</div>
    ${mesaMeta}
    </div>
    <table>
        <thead><tr><th>Producto</th><th>Cant</th><th>Precio</th><th>Subtotal</th></tr></thead>
        <tbody>
            ${items.map(i => `<tr><td>${i.nombre}</td><td>${i.cantidad}</td><td>$${i.precio.toFixed(2)}</td><td>$${i.subtotal.toFixed(2)}</td></tr>`).join('')}
        </tbody>
    </table>
    <div class="totales">
        <div><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>
        <div><span>Impuestos (16%):</span><span>$${impuestos.toFixed(2)}</span></div>
        <div class="final"><span>Total:</span><span>$${totalVenta.toFixed(2)}</span></div>
    </div>
    <div class="footer">¡Gracias por su compra!</div>
    <div class="no-print" style="text-align:center"><button onclick="window.print()">Imprimir</button></div>
</body></html>`;

                // Ticket de cocina (formato angosto)
                const mesaLinea = mesaCtx ? `<div>Mesa ${mesaCtx.id} · ${mesaCtx.cliente || ''}</div>` : '';
                const ticketHtml = `
<!doctype html>
<html><head><meta charset="utf-8"><title>Ticket Cocina</title>
<style>
    @page { size: 80mm auto; margin: 5mm; }
    body { font-family: monospace; font-size: 12px; color:#111; }
    .hdr { text-align:center; }
    .line { border-top:1px dashed #000; margin:6px 0; }
    .item { display:flex; justify-content:space-between; }
    .strong { font-weight:700; }
    @media print { .no-print { display:none; } }
</style></head>
<body>
    <div class="hdr">
        <div class="strong">Ticket Cocina</div>
        <div>${negocio}</div>
        <div>${ahora.toLocaleString()}</div>
    ${mesaLinea}
    </div>
    <div class="line"></div>
    ${items.map(i => `<div class="item"><span>${i.cantidad} x ${i.nombre}</span><span>$${i.subtotal.toFixed(2)}</span></div>`).join('')}
    <div class="line"></div>
    <div>Total: $${totalVenta.toFixed(2)}</div>
    <div class="no-print" style="text-align:center; margin-top:8px"><button onclick="window.print()">Imprimir</button></div>
</body></html>`;

                abrirVentanaImpresion(facturaHtml, 'Factura');
                abrirVentanaImpresion(ticketHtml, 'TicketCocina');
        }

        function abrirVentanaImpresion(html, title) {
                const win = window.open('', title, 'width=800,height=600');
                if (!win) return;
                win.document.open();
                win.document.write(html);
                win.document.close();
                // Intentar imprimir automáticamente cuando cargue
                win.onload = () => {
                        try { win.focus(); win.print(); } catch {}
                };
        }
    
    // Filtros de categoría
    const categoriaBtns = document.querySelectorAll('.categoria-btn');
    categoriaBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover clase active de todos los botones
            categoriaBtns.forEach(b => b.classList.remove('active'));
            // Agregar clase active al botón clickeado
            btn.classList.add('active');
            
            const categoria = btn.dataset.categoria;
            filtrarProductos(categoria);
        });
    });
    
    // Función para filtrar productos
    function filtrarProductos(categoria) {
        const productos = document.querySelectorAll('.producto-card');
        productos.forEach(producto => {
            if (categoria === 'todos' || producto.dataset.categoria === categoria) {
                producto.style.display = 'block';
            } else {
                producto.style.display = 'none';
            }
        });
    }
    
    // Búsqueda de productos
    const buscarInput = document.getElementById('buscar-producto-venta');
    if (buscarInput) {
        // Limpiar texto y placeholder en el primer enfoque/click
        let clearedBuscarOnce = false;
        const originalPlaceholder = buscarInput.placeholder;
        const clearOnFirstFocus = () => {
            if (!clearedBuscarOnce) {
                buscarInput.value = '';
                buscarInput.placeholder = '';
                clearedBuscarOnce = true;
                // Refrescar listado para mostrar todos (termino vacío)
                buscarInput.dispatchEvent(new Event('input'));
            }
        };
        buscarInput.addEventListener('focus', clearOnFirstFocus);
        buscarInput.addEventListener('click', clearOnFirstFocus);
        buscarInput.addEventListener('blur', () => {
            if (buscarInput.value === '') {
                buscarInput.placeholder = originalPlaceholder;
            }
        });

        // Filtrado por texto
        buscarInput.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase();
            const productos = document.querySelectorAll('.producto-card');
            
            productos.forEach(producto => {
                const nombre = producto.querySelector('h4').textContent.toLowerCase();
                if (nombre.includes(termino)) {
                    producto.style.display = 'block';
                } else {
                    producto.style.display = 'none';
                }
            });
        });
    }
    
    // Inicializar carrito
    actualizarCarrito();
}

// ============================
// VISTA: MESAS
// ============================

function initMesasView() {
    console.log('Inicializando vista Mesas');
    
    // Elementos del DOM
    const btnAgregarMesa = document.getElementById('btn-agregar-mesa');
    const modalMesa = document.getElementById('modal-mesa');
    const modalOcupar = document.getElementById('modal-ocupar-mesa');
    const modalReservar = null; // eliminado
    const formMesa = document.getElementById('form-mesa');
    const formOcupar = document.getElementById('form-ocupar-mesa');
    const formReservar = null;
    const gridMesas = document.getElementById('grid-mesas');
    
    // Actualizar estadísticas
    function actualizarEstadisticas() {
        const mesas = document.querySelectorAll('.mesa-card');
        const total = mesas.length;
        const disponibles = document.querySelectorAll('.mesa-card.disponible').length;
        const ocupadas = document.querySelectorAll('.mesa-card.ocupada').length;
    const reservadas = 0; // eliminado
        
        if (document.getElementById('total-mesas')) document.getElementById('total-mesas').textContent = total;
        if (document.getElementById('mesas-disponibles')) document.getElementById('mesas-disponibles').textContent = disponibles;
        if (document.getElementById('mesas-ocupadas')) document.getElementById('mesas-ocupadas').textContent = ocupadas;
        if (document.getElementById('mesas-reservadas')) document.getElementById('mesas-reservadas').textContent = reservadas;
    }
    
    // Abrir modal para agregar mesa
    if (btnAgregarMesa) {
        btnAgregarMesa.addEventListener('click', () => {
            document.getElementById('modal-titulo-mesa').textContent = 'Agregar Mesa';
            document.getElementById('mesa-id').value = '';
            if (formMesa) formMesa.reset();
            if (modalMesa) modalMesa.style.display = 'block';
        });
    }
    
    // Cerrar modales
    function setupModalClose(modal) {
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('.btn-outline');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (modal) modal.style.display = 'none';
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (modal) modal.style.display = 'none';
            });
        }
    }
    
    setupModalClose(modalMesa);
    setupModalClose(modalOcupar);
    // modal reservar eliminado
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === modalMesa) modalMesa.style.display = 'none';
        if (e.target === modalOcupar) modalOcupar.style.display = 'none';
    // modal reservar eliminado
    });
    
    // Enviar formulario de mesa
    if (formMesa) {
        formMesa.addEventListener('submit', (e) => {
            e.preventDefault();
            // Aquí iría la lógica para guardar la mesa
            alert('Mesa guardada correctamente');
            if (modalMesa) modalMesa.style.display = 'none';
        });
    }
    
    // ============================
    // PERSISTENCIA Y REHIDRATACIÓN
    // ============================

    function getMesasState() {
        try {
            return JSON.parse(localStorage.getItem('mesasState') || '{}');
        } catch (e) {
            return {};
        }
    }

    function setMesasState(state) {
        localStorage.setItem('mesasState', JSON.stringify(state));
    }

    function saveMesaState(mesaId, nuevoEstado, datos = {}) {
        const state = getMesasState();
        state[mesaId] = { estado: nuevoEstado, datos };
        setMesasState(state);
        // Notificar a otras vistas que el estado de mesas cambió (misma pestaña)
        try {
            window.dispatchEvent(new CustomEvent('mesasStateChanged', { detail: { mesaId, estado: nuevoEstado, datos } }));
        } catch (_) {}
    }

    function applyMesaState(mesaId, nuevoEstado, datos = {}, options = { navigateOnOcupar: false }) {
        const mesa = document.querySelector(`.mesa-card[data-id="${mesaId}"]`);
        if (!mesa) return;

        // Cambiar clases y dataset
    mesa.classList.remove('disponible', 'ocupada');
        mesa.classList.add(nuevoEstado);
        mesa.dataset.estado = nuevoEstado;

        // Indicador de estado
        const estadoElement = mesa.querySelector('.mesa-estado');
        if (!estadoElement) return;
        estadoElement.className = 'mesa-estado';

        if (nuevoEstado === 'disponible') {
            estadoElement.classList.add('estado-disponible');
            estadoElement.innerHTML = '<i class="fas fa-check-circle"></i> Disponible';
            if (mesa.querySelector('.mesa-info')) mesa.querySelector('.mesa-info').remove();
            mesa.querySelector('.mesa-acciones').innerHTML = `
                <button class="btn btn-sm btn-success btn-ocupar" data-id="${mesaId}">
                    <i class="fas fa-play"></i> Ocupar
                </button>
            `;
        } else if (nuevoEstado === 'ocupada') {
            estadoElement.classList.add('estado-ocupada');
            estadoElement.innerHTML = '<i class="fas fa-users"></i> Ocupada';
            if (!mesa.querySelector('.mesa-info')) {
                const infoDiv = document.createElement('div');
                infoDiv.className = 'mesa-info';
                infoDiv.innerHTML = `
                    <div class="mesa-cliente">${datos.cliente || 'Cliente'}</div>
                    <div class="mesa-tiempo">00:00</div>
                `;
                estadoElement.after(infoDiv);
            } else {
                const c = mesa.querySelector('.mesa-cliente');
                if (c && datos.cliente) c.textContent = datos.cliente;
            }
            mesa.querySelector('.mesa-acciones').innerHTML = `
                <button class="btn btn-sm btn-info btn-ver" data-id="${mesaId}">
                    <i class="fas fa-eye"></i> Ver
                </button>
                <button class="btn btn-sm btn-primary btn-cerrar" data-id="${mesaId}">
                    <i class="fas fa-check"></i> Cerrar
                </button>
            `;
            if (options.navigateOnOcupar) {
                window.appState = window.appState || {};
                window.appState.currentMesa = { id: mesaId, cliente: datos.cliente || 'Cliente', personas: datos.personas || null };
                if (typeof loadView === 'function') loadView('ventas-rapidas');
            }
    }

        // Re-enlazar listeners de los botones generados
        setTimeout(() => {
            const newOcuparBtn = mesa.querySelector('.btn-ocupar');
            const newReservarBtn = null;
            const newCerrarBtn = mesa.querySelector('.btn-cerrar');
            const newVerBtn = mesa.querySelector('.btn-ver');

            if (newOcuparBtn) {
                newOcuparBtn.addEventListener('click', () => {
                    document.getElementById('mesa-ocupar-id').value = mesaId;
                    if (formOcupar) formOcupar.reset();
                    if (modalOcupar) modalOcupar.style.display = 'block';
                });
            }
            // reservar eliminado
            if (newCerrarBtn) {
                newCerrarBtn.addEventListener('click', () => {
                    if (confirm('¿Estás seguro de que quieres cerrar esta mesa?')) {
                        cambiarEstadoMesa(mesaId, 'disponible');
                    }
                });
            }
            if (newVerBtn) {
                newVerBtn.addEventListener('click', () => {
                    // Lógica para ver detalles
                });
            }
        }, 50);
    }

    function rehydrateMesasFromStorage() {
        const saved = getMesasState();
        Object.keys(saved).forEach(mesaId => {
            const { estado, datos } = saved[mesaId] || {};
            if (estado) {
                applyMesaState(mesaId, estado, datos || {}, { navigateOnOcupar: false });
            }
        });
        actualizarEstadisticas();
    }

    // ============================
    // LISTENERS DE ACCIONES
    // ============================

    // Botones de ocupar mesa
    const botonesOcupar = document.querySelectorAll('.btn-ocupar');
    botonesOcupar.forEach(btn => {
        btn.addEventListener('click', () => {
            const mesaId = btn.dataset.id;
            const mesa = document.querySelector(`.mesa-card[data-id="${mesaId}"]`);
            
            if (mesa.dataset.estado === 'disponible') {
                document.getElementById('mesa-ocupar-id').value = mesaId;
                if (formOcupar) formOcupar.reset();
                if (modalOcupar) modalOcupar.style.display = 'block';
            }
        });
    });
    
    // Enviar formulario de ocupar mesa
    if (formOcupar) {
        formOcupar.addEventListener('submit', (e) => {
            e.preventDefault();
            const mesaId = document.getElementById('mesa-ocupar-id').value;
            const cliente = document.getElementById('cliente-nombre').value;
            const personas = document.getElementById('cliente-personas').value;
            
            // Cambiar estado de la mesa
            cambiarEstadoMesa(mesaId, 'ocupada', {
                cliente: cliente,
                personas: personas,
                tiempoInicio: new Date()
            });
            
            if (modalOcupar) modalOcupar.style.display = 'none';
            alert(`Mesa ${mesaId} ocupada por ${cliente}`);
        });
    }
    
    // Botones de reservar mesa
    // Botones reservar eliminados
    
    // Enviar formulario de reservar mesa
    // Form reservar eliminado
    
    // Botones de cerrar mesa
    const botonesCerrar = document.querySelectorAll('.btn-cerrar');
    botonesCerrar.forEach(btn => {
        btn.addEventListener('click', () => {
            const mesaId = btn.dataset.id;
            if (confirm('¿Estás seguro de que quieres cerrar esta mesa?')) {
                cambiarEstadoMesa(mesaId, 'disponible');
                alert(`Mesa ${mesaId} cerrada y disponible`);
            }
        });
    });
    
    // Botones de ver detalles
    const botonesVer = document.querySelectorAll('.btn-ver');
    botonesVer.forEach(btn => {
        btn.addEventListener('click', () => {
            const mesaId = btn.dataset.id;
            const mesa = document.querySelector(`.mesa-card[data-id="${mesaId}"]`);
            const estado = mesa.dataset.estado;
            
            let mensaje = `Detalles de la Mesa ${mesaId}\n`;
            mensaje += `Capacidad: ${mesa.dataset.capacidad} personas\n`;
            mensaje += `Estado: ${estado}\n`;
            
            if (estado === 'ocupada') {
                const cliente = mesa.querySelector('.mesa-cliente').textContent;
                const tiempo = mesa.querySelector('.mesa-tiempo').textContent;
                mensaje += `Cliente: ${cliente}\n`;
                mensaje += `Tiempo: ${tiempo}\n`;
            }
            
            alert(mensaje);
        });
    });
    
    // Función para cambiar estado de mesa
    function cambiarEstadoMesa(mesaId, nuevoEstado, datos = {}) {
        const mesa = document.querySelector(`.mesa-card[data-id="${mesaId}"]`);
            const estadoActual = mesa.dataset.estado;
        
        if (estadoActual === nuevoEstado) return;
        
        // Animación de cambio de estado
        mesa.classList.add('cambiando-estado');
        
        setTimeout(() => {
            // Cambiar clases CSS
            mesa.classList.remove('disponible', 'ocupada');
            mesa.classList.add(nuevoEstado);
            mesa.dataset.estado = nuevoEstado;
            
            // Cambiar el indicador de estado
            const estadoElement = mesa.querySelector('.mesa-estado');
            estadoElement.className = 'mesa-estado';
            
            switch(nuevoEstado) {
                case 'disponible':
                    estadoElement.classList.add('estado-disponible');
                    estadoElement.innerHTML = '<i class="fas fa-check-circle"></i> Disponible';
                    // Limpiar información adicional
                    if (mesa.querySelector('.mesa-info')) {
                        mesa.querySelector('.mesa-info').remove();
                    }
                    // Cambiar botones
                    mesa.querySelector('.mesa-acciones').innerHTML = `
                        <button class="btn btn-sm btn-success btn-ocupar" data-id="${mesaId}">
                            <i class="fas fa-play"></i> Ocupar
                        </button>
                    `;
                    saveMesaState(mesaId, 'disponible', {});
                    break;
                    
                case 'ocupada':
                    estadoElement.classList.add('estado-ocupada');
                    estadoElement.innerHTML = '<i class="fas fa-users"></i> Ocupada';
                    // Agregar información del cliente
                    if (!mesa.querySelector('.mesa-info')) {
                        const infoDiv = document.createElement('div');
                        infoDiv.className = 'mesa-info';
                        infoDiv.innerHTML = `
                            <div class="mesa-cliente">${datos.cliente || 'Cliente'}</div>
                            <div class="mesa-tiempo">00:00</div>
                        `;
                        mesa.querySelector('.mesa-estado').after(infoDiv);
                    }
                    // Cambiar botones
                    mesa.querySelector('.mesa-acciones').innerHTML = `
                        <button class="btn btn-sm btn-info btn-ver" data-id="${mesaId}">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="btn btn-sm btn-primary btn-cerrar" data-id="${mesaId}">
                            <i class="fas fa-check"></i> Cerrar
                        </button>
                    `;
                    saveMesaState(mesaId, 'ocupada', { cliente: datos.cliente || 'Cliente', personas: datos.personas || null });
                    // Guardar contexto y abrir Venta Rápida para asignar pedidos
                    window.appState = window.appState || {};
                    window.appState.currentMesa = { id: mesaId, cliente: datos.cliente || 'Cliente', personas: datos.personas || null };
                    if (typeof loadView === 'function') {
                        loadView('ventas-rapidas');
                    }
                    break;
                    
                // estado 'reservada' eliminado
            }
            
            // Actualizar event listeners de los nuevos botones
            setTimeout(() => {
                const newOcuparBtn = mesa.querySelector('.btn-ocupar');
                const newReservarBtn = null;
                const newCerrarBtn = mesa.querySelector('.btn-cerrar');
                const newVerBtn = mesa.querySelector('.btn-ver');
                
                if (newOcuparBtn) {
                    newOcuparBtn.addEventListener('click', () => {
                        document.getElementById('mesa-ocupar-id').value = mesaId;
                        if (formOcupar) formOcupar.reset();
                        if (modalOcupar) modalOcupar.style.display = 'block';
                    });
                }
                
                // reservar eliminado
                
                if (newCerrarBtn) {
                    newCerrarBtn.addEventListener('click', () => {
                        if (confirm('¿Estás seguro de que quieres cerrar esta mesa?')) {
                            cambiarEstadoMesa(mesaId, 'disponible');
                        }
                    });
                }
                
                if (newVerBtn) {
                    newVerBtn.addEventListener('click', () => {
                        // Lógica para ver detalles
                    });
                }
            }, 100);
            
            mesa.classList.remove('cambiando-estado');
            actualizarEstadisticas();
        }, 300);
    }
    
    // Filtros de mesas
    const filtroEstado = document.getElementById('filtro-estado-mesa');
    const filtroCapacidad = document.getElementById('filtro-capacidad');
    const buscarInput = document.getElementById('buscar-mesa');
    
    if (filtroEstado) {
        filtroEstado.addEventListener('change', aplicarFiltrosMesas);
    }
    
    if (filtroCapacidad) {
        filtroCapacidad.addEventListener('change', aplicarFiltrosMesas);
    }
    
    if (buscarInput) {
        buscarInput.addEventListener('input', aplicarFiltrosMesas);
    }
    
    function aplicarFiltrosMesas() {
        const estado = filtroEstado.value;
        const capacidad = filtroCapacidad.value;
        const busqueda = buscarInput.value.toLowerCase();
        
        const mesas = document.querySelectorAll('.mesa-card');
        mesas.forEach(mesa => {
            const mesaEstado = mesa.dataset.estado;
            const mesaCapacidad = mesa.dataset.capacidad;
            const mesaNumero = mesa.querySelector('.mesa-numero').textContent.toLowerCase();
            
            const coincideEstado = !estado || mesaEstado === estado;
            const coincideCapacidad = !capacidad || mesaCapacidad === capacidad;
            const coincideBusqueda = !busqueda || mesaNumero.includes(busqueda);
            
            if (coincideEstado && coincideCapacidad && coincideBusqueda) {
                mesa.style.display = 'block';
            } else {
                mesa.style.display = 'none';
            }
        });
    }
    
    // Cargar desde API y luego rehidratar estados locales
    async function cargarMesasDesdeAPI() {
        try {
            const resp = await fetch('/api/mesas');
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            let mesas = await resp.json();
            // Estados válidos: 'disponible' o 'ocupada'
            if (gridMesas) {
                gridMesas.innerHTML = mesas.map(m => {
                    const estadoClase = m.estado === 'ocupada' ? 'ocupada' : 'disponible';
                    const estadoBadge = m.estado === 'ocupada' ? '<span class="mesa-estado estado-ocupada"><i class="fas fa-users"></i> Ocupada</span>' : '<span class="mesa-estado estado-disponible"><i class="fas fa-check-circle"></i> Disponible</span>';
                    return `
                        <div class="mesa-card ${estadoClase}" data-id="${m.id}" data-estado="${m.estado}" data-capacidad="${m.capacidad}">
                            <div class="mesa-numero">Mesa ${m.numero}</div>
                            ${estadoBadge}
                            <div class="mesa-acciones">
                                ${m.estado === 'disponible' ? `
                                <button class=\"btn btn-sm btn-success btn-ocupar\" data-id=\"${m.id}\"><i class=\"fas fa-play\"></i> Ocupar</button>
                                ` : m.estado === 'ocupada' ? `
                                <button class=\"btn btn-sm btn-info btn-ver\" data-id=\"${m.id}\"><i class=\"fas fa-eye\"></i> Ver</button>
                                <button class=\"btn btn-sm btn-primary btn-cerrar\" data-id=\"${m.id}\"><i class=\"fas fa-check\"></i> Cerrar</button>
                                ` : ``}
                            </div>
                        </div>
                    `;
                }).join('');
            }
            rehydrateMesasFromStorage();
            actualizarEstadisticas();
            aplicarFiltrosMesas();
        } catch (e) {
            console.error('No se pudieron cargar mesas:', e);
            if (gridMesas) gridMesas.innerHTML = '<div class="alert alert-warning">No se pudieron cargar las mesas</div>';
        }
    }

    cargarMesasDesdeAPI();
    
    // Simular tiempo transcurrido para mesas ocupadas
    function actualizarTiempos() {
        const mesasOcupadas = document.querySelectorAll('.mesa-card.ocupada');
        mesasOcupadas.forEach(mesa => {
            const tiempoElement = mesa.querySelector('.mesa-tiempo');
            if (tiempoElement) {
                // Simular incremento de tiempo (en una app real, calcularías la diferencia)
                const tiempoActual = tiempoElement.textContent;
                const [minutos, segundos] = tiempoActual.split(':').map(Number);
                const nuevosSegundos = segundos + 1;
                const nuevosMinutos = minutos + Math.floor(nuevosSegundos / 60);
                
                tiempoElement.textContent = 
                    `${nuevosMinutos.toString().padStart(2, '0')}:${(nuevosSegundos % 60).toString().padStart(2, '0')}`;
            }
        });
    }
    
    // Actualizar tiempos cada minuto (simulado)
    setInterval(actualizarTiempos, 1000);
}

// vista reservaciones eliminada

// ============================
// VISTA: AJUSTES
// ============================

function initAjustesView() {
    console.log('Inicializando vista Ajustes');
    
    // Elementos del DOM
    const menuItems = document.querySelectorAll('.ajuste-menu-item');
    const secciones = document.querySelectorAll('.ajuste-seccion');
    const btnGuardar = document.getElementById('btn-guardar-ajustes');
    const modalConfirmacion = document.getElementById('modal-confirmacion');
    const btnCancelarCambios = document.getElementById('btn-cancelar-cambios');
    const btnConfirmarCambios = document.getElementById('btn-confirmar-cambios');

    // Navegación entre secciones
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;
            
            // Remover active de todos los items
            menuItems.forEach(i => i.classList.remove('active'));
            // Agregar active al item clickeado
            item.classList.add('active');
            
            // Ocultar todas las secciones
            secciones.forEach(sec => sec.classList.remove('active'));
            // Mostrar la sección correspondiente
            document.getElementById(`seccion-${target}`).classList.add('active');
        });
    });

    // Backup: elementos
    const btnCrearBackup = document.getElementById('btn-crear-backup');
    const btnProgramarBackup = document.getElementById('btn-programar-backup');
    const selFrecuencia = document.getElementById('frecuencia-backup');
    const inputArchivoBackup = document.getElementById('archivo-backup');
    const btnRestaurarBackup = document.getElementById('btn-restaurar-backup');
    const btnRestaurarDefaults = document.getElementById('btn-restaurar-defaults');
    const tablaBackups = document.getElementById('tabla-backups')?.querySelector('tbody');

    // Guardar ajustes (abre confirmación)
    if (btnGuardar) {
        btnGuardar.addEventListener('click', () => {
            if (modalConfirmacion) modalConfirmacion.style.display = 'block';
        });
    }

    // Cerrar modal de confirmación
    if (btnCancelarCambios) {
        btnCancelarCambios.addEventListener('click', () => {
            if (modalConfirmacion) modalConfirmacion.style.display = 'none';
        });
    }

    if (btnConfirmarCambios) {
        btnConfirmarCambios.addEventListener('click', () => {
            guardarAjustes();
            if (modalConfirmacion) modalConfirmacion.style.display = 'none';
        });
    }

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === modalConfirmacion) {
            if (modalConfirmacion) modalConfirmacion.style.display = 'none';
        }
    });

    // Función para guardar ajustes
    function guardarAjustes() {
        // Recopilar todos los valores de los ajustes
        const ajustes = {
            general: {
                tema: document.getElementById('tema-sistema').value,
                colorPrincipal: document.getElementById('color-principal').value,
                idioma: document.getElementById('idioma-sistema').value,
                zonaHoraria: document.getElementById('zona-horaria').value,
                formatoFecha: document.getElementById('formato-fecha').value,
                notificacionesEmail: document.getElementById('notificaciones-email').checked,
                notificacionesSistema: document.getElementById('notificaciones-sistema').checked,
                recordatoriosReservas: document.getElementById('recordatorios-reservas').checked
            },
            restaurante: {
                nombre: document.getElementById('nombre-restaurante').value,
                direccion: document.getElementById('direccion-restaurante').value,
                telefono: document.getElementById('telefono-restaurante').value,
                email: document.getElementById('email-restaurante').value,
                iva: parseFloat(document.getElementById('iva-porcentaje').value),
                propinaAutomatica: parseFloat(document.getElementById('propina-automatica').value),
                incluirIva: document.getElementById('incluir-iva-precios').checked
            },
            mesas: {
                numeroMesas: parseInt(document.getElementById('numero-mesas').value),
                mesas2Personas: parseInt(document.getElementById('mesas-2personas').value),
                mesas4Personas: parseInt(document.getElementById('mesas-4personas').value),
                mesas6Personas: parseInt(document.getElementById('mesas-6personas').value),
                mesas8Personas: parseInt(document.getElementById('mesas-8personas').value),
                tiempoComida: parseInt(document.getElementById('tiempo-promedio-comida').value),
                tiempoBebidas: parseInt(document.getElementById('tiempo-promedio-bebidas').value),
                tiempoLimiteReserva: parseInt(document.getElementById('tiempo-limite-reserva').value)
            },
            reservaciones: {
                anticipacion: parseInt(document.getElementById('anticipacion-reserva').value),
                maxPersonas: parseInt(document.getElementById('maximo-personas-reserva').value),
                reservasOnline: document.getElementById('reservas-online').checked,
                confirmacionAutomatica: document.getElementById('confirmacion-automatica').checked,
                tiempoRecordatorio: parseInt(document.getElementById('tiempo-recordatorio').value),
                recordatorioSMS: document.getElementById('recordatorio-sms').checked,
                recordatorioEmail: document.getElementById('recordatorio-email').checked,
                tiempoCancelacion: parseInt(document.getElementById('tiempo-cancelacion').value),
                penalizacionCancelacion: document.getElementById('penalizacion-cancelacion').checked
            }
        };

        console.log('Guardando ajustes:', ajustes);

        // Aplicar cambios a Mesas vía API bulk-generate
        const total = ajustes.mesas.numeroMesas;
        const body = {
            total,
            dist: {
                '2': ajustes.mesas.mesas2Personas,
                '4': ajustes.mesas.mesas4Personas,
                '6': ajustes.mesas.mesas6Personas,
                '8': ajustes.mesas.mesas8Personas
            },
            ubicaciones: ['interior', 'terraza', 'exterior', 'privado'],
            reset: true,
            startNumber: 1
        };

        fetch('/api/mesas/bulk-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        .then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(() => {
            alert('Ajustes guardados y mesas actualizadas');
        })
        .catch(err => {
            console.error('Error actualizando mesas:', err);
            alert('Ajustes guardados, pero hubo un error al actualizar las mesas');
        });
    }

    // Cargar ajustes guardados
    function cargarAjustes() {
        // Aquí iría la lógica para cargar ajustes del backend
        // Por ahora usamos valores por defecto
        console.log('Cargando ajustes...');

        // Completar inputs de Mesas desde la API real
        (async () => {
            try {
                const resp = await fetch('/api/mesas');
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const mesas = await resp.json();
                const activas = mesas.filter(m => m.activo === 1 || m.activo === true || m.activo === undefined);
                const total = activas.length;
                const d2 = activas.filter(m => Number(m.capacidad) === 2).length;
                const d4 = activas.filter(m => Number(m.capacidad) === 4).length;
                const d6 = activas.filter(m => Number(m.capacidad) === 6).length;
                const d8 = activas.filter(m => Number(m.capacidad) >= 8).length;
                const totalInput = document.getElementById('numero-mesas');
                const d2Input = document.getElementById('mesas-2personas');
                const d4Input = document.getElementById('mesas-4personas');
                const d6Input = document.getElementById('mesas-6personas');
                const d8Input = document.getElementById('mesas-8personas');
                if (totalInput) totalInput.value = String(total);
                if (d2Input) d2Input.value = String(d2);
                if (d4Input) d4Input.value = String(d4);
                if (d6Input) d6Input.value = String(d6);
                if (d8Input) d8Input.value = String(d8);
            } catch (e) {
                console.error('No se pudo cargar la distribución de mesas:', e);
            }
        })();
    }

    // ====== BACKUP: acciones ======
    async function cargarBackups() {
        try {
            const r = await fetch('/api/backup');
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const items = await r.json();
            if (tablaBackups) {
                tablaBackups.innerHTML = (items || []).map(it => {
                    const fecha = new Date(it.mtime).toLocaleString();
                    const tam = (Number(it.size) / (1024*1024)).toFixed(2) + ' MB';
                    return `<tr>
                        <td>${fecha}</td>
                        <td>${tam}</td>
                        <td>JSON</td>
                        <td>OK</td>
                        <td>
                            <button class="btn btn-outline" data-dl="${it.file}">Descargar</button>
                            <button class="btn btn-danger" data-rs="${it.file}">Restaurar</button>
                        </td>
                    </tr>`;
                }).join('');
                // Bind acciones por fila
                tablaBackups.querySelectorAll('button[data-dl]').forEach(b => {
                    b.addEventListener('click', () => {
                        const f = b.getAttribute('data-dl');
                        window.open(`/api/backup/download/${encodeURIComponent(f)}`,'_blank');
                    });
                });
                tablaBackups.querySelectorAll('button[data-rs]').forEach(b => {
                    b.addEventListener('click', async () => {
                        const f = b.getAttribute('data-rs');
                        if (!confirm('Esto sobrescribirá los datos actuales. ¿Continuar?')) return;
                        try {
                            const rr = await fetch('/api/backup/restore', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: f }) });
                            if (!rr.ok) throw new Error('HTTP ' + rr.status);
                            alert('Restaurado correctamente');
                        } catch (e) {
                            alert('Error al restaurar: ' + e.message);
                        }
                    });
                });
            }
        } catch (e) {
            if (tablaBackups) tablaBackups.innerHTML = `<tr><td colspan="5">No se pudo cargar el historial</td></tr>`;
        }
    }

    if (btnCrearBackup) {
        btnCrearBackup.addEventListener('click', async () => {
            try {
                const r = await fetch('/api/backup/create', { method: 'POST' });
                if (!r.ok) throw new Error('HTTP ' + r.status);
                const j = await r.json();
                alert('Backup creado: ' + j.file);
                cargarBackups();
            } catch (e) {
                alert('No se pudo crear el backup: ' + e.message);
            }
        });
    }

    if (btnProgramarBackup && selFrecuencia) {
        btnProgramarBackup.addEventListener('click', async () => {
            try {
                const freq = selFrecuencia.value;
                const r = await fetch('/api/backup/schedule', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ frequency: freq }) });
                if (!r.ok) throw new Error('HTTP ' + r.status);
                alert('Backup automático programado (' + freq + ')');
            } catch (e) {
                alert('No se pudo programar: ' + e.message);
            }
        });
    }

    if (btnRestaurarBackup && inputArchivoBackup) {
        btnRestaurarBackup.addEventListener('click', async () => {
            try {
                const f = inputArchivoBackup.files?.[0];
                if (!f) return alert('Selecciona un archivo primero');
                const fd = new FormData();
                fd.append('file', f);
                const up = await fetch('/api/backup/upload', { method: 'POST', body: fd });
                if (!up.ok) throw new Error('HTTP ' + up.status);
                const uj = await up.json();
                const name = uj.file;
                if (!name) throw new Error('Subida sin nombre de archivo');
                if (!confirm('Se restaurará el backup subido. ¿Continuar?')) return;
                const rr = await fetch('/api/backup/restore', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: name }) });
                if (!rr.ok) throw new Error('HTTP ' + rr.status);
                alert('Backup restaurado correctamente');
            } catch (e) {
                alert('Error en restauración: ' + e.message);
            }
        });
    }

    if (btnRestaurarDefaults) {
        btnRestaurarDefaults.addEventListener('click', async () => {
            if (!confirm('Esto reinstalará los valores por defecto. ¿Continuar?')) return;
            try {
                const r = await fetch('/api/backup/restore-defaults', { method: 'POST' });
                if (!r.ok) throw new Error('HTTP ' + r.status);
                alert('Valores por defecto restaurados');
                cargarBackups();
            } catch (e) {
                alert('No se pudo restaurar por defecto: ' + e.message);
            }
        });
    }

    // cargar historial al entrar en Ajustes
    cargarBackups();

    // Color picker interactivo
    const colorPicker = document.getElementById('color-principal');
    const colorValue = document.querySelector('.color-value');
    
    if (colorPicker && colorValue) {
        colorPicker.addEventListener('input', (e) => {
            colorValue.textContent = e.target.value;
            // Aplicar cambio de color en tiempo real
            document.documentElement.style.setProperty('--color-primario', e.target.value);
        });
    }

    // Inicializar
    cargarAjustes();
}

// ============================
// MANEJO DE ERRORES
// ============================

// Manejar errores no capturados
window.addEventListener('error', function(e) {
    console.error('Error no capturado:', e.error);
});

// Manejar promesas rechazadas no capturadas
window.addEventListener('unhandledrejection', function(e) {
    console.error('Promesa rechazada no capturada:', e.reason);
});

// ============================
// FUNCIONES GLOBALES
// ============================

// Hacer funciones disponibles globalmente
window.loadView = loadView;

// Exportar para uso en otros módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadView,
        toggleSidebar,
        initHomeView,
        initProductosView,
        initEmpleadosView,
        initVentaRapidaView,
        initMesasView,
        initAjustesView
    };
}
// ============================
// VISTA: REPORTES
// ============================

function initReportesView() {
    console.log('Inicializando vista Reportes');
    
    // Elementos del DOM
    const btnGenerarReporte = document.getElementById('btn-generar-reporte');
    const btnExportarPDF = document.getElementById('btn-exportar-pdf');
    const btnExportarExcel = document.getElementById('btn-exportar-excel');
    const btnFiltrosAvanzados = document.getElementById('btn-filtros-avanzados');
    const panelFiltrosAvanzados = document.getElementById('panel-filtros-avanzados');
    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
    const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');
    const rangoFecha = document.getElementById('rango-fecha');
    const fechasPersonalizadas = document.getElementById('fechas-personalizadas');
    const fechasPersonalizadasHasta = document.getElementById('fechas-personalizadas-hasta');
    const modalCarga = document.getElementById('modal-carga');
    const progresoFill = document.getElementById('progreso-fill');
    const progresoPorcentaje = document.getElementById('progreso-porcentaje');
    
    // Inicializar gráficos
    inicializarGraficos();
    
    // Configurar event listeners
    if (btnGenerarReporte) {
        btnGenerarReporte.addEventListener('click', generarReporte);
    }
    
    if (btnExportarPDF) {
        btnExportarPDF.addEventListener('click', exportarPDF);
    }
    
    if (btnExportarExcel) {
        btnExportarExcel.addEventListener('click', exportarExcel);
    }
    
    if (btnFiltrosAvanzados && panelFiltrosAvanzados) {
        btnFiltrosAvanzados.addEventListener('click', () => {
            const isVisible = panelFiltrosAvanzados.style.display === 'block';
            panelFiltrosAvanzados.style.display = isVisible ? 'none' : 'block';
            btnFiltrosAvanzados.innerHTML = isVisible ? 
                '<i class="fas fa-filter"></i> Filtros Avanzados' : 
                '<i class="fas fa-times"></i> Ocultar Filtros';
        });
    }
    
    if (btnAplicarFiltros) {
        btnAplicarFiltros.addEventListener('click', aplicarFiltrosAvanzados);
    }
    
    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
    }
    
    if (rangoFecha && fechasPersonalizadas && fechasPersonalizadasHasta) {
        rangoFecha.addEventListener('change', function() {
            const mostrarFechasPersonalizadas = this.value === 'personalizado';
            fechasPersonalizadas.style.display = mostrarFechasPersonalizadas ? 'block' : 'none';
            fechasPersonalizadasHasta.style.display = mostrarFechasPersonalizadas ? 'block' : 'none';
        });
    }
    
    // Configurar botones de tipo de gráfico
    const botonesTipoGrafico = document.querySelectorAll('.grafico-acciones .btn');
    botonesTipoGrafico.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover active de todos los botones
            botonesTipoGrafico.forEach(b => b.classList.remove('active'));
            // Agregar active al botón clickeado
            this.classList.add('active');
            
            const tipo = this.getAttribute('data-tipo');
            cambiarTipoGrafico(tipo);
        });
    });
    
    // Cargar reporte inicial
    setTimeout(() => {
        generarReporte();
    }, 1000);
    
    // Funciones de la vista de reportes
    function inicializarGraficos() {
        console.log('Inicializando gráficos...');
        
        // Aquí iría la inicialización de Chart.js
        // Por ahora simulamos la creación de gráficos
        setTimeout(() => {
            console.log('Gráficos inicializados');
        }, 500);
    }
    
    function generarReporte() {
        console.log('Generando reporte...');
        
        // Mostrar modal de carga
        if (modalCarga) modalCarga.style.display = 'block';
        
        // Simular progreso
        let progreso = 0;
        const intervalo = setInterval(() => {
            progreso += 5;
            if (progresoFill) progresoFill.style.width = `${progreso}%`;
            if (progresoPorcentaje) progresoPorcentaje.textContent = `${progreso}%`;
            
            if (progreso >= 100) {
                clearInterval(intervalo);
                
                // Simular carga de datos
                setTimeout(() => {
                    if (modalCarga) modalCarga.style.display = 'none';
                    cargarDatosReporte();
                    actualizarMetricas();
                    actualizarResumen();
                }, 500);
            }
        }, 100);
    }
    
    function cargarDatosReporte() {
        console.log('Cargando datos del reporte...');
        
        // Aquí iría la lógica para cargar datos reales
        // Por ahora usamos datos de ejemplo
        
        // Datos de ejemplo para la tabla
        const tablaVentas = document.getElementById('tabla-ventas');
        if (tablaVentas) {
            const tbody = tablaVentas.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td>15/12/2023</td>
                        <td>12:30</td>
                        <td>Mesa 2</td>
                        <td>María González</td>
                        <td>2 Café Americano, 1 Sandwich</td>
                        <td>$15.50</td>
                        <td>Efectivo</td>
                    </tr>
                    <tr>
                        <td>15/12/2023</td>
                        <td>13:45</td>
                        <td>Mesa 4</td>
                        <td>Carlos Rodríguez</td>
                        <td>3 Capuchino, 2 Brownie</td>
                        <td>$24.75</td>
                        <td>Tarjeta</td>
                    </tr>
                    <tr>
                        <td>15/12/2023</td>
                        <td>14:20</td>
                        <td>Mesa 1</td>
                        <td>Ana Martínez</td>
                        <td>1 Expreso, 1 Jugo de Naranja</td>
                        <td>$8.50</td>
                        <td>Efectivo</td>
                    </tr>
                    <tr>
                        <td>15/12/2023</td>
                        <td>15:30</td>
                        <td>Mesa 3</td>
                        <td>María González</td>
                        <td>4 Café Americano, 2 Sandwich</td>
                        <td>$31.00</td>
                        <td>Transferencia</td>
                    </tr>
                    <tr>
                        <td>15/12/2023</td>
                        <td>16:45</td>
                        <td>Mesa 5</td>
                        <td>Carlos Rodríguez</td>
                        <td>2 Capuchino, 1 Tarta de Manzana</td>
                        <td>$16.25</td>
                        <td>Tarjeta</td>
                    </tr>
                `;
            }
        }
        
        console.log('Datos del reporte cargados');
    }
    
    function actualizarMetricas() {
        console.log('Actualizando métricas...');
        
        // Aquí iría la lógica para calcular métricas reales
        // Por ahora usamos valores de ejemplo
        if (document.getElementById('total-ventas')) {
            document.getElementById('total-ventas').textContent = '$95.00';
        }
        
        if (document.getElementById('total-pedidos')) {
            document.getElementById('total-pedidos').textContent = '5';
        }
        
        if (document.getElementById('total-clientes')) {
            document.getElementById('total-clientes').textContent = '5';
        }
        
        if (document.getElementById('promedio-mesa')) {
            document.getElementById('promedio-mesa').textContent = '$19.00';
        }
    }
    
    function actualizarResumen() {
        console.log('Actualizando resumen...');
        
        // Aquí iría la lógica para calcular el resumen real
        // Por ahora usamos valores de ejemplo
        if (document.getElementById('resumen-periodo')) {
            document.getElementById('resumen-periodo').textContent = '15/12/2023 - 15/12/2023';
        }
        
        if (document.getElementById('resumen-total-ventas')) {
            document.getElementById('resumen-total-ventas').textContent = '$95.00';
        }
        
        if (document.getElementById('resumen-promedio-venta')) {
            document.getElementById('resumen-promedio-venta').textContent = '$19.00';
        }
        
        if (document.getElementById('resumen-producto-top')) {
            document.getElementById('resumen-producto-top').textContent = 'Café Americano (6 unidades)';
        }
        
        if (document.getElementById('resumen-empleado-top')) {
            document.getElementById('resumen-empleado-top').textContent = 'María González ($46.50)';
        }
        
        if (document.getElementById('resumen-mesa-top')) {
            document.getElementById('resumen-mesa-top').textContent = 'Mesa 2 ($15.50)';
        }
    }
    
    function exportarPDF() {
        console.log('Exportando a PDF...');
        // Aquí iría la lógica para exportar a PDF
        alert('Funcionalidad de exportación a PDF en desarrollo');
    }
    
    function exportarExcel() {
        console.log('Exportando a Excel...');
        // Aquí iría la lógica para exportar a Excel
        alert('Funcionalidad de exportación a Excel en desarrollo');
    }
    
    function aplicarFiltrosAvanzados() {
        console.log('Aplicando filtros avanzados...');
        
        // Obtener valores de los filtros
        const empleado = document.getElementById('filtro-empleado').value;
        const mesa = document.getElementById('filtro-mesa').value;
        const producto = document.getElementById('filtro-producto').value;
        const categoria = document.getElementById('filtro-categoria').value;
        
        console.log('Filtros aplicados:', { empleado, mesa, producto, categoria });
        
        // Regenerar reporte con los filtros aplicados
        generarReporte();
        
        // Cerrar panel de filtros
        if (panelFiltrosAvanzados) panelFiltrosAvanzados.style.display = 'none';
        if (btnFiltrosAvanzados) {
            btnFiltrosAvanzados.innerHTML = '<i class="fas fa-filter"></i> Filtros Avanzados';
        }
    }
    
    function limpiarFiltros() {
        console.log('Limpiando filtros...');
        
        // Restablecer valores de los filtros
        document.getElementById('filtro-empleado').value = '';
        document.getElementById('filtro-mesa').value = '';
        document.getElementById('filtro-producto').value = '';
        document.getElementById('filtro-categoria').value = '';
        
        // Regenerar reporte sin filtros
        generarReporte();
    }
    
    function cambiarTipoGrafico(tipo) {
        console.log('Cambiando tipo de gráfico a:', tipo);
        
        // Aquí iría la lógica para cambiar el tipo de gráfico
        // Por ahora solo mostramos un mensaje
        alert(`Cambiando a vista ${tipo} del gráfico`);
    }
}