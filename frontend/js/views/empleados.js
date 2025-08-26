// js/views/empleados.js
import { api, Empleados, Roles } from '../core/api.js';
import { enhanceAllSelects, refreshEnhancedSelect } from '../core/dom.js';

export function initEmpleados() {
  console.log('Vista Empleados inicializada');

  const tbody = document.querySelector('#tabla-empleados tbody');
  const modal = document.getElementById('modal-empleado');
  const closeModal = document.querySelector('#modal-empleado .close-modal');
  const cancelBtn = document.getElementById('btn-cancelar-empleado');
  const empleadoForm = document.getElementById('form-empleado');
  const addEmpleadoBtn = document.getElementById('btn-agregar-empleado');
  const rolSelect = document.getElementById('empleado-rol');

  let empleadosCache = [];
  let rolesCache = [];

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
        document.getElementById('empleado-usuario').disabled = true;
        document.getElementById('empleado-contrasena').disabled = true;
        document.getElementById('empleado-rol').disabled = true;
        modal && (modal.style.display = 'block');
      } catch (e) {
        alert('No se pudo cargar el empleado');
      }
    });

    tr.querySelector('.btn-eliminar')?.addEventListener('click', async () => {
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
      const estadosDb = Array.from(new Set(empleadosCache.map(e => e.estado).filter(Boolean)));
      const defaultsEstado = ['activo','inactivo','vacaciones','licencia'];
      setDatalist(document.getElementById('lista-estados'), estadosDb.length ? estadosDb : defaultsEstado);

      // Poblar filtros dinámicos (selects superiores)
      const depFilter = document.getElementById('filtro-departamento');
      const estadoFilter = document.getElementById('filtro-estado');
      const turnoFilter = document.getElementById('filtro-turno');
      const uniqueSorted = (arr) => Array.from(new Set(arr.filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
      const fillFilter = (select, values, placeholder) => {
        if (!select) return;
        const current = select.value;
        select.innerHTML = '';
        const ph = document.createElement('option'); ph.value = ''; ph.textContent = placeholder; select.appendChild(ph);
        uniqueSorted(values).forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; select.appendChild(o); });
        // Restaurar selección si sigue válida
        const exists = Array.from(select.options).some(o => o.value === current);
        select.value = exists ? current : '';
      };
      fillFilter(depFilter, empleadosCache.map(e=>e.departamento), 'Todos los departamentos');
      fillFilter(estadoFilter, empleadosCache.map(e=>e.estado), 'Todos los estados');
      fillFilter(turnoFilter, empleadosCache.map(e=>e.turno), 'Todos los turnos');

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
      payload.usuario = document.getElementById('empleado-usuario').value.trim();
      payload.contrasena = document.getElementById('empleado-contrasena').value.trim();
      payload.rol_id = Number(rolSelect?.value) || 1;
    }
    try {
      if (id) await Empleados.update(id, payload); else await Empleados.create(payload);
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

  addEmpleadoBtn?.addEventListener('click', async () => {
    document.getElementById('modal-titulo-empleado').textContent = 'Agregar Empleado';
    document.getElementById('empleado-id').value = '';
    empleadoForm?.reset();
    document.getElementById('empleado-usuario').disabled = false;
    document.getElementById('empleado-contrasena').disabled = false;
    document.getElementById('empleado-rol').disabled = false;
    await loadRoles();
    modal && (modal.style.display = 'block');
  });

  const close = () => { if (modal) modal.style.display = 'none'; };
  closeModal?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);
  window.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // Inicial
  loadEmpleados();
  loadRoles();
}
