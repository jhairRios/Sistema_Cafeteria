// js/views/home.js
import { api, Mesas as MesasAPI } from '../core/api.js';

export function initHome() {
  console.log('Vista Home inicializada');
  loadLowStock();
  const refresh = () => loadMesasDashboard();
  try { window.addEventListener('mesasStateChanged', refresh); } catch {}
  // Si otra pestaña o módulo actualiza localStorage, refrescar tablero de mesas
  try {
    window.addEventListener('storage', (e) => {
      if (e.key === 'mesasState') refresh();
    });
  } catch {}
  loadMesasDashboard();
}

async function loadLowStock() {
  const countEl = document.getElementById('low-stock-count');
  const tbody = document.getElementById('low-stock-tbody');
  if (!countEl || !tbody) return;
  try {
    const productos = await api.get('/api/productos');
    const arr = Array.isArray(productos) ? productos : [];
    const bajos = arr.filter(p => Number(p.stock) > 0 && Number(p.stock) < Number(p.stock_minimo || 0));
    const agotados = arr.filter(p => Number(p.stock) <= 0);
    // Orden: primero agotados (rojo), luego bajos (amarillo)
    const lista = [...agotados, ...bajos];
    const total = lista.length;
    countEl.textContent = `${total} producto${total === 1 ? '' : 's'}`;
    // Ajustar color del banner: si hay agotados => danger, si no y hay bajos => warning, sino mantener
    const alertEl = document.getElementById('low-stock-alert');
    if (alertEl) {
      alertEl.classList.remove('alert-warning', 'alert-danger');
      if (agotados.length > 0) alertEl.classList.add('alert-danger');
      else if (bajos.length > 0) alertEl.classList.add('alert-warning');
      else alertEl.classList.add('alert-warning');
    }
    tbody.innerHTML = lista.map(p => {
      const estado = Number(p.stock) <= 0 ? {label: 'Agotado', cls: 'badge-danger'} : {label: 'Bajo', cls: 'badge-warning'};
      return `
        <tr>
          <td>${escapeHtml(p.nombre)}</td>
          <td>${p.stock}</td>
          <td>${p.stock_minimo ?? 0}</td>
          <td><span class="badge ${estado.cls}">${estado.label}</span></td>
        </tr>`;
    }).join('');
    if (total === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No hay productos con stock bajo.</td></tr>';
    }
  } catch (err) {
    console.error('Error cargando low-stock:', err);
    countEl.textContent = '0 productos';
    tbody.innerHTML = '<tr><td colspan="4">No se pudo cargar la información.</td></tr>';
  }
}

function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

