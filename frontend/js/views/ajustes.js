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
    const all = await api.get('/api/permisos');
  permisosContainer.dataset.all = JSON.stringify(all);
  permisosContainer.innerHTML = all.map(p => `
      <label class="checkbox permiso-item">
        <input type="checkbox" data-clave="${p.clave}" data-id="${p.id}"> ${p.nombre} <span class="badge">${p.tipo}</span>
      </label>`).join('');
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
    const filtrados = all.filter(p => (p.nombre||'').toLowerCase().includes(term) || (p.clave||'').toLowerCase().includes(term));
    permisosContainer.innerHTML = filtrados.map(p => `
      <label class="checkbox permiso-item">
        <input type="checkbox" data-clave="${p.clave}" data-id="${p.id}"> ${p.nombre} <span class="badge">${p.tipo}</span>
      </label>`).join('');
    // Re-sincronizar con rol seleccionado actual
    syncPermisosRol().then(() => actualizarContadorPermisos());
  });

  qs('#btn-perm-todo')?.addEventListener('click', (e) => {
    e.preventDefault(); qsa('.permiso-item input').forEach(i => i.checked = true); actualizarContadorPermisos();
  });
  qs('#btn-perm-limpiar')?.addEventListener('click', (e) => {
    e.preventDefault(); qsa('.permiso-item input').forEach(i => i.checked = false); actualizarContadorPermisos();
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
  const activoEl = qs(`#${prefix}-activo`);
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
          if (activoEl) activoEl.checked = Number(r.activo) === 1;
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
      const payload = { nombre: nombreEl.value.trim(), descripcion: (descEl.value||'').trim(), activo: activoEl && activoEl.checked ? 1 : 0 };
      if (!payload.nombre) return alert('Nombre es requerido');
      const id = idEl.value;
      if (id) await update(id, payload); else await create(payload);
      idEl.value=''; nombreEl.value=''; descEl.value=''; if (activoEl) activoEl.checked = true;
      await load();
    });
    filtroActivo?.addEventListener('change', load);
    return { load };
  }

  const depModule = catalogFactory('dep', 'departamentos', '#tabla-dep tbody');
  const turModule = catalogFactory('tur', 'turnos', '#tabla-tur tbody');
  const carModule = catalogFactory('car', 'cargos', '#tabla-car tbody');

  // 4) Restaurante: cargar/guardar configuración
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
    await api.put('/api/restaurante', payload);
  }

  qs('#btn-guardar-ajustes')?.addEventListener('click', async () => {
    try {
      await saveRestaurante();
      alert('Ajustes guardados');
    } catch (e) {
      alert('Error al guardar ajustes: ' + (e?.message || ''));
    }
  });

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
