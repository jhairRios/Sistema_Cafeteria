// js/views/ventas-rapidas.js
import { api } from '../core/api.js';

export function initVentasRapidas() {
    console.log('Inicializando vista Venta Rápida');
    let permisos = [];
    try { permisos = JSON.parse(sessionStorage.getItem('permisos')||'[]'); } catch(_) {}
    const canAgregar = permisos.includes('action.ventas.agregar');
    const canLimpiar = permisos.includes('action.ventas.limpiar');
    const canCancelar = permisos.includes('action.ventas.cancelar');
    const canProcesar = permisos.includes('action.ventas.procesar');

    let carrito = [];
    let total = 0;
    const mesaContext = (window.appState && window.appState.currentMesa) ? window.appState.currentMesa : null;

    const carritoVacio = document.getElementById('carrito-vacio');
    const carritoLista = document.getElementById('carrito-lista');
    const carritoItemsBody = document.getElementById('carrito-items-body');
    const cantidadItems = document.getElementById('cantidad-items');
    const subtotalElement = document.getElementById('subtotal');
    const impuestosElement = document.getElementById('impuestos');
    const totalFinalElement = document.getElementById('total-final');
    const totalVentaElement = document.getElementById('total-venta');
    const btnLimpiar = document.getElementById('btn-limpiar-venta');
    const btnCancelar = document.getElementById('btn-cancelar-venta');
    const btnProcesar = document.getElementById('btn-procesar-venta');
    const modalPago = document.getElementById('modal-pago-efectivo');
    const btnCancelarPago = document.getElementById('btn-cancelar-pago');
    const btnConfirmarPago = document.getElementById('btn-confirmar-pago');
    const montoRecibido = document.getElementById('monto-recibido');
    const pagoTotal = document.getElementById('pago-total');
    const pagoCambio = document.getElementById('pago-cambio');

    if (mesaContext) {
        const headerActions = document.querySelector('.venta-rapida-container .page-header .header-actions');
        if (headerActions && !headerActions.querySelector('.mesa-chip')) {
            const chip = document.createElement('div');
            chip.className = 'mesa-chip';
            const personasTxt = mesaContext.personas ? ` · ${mesaContext.personas} p` : '';
            chip.innerHTML = `<i class="fas fa-concierge-bell"></i> Mesa ${mesaContext.id} · ${mesaContext.cliente || 'Sin nombre'}${personasTxt}`;
            headerActions.prepend(chip);
        }
    }

    // Configuración del restaurante (cache local + fetch backend)
    let restauranteConfig = null;
    function getRestConfig() {
        if (restauranteConfig) return restauranteConfig;
        try {
            const ls = localStorage.getItem('restauranteConfig');
            if (ls) restauranteConfig = JSON.parse(ls);
        } catch {}
        return restauranteConfig;
    }
    async function ensureRestConfig() {
        const cfg = getRestConfig();
        if (cfg) return cfg;
        try {
            const res = await fetch('/api/restaurante');
            const data = await res.json();
            restauranteConfig = data;
            try { localStorage.setItem('restauranteConfig', JSON.stringify(data)); } catch {}
            return data;
        } catch (e) {
            console.warn('No se pudo obtener config restaurante, usando defaults');
            return { nombre: 'Mi Restaurante', direccion: '', telefono: '', email: '', iva_porcentaje: 16, propina_automatica: 0, incluir_iva: 1 };
        }
    }

    // Cargar productos desde API y enlazar eventos
    const grid = document.getElementById('productos-grid');
    loadProductos();

    async function loadProductos() {
        if (!grid) return;
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:1rem"><i class="fas fa-spinner fa-spin"></i> Cargando productos...</div>';
        try {
            const data = await api.get('/api/productos');
            const items = (Array.isArray(data) ? data : []).filter(p => Number(p.stock) > 0);
            if (items.length === 0) {
                grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:1rem">No hay productos disponibles.</div>';
                return;
            }
            grid.innerHTML = items.map(p => `
                <div class="producto-card" data-id="${p.id}" data-categoria="${escapeHtml(p.categoria || '')}" data-precio="${Number(p.precio)}">
                    <div class="producto-img"><i class="fas fa-box"></i></div>
                    <div class="producto-info">
                        <h4>${escapeHtml(p.nombre)}</h4>
                        <p class="producto-precio">${formatMoney(p.precio)}</p>
                        <p class="producto-stock">Disponible: ${p.stock}</p>
                    </div>
                    <button class="btn-agregar-producto"><i class="fas fa-plus"></i> Agregar</button>
                </div>`).join('');
            bindAgregarHandlers();
            // Ocultar botón Agregar si no tiene permiso
            if (!canAgregar) {
                grid.querySelectorAll('.btn-agregar-producto').forEach(b => b.style.display = 'none');
            }
        } catch (e) {
            console.error(e);
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:1rem;color:#dc3545">No se pudieron cargar los productos.</div>';
        }
    }

    function bindAgregarHandlers() {
    const botonesAgregar = document.querySelectorAll('.btn-agregar-producto');
        botonesAgregar.forEach(btn => {
            btn.addEventListener('click', (e) => {
        if (!canAgregar) return;
                const productoCard = e.target.closest('.producto-card');
                if (!productoCard) return;
                const productoId = String(productoCard.dataset.id);
                const productoNombre = productoCard.querySelector('h4').textContent;
                const productoPrecio = parseFloat(productoCard.dataset.precio);
                agregarAlCarrito(productoId, productoNombre, productoPrecio);
            });
        });
    }

    function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
    function formatMoney(v) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v||0)); }

    function agregarAlCarrito(id, nombre, precio) {
        const productoExistente = carrito.find(item => item.id === id);
        if (productoExistente) {
            productoExistente.cantidad += 1;
            productoExistente.subtotal = productoExistente.cantidad * precio;
        } else {
            carrito.push({ id, nombre, precio, cantidad: 1, subtotal: precio });
        }
        actualizarCarrito();
    }

    function actualizarCarrito() {
    const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const ivaPct = Number((getRestConfig()?.iva_porcentaje ?? 16)) / 100;
    const impuestos = subtotal * ivaPct;
        total = subtotal + impuestos;

        // Actualizar etiqueta de IVA (ej. "Impuestos (16%):") en la UI
        if (impuestosElement && impuestosElement.previousElementSibling) {
            const pct = Math.round((ivaPct || 0) * 100);
            impuestosElement.previousElementSibling.textContent = `Impuestos (${pct}%):`;
        }

        if (cantidadItems) cantidadItems.textContent = `${carrito.length} items`;
        if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
        if (impuestosElement) impuestosElement.textContent = `$${impuestos.toFixed(2)}`;
        if (totalFinalElement) totalFinalElement.textContent = `$${total.toFixed(2)}`;
        if (totalVentaElement) totalVentaElement.textContent = `$${total.toFixed(2)}`;
        if (pagoTotal) pagoTotal.textContent = `$${total.toFixed(2)}`;

        if (carrito.length === 0) {
            if (carritoVacio) carritoVacio.style.display = 'block';
            if (carritoLista) carritoLista.style.display = 'none';
        } else {
            if (carritoVacio) carritoVacio.style.display = 'none';
            if (carritoLista) carritoLista.style.display = 'block';

            if (carritoItemsBody) {
                carritoItemsBody.innerHTML = '';
                carrito.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
            <td>${item.nombre}</td>
            <td>
              <div class="cantidad-control">
                <button class="cantidad-btn" data-action="decrease" data-id="${item.id}">-</button>
                <input type="number" class="cantidad-input" value="${item.cantidad}" min="1" data-id="${item.id}">
                <button class="cantidad-btn" data-action="increase" data-id="${item.id}">+</button>
              </div>
            </td>
            <td>$${item.precio.toFixed(2)}</td>
            <td>$${item.subtotal.toFixed(2)}</td>
            <td>
              <button class="btn-eliminar-item" data-id="${item.id}">
                <i class="fas fa-trash"></i>
              </button>
            </td>`;
                    carritoItemsBody.appendChild(row);
                });
                agregarEventListenersCarrito();
            }
        }
    }

    function agregarEventListenersCarrito() {
        document.querySelectorAll('.cantidad-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const productId = e.target.dataset.id;
                actualizarCantidad(productId, action);
            });
        });

        document.querySelectorAll('.cantidad-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const productId = e.target.dataset.id;
                const nuevaCantidad = parseInt(e.target.value);
                if (nuevaCantidad > 0) actualizarCantidadManual(productId, nuevaCantidad);
            });
        });

        document.querySelectorAll('.btn-eliminar-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('button').dataset.id;
                eliminarDelCarrito(productId);
            });
        });
    }

    function actualizarCantidad(productId, action) {
        const item = carrito.find(item => item.id === productId);
        if (!item) return;
        if (action === 'increase') item.cantidad += 1;
        else if (action === 'decrease' && item.cantidad > 1) item.cantidad -= 1;
        item.subtotal = item.cantidad * item.precio;
        actualizarCarrito();
    }

    function actualizarCantidadManual(productId, cantidad) {
        const item = carrito.find(item => item.id === productId);
        if (!item) return;
        item.cantidad = cantidad;
        item.subtotal = item.cantidad * item.precio;
        actualizarCarrito();
    }

    function eliminarDelCarrito(productId) {
        carrito = carrito.filter(item => item.id !== productId);
        actualizarCarrito();
    }

    if (btnLimpiar) btnLimpiar.style.display = canLimpiar ? '' : 'none';
    btnLimpiar?.addEventListener('click', () => { if (!canLimpiar) return; carrito = []; actualizarCarrito(); });

    if (btnCancelar) btnCancelar.style.display = canCancelar ? '' : 'none';
    btnCancelar?.addEventListener('click', () => {
        if (!canCancelar) return;
        if (confirm('¿Estás seguro de que quieres cancelar la venta?')) {
            carrito = []; actualizarCarrito();
        }
    });

    if (btnProcesar) btnProcesar.style.display = canProcesar ? '' : 'none';
    btnProcesar?.addEventListener('click', () => {
        if (!canProcesar) return;
        if (carrito.length === 0) return alert('El carrito está vacío');
        const metodoPago = document.getElementById('metodo-pago').value;
        if (metodoPago === 'efectivo') {
            modalPago && (modalPago.style.display = 'block');
            if (montoRecibido) montoRecibido.value = '';
            if (pagoCambio) pagoCambio.textContent = '$0.00';
        } else {
            procesarVenta();
        }
    });

    montoRecibido?.addEventListener('input', (e) => {
        const monto = parseFloat(e.target.value) || 0;
        const cambio = monto - total;
        if (pagoCambio) pagoCambio.textContent = `$${cambio >= 0 ? cambio.toFixed(2) : '0.00'}`;
    });

    btnCancelarPago?.addEventListener('click', () => { modalPago && (modalPago.style.display = 'none'); });

    btnConfirmarPago?.addEventListener('click', () => {
        const monto = parseFloat(montoRecibido.value) || 0;
        if (monto < total) return alert('El monto recibido es menor que el total');
        modalPago && (modalPago.style.display = 'none');
        procesarVenta();
    try { imprimirFacturaYTicket(carrito, total, mesaContext); } catch (e) { console.error('Error al generar impresión:', e); }
    });

    async function procesarVenta() {
        try {
            // Construir payload: [{ id, cantidad }]
            const items = carrito.map(it => ({ id: Number(it.id), cantidad: Number(it.cantidad) }));
            // Metadatos de venta
            let empleado_nombre = null; let empleado_id = null;
            try { empleado_nombre = sessionStorage.getItem('nombreUsuario') || null; } catch {}
            try { const eid = sessionStorage.getItem('empleadoId'); if (eid) empleado_id = Number(eid); } catch {}
            const mesa_id = mesaContext?.id ? Number(mesaContext.id) : null;
            const mesa_codigo = mesa_id ? `Mesa ${mesa_id}` : (mesaContext?.numero ? `Mesa ${mesaContext.numero}` : null);
            const cliente_nombre = mesaContext?.cliente || null;
            const metodo_pago = 'efectivo';
            const payload = { items, empleado_id, empleado_nombre, mesa_id, mesa_codigo, cliente_nombre, metodo_pago, total: Number(total)||0 };
            const res = await fetch('/api/ventas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `Error HTTP ${res.status}`);
            }
            // Opcional: actualizar stocks en tarjetas si están visibles
            const data = await res.json();
            if (Array.isArray(data.updated)) {
                data.updated.forEach(u => {
                    const card = document.querySelector(`.producto-card[data-id="${u.id}"] .producto-stock`);
                    if (card) card.textContent = `Disponible: ${u.stock}`;
                });
            }
            alert('Venta procesada correctamente');
            carrito = [];
            actualizarCarrito();
        } catch (e) {
            alert(e.message || 'Error al procesar la venta');
        }
    }

    function imprimirFacturaYTicket(items, totalVenta, mesaCtx) {
        const ahora = new Date();
        const folio = 'FAC-' + ahora.getTime();
        const cfg = getRestConfig() || { nombre: 'Mi Restaurante', direccion: '', telefono: '', email: '', iva_porcentaje: 16 };
        const negocio = cfg.nombre || 'Mi Restaurante';
        const direccion = cfg.direccion || '';
        const tel = cfg.telefono ? ('Tel: ' + cfg.telefono) : '';

        const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
        const ivaPct = Number(cfg.iva_porcentaje ?? 16) / 100;
        const impuestos = subtotal * ivaPct;

        const mesaMeta = mesaCtx ? `<div class="meta">Mesa ${mesaCtx.id} · ${mesaCtx.cliente || 'Sin nombre'}${mesaCtx.personas ? ' · ' + mesaCtx.personas + ' persona(s)' : ''}</div>` : '';
        const contactoLinea = [direccion, tel].filter(Boolean).join(' · ');
        const facturaHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Factura</title><style>@page { size: A5 portrait; margin: 10mm; } body { font-family: Arial, sans-serif; color:#111827; } h1 { font-size: 16px; margin: 0 0 8px; } .header { text-align:center; margin-bottom: 10px; } .meta { font-size: 12px; color:#555; } table { width:100%; border-collapse:collapse; margin-top:8px; } th, td { border-bottom:1px solid #e5e7eb; padding:6px; font-size:12px; text-align:left; } th { background:#f9fafb; } .totales { margin-top:8px; } .totales div { display:flex; justify-content:space-between; font-size:13px; margin-top:4px; } .final { font-weight:700; } .footer { margin-top:10px; text-align:center; font-size:11px; color:#6b7280; } @media print { .no-print { display:none; } } .no-print { margin-top: 10px; } button { padding:6px 10px; }</style></head><body><div class="header"><h1>${negocio}</h1><div class="meta">${contactoLinea}</div><div class="meta">Folio: ${folio} · ${ahora.toLocaleString()}</div>${mesaMeta}</div><table><thead><tr><th>Producto</th><th>Cant</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>${items.map(i => `<tr><td>${i.nombre}</td><td>${i.cantidad}</td><td>$${i.precio.toFixed(2)}</td><td>$${i.subtotal.toFixed(2)}</td></tr>`).join('')}</tbody></table><div class="totales"><div><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div><div><span>Impuestos (${Math.round(ivaPct*100)}%):</span><span>$${impuestos.toFixed(2)}</span></div><div class="final"><span>Total:</span><span>$${totalVenta.toFixed(2)}</span></div></div><div class="footer">¡Gracias por su compra!</div><div class="no-print" style="text-align:center"><button onclick="window.print()">Imprimir</button></div></body></html>`;

        const mesaLinea = mesaCtx ? `<div>Mesa ${mesaCtx.id} · ${mesaCtx.cliente || ''}</div>` : '';
    const ticketHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket Cocina</title><style>@page { size: 80mm auto; margin: 5mm; } body { font-family: monospace; font-size: 12px; color:#111; } .hdr { text-align:center; } .line { border-top:1px dashed #000; margin:6px 0; } .item { display:flex; justify-content:space-between; } .strong { font-weight:700; } @media print { .no-print { display:none; } }</style></head><body><div class="hdr"><div class="strong">Ticket Cocina</div><div>${negocio}</div><div>${ahora.toLocaleString()}</div>${mesaLinea}</div><div class="line"></div>${items.map(i => `<div class="item"><span>${i.cantidad} x ${i.nombre}</span><span>$${i.subtotal.toFixed(2)}</span></div>`).join('')}<div class="line"></div><div>Total: $${totalVenta.toFixed(2)}</div><div class="no-print" style="text-align:center; margin-top:8px"><button onclick="window.print()">Imprimir</button></div></body></html>`;

        abrirVentanaImpresion(facturaHtml, 'Factura');
        abrirVentanaImpresion(ticketHtml, 'TicketCocina');
    }

    function abrirVentanaImpresion(html, title) {
        const win = window.open('', title, 'width=800,height=600');
        if (!win) return;
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.onload = () => { try { win.focus(); win.print(); } catch { } };
    }

    const categoriaBtns = document.querySelectorAll('.categoria-btn');
    categoriaBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoriaBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const categoria = btn.dataset.categoria;
            filtrarProductos(categoria);
        });
    });

    function filtrarProductos(categoria) {
        const productos = document.querySelectorAll('.producto-card');
        productos.forEach(producto => {
            if (categoria === 'todos' || producto.dataset.categoria === categoria) producto.style.display = '';
            else producto.style.display = 'none';
        });
    }

    const buscarInput = document.getElementById('buscar-producto-venta');
    if (buscarInput) {
        let clearedBuscarOnce = false;
        const originalPlaceholder = buscarInput.placeholder;
        const clearOnFirstFocus = () => {
            if (!clearedBuscarOnce) {
                buscarInput.value = '';
                buscarInput.placeholder = '';
                clearedBuscarOnce = true;
                buscarInput.dispatchEvent(new Event('input'));
            }
        };
        buscarInput.addEventListener('focus', clearOnFirstFocus);
        buscarInput.addEventListener('click', clearOnFirstFocus);
        buscarInput.addEventListener('blur', () => { if (buscarInput.value === '') buscarInput.placeholder = originalPlaceholder; });
        buscarInput.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase();
            const productos = document.querySelectorAll('.producto-card');
            productos.forEach(producto => {
                const nombre = producto.querySelector('h4').textContent.toLowerCase();
                if (termino === '') {
                    producto.style.display = '';
                } else {
                    producto.style.display = nombre.includes(termino) ? '' : 'none';
                }
            });
        });
    }

    // Cargar config al iniciar y escuchar actualizaciones desde Ajustes
    ensureRestConfig().then(() => actualizarCarrito());
    window.addEventListener('restauranteConfigUpdated', (ev) => {
        restauranteConfig = ev?.detail || restauranteConfig;
        try { localStorage.setItem('restauranteConfig', JSON.stringify(restauranteConfig)); } catch {}
        actualizarCarrito();
    });
}
