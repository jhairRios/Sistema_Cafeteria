// js/views/mesas.js
export function initMesas() {
    console.log('Inicializando vista Mesas');

    const btnAgregarMesa = document.getElementById('btn-agregar-mesa');
    const modalMesa = document.getElementById('modal-mesa');
    const modalOcupar = document.getElementById('modal-ocupar-mesa');
    const modalReservar = document.getElementById('modal-reservar-mesa');
    const formMesa = document.getElementById('form-mesa');
    const formOcupar = document.getElementById('form-ocupar-mesa');
    const formReservar = document.getElementById('form-reservar-mesa');

    function actualizarEstadisticas() {
        const mesas = document.querySelectorAll('.mesa-card');
        const total = mesas.length;
        const disponibles = document.querySelectorAll('.mesa-card.disponible').length;
        const ocupadas = document.querySelectorAll('.mesa-card.ocupada').length;
        const reservadas = document.querySelectorAll('.mesa-card.reservada').length;
        const setText = (id, val) => { const n = document.getElementById(id); if (n) n.textContent = val; };
        setText('total-mesas', total);
        setText('mesas-disponibles', disponibles);
        setText('mesas-ocupadas', ocupadas);
        setText('mesas-reservadas', reservadas);
    }

    btnAgregarMesa?.addEventListener('click', () => {
        const t = document.getElementById('modal-titulo-mesa'); if (t) t.textContent = 'Agregar Mesa';
        const id = document.getElementById('mesa-id'); if (id) id.value = '';
        formMesa?.reset();
        modalMesa && (modalMesa.style.display = 'block');
    });

    function setupModalClose(modal) {
        if (!modal) return;
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('.btn-outline');
        closeBtn?.addEventListener('click', () => { modal.style.display = 'none'; });
        cancelBtn?.addEventListener('click', () => { modal.style.display = 'none'; });
    }

    setupModalClose(modalMesa);
    setupModalClose(modalOcupar);
    setupModalClose(modalReservar);

    window.addEventListener('click', (e) => {
        if (e.target === modalMesa) modalMesa.style.display = 'none';
        if (e.target === modalOcupar) modalOcupar.style.display = 'none';
        if (e.target === modalReservar) modalReservar.style.display = 'none';
    });

    formMesa?.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Mesa guardada correctamente');
        modalMesa && (modalMesa.style.display = 'none');
    });

    function getMesasState() { try { return JSON.parse(localStorage.getItem('mesasState') || '{}'); } catch { return {}; } }
    function setMesasState(state) { localStorage.setItem('mesasState', JSON.stringify(state)); }
    function saveMesaState(mesaId, nuevoEstado, datos = {}) { const state = getMesasState(); state[mesaId] = { estado: nuevoEstado, datos }; setMesasState(state); }

    function applyMesaState(mesaId, nuevoEstado, datos = {}, options = { navigateOnOcupar: false }) {
        const mesa = document.querySelector(`.mesa-card[data-id="${mesaId}"]`);
        if (!mesa) return;
        mesa.classList.remove('disponible', 'ocupada', 'reservada');
        mesa.classList.add(nuevoEstado);
        mesa.dataset.estado = nuevoEstado;
        const estadoElement = mesa.querySelector('.mesa-estado');
        if (!estadoElement) return;
        estadoElement.className = 'mesa-estado';

        if (nuevoEstado === 'disponible') {
            estadoElement.classList.add('estado-disponible');
            estadoElement.innerHTML = '<i class="fas fa-check-circle"></i> Disponible';
            mesa.querySelector('.mesa-info')?.remove();
            mesa.querySelector('.mesa-acciones').innerHTML = `
        <button class="btn btn-sm btn-success btn-ocupar" data-id="${mesaId}"><i class="fas fa-play"></i> Ocupar</button>
        <button class="btn btn-sm btn-warning btn-reservar" data-id="${mesaId}"><i class="fas fa-calendar"></i> Reservar</button>`;
        } else if (nuevoEstado === 'ocupada') {
            estadoElement.classList.add('estado-ocupada');
            estadoElement.innerHTML = '<i class="fas fa-users"></i> Ocupada';
            if (!mesa.querySelector('.mesa-info')) {
                const infoDiv = document.createElement('div');
                infoDiv.className = 'mesa-info';
                infoDiv.innerHTML = `<div class="mesa-cliente">${datos.cliente || 'Cliente'}</div><div class="mesa-tiempo">00:00</div>`;
                estadoElement.after(infoDiv);
            } else {
                const c = mesa.querySelector('.mesa-cliente'); if (c && datos.cliente) c.textContent = datos.cliente;
            }
            mesa.querySelector('.mesa-acciones').innerHTML = `
        <button class="btn btn-sm btn-info btn-ver" data-id="${mesaId}"><i class="fas fa-eye"></i> Ver</button>
        <button class="btn btn-sm btn-primary btn-cerrar" data-id="${mesaId}"><i class="fas fa-check"></i> Cerrar</button>`;
            if (options.navigateOnOcupar) {
                window.appState = window.appState || {}; window.appState.currentMesa = { id: mesaId, cliente: datos.cliente || 'Cliente', personas: datos.personas || null };
                window.__app?.loadView && window.__app.loadView('ventas-rapidas');
            }
        } else if (nuevoEstado === 'reservada') {
            estadoElement.classList.add('estado-reservada');
            estadoElement.innerHTML = '<i class="fas fa-calendar-check"></i> Reservada';
            if (!mesa.querySelector('.mesa-info')) {
                const infoDiv = document.createElement('div'); infoDiv.className = 'mesa-info';
                infoDiv.innerHTML = `<div class="mesa-cliente">${datos.cliente || 'Reserva'}</div><div class="mesa-horario">${datos.hora || '19:30'} hrs</div>`; estadoElement.after(infoDiv);
            } else {
                const c = mesa.querySelector('.mesa-cliente'); const h = mesa.querySelector('.mesa-horario');
                if (c && datos.cliente) c.textContent = datos.cliente; if (h && datos.hora) h.textContent = `${datos.hora} hrs`;
            }
            mesa.querySelector('.mesa-acciones').innerHTML = `
        <button class="btn btn-sm btn-info btn-ver" data-id="${mesaId}"><i class="fas fa-eye"></i> Ver</button>
        <button class="btn btn-sm btn-success btn-ocupar" data-id="${mesaId}"><i class="fas fa-play"></i> Ocupar</button>`;
        }

        setTimeout(() => {
            mesa.querySelector('.btn-ocupar')?.addEventListener('click', () => {
                document.getElementById('mesa-ocupar-id').value = mesaId;
                formOcupar?.reset();
                modalOcupar && (modalOcupar.style.display = 'block');
            });
            mesa.querySelector('.btn-reservar')?.addEventListener('click', () => {
                document.getElementById('mesa-reservar-id').value = mesaId;
                formReservar?.reset();
                modalReservar && (modalReservar.style.display = 'block');
            });
            mesa.querySelector('.btn-cerrar')?.addEventListener('click', () => {
                if (confirm('¿Estás seguro de que quieres cerrar esta mesa?')) cambiarEstadoMesa(mesaId, 'disponible');
            });
            mesa.querySelector('.btn-ver')?.addEventListener('click', () => { /* ver detalles */ });
        }, 50);
    }

    function rehydrateMesasFromStorage() {
        const saved = getMesasState();
        Object.keys(saved).forEach(mesaId => {
            const { estado, datos } = saved[mesaId] || {};
            if (estado) applyMesaState(mesaId, estado, datos || {}, { navigateOnOcupar: false });
        });
        actualizarEstadisticas();
    }

    document.querySelectorAll('.btn-ocupar').forEach(btn => {
        btn.addEventListener('click', () => {
            const mesaId = btn.dataset.id;
            const mesa = document.querySelector(`.mesa-card[data-id="${mesaId}"]`);
            if (mesa.dataset.estado === 'disponible' || mesa.dataset.estado === 'reservada') {
                document.getElementById('mesa-ocupar-id').value = mesaId;
                formOcupar?.reset();
                modalOcupar && (modalOcupar.style.display = 'block');
            }
        });
    });

    formOcupar?.addEventListener('submit', (e) => {
        e.preventDefault();
        const mesaId = document.getElementById('mesa-ocupar-id').value;
        const cliente = document.getElementById('cliente-nombre').value;
        const personas = document.getElementById('cliente-personas').value;
        cambiarEstadoMesa(mesaId, 'ocupada', { cliente, personas, tiempoInicio: new Date() });
        modalOcupar && (modalOcupar.style.display = 'none');
        alert(`Mesa ${mesaId} ocupada por ${cliente}`);
    });

    document.querySelectorAll('.btn-reservar').forEach(btn => {
        btn.addEventListener('click', () => {
            const mesaId = btn.dataset.id;
            const mesa = document.querySelector(`.mesa-card[data-id="${mesaId}"]`);
            if (mesa.dataset.estado === 'disponible') {
                document.getElementById('mesa-reservar-id').value = mesaId;
                document.getElementById('reserva-fecha').min = new Date().toISOString().split('T')[0];
                formReservar?.reset();
                modalReservar && (modalReservar.style.display = 'block');
            }
        });
    });

    formReservar?.addEventListener('submit', (e) => {
        e.preventDefault();
        const mesaId = document.getElementById('mesa-reservar-id').value;
        const nombre = document.getElementById('reserva-nombre').value;
        const fecha = document.getElementById('reserva-fecha').value;
        const hora = document.getElementById('reserva-hora').value;
        cambiarEstadoMesa(mesaId, 'reservada', { cliente: nombre, fecha, hora });
        modalReservar && (modalReservar.style.display = 'none');
        alert(`Mesa ${mesaId} reservada para ${nombre}`);
    });

    document.querySelectorAll('.btn-cerrar').forEach(btn => {
        btn.addEventListener('click', () => {
            const mesaId = btn.dataset.id;
            if (confirm('¿Estás seguro de que quieres cerrar esta mesa?')) {
                cambiarEstadoMesa(mesaId, 'disponible');
                alert(`Mesa ${mesaId} cerrada y disponible`);
            }
        });
    });

    document.querySelectorAll('.btn-ver').forEach(btn => {
        btn.addEventListener('click', () => {
            const mesaId = btn.dataset.id;
            const mesa = document.querySelector(`.mesa-card[data-id="${mesaId}"]`);
            const estado = mesa.dataset.estado;
            let mensaje = `Detalles de la Mesa ${mesaId}\n`;
            mensaje += `Capacidad: ${mesa.dataset.capacidad} personas\n`;
            mensaje += `Estado: ${estado}\n`;
            if (estado === 'ocupada') {
                const cliente = mesa.querySelector('.mesa-cliente').textContent;
                const tiempo = mesa.querySelector('.mesa-tiempo').textContent;
                mensaje += `Cliente: ${cliente}\n`;
                mensaje += `Tiempo: ${tiempo}\n`;
            } else if (estado === 'reservada') {
                const cliente = mesa.querySelector('.mesa-cliente').textContent;
                const horario = mesa.querySelector('.mesa-horario').textContent;
                mensaje += `Reserva: ${cliente}\n`;
                mensaje += `Horario: ${horario}\n`;
            }
            alert(mensaje);
        });
    });

    function cambiarEstadoMesa(mesaId, nuevoEstado, datos = {}) {
        const mesa = document.querySelector(`.mesa-card[data-id="${mesaId}"]`);
        const estadoActual = mesa.dataset.estado;
        if (estadoActual === nuevoEstado) return;
        mesa.classList.add('cambiando-estado');
        setTimeout(() => {
            mesa.classList.remove('disponible', 'ocupada', 'reservada');
            mesa.classList.add(nuevoEstado);
            mesa.dataset.estado = nuevoEstado;
            const estadoElement = mesa.querySelector('.mesa-estado');
            estadoElement.className = 'mesa-estado';
            switch (nuevoEstado) {
                case 'disponible':
                    estadoElement.classList.add('estado-disponible');
                    estadoElement.innerHTML = '<i class="fas fa-check-circle"></i> Disponible';
                    mesa.querySelector('.mesa-info')?.remove();
                    mesa.querySelector('.mesa-acciones').innerHTML = `
            <button class="btn btn-sm btn-success btn-ocupar" data-id="${mesaId}"><i class="fas fa-play"></i> Ocupar</button>
            <button class="btn btn-sm btn-warning btn-reservar" data-id="${mesaId}"><i class="fas fa-calendar"></i> Reservar</button>`;
                    saveMesaState(mesaId, 'disponible', {});
                    break;
                case 'ocupada':
                    estadoElement.classList.add('estado-ocupada');
                    estadoElement.innerHTML = '<i class="fas fa-users"></i> Ocupada';
                    if (!mesa.querySelector('.mesa-info')) {
                        const infoDiv = document.createElement('div'); infoDiv.className = 'mesa-info';
                        infoDiv.innerHTML = `<div class="mesa-cliente">${datos.cliente || 'Cliente'}</div><div class="mesa-tiempo">00:00</div>`; mesa.querySelector('.mesa-estado').after(infoDiv);
                    }
                    mesa.querySelector('.mesa-acciones').innerHTML = `
            <button class="btn btn-sm btn-info btn-ver" data-id="${mesaId}"><i class="fas fa-eye"></i> Ver</button>
            <button class="btn btn-sm btn-primary btn-cerrar" data-id="${mesaId}"><i class="fas fa-check"></i> Cerrar</button>`;
                    saveMesaState(mesaId, 'ocupada', { cliente: datos.cliente || 'Cliente', personas: datos.personas || null });
                    window.appState = window.appState || {}; window.appState.currentMesa = { id: mesaId, cliente: datos.cliente || 'Cliente', personas: datos.personas || null };
                    window.__app?.loadView && window.__app.loadView('ventas-rapidas');
                    break;
                case 'reservada':
                    estadoElement.classList.add('estado-reservada');
                    estadoElement.innerHTML = '<i class="fas fa-calendar-check"></i> Reservada';
                    if (!mesa.querySelector('.mesa-info')) {
                        const infoDiv = document.createElement('div'); infoDiv.className = 'mesa-info';
                        infoDiv.innerHTML = `<div class="mesa-cliente">${datos.cliente || 'Reserva'}</div><div class="mesa-horario">${datos.hora || '19:30'} hrs</div>`; mesa.querySelector('.mesa-estado').after(infoDiv);
                    }
                    mesa.querySelector('.mesa-acciones').innerHTML = `
            <button class="btn btn-sm btn-info btn-ver" data-id="${mesaId}"><i class="fas fa-eye"></i> Ver</button>
            <button class="btn btn-sm btn-success btn-ocupar" data-id="${mesaId}"><i class="fas fa-play"></i> Ocupar</button>`;
                    saveMesaState(mesaId, 'reservada', { cliente: datos.cliente || 'Reserva', hora: datos.hora || '19:30' });
                    break;
            }
            setTimeout(() => {
                mesa.querySelector('.btn-ocupar')?.addEventListener('click', () => {
                    document.getElementById('mesa-ocupar-id').value = mesaId;
                    formOcupar?.reset();
                    modalOcupar && (modalOcupar.style.display = 'block');
                });
                mesa.querySelector('.btn-reservar')?.addEventListener('click', () => {
                    document.getElementById('mesa-reservar-id').value = mesaId;
                    formReservar?.reset();
                    modalReservar && (modalReservar.style.display = 'block');
                });
                mesa.querySelector('.btn-cerrar')?.addEventListener('click', () => {
                    if (confirm('¿Estás seguro de que quieres cerrar esta mesa?')) cambiarEstadoMesa(mesaId, 'disponible');
                });
                mesa.querySelector('.btn-ver')?.addEventListener('click', () => { /* ver detalles */ });
            }, 100);
            mesa.classList.remove('cambiando-estado');
            actualizarEstadisticas();
        }, 300);
    }

    const filtroEstado = document.getElementById('filtro-estado-mesa');
    const filtroCapacidad = document.getElementById('filtro-capacidad');
    const buscarInput = document.getElementById('buscar-mesa');

    filtroEstado?.addEventListener('change', aplicarFiltrosMesas);
    filtroCapacidad?.addEventListener('change', aplicarFiltrosMesas);
    buscarInput?.addEventListener('input', aplicarFiltrosMesas);

    function aplicarFiltrosMesas() {
        const estado = filtroEstado?.value || '';
        const capacidad = filtroCapacidad?.value || '';
        const busqueda = (buscarInput?.value || '').toLowerCase();
        const mesas = document.querySelectorAll('.mesa-card');
        mesas.forEach(mesa => {
            const mesaEstado = mesa.dataset.estado;
            const mesaCapacidad = mesa.dataset.capacidad;
            const mesaNumero = mesa.querySelector('.mesa-numero').textContent.toLowerCase();
            const coincideEstado = !estado || mesaEstado === estado;
            const coincideCapacidad = !capacidad || mesaCapacidad === capacidad;
            const coincideBusqueda = !busqueda || mesaNumero.includes(busqueda);
            mesa.style.display = (coincideEstado && coincideCapacidad && coincideBusqueda) ? 'block' : 'none';
        });
    }

    rehydrateMesasFromStorage();

    function actualizarTiempos() {
        const mesasOcupadas = document.querySelectorAll('.mesa-card.ocupada');
        mesasOcupadas.forEach(mesa => {
            const tiempoElement = mesa.querySelector('.mesa-tiempo');
            if (tiempoElement) {
                const tiempoActual = tiempoElement.textContent;
                const [minutos, segundos] = tiempoActual.split(':').map(Number);
                const nuevosSegundos = segundos + 1;
                const nuevosMinutos = minutos + Math.floor(nuevosSegundos / 60);
                tiempoElement.textContent = `${nuevosMinutos.toString().padStart(2, '0')}:${(nuevosSegundos % 60).toString().padStart(2, '0')}`;
            }
        });
    }

    setInterval(actualizarTiempos, 1000);
}
