// js/views/reportes.js
export function initReportes() {
  console.log('Inicializando vista Reportes');
  // Cache de productos (id -> { nombre, categoria, precio }) para nombres y totales
  const productsCache = new Map();
  async function ensureProductsCache() {
    if (productsCache.size) return productsCache;
    try {
      const res = await fetch('/api/productos');
      const arr = await res.json();
      (arr||[]).forEach(p => productsCache.set(String(p.id), { nombre: p.nombre, categoria: p.categoria || null, precio: Number(p.precio)||0 }));
    } catch (e) { console.warn('No se pudieron cargar productos para cache', e); }
    return productsCache;
  }
  let permisos = [];
  try { permisos = JSON.parse(sessionStorage.getItem('permisos')||'[]'); } catch(_) {}
  const canGenerar = permisos.includes('action.reportes.generar');
  const canExportPdf = permisos.includes('action.reportes.export.pdf');
  const canExportExcel = permisos.includes('action.reportes.export.excel');
  const canFiltros = permisos.includes('action.reportes.filtros');

  const btnGenerarReporte = document.getElementById('btn-generar-reporte');
  const btnExportarPDF = document.getElementById('btn-exportar-pdf');
  const btnExportarExcel = document.getElementById('btn-exportar-excel');
  const btnFiltrosAvanzados = document.getElementById('btn-filtros-avanzados');
  const panelFiltrosAvanzados = document.getElementById('panel-filtros-avanzados');
  const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
  const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');
  const tipoReporteSel = document.getElementById('tipo-reporte');
  const rangoFecha = document.getElementById('rango-fecha');
  const fechasPersonalizadas = document.getElementById('fechas-personalizadas');
  const fechasPersonalizadasHasta = document.getElementById('fechas-personalizadas-hasta');
  const modalCarga = document.getElementById('modal-carga');
  const progresoFill = document.getElementById('progreso-fill');
  const progresoPorcentaje = document.getElementById('progreso-porcentaje');
  const tabla = document.getElementById('tabla-ventas');
  const buscarInput = document.getElementById('buscar-ventas');

  inicializarGraficos();

  if (btnGenerarReporte) btnGenerarReporte.style.display = canGenerar ? '' : 'none';
  if (btnExportarPDF) btnExportarPDF.style.display = canExportPdf ? '' : 'none';
  if (btnExportarExcel) btnExportarExcel.style.display = canExportExcel ? '' : 'none';
  if (btnFiltrosAvanzados) btnFiltrosAvanzados.style.display = canFiltros ? '' : 'none';

  btnGenerarReporte?.addEventListener('click', () => { if (!canGenerar) return; generarReporte(); });
  btnExportarPDF?.addEventListener('click', () => { if (!canExportPdf) return; exportarPDF(); });
  btnExportarExcel?.addEventListener('click', () => { if (!canExportExcel) return; exportarExcel(); });

  if (btnFiltrosAvanzados && panelFiltrosAvanzados) {
    btnFiltrosAvanzados.addEventListener('click', () => {
      if (!canFiltros) return;
      const isVisible = panelFiltrosAvanzados.style.display === 'block';
      panelFiltrosAvanzados.style.display = isVisible ? 'none' : 'block';
      btnFiltrosAvanzados.innerHTML = isVisible ? '<i class="fas fa-filter"></i> Filtros Avanzados' : '<i class="fas fa-times"></i> Ocultar Filtros';
    });
  }

  btnAplicarFiltros?.addEventListener('click', () => { if (!canFiltros) return; aplicarFiltrosAvanzados(); });
  btnLimpiarFiltros?.addEventListener('click', () => { if (!canFiltros) return; limpiarFiltros(); });

  if (rangoFecha && fechasPersonalizadas && fechasPersonalizadasHasta) {
    rangoFecha.addEventListener('change', function () {
      const mostrar = this.value === 'personalizado';
      fechasPersonalizadas.style.display = mostrar ? 'block' : 'none';
      fechasPersonalizadasHasta.style.display = mostrar ? 'block' : 'none';
      if (canGenerar) generarReporte();
    });
  }

  // Cambios de tipo de reporte regeneran tabla
  tipoReporteSel?.addEventListener('change', () => { if (canGenerar) generarReporte(); });

  // Filtro de búsqueda básico por texto en filas
  buscarInput?.addEventListener('input', () => {
    const term = (buscarInput.value || '').toLowerCase();
    const rows = tabla?.querySelectorAll('tbody tr');
    rows?.forEach(tr => {
      const txt = tr.textContent?.toLowerCase() || '';
      tr.style.display = txt.includes(term) ? '' : 'none';
    });
  });

  const botonesTipoGrafico = document.querySelectorAll('.grafico-acciones .btn');
  botonesTipoGrafico.forEach(btn => {
    btn.addEventListener('click', function () {
      botonesTipoGrafico.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const tipo = this.getAttribute('data-tipo');
      cambiarTipoGrafico(tipo);
    });
  });

  setTimeout(() => { if (canGenerar) generarReporte(); }, 1000);

  function inicializarGraficos() { /* inicialización perezosa, dibujo en generarReporte */ }

  function generarReporte() {
    console.log('Generando reporte...');
    modalCarga && (modalCarga.style.display = 'block');
    let progreso = 0;
    const intervalo = setInterval(() => {
      progreso += 5;
      if (progresoFill) progresoFill.style.width = `${progreso}%`;
      if (progresoPorcentaje) progresoPorcentaje.textContent = `${progreso}%`;
      if (progreso >= 100) {
        clearInterval(intervalo);
        setTimeout(() => {
          modalCarga && (modalCarga.style.display = 'none');
          const tipo = tipoReporteSel?.value || 'ventas';
          cargarDatosReporte(tipo);
          actualizarMetricas();
          actualizarResumen();
          renderGraficos();
        }, 500);
      }
    }, 100);
  }

  async function cargarDatosReporte(tipo = 'ventas') {
    console.log('Cargando datos del reporte...', tipo);
  const params = buildQueryParams();
    const tbody = tabla?.querySelector('tbody');
    const thead = tabla?.querySelector('thead tr');
    if (!tbody || !thead) return;

    // Helper para pintar "sin datos"
    const renderEmpty = (cols) => {
      tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;color:#6b7280;">Sin datos</td></tr>`;
    };

    try {
      if (tipo === 'ventas') {
        thead.innerHTML = `
          <th>Fecha</th>
          <th>Hora</th>
          <th>Mesa</th>
          <th>Empleado</th>
          <th>Cantidades</th>
          <th>Total</th>
          <th>Método Pago</th>`;
        await ensureProductsCache();
        const res = await fetch(`/api/reportes/ventas${params}`);
        const rows = await res.json();
        if (!rows.length) return renderEmpty(7);
  tbody.innerHTML = rows.map(r => {
          const f = new Date(r.fecha);
          const fecha = f.toLocaleDateString();
          const hora = f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          // Normalizar items (acepta objeto o string)
          let items = [];
          const raw = r.items_json;
          if (Array.isArray(raw)) items = raw;
          else { try { items = JSON.parse(raw || '[]'); } catch { items = []; } }
          // Enriquecer nombres desde cache si faltan
          const partes = (items||[]).slice(0,3).map(it => {
            const id = String(it.id);
            const name = it.nombre || productsCache.get(id)?.nombre || `Producto ${id}`;
            return `${Number(it.cantidad)||0} x ${name}`;
          });
          // Mostrar solo cantidad por producto (sin nombre)
          const cantidades = (items||[]).slice(0,3).map(it => `${Number(it.cantidad)||0}`);
          const productosTxt = cantidades.length ? (cantidades.join(', ') + ((items.length>3)?` +${items.length-3} más`:'')) : '-';
          // Total: usar r.total o calcular desde items con precios cacheados
          let total = Number(r.total)||0;
          if (!(total>0) && Array.isArray(items) && items.length) {
            total = items.reduce((acc, it) => acc + (Number(it.subtotal)|| (Number(it.cantidad)||0) * (productsCache.get(String(it.id))?.precio||0)), 0);
          }
          const mp = String(r.metodo_pago||'');
          const mpL = mp.toLowerCase();
          let metodoClass = 'badge';
          if (mpL.includes('efect')) metodoClass = 'badge-success';
          else if (mpL.includes('tarj') || mpL.includes('card')) metodoClass = 'badge-info';
          else if (mpL.includes('transf') || mpL.includes('dep')) metodoClass = 'badge-warning';

          return `<tr>
            <td>${fecha}</td>
            <td>${hora}</td>
            <td>${r.mesa_codigo ? `<span class="badge badge-info">${r.mesa_codigo}</span>` : '—'}</td>
            <td>${r.empleado_nombre||'—'}</td>
            <td>${productosTxt}</td>
            <td><strong>$${Number(total).toFixed(2)}</strong></td>
            <td>${mp ? `<span class="${metodoClass}">${mp}</span>` : ''}</td>
          </tr>`;
        }).join('');
      } else if (tipo === 'productos') {
        thead.innerHTML = `
          <th>Producto</th>
          <th>Categoría</th>
          <th>Cantidad Vendida</th>`;
        const res = await fetch(`/api/reportes/top-productos${params}`);
        const rows = await res.json();
        if (!rows.length) return renderEmpty(3);
        tbody.innerHTML = rows.map(r => `
          <tr><td>${r.nombre || ('Producto '+r.id)}</td><td>${r.categoria || ''}</td><td>${r.cantidad}</td></tr>
        `).join('');
      } else if (tipo === 'mesas') {
        thead.innerHTML = `
          <th>Mesa</th>
          <th>Usos</th>
          <th>Total</th>`;
        const res = await fetch(`/api/reportes/uso-mesas${params}`);
        const rows = await res.json();
        if (!rows.length) return renderEmpty(3);
        tbody.innerHTML = rows.map(r => `
          <tr><td>${r.mesa_codigo||''}</td><td>${r.usos}</td><td>$${Number(r.total).toFixed(2)}</td></tr>
        `).join('');
      } else if (tipo === 'empleados') {
        thead.innerHTML = `
          <th>Empleado</th>
          <th>Ventas</th>
          <th>Total</th>`;
        const res = await fetch(`/api/reportes/empleados${params}`);
        const rows = await res.json();
        if (!rows.length) return renderEmpty(3);
        tbody.innerHTML = rows.map(r => `
          <tr><td>${r.empleado_nombre||''}</td><td>${r.ventas}</td><td>$${Number(r.total).toFixed(2)}</td></tr>
        `).join('');
      } else if (tipo === 'clientes') {
        thead.innerHTML = `
          <th>Cliente</th>
          <th>Visitas</th>
          <th>Total</th>`;
        const res = await fetch(`/api/reportes/clientes${params}`);
        const rows = await res.json();
        if (!rows.length) return renderEmpty(3);
        tbody.innerHTML = rows.map(r => `
          <tr><td>${r.cliente_nombre||''}</td><td>${r.visitas}</td><td>$${Number(r.total).toFixed(2)}</td></tr>
        `).join('');
      }
    } catch (e) {
      console.warn('Error cargando reporte', tipo, e);
    }
  }

  async function actualizarMetricas() {
    console.log('Actualizando métricas...');
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    try {
      const res = await fetch(`/api/reportes/resumen${buildQueryParams()}`);
      const j = await res.json();
      setText('total-ventas', `$${Number(j.totalVentas).toFixed(2)}`);
      setText('total-pedidos', String(j.conteoVentas));
      setText('total-clientes', String(j.totalClientes));
      setText('promedio-mesa', `$${Number(j.promedioVenta).toFixed(2)}`);
    } catch (e) { console.warn('Error métricas', e); }
  }

  async function actualizarResumen() {
    console.log('Actualizando resumen...');
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    try {
      const params = buildQueryParams();
      const [resResumen, resProd, resEmp, resMesa] = await Promise.all([
        fetch(`/api/reportes/resumen${params}`),
        fetch(`/api/reportes/top-productos${params}`),
        fetch(`/api/reportes/empleados${params}`),
        fetch(`/api/reportes/uso-mesas${params}`)
      ]);
      const j = await resResumen.json();
      const topProd = (await resProd.json())[0];
      const topEmp = (await resEmp.json())[0];
      const topMesa = (await resMesa.json())[0];
      const inicio = new Date(j.rango?.inicio); const fin = new Date(j.rango?.fin);
      setText('resumen-periodo', `${inicio.toLocaleDateString()} - ${fin.toLocaleDateString()}`);
      setText('resumen-total-ventas', `$${Number(j.totalVentas).toFixed(2)}`);
      setText('resumen-promedio-venta', `$${Number(j.promedioVenta).toFixed(2)}`);
      setText('resumen-producto-top', topProd ? `${topProd.nombre || ('Producto '+topProd.id)} (${topProd.cantidad} uds)` : 'N/A');
      setText('resumen-empleado-top', topEmp ? `${topEmp.empleado_nombre||'N/D'} ($${Number(topEmp.total).toFixed(2)})` : 'N/A');
      setText('resumen-mesa-top', topMesa ? `${topMesa.mesa_codigo||'N/D'} ($${Number(topMesa.total).toFixed(2)})` : 'N/A');
    } catch (e) { console.warn('Error resumen', e); }
  }

  // Gráficos simples con Canvas 2D (sin dependencias)
  function drawBarChart(canvasId, labels, values, opts={}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.clientWidth || 600;
    const H = canvas.height = canvas.clientHeight || 300;
    ctx.clearRect(0,0,W,H);
    if (!labels.length) return;
    const max = Math.max(...values, 1);
    const padding = 32; const gap = 8;
    const barW = Math.max(10, (W - padding*2 - gap*(labels.length-1)) / labels.length);
    ctx.fillStyle = opts.bg || '#e5e7eb';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#3746d4';
    labels.forEach((lab, i) => {
      const x = padding + i*(barW+gap);
      const h = Math.round((values[i]/max) * (H - padding*2));
      const y = H - padding - h;
      ctx.fillRect(x, y, barW, h);
    });
    // Ejes simples
    ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padding, H - padding); ctx.lineTo(W - padding/2, H - padding); ctx.stroke();
    // Etiquetas X (cada n para no saturar)
    ctx.fillStyle = '#111827'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    const step = Math.ceil(labels.length / 8);
    labels.forEach((lab, i) => { if (i%step===0) ctx.fillText(String(lab), padding + i*(barW+gap) + barW/2, H - padding + 14); });
  }

  async function renderGraficos() {
    const params = buildQueryParams();
    await ensureProductsCache();
    // Ventas por día: agrupar ventas
    try {
      const res = await fetch(`/api/reportes/ventas${params}`);
      const rows = await res.json();
      const byDay = new Map();
      (rows||[]).forEach(r => { const d = new Date(r.fecha); const key = d.toLocaleDateString(); byDay.set(key, (byDay.get(key)||0) + (Number(r.total)||0)); });
      const labels = Array.from(byDay.keys());
      const values = Array.from(byDay.values());
      drawBarChart('grafico-ventas', labels, values, { bg: '#f9fafb' });
    } catch (e) { /* noop */ }
    // Productos más vendidos
    try {
      const res = await fetch(`/api/reportes/top-productos${params}`);
      const rows = await res.json();
      const top = (rows||[]).slice(0,8);
      const labels = top.map(x => x.nombre || ('Producto '+x.id));
      const values = top.map(x => Number(x.cantidad)||0);
      drawBarChart('grafico-productos', labels, values, { bg: '#f9fafb' });
    } catch (e) { /* noop */ }
    // Ventas por categoría (suma cantidades por categoría usando ventas/items)
    try {
      const res = await fetch(`/api/reportes/ventas${params}`);
      const rows = await res.json();
      const catMap = new Map();
      (rows||[]).forEach(r => {
        let items = [];
        const raw = r.items_json; if (Array.isArray(raw)) items = raw; else { try { items = JSON.parse(raw||'[]'); } catch {} }
        (items||[]).forEach(it => {
          const info = productsCache.get(String(it.id));
          const cat = info?.categoria || 'Otros';
          catMap.set(cat, (catMap.get(cat)||0) + (Number(it.cantidad)||0));
        });
      });
      const labels = Array.from(catMap.keys());
      const values = Array.from(catMap.values());
      drawBarChart('grafico-categorias', labels, values, { bg: '#f9fafb' });
    } catch (e) { /* noop */ }
  }

  function exportarPDF() {
    console.log('Exportando a PDF...');
    alert('Funcionalidad de exportación a PDF en desarrollo');
  }

  function exportarExcel() {
    console.log('Exportando a Excel...');
    alert('Funcionalidad de exportación a Excel en desarrollo');
  }

  function aplicarFiltrosAvanzados() {
    console.log('Aplicando filtros avanzados...');
    const empleado = document.getElementById('filtro-empleado').value;
    const mesa = document.getElementById('filtro-mesa').value;
    const producto = document.getElementById('filtro-producto').value;
    const categoria = document.getElementById('filtro-categoria').value;
    console.log('Filtros aplicados:', { empleado, mesa, producto, categoria });
    generarReporte();
    if (panelFiltrosAvanzados) panelFiltrosAvanzados.style.display = 'none';
    if (btnFiltrosAvanzados) btnFiltrosAvanzados.innerHTML = '<i class="fas fa-filter"></i> Filtros Avanzados';
  }

  function limpiarFiltros() {
    console.log('Limpiando filtros...');
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('filtro-empleado', '');
    setVal('filtro-mesa', '');
    setVal('filtro-producto', '');
    setVal('filtro-categoria', '');
    generarReporte();
  }

  function cambiarTipoGrafico(tipo) {
    console.log('Cambiando tipo de gráfico a:', tipo);
    alert(`Cambiando a vista ${tipo} del gráfico`);
  }

  function buildQueryParams() {
    const rango = document.getElementById('rango-fecha')?.value || 'hoy';
    const desde = document.getElementById('fecha-desde')?.value || '';
    const hasta = document.getElementById('fecha-hasta')?.value || '';
  const empleado = document.getElementById('filtro-empleado')?.value || '';
  const mesa = document.getElementById('filtro-mesa')?.value || '';
  const producto = document.getElementById('filtro-producto')?.value || '';
  const categoria = document.getElementById('filtro-categoria')?.value || '';
    const parts = new URLSearchParams();
    parts.set('rango', rango);
    if (rango === 'personalizado') { if (desde) parts.set('desde', desde); if (hasta) parts.set('hasta', hasta); }
  if (empleado) parts.set('empleado', empleado);
  if (mesa) parts.set('mesa', mesa);
  if (producto) parts.set('producto', producto);
  if (categoria) parts.set('categoria', categoria);
    return `?${parts.toString()}`;
  }
}
