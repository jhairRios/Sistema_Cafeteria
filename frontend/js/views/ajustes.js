// js/views/ajustes.js
export function initAjustes() {
  console.log('Inicializando vista Ajustes');

  const menuItems = document.querySelectorAll('.ajuste-menu-item');
  const secciones = document.querySelectorAll('.ajuste-seccion');
  const btnGuardar = document.getElementById('btn-guardar-ajustes');
  const modalConfirmacion = document.getElementById('modal-confirmacion');
  const btnCancelarCambios = document.getElementById('btn-cancelar-cambios');
  const btnConfirmarCambios = document.getElementById('btn-confirmar-cambios');

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      menuItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      secciones.forEach(sec => sec.classList.remove('active'));
      document.getElementById(`seccion-${target}`).classList.add('active');
    });
  });

  btnGuardar?.addEventListener('click', () => { modalConfirmacion && (modalConfirmacion.style.display = 'block'); });
  btnCancelarCambios?.addEventListener('click', () => { modalConfirmacion && (modalConfirmacion.style.display = 'none'); });
  btnConfirmarCambios?.addEventListener('click', () => { guardarAjustes(); modalConfirmacion && (modalConfirmacion.style.display = 'none'); });

  window.addEventListener('click', (e) => { if (e.target === modalConfirmacion) modalConfirmacion.style.display = 'none'; });

  function guardarAjustes() {
    const ajustes = {
      general: {
        tema: document.getElementById('tema-sistema').value,
        colorPrincipal: document.getElementById('color-principal').value,
        idioma: document.getElementById('idioma-sistema').value,
        zonaHoraria: document.getElementById('zona-horaria').value,
        formatoFecha: document.getElementById('formato-fecha').value,
        notificacionesEmail: document.getElementById('notificaciones-email').checked,
        notificacionesSistema: document.getElementById('notificaciones-sistema').checked,
        recordatoriosReservas: document.getElementById('recordatorios-reservas').checked,
      },
      restaurante: {
        nombre: document.getElementById('nombre-restaurante').value,
        direccion: document.getElementById('direccion-restaurante').value,
        telefono: document.getElementById('telefono-restaurante').value,
        email: document.getElementById('email-restaurante').value,
        iva: parseFloat(document.getElementById('iva-porcentaje').value),
        propinaAutomatica: parseFloat(document.getElementById('propina-automatica').value),
        incluirIva: document.getElementById('incluir-iva-precios').checked,
      },
      mesas: {
        numeroMesas: parseInt(document.getElementById('numero-mesas').value),
        mesas2Personas: parseInt(document.getElementById('mesas-2personas').value),
        mesas4Personas: parseInt(document.getElementById('mesas-4personas').value),
        mesas6Personas: parseInt(document.getElementById('mesas-6personas').value),
        mesas8Personas: parseInt(document.getElementById('mesas-8personas').value),
        tiempoComida: parseInt(document.getElementById('tiempo-promedio-comida').value),
        tiempoBebidas: parseInt(document.getElementById('tiempo-promedio-bebidas').value),
        tiempoLimiteReserva: parseInt(document.getElementById('tiempo-limite-reserva').value),
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
        penalizacionCancelacion: document.getElementById('penalizacion-cancelacion').checked,
      },
    };
    console.log('Guardando ajustes:', ajustes);
    setTimeout(() => { alert('Ajustes guardados correctamente'); }, 500);
  }

  function cargarAjustes() {
    console.log('Cargando ajustes...');
  }

  const colorPicker = document.getElementById('color-principal');
  const colorValue = document.querySelector('.color-value');
  if (colorPicker && colorValue) {
    colorPicker.addEventListener('input', (e) => {
      colorValue.textContent = e.target.value;
      document.documentElement.style.setProperty('--color-primario', e.target.value);
    });
  }

  cargarAjustes();
}
