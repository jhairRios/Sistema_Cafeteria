// js/views/reservaciones.js
export function initReservaciones() {
  console.log('Inicializando vista Reservaciones');

  const btnNuevaReserva = document.getElementById('btn-nueva-reserva');
  const modalNuevaReserva = document.getElementById('modal-nueva-reserva');
  const modalVerReserva = document.getElementById('modal-ver-reserva');
  const formNuevaReserva = document.getElementById('form-nueva-reserva');
  const filtroFecha = document.getElementById('filtro-fecha');
  const filtroEstado = document.getElementById('filtro-estado');
  const filtroMesa = document.getElementById('filtro-mesa');
  const btnDiaAnterior = document.getElementById('btn-dia-anterior');
  const btnDiaSiguiente = document.getElementById('btn-dia-siguiente');
  const btnHoy = document.getElementById('btn-hoy');
  const fechaActual = document.getElementById('fecha-actual');
  const fechaLista = document.getElementById('fecha-lista');

  let fechaSeleccionada = new Date();

  function inicializarFecha() {
    const hoy = new Date().toISOString().split('T')[0];
    if (filtroFecha) filtroFecha.value = hoy;
    actualizarDisplayFecha();
  }

  function actualizarDisplayFecha() {
    const fecha = new Date(filtroFecha.value);
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (fechaActual) fechaActual.textContent = fecha.toLocaleDateString('es-ES', options);
    if (fechaLista) fechaLista.textContent = fecha.toLocaleDateString('es-ES', options);
    fechaSeleccionada = fecha;
  }

  btnDiaAnterior?.addEventListener('click', () => {
    const fecha = new Date(filtroFecha.value);
    fecha.setDate(fecha.getDate() - 1);
    filtroFecha.value = fecha.toISOString().split('T')[0];
    actualizarDisplayFecha();
    cargarReservaciones();
  });

  btnDiaSiguiente?.addEventListener('click', () => {
    const fecha = new Date(filtroFecha.value);
    fecha.setDate(fecha.getDate() + 1);
    filtroFecha.value = fecha.toISOString().split('T')[0];
    actualizarDisplayFecha();
    cargarReservaciones();
  });

  btnHoy?.addEventListener('click', () => {
    const hoy = new Date().toISOString().split('T')[0];
    filtroFecha.value = hoy;
    actualizarDisplayFecha();
    cargarReservaciones();
  });

  filtroFecha?.addEventListener('change', () => { actualizarDisplayFecha(); cargarReservaciones(); });
  filtroEstado?.addEventListener('change', cargarReservaciones);
  filtroMesa?.addEventListener('change', cargarReservaciones);

  btnNuevaReserva?.addEventListener('click', () => {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('reserva-fecha').min = hoy;
    document.getElementById('reserva-fecha').value = filtroFecha.value;
    formNuevaReserva?.reset();
    modalNuevaReserva && (modalNuevaReserva.style.display = 'block');
  });

  function setupModalClose(modal) {
    if (!modal) return;
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = modal.querySelector('.btn-outline');
    closeBtn?.addEventListener('click', () => { modal.style.display = 'none'; });
    cancelBtn?.addEventListener('click', () => { modal.style.display = 'none'; });
  }

  setupModalClose(modalNuevaReserva);
  setupModalClose(modalVerReserva);

  window.addEventListener('click', (e) => {
    if (e.target === modalNuevaReserva) modalNuevaReserva.style.display = 'none';
    if (e.target === modalVerReserva) modalVerReserva.style.display = 'none';
  });

  formNuevaReserva?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Reservación creada correctamente');
    modalNuevaReserva && (modalNuevaReserva.style.display = 'none');
    cargarReservaciones();
  });

  function setupBotonesReservaciones() {
    document.querySelectorAll('.btn-checkin').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reservacionId = e.target.closest('button').dataset.id;
        hacerCheckin(reservacionId);
      });
    });
    document.querySelectorAll('.btn-confirmar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reservacionId = e.target.closest('button').dataset.id;
        confirmarReservacion(reservacionId);
      });
    });
    document.querySelectorAll('.btn-ver').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reservacionId = e.target.closest('button').dataset.id;
        verReservacion(reservacionId);
      });
    });
    document.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reservacionId = e.target.closest('button').dataset.id;
        editarReservacion(reservacionId);
      });
    });
  }

  function hacerCheckin(reservacionId) {
    if (confirm('¿Marcar esta reservación como check-in?')) {
      alert(`Check-in realizado para reservación ${reservacionId}`);
      cargarReservaciones();
    }
  }
  function confirmarReservacion(reservacionId) {
    if (confirm('¿Confirmar esta reservación por teléfono?')) {
      alert(`Reservación ${reservacionId} confirmada`);
      cargarReservaciones();
    }
  }
  function verReservacion(reservacionId) {
    modalVerReserva && (modalVerReserva.style.display = 'block');
  }
  function editarReservacion(reservacionId) {
    alert(`Editando reservación ${reservacionId}`);
  }

  function cargarReservaciones() {
    console.log('Cargando reservaciones para:', filtroFecha.value);
    setTimeout(() => { setupBotonesReservaciones(); }, 100);
  }

  inicializarFecha();
  cargarReservaciones();
  setupBotonesReservaciones();

  const reservacionesItems = document.querySelectorAll('.reservacion-item');
  reservacionesItems.forEach(item => { item.addEventListener('mousedown', iniciarArrastre); });
  function iniciarArrastre(e) {
    const item = e.target.closest('.reservacion-item');
    item.style.opacity = '0.8';
    item.style.cursor = 'grabbing';
    function onMouseMove(e) { /* lógica de arrastre */ }
    function onMouseUp() {
      item.style.opacity = '1';
      item.style.cursor = 'pointer';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  setInterval(() => { cargarReservaciones(); }, 60000);
}
