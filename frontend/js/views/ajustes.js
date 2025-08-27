// js/views/ajustes.js
import { api, Roles } from '../core/api.js';

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
    setOptions(qs('#rol-select-permisos'), roles, { placeholder: 'Elige un rol' });
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
    permisosContainer.innerHTML = all.map(p => `
      <label class="checkbox permiso-item">
        <input type="checkbox" data-clave="${p.clave}" data-id="${p.id}"> ${p.nombre} <span class="badge">${p.tipo}</span>
      </label>`).join('');
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
    alert('Permisos guardados');
  });

  // 3) Catálogos genéricos: departamentos, turnos, cargos
  function catalogFactory(prefix, endpoint, tbodySel) {
    const idEl = qs(`#${prefix}-id`);
    const nombreEl = qs(`#${prefix}-nombre`);
    const descEl = qs(`#${prefix}-desc`);
    const btn = qs(`#btn-${prefix}-guardar`);
    const tbody = qs(tbodySel);
    const list = async () => api.get(`/api/catalogos/${endpoint}`);
    const create = (p) => api.post(`/api/catalogos/${endpoint}`, p);
    const update = (id, p) => api.put(`/api/catalogos/${endpoint}/${id}`, p);
    const remove = (id) => api.del(`/api/catalogos/${endpoint}/${id}`);
    async function load() {
      const rows = await list();
      renderRows(tbody, rows, (r) => `
        <tr data-id="${r.id}">
          <td>${r.id}</td>
          <td>${r.nombre}</td>
          <td>${r.descripcion||''}</td>
          <td>${Number(r.activo) ? '<span class="badge badge-success">Sí</span>' : '<span class="badge badge-danger">No</span>'}</td>
          <td>
            <button class="btn btn-sm btn-warning edit"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger del"><i class="fas fa-trash"></i></button>
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
        });
        tr.querySelector('.del')?.addEventListener('click', async () => {
          if (!confirm('¿Eliminar registro?')) return;
          await remove(id); await load();
        });
      });
    }
    btn?.addEventListener('click', async () => {
      const payload = { nombre: nombreEl.value.trim(), descripcion: (descEl.value||'').trim(), activo: 1 };
      if (!payload.nombre) return alert('Nombre es requerido');
      const id = idEl.value;
      if (id) await update(id, payload); else await create(payload);
      idEl.value=''; nombreEl.value=''; descEl.value='';
      await load();
    });
    return { load };
  }

  const depModule = catalogFactory('dep', 'departamentos', '#tabla-dep tbody');
  const turModule = catalogFactory('tur', 'turnos', '#tabla-tur tbody');
  const carModule = catalogFactory('car', 'cargos', '#tabla-car tbody');

  // Inicialización
  Promise.all([
    loadRoles(),
    loadPermisosDisponibles().then(syncPermisosRol),
    depModule.load(),
    turModule.load(),
    carModule.load(),
  ]).catch(err => console.error('Error inicializando Ajustes:', err));
}
