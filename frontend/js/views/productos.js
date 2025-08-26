// js/views/productos.js
export function initProductos() {
  console.log('Vista Productos inicializada');
  const addProductBtn = document.getElementById('btn-agregar-producto');
  const modal = document.getElementById('modal-producto');
  const closeModal = document.querySelector('.close-modal');
  const cancelBtn = document.getElementById('btn-cancelar');
  const productForm = document.getElementById('form-producto');

  addProductBtn?.addEventListener('click', () => {
    const t = document.getElementById('modal-titulo');
    if (t) t.textContent = 'Agregar Producto';
    const id = document.getElementById('producto-id');
    if (id) id.value = '';
    productForm?.reset();
    if (modal) modal.style.display = 'block';
  });

  const close = () => { if (modal) modal.style.display = 'none'; };
  closeModal?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);
  window.addEventListener('click', (e) => { if (e.target === modal) close(); });

  productForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Producto guardado correctamente');
    close();
  });
}
