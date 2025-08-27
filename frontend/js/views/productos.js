// js/views/productos.js
// CRUD de productos consumiendo /api/productos
import { api } from '../core/api.js';

export function initProductos() {
  console.log('Vista Productos inicializada');
  // Elementos UI
  const addBtn = document.getElementById('btn-agregar-producto');
  const modal = document.getElementById('modal-producto');
  const modalTitle = document.getElementById('modal-titulo');
  const form = document.getElementById('form-producto');
  const closeBtn = document.querySelector('.close-modal');
  const cancelBtn = document.getElementById('btn-cancelar');
  const tbody = document.getElementById('tbody-productos');
  const buscar = document.getElementById('buscar-producto');
  const filtroCategoria = document.getElementById('filtro-categoria');
  const filtroEstado = document.getElementById('filtro-estado');

  // Estado local
  let productos = [];
  let editingId = null;

  // Utilidades
  const openModal = () => { if (modal) modal.style.display = 'block'; };
  const closeModal = () => { if (modal) modal.style.display = 'none'; editingId = null; };
  const resetForm = () => form && form.reset();
  const getFormData = () => ({
    id: valueOf('#producto-id'),
    nombre: valueOf('#producto-nombre'),
    categoria: valueOf('#producto-categoria'),
    precio: numberOf('#producto-precio'),
    stock: numberOf('#producto-stock'),
    stock_minimo: numberOf('#producto-stock-minimo'),
    descripcion: valueOf('#producto-descripcion')
  });
  function valueOf(sel) { const el = document.querySelector(sel); return el ? el.value.trim() : ''; }
  function numberOf(sel) { const v = parseFloat(valueOf(sel)); return isNaN(v) ? 0 : v; }

  function formatMoney(v) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v||0)); }

  function estadoFrom(p) {
    if (p.stock <= 0) return { label: 'Agotado', cls: 'badge-danger' };
    if (p.stock < (p.stock_minimo || 0)) return { label: 'Bajo Stock', cls: 'badge-warning' };
    return { label: 'Disponible', cls: 'badge-success' };
  }

  function render() {
    if (!tbody) return;
    const text = (buscar?.value || '').toLowerCase();
    const cat = filtroCategoria?.value || '';
    const est = filtroEstado?.value || '';
    const filtered = productos.filter(p => {
      const matchText = !text || `${p.nombre} ${p.categoria || ''}`.toLowerCase().includes(text);
      const matchCat = !cat || (p.categoria === cat);
      const estObj = estadoFrom(p);
      const mapEst = estObj.label.toLowerCase().replace(' ', '-');
      const matchEst = !est || est === mapEst;
      return matchText && matchCat && matchEst;
    });
    tbody.innerHTML = filtered.map(p => {
      const est = estadoFrom(p);
          return `
        <tr>
          <td>${p.id}</td>
          <td>${escapeHtml(p.nombre)}</td>
          <td>${escapeHtml(p.categoria || '')}</td>
          <td>${formatMoney(p.precio)}</td>
            <td>${p.stock}</td>
            <td>${p.stock_minimo ?? 0}</td>
          <td><span class="badge ${est.cls}">${est.label}</span></td>
          <td class="acciones">
            <button class="btn btn-sm btn-warning" data-action="edit" data-id="${p.id}"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${p.id}"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
    }).join('');
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  // Eventos de tabla (delegación)
  tbody?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    const item = productos.find(x => String(x.id) === String(id));
    if (!item) return;
    if (action === 'edit') {
      editingId = item.id;
      // Prellenar formulario
      setValue('#producto-id', item.id);
      setValue('#producto-nombre', item.nombre);
      setValue('#producto-categoria', item.categoria || '');
      setValue('#producto-precio', item.precio);
      setValue('#producto-stock', item.stock);
      setValue('#producto-stock-minimo', item.stock_minimo || 0);
      setValue('#producto-descripcion', item.descripcion || '');
      if (modalTitle) modalTitle.textContent = 'Editar Producto';
      openModal();
    } else if (action === 'delete') {
      if (!confirm('¿Eliminar este producto?')) return;
      await apiDelete(id);
      await load();
    }
  });

  function setValue(sel, v) { const el = document.querySelector(sel); if (el) el.value = v; }

  // Modal open/close
  addBtn?.addEventListener('click', () => {
    editingId = null;
    resetForm();
    setValue('#producto-id', '');
    setValue('#producto-stock-minimo', 0);
    if (modalTitle) modalTitle.textContent = 'Agregar Producto';
    openModal();
  });
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // Submit
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData();
    try {
      if (editingId) {
        await apiPut(editingId, data);
      } else {
        await apiPost(data);
      }
      closeModal();
      await load();
    } catch (err) {
      alert(err?.message || 'Error al guardar');
    }
  });

  // Filtros y búsqueda
  buscar?.addEventListener('input', render);
  filtroCategoria?.addEventListener('change', render);
  filtroEstado?.addEventListener('change', render);

  // API helpers
  async function apiGetAll() {
    const data = await api.get('/api/productos');
    if (!Array.isArray(data)) throw new Error('Respuesta inválida del servidor (esperado JSON de lista)');
    return data;
  }
  async function apiPost(data) { return api.post('/api/productos', data); }
  async function apiPut(id, data) { return api.put(`/api/productos/${id}`, data); }
  async function apiDelete(id) { return api.del(`/api/productos/${id}`); }

  async function load() {
    try {
      productos = await apiGetAll();
      render();
    } catch (e) {
      console.error(e);
  if (tbody) tbody.innerHTML = `<tr><td colspan="8">${e?.message || 'Error al cargar'}</td></tr>`;
    }
  }

  // Primer render
  load();
}