async function loadMesasDashboard() {
  const grid = document.getElementById('home-grid-mesas');
  const elDisp = document.getElementById('home-mesas-disponibles');
  const elOc = document.getElementById('home-mesas-ocupadas');
  const elRes = null; // removido
  if (!grid || !elDisp || !elOc) return;
  try {
    let mesas = await api.get('/api/mesas');
    let arr = Array.isArray(mesas) ? mesas : [];
    // Normalizar: no hay estado 'reservada'
    arr = arr.map(m => ({ ...m, estado: m.estado === 'reservada' ? 'disponible' : m.estado }));
    // Respetar overrides locales
    try {
      const overrides = JSON.parse(localStorage.getItem('mesasState') || '{}');
      arr = arr.map(m => {
        const ov = overrides[m.id];
        if (ov && ov.estado) {
          const est = ov.estado === 'reservada' ? 'disponible' : ov.estado;
          return { ...m, estado: est };
        }
        return m;
      });
    } catch {}
    const disponibles = arr.filter(m => m.estado === 'disponible').length;
    const ocupadas = arr.filter(m => m.estado === 'ocupada').length;
    elDisp.textContent = String(disponibles);
    elOc.textContent = String(ocupadas);
  // elRes removido
    grid.innerHTML = arr.map(m => {
      const estadoClase = m.estado === 'ocupada' ? 'mesa-ocupada' : 'mesa-disponible';
      const estadoBadge = m.estado === 'ocupada'
        ? '<div class="mesa-estado estado-ocupada">Ocupada</div>'
        : '<div class="mesa-estado estado-disponible">Disponible</div>';
        const acciones = m.estado === 'ocupada'
          ? `<div class="mesa-actions">
               <button class="btn btn-sm btn-info btn-ver-mesa" data-id="${m.id}"><i class="fas fa-eye"></i> Ver</button>
               <button class="btn btn-sm btn-primary btn-cerrar-mesa" data-id="${m.id}"><i class="fas fa-check"></i> Cerrar</button>
             </div>`
          : `<div class="mesa-actions"><button class="btn btn-sm btn-success btn-ocupar-mesa" data-id="${m.id}"><i class="fas fa-play"></i> Ocupar</button></div>`;
      return `
        <div class="mesa-card ${estadoClase}" data-id="${m.id}" data-estado="${m.estado}" data-capacidad="${m.capacidad}">
          <div class="mesa-numero">Mesa ${m.numero}</div>
          ${estadoBadge}
          ${acciones}
        </div>`;
    }).join('');

    // Referencias a modal de ocupar (Home)
    const modal = document.getElementById('modal-ocupar-home');
    const form = document.getElementById('form-ocupar-home');
    const closeBtn = document.getElementById('close-ocupar-home');
    const cancelBtn = document.getElementById('btn-cancelar-ocupar-home');

    function abrirModalOcupar(mesaId) {
      const idInput = document.getElementById('mesa-ocupar-id-home');
      if (idInput) idInput.value = mesaId;
      form?.reset();
      if (modal) modal.style.display = 'block';
    }

    function cerrarModalOcupar() {
      if (modal) modal.style.display = 'none';
    }

    closeBtn?.addEventListener('click', cerrarModalOcupar);
    cancelBtn?.addEventListener('click', cerrarModalOcupar);
    window.addEventListener('click', (e) => { if (e.target === modal) cerrarModalOcupar(); });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const mesaId = document.getElementById('mesa-ocupar-id-home')?.value;
      const cliente = document.getElementById('cliente-nombre-home')?.value || 'Cliente';
      const personas = parseInt(document.getElementById('cliente-personas-home')?.value || '0', 10);
      if (!mesaId || !Number.isFinite(personas) || personas <= 0) return;
      try {
        await MesasAPI.setEstado(mesaId, 'ocupada', { cliente, personas, tiempoInicio: new Date().toISOString() });
        // Sync local
        try {
          const state = JSON.parse(localStorage.getItem('mesasState') || '{}');
          state[mesaId] = { estado: 'ocupada', datos: { cliente, personas } };
          localStorage.setItem('mesasState', JSON.stringify(state));
        } catch {}
        try { window.dispatchEvent(new CustomEvent('mesasStateChanged', { detail: { mesaId, estado: 'ocupada', datos: { cliente, personas } } })); } catch {}
        // Navegar a Venta Rápida como en Mesas
        try {
          window.appState = window.appState || {};
          window.appState.currentMesa = { id: mesaId, cliente, personas };
          window.__app?.loadView && window.__app.loadView('ventas-rapidas');
        } catch {}
        cerrarModalOcupar();
        loadMesasDashboard();
      } catch (err) {
        console.error('No se pudo ocupar la mesa desde Home:', err);
        alert('No se pudo ocupar la mesa. Intenta de nuevo.');
      }
    });

    // Manejar click en botones Ver/Cerrar/Ocupar (delegación)
    grid.onclick = async (ev) => {
      const btnCerrar = ev.target.closest?.('.btn-cerrar-mesa');
      const btnOcupar = ev.target.closest?.('.btn-ocupar-mesa');
      const btnVer = ev.target.closest?.('.btn-ver-mesa');
      if (!btnCerrar && !btnOcupar && !btnVer) return;
      const card = (btnCerrar || btnOcupar || btnVer).closest('.mesa-card');
      const mesaId = card?.dataset?.id;
      if (!mesaId) return;
      if (btnCerrar) {
        if (!confirm('¿Estás seguro de que quieres cerrar esta mesa?')) return;
        try {
          await MesasAPI.setEstado(mesaId, 'disponible', {});
          // Sync local override para reflejar inmediatamente
          try {
            const state = JSON.parse(localStorage.getItem('mesasState') || '{}');
            state[mesaId] = { estado: 'disponible', datos: {} };
            localStorage.setItem('mesasState', JSON.stringify(state));
          } catch {}
          try { window.dispatchEvent(new CustomEvent('mesasStateChanged', { detail: { mesaId, estado: 'disponible', datos: {} } })); } catch {}
          loadMesasDashboard();
        } catch (e) {
          console.error('No se pudo cerrar la mesa:', e);
          alert('No se pudo cerrar la mesa. Intenta de nuevo.');
        }
      } else if (btnOcupar) {
        // Abrir modal para capturar datos en lugar de prompts
        abrirModalOcupar(mesaId);
      } else if (btnVer) {
        try {
          const numeroTxt = card.querySelector('.mesa-numero')?.textContent?.trim() || `Mesa ${mesaId}`;
          const capacidad = card.dataset.capacidad || '?';
          const estado = card.dataset.estado || 'desconocido';
          let cliente = '';
          try {
            const overrides = JSON.parse(localStorage.getItem('mesasState') || '{}');
            cliente = overrides[mesaId]?.datos?.cliente || '';
          } catch {}
          let msg = `${numeroTxt}\nCapacidad: ${capacidad} personas\nEstado: ${estado}`;
          if (estado === 'ocupada' && cliente) msg += `\nCliente: ${cliente}`;
          alert(msg);
        } catch {}
      }
    };
  } catch (e) {
    console.error('No se pudieron cargar las mesas para el dashboard:', e);
    elDisp.textContent = '—';
    elOc.textContent = '—';
  // elRes removido
    grid.innerHTML = '<div class="alert alert-warning">No se pudieron cargar las mesas</div>';
  }
}
