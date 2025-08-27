// js/views/mesas.js
import { Mesas as MesasAPI } from '../core/api.js';

export function initMesas() {
    console.log('Inicializando vista Mesas');

    const btnAgregarMesa = document.getElementById('btn-agregar-mesa');
    const modalMesa = document.getElementById('modal-mesa');
    const modalOcupar = document.getElementById('modal-ocupar-mesa');
    const modalReservar = null; // eliminado
    const formMesa = document.getElementById('form-mesa');
    const formOcupar = document.getElementById('form-ocupar-mesa');
    const formReservar = null;

    function actualizarEstadisticas() {
        const mesas = document.querySelectorAll('.mesa-card');
        const total = mesas.length;
        const disponibles = document.querySelectorAll('.mesa-card.disponible').length;
        const ocupadas = document.querySelectorAll('.mesa-card.ocupada').length;
    const reservadas = 0;
        const setText = (id, val) => { const n = document.getElementById(id); if (n) n.textContent = val; };
        setText('total-mesas', total);
        setText('mesas-disponibles', disponibles);
        setText('mesas-ocupadas', ocupadas);
    // Reservadas eliminadas
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
    // reservar eliminado

    window.addEventListener('click', (e) => {
        if (e.target === modalMesa) modalMesa.style.display = 'none';
        if (e.target === modalOcupar) modalOcupar.style.display = 'none';
    // reservar eliminado
    });

    formMesa?.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Mesa guardada correctamente');
        modalMesa && (modalMesa.style.display = 'none');
    });

    // Usar localStorage para que Home y Mesas compartan el mismo estado y se sincronicen
    function getMesasState() { try { return JSON.parse(localStorage.getItem('mesasState') || '{}'); } catch { return {}; } }
    function setMesasState(state) { localStorage.setItem('mesasState', JSON.stringify(state)); }
    function saveMesaState(mesaId, nuevoEstado, datos = {}) { const state = getMesasState(); state[mesaId] = { estado: nuevoEstado, datos }; setMesasState(state); try { window.dispatchEvent(new CustomEvent('mesasStateChanged',{detail:{mesaId,estado:nuevoEstado,datos}})); } catch(_){} }

    function renderMesaCard(m) {
        const div = document.createElement('div');
    const estadoClass = m.estado === 'ocupada' ? 'ocupada' : 'disponible';
        div.className = `mesa-card ${estadoClass}`;
        div.dataset.id = m.id;
        div.dataset.capacidad = m.capacidad;
    div.dataset.estado = estadoClass;
        const detalle = typeof m.detalle === 'string' ? safeJSON(m.detalle) : (m.detalle || {});
        const cliente = detalle.cliente || null;
        const horario = detalle.hora || null;
        div.innerHTML = `
            <div class="mesa-header">
                <span class="mesa-numero">${m.nombre || `Mesa ${m.numero}`}</span>
                <span class="mesa-capacidad"><i class="fas fa-user"></i> ${m.capacidad}</span>
            </div>
            <div class="mesa-estado ${estadoClass === 'disponible' ? 'estado-disponible' : 'estado-ocupada'}">
                ${estadoClass === 'disponible' ? '<i class="fas fa-check-circle"></i> Disponible' : '<i class="fas fa-users"></i> Ocupada'}
            </div>
            ${estadoClass !== 'disponible' ? `<div class="mesa-info"><div class="mesa-cliente">${cliente || 'Cliente'}</div><div class="mesa-tiempo">00:00</div></div>` : ''}
            <div class="mesa-acciones"></div>
        `;
        const acc = div.querySelector('.mesa-acciones');
        if (estadoClass === 'disponible') {
            acc.innerHTML = `
                <button class="btn btn-sm btn-success btn-ocupar" data-id="${m.id}"><i class="fas fa-play"></i> Ocupar</button>`;
        } else if (estadoClass === 'ocupada') {
            acc.innerHTML = `
                <button class="btn btn-sm btn-info btn-ver" data-id="${m.id}"><i class="fas fa-eye"></i> Ver</button>
                <button class="btn btn-sm btn-primary btn-cerrar" data-id="${m.id}"><i class="fas fa-check"></i> Cerrar</button>`;
        }
        return div;
    }

    function safeJSON(txt) { try { return JSON.parse(txt); } catch { return {}; } }

    async function cargarMesas() {
        const grid = document.getElementById('grid-mesas');
        if (!grid) return;
        grid.innerHTML = '';
        let mesas;
        try {
            mesas = await MesasAPI.list();
        } catch (e) {
            console.error('Error al cargar mesas:', e);
            grid.innerHTML = '<div class="empty">No se pudieron cargar las mesas. Revisa el servidor.</div>';
            return;
        }
        if (!Array.isArray(mesas)) {
            console.warn('La API de mesas no devolvió una lista:', mesas);
            grid.innerHTML = '<div class="empty">Sin datos de mesas. ¿El backend está actualizado?</div>';
            return;
        }
        mesas.forEach(m => grid.appendChild(renderMesaCard(m)));
        wireEventosMesas();
        actualizarEstadisticas();
        rehydrateMesasFromStorage();
    }

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
    <button class="btn btn-sm btn-success btn-ocupar" data-id="${mesaId}"><i class="fas fa-play"></i> Ocupar</button>`;
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
    }

        setTimeout(() => {
            mesa.querySelector('.btn-ocupar')?.addEventListener('click', () => {
                document.getElementById('mesa-ocupar-id').value = mesaId;
                formOcupar?.reset();
                modalOcupar && (modalOcupar.style.display = 'block');
            });
            // reservar eliminado
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

    function wireEventosMesas() {
        document.querySelectorAll('.btn-ocupar').forEach(btn => {
            btn.addEventListener('click', () => {
                const mesaId = btn.dataset.id;
                const mesa = document.querySelector(`.mesa-card[data-id="${mesaId}"]`);
        if (mesa.dataset.estado === 'disponible') {
                    document.getElementById('mesa-ocupar-id').value = mesaId;
                    formOcupar?.reset();
                    modalOcupar && (modalOcupar.style.display = 'block');
                }
            });
        });
    // reservar eliminado
        document.querySelectorAll('.btn-cerrar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const mesaId = btn.dataset.id;
                if (confirm('¿Estás seguro de que quieres cerrar esta mesa?')) {
                    await MesasAPI.setEstado(mesaId, 'disponible', {});
                    saveMesaState(mesaId, 'disponible', {});
                    applyMesaState(mesaId, 'disponible', {});
                    actualizarEstadisticas();
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
                    const cliente = mesa.querySelector('.mesa-cliente')?.textContent || '';
                    const tiempo = mesa.querySelector('.mesa-tiempo')?.textContent || '';
                    mensaje += `Cliente: ${cliente}\n`;
                    mensaje += `Tiempo: ${tiempo}\n`;
                }
                alert(mensaje);
            });
        });
    }

    formOcupar?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mesaId = document.getElementById('mesa-ocupar-id').value;
        const cliente = document.getElementById('cliente-nombre').value;
        const personas = document.getElementById('cliente-personas').value;
        await MesasAPI.setEstado(mesaId, 'ocupada', { cliente, personas, tiempoInicio: new Date() });
        cambiarEstadoMesa(mesaId, 'ocupada', { cliente, personas, tiempoInicio: new Date() });
        modalOcupar && (modalOcupar.style.display = 'none');
        alert(`Mesa ${mesaId} ocupada por ${cliente}`);
    });

    // reservar eliminado

    // cerrar movido a wireEventosMesas

    // ver movido a wireEventosMesas

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
            <button class="btn btn-sm btn-success btn-ocupar" data-id="${mesaId}"><i class="fas fa-play"></i> Ocupar</button>`;
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
                // estado reservada eliminado
            }
            setTimeout(() => {
                mesa.querySelector('.btn-ocupar')?.addEventListener('click', () => {
                    document.getElementById('mesa-ocupar-id').value = mesaId;
                    formOcupar?.reset();
                    modalOcupar && (modalOcupar.style.display = 'block');
                });
                // reservar eliminado
                mesa.querySelector('.btn-cerrar')?.addEventListener('click', () => {
                    if (confirm('¿Estás seguro de que quieres cerrar esta mesa?')) cambiarEstadoMesa(mesaId, 'disponible');
                });
                mesa.querySelector('.btn-ver')?.addEventListener('click', () => { /* ver detalles */ });
            }, 100);
            mesa.classList.remove('cambiando-estado');
            actualizarEstadisticas();
            try { window.dispatchEvent(new CustomEvent('mesasStateChanged',{detail:{mesaId,estado:nuevoEstado,datos}})); } catch(_){}
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

    cargarMesas();

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
