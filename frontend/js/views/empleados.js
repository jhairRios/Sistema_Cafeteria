// js/views/empleados.js
import { api, Empleados, Roles } from '../core/api.js';
import { enhanceAllSelects, refreshEnhancedSelect } from '../core/dom.js';

export function initEmpleados() {
  console.log('Vista Empleados inicializada');
  let permisos = [];
  try { permisos = JSON.parse(sessionStorage.getItem('permisos')||'[]'); } catch(_) {}
  const canCreate = permisos.includes('action.empleados.add') || permisos.includes('action.empleados.crud');
  const canUpdate = permisos.includes('action.empleados.edit') || permisos.includes('action.empleados.crud');
  const canDelete = permisos.includes('action.empleados.delete') || permisos.includes('action.empleados.crud');

  const tbody = document.querySelector('#tabla-empleados tbody');
  const modal = document.getElementById('modal-empleado');
  const closeModal = document.querySelector('#modal-empleado .close-modal');
  const cancelBtn = document.getElementById('btn-cancelar-empleado');
  const empleadoForm = document.getElementById('form-empleado');
  const addEmpleadoBtn = document.getElementById('btn-agregar-empleado');
  if (addEmpleadoBtn && !canCreate) addEmpleadoBtn.style.display = 'none';
  const rolSelect = document.getElementById('empleado-rol');
  const usuarioInput = document.getElementById('empleado-usuario');
  const pwdInput = document.getElementById('empleado-contrasena');

  let empleadosCache = [];
  let rolesCache = [];

  function setOptions(select, items, { valueKey = 'id', labelKey = 'nombre', placeholder = 'Seleccionar' } = {}) {
    if (!select) return;
    select.innerHTML = '';
    const ph = document.createElement('option'); ph.value = ''; ph.textContent = placeholder; select.appendChild(ph);
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

  function ensureOption(select, value) {
    if (!select || !value) return;
    const exists = Array.from(select.options).some(o => String(o.value) === String(value));
    if (!exists) {
      const o = document.createElement('option');
      o.value = value; o.textContent = value;
      select.appendChild(o);
    }
    select.value = value;
    // Actualizar UI mejorada si aplica
    if (select.dataset.enhanced === 'true') refreshEnhancedSelect(select);
  }

  function refreshOrEnhance(select) {
    if (!select) return;
    if (select.dataset.enhanced === 'true') refreshEnhancedSelect(select);
    else enhanceAllSelects(document);
  }

  async function loadRoles() {
    if (rolesCache.length) return rolesCache;
    try {
      rolesCache = await Roles.all();
    } catch (e) {
      console.error('Error cargando roles', e);
      rolesCache = [ { id: 1, nombre: 'Administrador' }, { id: 2, nombre: 'Cajero' }, { id: 3, nombre: 'Mesero' } ];
    }
    setOptions(rolSelect, rolesCache, { placeholder: 'Selecciona un rol' });
    // Reaplicar mejoras de select custom si existen estilos
    if (rolSelect) {
      if (rolSelect.dataset.enhanced === 'true') refreshEnhancedSelect(rolSelect);
      else enhanceAllSelects(document);
    }
    return rolesCache;
  }

  async function loadCatalogosDatalists() {
    try {
      const [deps, turns, cars] = await Promise.all([
        api.get('/api/catalogos/departamentos'),
        api.get('/api/catalogos/turnos'),
        api.get('/api/catalogos/cargos'),
      ]);
  const depsAct = (deps||[]).filter(d => Number(d.activo) === 1 || d.activo === true || d.activo === 1);
  const turnsAct = (turns||[]).filter(t => Number(t.activo) === 1 || t.activo === true || t.activo === 1);
  const carsAct = (cars||[]).filter(c => Number(c.activo) === 1 || c.activo === true || c.activo === 1);
  const depsUse = depsAct.length ? depsAct : (deps||[]);
  const turnsUse = turnsAct.length ? turnsAct : (turns||[]);
  const carsUse = carsAct.length ? carsAct : (cars||[]);
  const depSelEl = document.getElementById('empleado-departamento');
  const turSelEl = document.getElementById('empleado-turno');
  const carSelEl = document.getElementById('empleado-posicion');
  setOptions(depSelEl, depsUse, { valueKey: 'nombre', labelKey: 'nombre', placeholder: 'Selecciona un departamento' });
  setOptions(turSelEl, turnsUse, { valueKey: 'nombre', labelKey: 'nombre', placeholder: 'Selecciona un turno' });
  setOptions(carSelEl, carsUse, { valueKey: 'nombre', labelKey: 'nombre', placeholder: 'Selecciona un cargo' });
  refreshOrEnhance(depSelEl); refreshOrEnhance(turSelEl); refreshOrEnhance(carSelEl);
    } catch (e) {
      // Si falla, intentar poblar con valores existentes en la lista de empleados
      const depVals = Array.from(new Set((empleadosCache||[]).map(e=>e.departamento).filter(Boolean)));
      const turVals = Array.from(new Set((empleadosCache||[]).map(e=>e.turno).filter(Boolean)));
      const carVals = Array.from(new Set((empleadosCache||[]).map(e=>e.posicion).filter(Boolean)));
  const depSelEl = document.getElementById('empleado-departamento');
  const turSelEl = document.getElementById('empleado-turno');
  const carSelEl = document.getElementById('empleado-posicion');
  setOptions(depSelEl, depVals.map(n=>({ nombre:n })), { valueKey: 'nombre', labelKey: 'nombre', placeholder: 'Selecciona un departamento' });
  setOptions(turSelEl, turVals.map(n=>({ nombre:n })), { valueKey: 'nombre', labelKey: 'nombre', placeholder: 'Selecciona un turno' });
  setOptions(carSelEl, carVals.map(n=>({ nombre:n })), { valueKey: 'nombre', labelKey: 'nombre', placeholder: 'Selecciona un cargo' });
  refreshOrEnhance(depSelEl); refreshOrEnhance(turSelEl); refreshOrEnhance(carSelEl);
    }
  }

  // Cargar opciones de filtros desde catálogos de Ajustes (y fallback a empleados si falla)
  async function loadFilterCatalogs() {
    const depFilter = document.getElementById('filtro-departamento');
    const turnoFilter = document.getElementById('filtro-turno');
    try {
      const [deps, turns] = await Promise.all([
        api.get('/api/catalogos/departamentos'),
        api.get('/api/catalogos/turnos'),
      ]);
      const depsAct = (deps||[]).filter(d => Number(d.activo) === 1 || d.activo === true || d.activo === 1).map(d => d.nombre);
      const turnsAct = (turns||[]).filter(t => Number(t.activo) === 1 || t.activo === true || t.activo === 1).map(t => t.nombre);
      const uniqueSorted = (arr) => Array.from(new Set(arr.filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
      const fill = (select, values, placeholder) => {
        if (!select) return;
        const current = select.value;
        select.innerHTML = '';
        const ph = document.createElement('option'); ph.value = ''; ph.textContent = placeholder; select.appendChild(ph);
        uniqueSorted(values).forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; select.appendChild(o); });
        const exists = Array.from(select.options).some(o => o.value === current);
        select.value = exists ? current : '';
      };
      fill(depFilter, depsAct, 'Todos los departamentos');
      fill(turnoFilter, turnsAct, 'Todos los turnos');
    } catch(_) {
      // Fallback a valores existentes en empleados
      const uniqueSorted = (arr) => Array.from(new Set(arr.filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
      const fill = (select, values, placeholder) => {
        if (!select) return;
        const current = select.value;
        select.innerHTML = '';
        const ph = document.createElement('option'); ph.value = ''; ph.textContent = placeholder; select.appendChild(ph);
        uniqueSorted(values).forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; select.appendChild(o); });
        const exists = Array.from(select.options).some(o => o.value === current);
        select.value = exists ? current : '';
      };
      fill(depFilter, empleadosCache.map(e=>e.departamento), 'Todos los departamentos');
      fill(turnoFilter, empleadosCache.map(e=>e.turno), 'Todos los turnos');
    }
  }

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
          ${canUpdate ? `<button class="btn btn-sm btn-warning btn-editar" data-id="${e.id}"><i class="fas fa-edit"></i></button>` : ''}
          ${canDelete ? `<button class="btn btn-sm btn-danger btn-eliminar" data-id="${e.id}"><i class="fas fa-trash"></i></button>` : ''}
          <button class="btn btn-sm btn-info btn-ver" data-id="${e.id}"><i class="fas fa-eye"></i></button>
        </td>
      </tr>`;
  }

  function bindRowActions(tr) {
    const id = tr.getAttribute('data-id');
  tr.querySelector('.btn-editar')?.addEventListener('click', async () => {
      if (!canUpdate) return;
      try {
        const emp = await Empleados.get(id);
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
  await loadRoles();
  await loadCatalogosDatalists();
  if (usuarioInput) { usuarioInput.value = emp.usuario || ''; usuarioInput.disabled = false; }
  if (pwdInput) { pwdInput.value = emp.contrasena || ''; pwdInput.disabled = false; }
  if (rolSelect) { rolSelect.disabled = false; rolSelect.value = String(emp.rol_id || ''); }
  // Setear valores en selects de catálogos
  const depSel = document.getElementById('empleado-departamento'); if (depSel) { if (emp.departamento) ensureOption(depSel, emp.departamento); else { depSel.value = ''; refreshOrEnhance(depSel); } }
  const turSel = document.getElementById('empleado-turno'); if (turSel) { if (emp.turno) ensureOption(turSel, emp.turno); else { turSel.value = ''; refreshOrEnhance(turSel); } }
  const carSel = document.getElementById('empleado-posicion'); if (carSel) { if (emp.posicion) ensureOption(carSel, emp.posicion); else { carSel.value = ''; refreshOrEnhance(carSel); } }
        modal && (modal.style.display = 'block');
      } catch (e) {
        alert('No se pudo cargar el empleado');
      }
    });

    tr.querySelector('.btn-eliminar')?.addEventListener('click', async () => {
      if (!canDelete) return;
      if (!confirm('¿Eliminar empleado?')) return;
      try {
        await Empleados.remove(id);
        tr.remove();
      } catch (e) {
        alert('No se pudo eliminar');
      }
    });
  }

  async function loadEmpleados() {
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';
    try {
      empleadosCache = await Empleados.list();
      tbody.innerHTML = empleadosCache.map(rowHtml).join('') || '<tr><td colspan="8">Sin registros</td></tr>';
      tbody.querySelectorAll('tr').forEach(bindRowActions);
      // Poblar datalists
      setDatalist(document.getElementById('lista-departamentos'), empleadosCache.map(e => e.departamento || ''));
      setDatalist(document.getElementById('lista-turnos'), empleadosCache.map(e => e.turno || ''));
      try {
        const cargos = await api.get('/api/catalogos/cargos');
        setDatalist(document.getElementById('lista-cargos'), cargos.map(c => c.nombre));
      } catch(_) {}
      const estadosDb = Array.from(new Set(empleadosCache.map(e => e.estado).filter(Boolean)));
      const defaultsEstado = ['activo','inactivo','vacaciones','licencia'];
      setDatalist(document.getElementById('lista-estados'), estadosDb.length ? estadosDb : defaultsEstado);

      // Poblar filtros dinámicos: departamentos/turnos desde catálogos de Ajustes; estados desde empleados
      const depFilter = document.getElementById('filtro-departamento');
      const estadoFilter = document.getElementById('filtro-estado');
      const turnoFilter = document.getElementById('filtro-turno');
      await loadFilterCatalogs();
      const uniqueSorted = (arr) => Array.from(new Set(arr.filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
      const fillEstado = (select, values, placeholder) => {
        if (!select) return;
        const current = select.value;
        select.innerHTML = '';
        const ph = document.createElement('option'); ph.value = ''; ph.textContent = placeholder; select.appendChild(ph);
        uniqueSorted(values).forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; select.appendChild(o); });
        const exists = Array.from(select.options).some(o => o.value === current);
        select.value = exists ? current : '';
      };
      fillEstado(estadoFilter, empleadosCache.map(e=>e.estado), 'Todos los estados');

      // Vincular eventos de filtro si no existen
      const searchInput = document.getElementById('buscar-empleado');
      const applyFilters = () => {
        const depVal = depFilter?.value || '';
        const estVal = estadoFilter?.value || '';
        const turVal = turnoFilter?.value || '';
        const term = (searchInput?.value || '').toLowerCase();
        const filtered = empleadosCache.filter(e => {
          const okDep = !depVal || (e.departamento || '').toLowerCase() === depVal.toLowerCase();
          const okEst = !estVal || (e.estado || '').toLowerCase() === estVal.toLowerCase();
          const okTur = !turVal || (e.turno || '').toLowerCase() === turVal.toLowerCase();
          const okTerm = !term || [e.nombre, e.posicion, e.telefono, e.departamento, e.turno].some(v => (v||'').toLowerCase().includes(term));
          return okDep && okEst && okTur && okTerm;
        });
        tbody.innerHTML = filtered.map(rowHtml).join('') || '<tr><td colspan="8">Sin registros</td></tr>';
        tbody.querySelectorAll('tr').forEach(bindRowActions);
      };
  if (depFilter && !depFilter.__bound) { depFilter.addEventListener('change', applyFilters); depFilter.__bound = true; }
      if (estadoFilter && !estadoFilter.__bound) { estadoFilter.addEventListener('change', applyFilters); estadoFilter.__bound = true; }
      if (turnoFilter && !turnoFilter.__bound) { turnoFilter.addEventListener('change', applyFilters); turnoFilter.__bound = true; }
      if (searchInput && !searchInput.__bound) { searchInput.addEventListener('input', applyFilters); searchInput.__bound = true; }
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8">${e.message || 'Error al cargar'}</td></tr>`;
      console.error(e);
    }
  }

  empleadoForm?.addEventListener('submit', async (e) => {
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
      direccion: document.getElementById('empleado-direccion').value.trim(),
    };
  if (!id) {
      if (!canCreate) { alert('No tienes permiso para agregar empleados'); return; }
      payload.usuario = document.getElementById('empleado-usuario').value.trim();
      payload.contrasena = document.getElementById('empleado-contrasena').value.trim();
      payload.rol_id = Number(rolSelect?.value) || 1;
    }
    try {
      if (id) {
        if (!canUpdate) { alert('No tienes permiso para editar empleados'); return; }
        // Campos adicionales en edición
        if (usuarioInput) payload.usuario = String(usuarioInput.value || '').trim();
        if (rolSelect) payload.rol_id = Number(rolSelect.value) || 1;
        if (pwdInput && String(pwdInput.value || '').trim()) payload.contrasena = String(pwdInput.value).trim();
        await Empleados.update(id, payload);
      } else {
        await Empleados.create(payload);
      }
      await loadEmpleados();
      modal && (modal.style.display = 'none');
    } catch (e) {
      if (e.status === 409) {
        alert(e.message || 'El correo ya está registrado');
      } else {
        alert(e.message || 'No se pudo guardar');
      }
    }
  });

  // Toggle mostrar/ocultar contraseña en el modal si existe el botón
  const togglePwdBtn = document.getElementById('toggle-empleado-contrasena');
  if (togglePwdBtn && pwdInput) {
    let visible = false;
    togglePwdBtn.addEventListener('click', () => {
      visible = !visible;
      pwdInput.type = visible ? 'text' : 'password';
      togglePwdBtn.innerHTML = visible ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    });
  }

  addEmpleadoBtn?.addEventListener('click', async () => {
    if (!canCreate) return;
    document.getElementById('modal-titulo-empleado').textContent = 'Agregar Empleado';
    document.getElementById('empleado-id').value = '';
    empleadoForm?.reset();
  if (usuarioInput) usuarioInput.disabled = false;
  if (pwdInput) pwdInput.disabled = false;
  if (rolSelect) rolSelect.disabled = false;
    await loadRoles();
  await loadCatalogosDatalists();
  // Asegurar refresh visual de selects
  refreshOrEnhance(document.getElementById('empleado-departamento'));
  refreshOrEnhance(document.getElementById('empleado-turno'));
  refreshOrEnhance(document.getElementById('empleado-posicion'));
    modal && (modal.style.display = 'block');
  });

  const close = () => { if (modal) modal.style.display = 'none'; };
  closeModal?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);
  window.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // Inicial
  loadEmpleados();
  loadRoles();
  loadCatalogosDatalists();
}
