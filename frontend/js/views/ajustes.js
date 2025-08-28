// js/views/ajustes.js
import { api, Roles, Mesas } from '../core/api.js';
import { refreshEnhancedSelect } from '../core/dom.js';

export function initAjustes() {
  console.log('Inicializando vista Ajustes');

  // Tabs
  const menuItems = document.querySelectorAll('.ajuste-menu-item');
  const secciones = document.querySelectorAll('.ajuste-seccion');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      menuItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      secciones.forEach(sec => sec.classList.remove('active'));
      document.getElementById(`seccion-${target}`).classList.add('active');
    });
  });

  // Helpers
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));
  const setOptions = (sel, items, { valueKey='id', labelKey='nombre', placeholder='Seleccionar' }={}) => {
    if (!sel) return;
    sel.innerHTML = '';
    const ph = document.createElement('option'); ph.value = ''; ph.textContent = placeholder; sel.appendChild(ph);
    (items||[]).forEach(it => { const o = document.createElement('option'); o.value = it[valueKey]; o.textContent = it[labelKey]; sel.appendChild(o); });
  };
  const renderRows = (tbody, items, mapRow) => { if (tbody) tbody.innerHTML = (items||[]).map(mapRow).join('') || '<tr><td colspan="5">Sin registros</td></tr>'; };

  // Humanización de permisos (CRUD -> Crear/Ver/Editar/Eliminar)
  const moduloNames = {
    productos: 'Productos', ventas: 'Ventas', mesas: 'Mesas', empleados: 'Empleados',
    reportes: 'Reportes', ajustes: 'Ajustes', restaurante: 'Restaurante', roles: 'Roles',
    permisos: 'Permisos', catalogos: 'Catálogos', departamentos: 'Departamentos', turnos: 'Turnos', cargos: 'Cargos', backup: 'Backup'
  };
  function humanizeModule(key='') {
    return moduloNames[key] || (key ? key.charAt(0).toUpperCase()+key.slice(1) : '');
  }
  function humanizeType(tipo) { return tipo === 'view' ? 'Vista' : 'Acción'; }
  function humanizeAction(raw='') {
    const a = String(raw).toLowerCase();
    if ([ 'crear', 'create', 'agregar', 'nuevo', 'alta' ].includes(a)) return 'Crear';
    if ([ 'leer', 'read', 'ver', 'listar' ].includes(a)) return 'Ver';
    if ([ 'actualizar', 'update', 'editar', 'modificar' ].includes(a)) return 'Editar';
    if ([ 'eliminar', 'delete', 'borrar', 'remover' ].includes(a)) return 'Eliminar';
    if (a === 'procesar') return 'Procesar';
    if (a === 'cancelar') return 'Cancelar';
    if (a === 'limpiar') return 'Limpiar';
    if (a === 'imprimir') return 'Imprimir';
    if (a === 'schedule' || a === 'programar') return 'Programar';
    if (a === 'restore' || a === 'restaurar') return 'Restaurar';
    if (a === 'create_backup' || a === 'backup' || a === 'createbackup') return 'Crear backup';
    return raw ? raw.charAt(0).toUpperCase()+raw.slice(1) : '';
  }
  function humanizePerm(p) {
    // Esperado: clave tipo.modulo[.accion]
    const clave = p?.clave || '';
    const parts = clave.split('.');
    const tipo = parts[0] || p?.tipo || '';
    const modulo = parts[1] || '';
    const accion = parts[2] || '';
    const tt = humanizeType(tipo);
    if (tipo === 'view') {
      return { label: `Ver ${humanizeModule(modulo)}`, tipoText: tt };
    }
    if (tipo === 'action') {
      const act = humanizeAction(accion);
      // Formato: Modulo: Acción
      return { label: `${humanizeModule(modulo)}: ${act}`, tipoText: tt };
    }
    // Fallback al nombre existente si no coincide patrón
    return { label: p?.nombre || clave, tipoText: tt || (p?.tipo || '') };
  }

  // 1) Roles CRUD
  const rolId = qs('#rol-id');
  const rolNombre = qs('#rol-nombre');
  const rolDesc = qs('#rol-desc');
  const btnRolGuardar = qs('#btn-rol-guardar');
  const tablaRoles = qs('#tabla-roles tbody');

  async function loadRoles() {
    const roles = await Roles.all();
    renderRows(tablaRoles, roles, (r) => `
      <tr data-id="${r.id}">
        <td>${r.id}</td>
        <td>${r.nombre}</td>
        <td>${r.descripcion || ''}</td>
        <td>
          <button class="btn btn-sm btn-warning edit-rol"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger del-rol"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`);
    bindRolesTable();
    // Refrescar selector de permisos
    const sel = qs('#rol-select-permisos');
    setOptions(sel, roles, { placeholder: 'Elige un rol' });
  // Popular selector "Copiar de"
  const selCopy = qs('#rol-select-copiar');
  setOptions(selCopy, roles, { placeholder: 'Copiar de...' });
    // Actualizar UI del select mejorado con las nuevas opciones
    refreshEnhancedSelect(sel);
    // Seleccionar por defecto el primer rol si no hay selección previa
    if (roles.length && sel && !sel.value) {
      sel.value = String(roles[0].id);
      // Actualizar UI del select mejorado y disparar sincronización
      refreshEnhancedSelect(sel);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function bindRolesTable() {
    tablaRoles?.querySelectorAll('tr').forEach(tr => {
      const id = tr.getAttribute('data-id');
      tr.querySelector('.edit-rol')?.addEventListener('click', async () => {
        const r = await Roles.get(id);
        rolId.value = r.id;
        rolNombre.value = r.nombre || '';
        rolDesc.value = r.descripcion || '';
      });
      tr.querySelector('.del-rol')?.addEventListener('click', async () => {
        if (!confirm('¿Eliminar rol?')) return;
        await Roles.remove(id);
        await loadRoles();
      });
    });
  }

  btnRolGuardar?.addEventListener('click', async () => {
    const payload = { nombre: rolNombre.value.trim(), descripcion: rolDesc.value.trim() };
    const id = rolId.value;
    if (!payload.nombre) return alert('Nombre es requerido');
    if (id) await Roles.update(id, payload); else await Roles.create(payload);
    rolId.value = ''; rolNombre.value=''; rolDesc.value='';
    await loadRoles();
  });

  // 2) Permisos por rol
  const permisosContainer = qs('#lista-permisos');
  const rolSelectPerm = qs('#rol-select-permisos');
  const btnGuardarPerms = qs('#btn-guardar-permisos');

  async function loadPermisosDisponibles() {
  const raw = await api.get('/api/permisos');
  const all = (raw||[]).map(p => { const h = humanizePerm(p); return { ...p, uiLabel: h.label, uiTipo: h.tipoText }; });
  permisosContainer.dataset.all = JSON.stringify(all);
  renderPermisosList(all);
  actualizarContadorPermisos();
  }

  async function syncPermisosRol() {
    const rid = rolSelectPerm.value; if (!rid) { qsa('.permiso-item input').forEach(i=>i.checked=false); return; }
    const actuales = await Roles.getPermisos(rid);
    const claves = new Set(actuales.map(p => p.clave));
    qsa('.permiso-item input').forEach(i => { i.checked = claves.has(i.dataset.clave); });
  }

  rolSelectPerm?.addEventListener('change', syncPermisosRol);
  btnGuardarPerms?.addEventListener('click', async () => {
    const rid = rolSelectPerm.value; if (!rid) return alert('Selecciona un rol');
    const seleccionadas = qsa('.permiso-item input:checked').map(i => i.dataset.clave);
    await Roles.setPermisos(rid, seleccionadas);
    try {
      // Si el usuario actual tiene ese rol, refrescar permisos en sesión
      const myRolId = sessionStorage.getItem('rolId');
      if (myRolId && String(myRolId) === String(rid)) {
        // Volver a obtener permisos del rol y reflejar en sesión
        const actuales = await Roles.getPermisos(rid);
        const claves = actuales.map(p => p.clave);
        sessionStorage.setItem('permisos', JSON.stringify(claves));
        // Notificar al resto del UI (main.js escucha este evento)
        window.dispatchEvent(new CustomEvent('permisosActualizados'));
      }
    } catch(_) {}
    alert('Permisos guardados');
  });

  // Filtro, seleccionar todo/limpiar, copiar de
  function actualizarContadorPermisos() {
    const totalSel = qsa('.permiso-item input:checked').length;
    const lbl = qs('#perm-count'); if (lbl) lbl.textContent = `${totalSel} seleccionados`;
  }
  permisosContainer?.addEventListener('change', (e) => {
    if (e.target && e.target.matches('.permiso-item input')) actualizarContadorPermisos();
  });

  const filtroPerm = qs('#filtro-permiso');
  filtroPerm?.addEventListener('input', () => {
    const term = (filtroPerm.value||'').toLowerCase();
    const all = JSON.parse(permisosContainer.dataset.all||'[]');
    const filtrados = all.filter(p => (p.uiLabel||'').toLowerCase().includes(term) || (p.clave||'').toLowerCase().includes(term));
    renderPermisosList(filtrados);
    // Re-sincronizar con rol seleccionado actual
    syncPermisosRol().then(() => actualizarContadorPermisos());
  });

  function groupByModule(perms) {
    const groups = {};
    (perms||[]).forEach(p => {
      const clave = p?.clave || '';
      const modulo = (clave.split('.')[1]) || 'otros';
      const key = modulo.toLowerCase();
      if (!groups[key]) groups[key] = { modulo: key, nombre: humanizeModule(key), items: [] };
      groups[key].items.push(p);
    });
    // Ordenar por nombre
    return Object.values(groups).sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  function renderPermisosList(perms) {
    const groups = groupByModule(perms);
    permisosContainer.innerHTML = groups.map(g => `
      <div class="permiso-group" data-modulo="${g.modulo}">
        <div class="permiso-group-header">
          <div class="permiso-group-title"><i class="fas fa-folder"></i> ${g.nombre}</div>
          <div class="permiso-group-meta"><span class="permiso-group-count">${g.items.length}</span><i class="fas fa-chevron-down chev"></i></div>
        </div>
        <div class="permiso-group-body">
          ${g.items.map(p => `
            <label class="checkbox permiso-item">
              <input type="checkbox" data-clave="${p.clave}" data-id="${p.id}"> ${p.uiLabel} <span class="badge">${p.uiTipo}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // Toggle de grupos (acordeón)
  permisosContainer?.addEventListener('click', (e) => {
    const header = e.target.closest('.permiso-group-header');
    if (!header) return;
    const group = header.closest('.permiso-group');
    if (!group) return;
    group.classList.toggle('collapsed');
  });

  qs('#btn-perm-todo')?.addEventListener('click', (e) => {
    e.preventDefault(); qsa('.permiso-item input').forEach(i => i.checked = true); actualizarContadorPermisos();
  });
  qs('#btn-perm-limpiar')?.addEventListener('click', (e) => {
    e.preventDefault(); qsa('.permiso-item input').forEach(i => i.checked = false); actualizarContadorPermisos();
  });
  qs('#btn-perm-colapsar')?.addEventListener('click', (e) => {
    e.preventDefault(); qsa('.permiso-group').forEach(g => g.classList.add('collapsed'));
  });
  qs('#btn-perm-expandir')?.addEventListener('click', (e) => {
    e.preventDefault(); qsa('.permiso-group').forEach(g => g.classList.remove('collapsed'));
  });

  qs('#btn-copiar-permisos')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const fromId = qs('#rol-select-copiar')?.value; const toId = rolSelectPerm?.value;
    if (!fromId || !toId) return alert('Selecciona rol destino y rol a copiar');
    if (String(fromId) === String(toId)) return alert('Rol origen y destino son iguales');
    const actuales = await Roles.getPermisos(fromId);
    const claves = new Set((actuales||[]).map(p => p.clave));
    qsa('.permiso-item input').forEach(i => i.checked = claves.has(i.dataset.clave));
    actualizarContadorPermisos();
  });

  // 3) Catálogos genéricos: departamentos, turnos, cargos
  function catalogFactory(prefix, endpoint, tbodySel) {
    const idEl = qs(`#${prefix}-id`);
    const nombreEl = qs(`#${prefix}-nombre`);
    const descEl = qs(`#${prefix}-desc`);
  const btn = qs(`#btn-${prefix}-guardar`);
  const activoEl = null; // checkbox eliminado en UI; manejar activo con acciones de tabla
    const tbody = qs(tbodySel);
    const filtroActivo = qs(`#${prefix}-filtro-activo`);
    const list = async () => api.get(`/api/catalogos/${endpoint}`);
    const create = (p) => api.post(`/api/catalogos/${endpoint}`, p);
    const update = (id, p) => api.put(`/api/catalogos/${endpoint}/${id}`, p);
    const remove = (id) => api.del(`/api/catalogos/${endpoint}/${id}`);
    async function load() {
      const rows = await list();
      const filtered = rows.filter(r => {
        const f = (filtroActivo && filtroActivo.value !== '') ? Number(filtroActivo.value) : null;
        return f === null ? true : Number(r.activo) === f;
      });
      renderRows(tbody, filtered, (r) => `
        <tr data-id="${r.id}">
          <td>${r.id}</td>
          <td>${r.nombre}</td>
          <td>${r.descripcion||''}</td>
          <td>${Number(r.activo) ? '<span class="badge badge-success">Sí</span>' : '<span class="badge badge-danger">No</span>'}</td>
          <td>
            <button class="btn btn-sm btn-warning edit"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger del"><i class="fas fa-trash"></i></button>
            <button class="btn btn-sm ${Number(r.activo)?'btn-outline':'btn-success'} toggle-activo" title="${Number(r.activo)?'Desactivar':'Activar'}">
              ${Number(r.activo)?'<i class="fas fa-ban"></i>':'<i class="fas fa-check"></i>'}
            </button>
          </td>
        </tr>`);
      bind();
    }
    function bind() {
      tbody?.querySelectorAll('tr').forEach(tr => {
        const id = tr.getAttribute('data-id');
        tr.querySelector('.edit')?.addEventListener('click', async () => {
          const r = await api.get(`/api/catalogos/${endpoint}/${id}`);
          idEl.value = r.id;
          nombreEl.value = r.nombre || '';
          descEl.value = r.descripcion || '';
          // activo se gestiona desde el botón de acciones (toggle)
        });
        tr.querySelector('.del')?.addEventListener('click', async () => {
          if (!confirm('¿Eliminar registro?')) return;
          await remove(id); await load();
        });
        tr.querySelector('.toggle-activo')?.addEventListener('click', async () => {
          const row = await api.get(`/api/catalogos/${endpoint}/${id}`);
          const nuevo = Number(row.activo) ? 0 : 1;
          await update(id, { nombre: row.nombre, descripcion: row.descripcion, activo: nuevo });
          await load();
        });
      });
    }
    btn?.addEventListener('click', async () => {
      const payload = { nombre: nombreEl.value.trim(), descripcion: (descEl.value||'').trim() };
      if (!payload.nombre) return alert('Nombre es requerido');
      const id = idEl.value;
      if (id) {
        await update(id, payload);
      } else {
        // Al crear, activo=1 por defecto en backend o explícito aquí si el endpoint lo requiere
        await create({ ...payload, activo: 1 });
      }
      idEl.value=''; nombreEl.value=''; descEl.value='';
      await load();
    });
    filtroActivo?.addEventListener('change', load);
    return { load };
  }

  const depModule = catalogFactory('dep', 'departamentos', '#tabla-dep tbody');
  const turModule = catalogFactory('tur', 'turnos', '#tabla-tur tbody');
  const carModule = catalogFactory('car', 'cargos', '#tabla-car tbody');

  // 4) Restaurante: cargar/guardar configuración
  function actualizarPreviewFactura() {
    const nombre = qs('#nombre-restaurante')?.value?.trim() || 'Mi Restaurante';
    const dir = qs('#direccion-restaurante')?.value?.trim() || '';
    const tel = qs('#telefono-restaurante')?.value?.trim() || '';
    const em = qs('#email-restaurante')?.value?.trim() || '';
    const elNombre = document.getElementById('preview-nombre');
    const elDir = document.getElementById('preview-direccion');
    const elContacto = document.getElementById('preview-contacto');
    if (elNombre) elNombre.textContent = nombre;
    if (elDir) elDir.textContent = dir;
    if (elContacto) {
      const parts = [];
      if (tel) parts.push(tel);
      if (em) parts.push(em);
      elContacto.textContent = parts.join(' · ');
    }
  }

  async function loadRestaurante() {
    try {
      const cfg = await api.get('/api/restaurante');
      const setVal = (id, val) => { const el = qs(id); if (el) el.value = val ?? el.value; };
      setVal('#nombre-restaurante', cfg.nombre || '');
      setVal('#direccion-restaurante', cfg.direccion || '');
      setVal('#telefono-restaurante', cfg.telefono || '');
      setVal('#email-restaurante', cfg.email || '');
      setVal('#iva-porcentaje', cfg.iva_porcentaje ?? 16);
      setVal('#propina-automatica', cfg.propina_automatica ?? 10);
      const inc = qs('#incluir-iva-precios'); if (inc) inc.checked = Number(cfg.incluir_iva ?? 1) === 1;
      // Cachear en localStorage y en memoria global
      try { localStorage.setItem('restauranteConfig', JSON.stringify(cfg)); } catch {}
      window.__restauranteConfig = cfg;
      // Actualizar vista previa
      actualizarPreviewFactura();
      // Horarios: si existieran, podríamos mapearlos aquí (dejamos como enhancement futuro)
    } catch (e) {
      console.warn('No se pudo cargar configuración de restaurante:', e?.message);
    }
  }

  async function saveRestaurante() {
    const payload = {
      nombre: qs('#nombre-restaurante')?.value?.trim(),
      direccion: qs('#direccion-restaurante')?.value?.trim(),
      telefono: qs('#telefono-restaurante')?.value?.trim(),
      email: qs('#email-restaurante')?.value?.trim(),
      iva_porcentaje: Number(qs('#iva-porcentaje')?.value || 16),
      propina_automatica: Number(qs('#propina-automatica')?.value || 10),
      incluir_iva: qs('#incluir-iva-precios')?.checked ? 1 : 0,
    };
    const saved = await api.put('/api/restaurante', payload);
    // Persistir en cache y emitir evento para otras vistas
    try { localStorage.setItem('restauranteConfig', JSON.stringify(saved)); } catch {}
    window.__restauranteConfig = saved;
    try { window.dispatchEvent(new CustomEvent('restauranteConfigUpdated', { detail: saved })); } catch {}
    actualizarPreviewFactura();
    return saved;
  }

  qs('#btn-guardar-ajustes')?.addEventListener('click', async () => {
    try {
      await saveRestaurante();
      alert('Ajustes guardados');
    } catch (e) {
      alert('Error al guardar ajustes: ' + (e?.message || ''));
    }
  });

  // Enlazar inputs a la vista previa de factura
  ['#nombre-restaurante','#direccion-restaurante','#telefono-restaurante','#email-restaurante']
    .forEach(sel => { const el = qs(sel); if (el) el.addEventListener('input', actualizarPreviewFactura, true); });

  // 5) Mesas: aplicar disposición
  qs('#btn-aplicar-disposicion')?.addEventListener('click', async () => {
    const total = Number(qs('#numero-mesas')?.value || 0);
    const d2 = Number(qs('#mesas-2personas')?.value || 0);
    const d4 = Number(qs('#mesas-4personas')?.value || 0);
    const d6 = Number(qs('#mesas-6personas')?.value || 0);
    const d8 = Number(qs('#mesas-8personas')?.value || 0);
    const reset = !!qs('#mesas-reset')?.checked;
    const payload = { total, dist: { '2': d2, '4': d4, '6': d6, '8': d8 }, ubicaciones: ['interior','exterior','terraza'], reset };
    try {
      const r = await Mesas.bulkGenerate(payload);
      alert(`Mesas aplicadas. Creadas: ${r?.created ?? 0}`);
    } catch (e) {
      alert('Error aplicando disposición: ' + (e?.message || ''));
    }
  });

  // 6) Backup: wiring básico
  async function refreshBackupList() {
    try {
      const items = await api.get('/api/backup');
      // Rellenar historial
      const tbody = document.querySelector('#tabla-backups tbody');
      if (tbody) {
        tbody.innerHTML = (items||[]).map(it => {
          const date = new Date(it.mtime).toLocaleString();
          const size = (it.size/1024/1024).toFixed(1) + ' MB';
          return `<tr>
            <td>${date}</td>
            <td>${size}</td>
            <td>Manual</td>
            <td><span class="badge badge-success">Completado</span></td>
            <td>
              <a class="btn btn-sm btn-primary" href="/api/backup/download/${encodeURIComponent(it.file)}"><i class="fas fa-download"></i></a>
            </td>
          </tr>`;
        }).join('') || '<tr><td colspan="5">Sin backups</td></tr>';
      }
      // Actualizar cabecera
      const last = items[0];
      const st = document.querySelector('#seccion-backup .backup-status span');
      const sz = document.querySelector('#seccion-backup .backup-size span');
      if (last) {
        if (st) st.textContent = `Último backup: ${new Date(last.mtime).toLocaleString()}`;
        if (sz) sz.textContent = `Tamaño: ${(last.size/1024/1024).toFixed(1)} MB`;
      }
    } catch (_) {}
  }

  const btnCrearBackup = document.querySelector('#seccion-backup .backup-actions .btn.btn-primary');
  btnCrearBackup?.addEventListener('click', async () => {
    const r = await api.post('/api/backup/create', {});
    alert('Backup creado: ' + r.file);
    await refreshBackupList();
  });

  const btnRestore = document.querySelector('#seccion-backup .restore-actions .btn.btn-warning');
  btnRestore?.addEventListener('click', async () => {
  const input = document.getElementById('archivo-backup');
  const fileObj = input?.files?.[0];
  if (!fileObj) { alert('Selecciona un archivo'); return; }
  const fd = new FormData();
  fd.append('file', fileObj);
  // Subir al servidor
  await fetch('/api/backup/upload', { method: 'POST', body: fd });
  // Restaurar a partir del nombre subido
  await api.post('/api/backup/restore', { file: fileObj.name });
    alert('Restaurado');
  });

  const btnRestoreDefaults = document.querySelector('#seccion-backup .restore-actions .btn.btn-danger');
  btnRestoreDefaults?.addEventListener('click', async () => {
    if (!confirm('Esto sobrescribirá tus datos. ¿Continuar?')) return;
    await api.post('/api/backup/restore-defaults', {});
    alert('Restaurado a valores por defecto');
  });

  // Inicialización: cargar roles y permisos, luego sincronizar selección
  Promise.all([
    loadRoles(),
    loadPermisosDisponibles(),
    depModule.load(),
    turModule.load(),
    carModule.load(),
  loadRestaurante(),
  refreshBackupList(),
  ])
  .then(() => syncPermisosRol())
  .catch(err => console.error('Error inicializando Ajustes:', err));

  // Programación de backup automático
  const freqSel = document.getElementById('frecuencia-backup');
  freqSel?.addEventListener('change', async () => {
    try { await api.post('/api/backup/schedule', { frequency: freqSel.value }); } catch (_) {}
  });
}
