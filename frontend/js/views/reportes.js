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

  // Botón Generar Reporte removido
  const btnExportarPDF = document.getElementById('btn-exportar-pdf');
  const btnExportarExcel = document.getElementById('btn-exportar-excel');
  // Filtros avanzados removidos
  const tipoReporteSel = document.getElementById('tipo-reporte');
  const rangoFecha = document.getElementById('rango-fecha');
  const fechasPersonalizadas = document.getElementById('fechas-personalizadas');
  const fechasPersonalizadasHasta = document.getElementById('fechas-personalizadas-hasta');
  const modalCarga = document.getElementById('modal-carga');
  const progresoFill = document.getElementById('progreso-fill');
  const progresoPorcentaje = document.getElementById('progreso-porcentaje');
  const tabla = document.getElementById('tabla-ventas');
  const buscarInput = document.getElementById('buscar-ventas');

  // Poblar filtros avanzados desde BD
  (async function populateAdvancedFilters() {
    try {
      // Empleados
      const selEmp = document.getElementById('filtro-empleado');
      if (selEmp) {
        const res = await fetch('/api/empleados');
        const data = await res.json();
        const opts = ['<option value="">Todos los empleados</option>']
          .concat((data||[]).map(e => `<option value="${e.id}">${escapeHtml(e.nombre||`Empleado ${e.id}`)}</option>`));
        selEmp.innerHTML = opts.join('');
      }
    } catch (e) { console.warn('No se pudieron cargar empleados para filtros', e); }
    try {
      // Mesas
      const selMesa = document.getElementById('filtro-mesa');
      if (selMesa) {
        const res = await fetch('/api/mesas');
        const data = await res.json();
        const opts = ['<option value="">Todas las mesas</option>']
          .concat((data||[]).map(m => {
            const label = m.mesa_codigo || m.codigo || (m.numero ? `Mesa ${m.numero}` : `Mesa ${m.id}`);
            return `<option value="${m.id}">${escapeHtml(label)}</option>`;
          }));
        selMesa.innerHTML = opts.join('');
      }
    } catch (e) { console.warn('No se pudieron cargar mesas para filtros', e); }
    try {
      // Productos y Categorías desde cache
      await ensureProductsCache();
      const selProd = document.getElementById('filtro-producto');
      if (selProd) {
        const opts = ['<option value="">Todos los productos</option>']
          .concat(Array.from(productsCache.entries()).map(([id, info]) => `<option value="${id}">${escapeHtml(info.nombre || ('Producto '+id))}</option>`));
        selProd.innerHTML = opts.join('');
      }
      const selCat = document.getElementById('filtro-categoria');
      if (selCat) {
        const cats = new Set();
        productsCache.forEach(info => { if (info.categoria) cats.add(info.categoria); });
        const opts = ['<option value="">Todas las categorías</option>']
          .concat(Array.from(cats).map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`));
        selCat.innerHTML = opts.join('');
      }
    } catch (e) { console.warn('No se pudieron cargar productos/categorías para filtros', e); }
  })();

  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  // (sin gráficos)

  // Botón Generar Reporte removido
  if (btnExportarPDF) btnExportarPDF.style.display = canExportPdf ? '' : 'none';
  if (btnExportarExcel) btnExportarExcel.style.display = canExportExcel ? '' : 'none';
  // Filtros avanzados removidos: no hay panel que mostrar/ocultar

  // Botón Generar Reporte removido
  btnExportarPDF?.addEventListener('click', async () => { if (!canExportPdf) return; await exportarPDF(); });
  btnExportarExcel?.addEventListener('click', async () => { if (!canExportExcel) return; await exportarExcel(); });

  // Filtros avanzados eliminados: no hay listeners

  // Rango por defecto: "mes" para mostrar datos más fácilmente
  if (rangoFecha) { try { rangoFecha.value = 'mes'; } catch {} }

  if (rangoFecha && fechasPersonalizadas && fechasPersonalizadasHasta) {
    rangoFecha.addEventListener('change', function () {
      const mostrar = this.value === 'personalizado';
      fechasPersonalizadas.style.display = mostrar ? 'block' : 'none';
      fechasPersonalizadasHasta.style.display = mostrar ? 'block' : 'none';
      generarReporte();
    });
  }

  // Cambios de tipo de reporte regeneran tabla
  tipoReporteSel?.addEventListener('change', () => { generarReporte(); });

  // Filtro de búsqueda básico por texto en filas
  buscarInput?.addEventListener('input', () => {
    const term = (buscarInput.value || '').toLowerCase();
    const rows = tabla?.querySelectorAll('tbody tr');
    rows?.forEach(tr => {
      const txt = tr.textContent?.toLowerCase() || '';
      tr.style.display = txt.includes(term) ? '' : 'none';
    });
  });

  // (sin botones de tipo de gráfico)

  setTimeout(() => { generarReporte(); }, 400);

  // (sin inicialización de gráficos)

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
          renderTablasResumen();
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
            <td>${r.mesa_codigo ? `<span class="badge badge-info">${r.mesa_codigo}</span>` : '<span class="badge">Venta Rápida</span>'}</td>
            <td>${r.empleado_nombre||'—'}</td>
            <td>${productosTxt}</td>
            <td><strong>L${Number(total).toFixed(2)}</strong></td>
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
          <tr><td>${r.mesa_codigo ? r.mesa_codigo : 'Venta Rápida'}</td><td>${r.usos}</td><td>L${Number(r.total).toFixed(2)}</td></tr>
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
          <tr><td>${r.empleado_nombre||''}</td><td>${r.ventas}</td><td>L${Number(r.total).toFixed(2)}</td></tr>
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
          <tr><td>${r.cliente_nombre||''}</td><td>${r.visitas}</td><td>L${Number(r.total).toFixed(2)}</td></tr>
        `).join('');
      }
    } catch (e) {
      console.warn('Error cargando reporte', tipo, e);
      // Fallback visual: mostrar "Sin datos"
      if (thead && tbody) {
        if (tipo === 'ventas') thead.innerHTML = `<th>Fecha</th><th>Hora</th><th>Mesa</th><th>Empleado</th><th>Cantidades</th><th>Total</th><th>Método Pago</th>`;
        else if (tipo === 'productos') thead.innerHTML = `<th>Producto</th><th>Categoría</th><th>Cantidad Vendida</th>`;
        else if (tipo === 'mesas') thead.innerHTML = `<th>Mesa</th><th>Usos</th><th>Total</th>`;
        else if (tipo === 'empleados') thead.innerHTML = `<th>Empleado</th><th>Ventas</th><th>Total</th>`;
        else if (tipo === 'clientes') thead.innerHTML = `<th>Cliente</th><th>Visitas</th><th>Total</th>`;
        const cols = thead.querySelectorAll('th').length || 1;
        tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;color:#6b7280;">Sin datos</td></tr>`;
      }
    }
  }

  async function actualizarMetricas() {
    console.log('Actualizando métricas...');
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    try {
      const res = await fetch(`/api/reportes/resumen${buildQueryParams()}`);
      const j = await res.json();
  setText('total-ventas', `L${Number(j.totalVentas).toFixed(2)}`);
      setText('total-pedidos', String(j.conteoVentas));
      setText('total-clientes', String(j.totalClientes));
  setText('promedio-mesa', `L${Number(j.promedioVenta).toFixed(2)}`);
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
  setText('resumen-total-ventas', `L${Number(j.totalVentas).toFixed(2)}`);
  setText('resumen-promedio-venta', `L${Number(j.promedioVenta).toFixed(2)}`);
      setText('resumen-producto-top', topProd ? `${topProd.nombre || ('Producto '+topProd.id)} (${topProd.cantidad} uds)` : 'N/A');
  setText('resumen-empleado-top', topEmp ? `${topEmp.empleado_nombre||'N/D'} (L${Number(topEmp.total).toFixed(2)})` : 'N/A');
  setText('resumen-mesa-top', topMesa ? `${(topMesa.mesa_codigo && topMesa.mesa_codigo.trim()) ? topMesa.mesa_codigo : 'Venta Rápida'} (L${Number(topMesa.total).toFixed(2)})` : 'N/A');
    } catch (e) { console.warn('Error resumen', e); }
  }

  async function renderTablasResumen() {
    const params = buildQueryParams();
    await ensureProductsCache();
    // Ventas por día: agrupar ventas y llenar tabla
    try {
      const res = await fetch(`/api/reportes/ventas${params}`);
      const rows = await res.json();
      const byDay = new Map();
      (rows||[]).forEach(r => { const d = new Date(r.fecha); const key = d.toLocaleDateString(); byDay.set(key, (byDay.get(key)||0) + (Number(r.total)||0)); });
      const tbody = document.querySelector('#tabla-ventas-por-dia tbody');
  if (tbody) tbody.innerHTML = Array.from(byDay.entries()).map(([fecha, total]) => `<tr><td>${fecha}</td><td>L${Number(total).toFixed(2)}</td></tr>`).join('') || '<tr><td colspan="2">Sin datos</td></tr>';
    } catch (e) { /* noop */ }
    // Productos más vendidos
    try {
      const res = await fetch(`/api/reportes/top-productos${params}`);
      const rows = await res.json();
      const top = (rows||[]).slice(0,8);
      const tbody = document.querySelector('#tabla-top-productos tbody');
      if (tbody) tbody.innerHTML = top.map(x => `<tr><td>${x.nombre || ('Producto ' + x.id)}</td><td>${Number(x.cantidad)||0}</td></tr>`).join('') || '<tr><td colspan="2">Sin datos</td></tr>';
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
      const tbody = document.querySelector('#tabla-ventas-categorias tbody');
      if (tbody) tbody.innerHTML = Array.from(catMap.entries()).map(([cat, cant]) => `<tr><td>${cat}</td><td>${cant}</td></tr>`).join('') || '<tr><td colspan="2">Sin datos</td></tr>';
    } catch (e) { /* noop */ }
  }

  async function exportarPDF() {
    try {
      // Generar contenido HTML sencillo de reporte con las tres tablas visibles
      const ahora = new Date();
      const periodo = document.getElementById('resumen-periodo')?.textContent || '';
      const totalVentas = document.getElementById('total-ventas')?.textContent || '';
      const promedioMesa = document.getElementById('promedio-mesa')?.textContent || '';
  let logoUrl = '';
  try { const ls = localStorage.getItem('restauranteConfig'); if (ls) logoUrl = (JSON.parse(ls).logo_url)||''; } catch {}
  try { if (!logoUrl && window.__restauranteConfig) logoUrl = window.__restauranteConfig.logo_url || ''; } catch {}
      const tablaPrincipal = document.getElementById('tabla-ventas');
      const tablaPorDia = document.getElementById('tabla-ventas-por-dia');
      const tablaTopProd = document.getElementById('tabla-top-productos');
      const tablaCategorias = document.getElementById('tabla-ventas-categorias');

      const toHtmlTable = (table) => table ? `<table>${table.tHead?.outerHTML || ''}${table.tBodies[0]?.outerHTML || ''}</table>` : '';
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Reporte</title>
        <style>
          body{font-family:Arial, sans-serif; color:#111827}
          h1,h2{margin:0 0 6px}
          .meta{color:#555;font-size:12px;margin-bottom:10px}
          table{width:100%; border-collapse:collapse; margin:8px 0}
          th,td{border:1px solid #e5e7eb; padding:6px; font-size:12px; text-align:left}
          th{background:#f9fafb}
          .logo{height:50px; object-fit:contain; margin-bottom:8px}
        </style></head><body>
        ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="Logo">` : ``}
        <h1>Reporte de Ventas</h1>
        <div class="meta">Generado: ${ahora.toLocaleString()} · Período: ${periodo}</div>
        <div class="meta">Totales: ${totalVentas} · Promedio por Mesa: ${promedioMesa}</div>
        <h2>Detalle de Ventas</h2>
        ${toHtmlTable(tablaPrincipal)}
        <h2>Ventas por Día</h2>
        ${toHtmlTable(tablaPorDia)}
        <h2>Productos Más Vendidos</h2>
        ${toHtmlTable(tablaTopProd)}
        <h2>Ventas por Categoría</h2>
        ${toHtmlTable(tablaCategorias)}
        <script>window.onload=()=>{window.print()};</script>
      </body></html>`;

      const win = window.open('', 'ReportePDF');
      if (!win) return alert('No se pudo abrir la ventana de impresión');
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (e) {
      alert('No se pudo exportar a PDF');
    }
  }

  // Cargar ExcelJS dinámicamente si no está presente
  async function ensureExcelJS() {
    // @ts-ignore
    if (window.ExcelJS) return window.ExcelJS;
    // Intentar cargar desde CDN
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-exceljs]');
      if (existing) { existing.addEventListener('load', resolve); existing.addEventListener('error', reject); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      s.async = true; s.defer = true; s.setAttribute('data-exceljs','1');
      s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    });
    // @ts-ignore
    return window.ExcelJS;
  }

  async function exportarExcel() {
    try {
      const ExcelJS = await ensureExcelJS();
      if (!ExcelJS) return alert('No se pudo cargar el motor de Excel. Verifica tu conexión.');

  // Color de encabezado fijo: azul
  const headerBgArgb = 'FF2563EB';

      const wb = new ExcelJS.Workbook();
      wb.creator = 'Sistema Cafetería';
      wb.created = new Date();

      const addSheetFromTable = (sheetName, tableEl, opts = {}) => {
        const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
        if (!tableEl) return ws;
        // Título opcional
        if (opts.title) {
          ws.addRow([opts.title]);
          const r1 = ws.getRow(1);
          r1.font = { bold: true, size: 14 };
          r1.alignment = { vertical: 'middle', horizontal: 'left' };
          ws.addRow([]);
        }
        // Headers como array de textos (cada th una columna)
        const headers = Array.from(tableEl.querySelectorAll('thead th')).map(th => (th.textContent || '').replace(/\s+/g,' ').trim());
        if (headers.length) {
          const headerRow = ws.addRow(headers);
          headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
          headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgArgb } };
        }
        // Body
        const bodyRows = [];
        tableEl.querySelectorAll('tbody tr').forEach(tr => {
          const cols = Array.from(tr.querySelectorAll('td')).map(td => {
            // Tomar el texto visible, sin comas CSV, limpio
            let text = (td.textContent || '').replace(/[\n\r]+/g,' ').replace(/\s+/g,' ').trim();
            // Remover comillas raras en HTML, quedan limpios para celdas
            return text.replace(/["']/g, '');
          });
          bodyRows.push(cols);
        });
        bodyRows.forEach(r => ws.addRow(r));

        // Auto-ajuste de ancho por contenido (headers + filas)
        const colCount = headers.length;
        const widths = new Array(colCount).fill(10);
        for (let c = 0; c < colCount; c++) {
          let maxLen = (headers[c] || '').length;
          for (let r = 0; r < bodyRows.length; r++) {
            const cellText = String((bodyRows[r] || [])[c] ?? '');
            if (cellText.length > maxLen) maxLen = cellText.length;
          }
          // padding y límites razonables
          widths[c] = Math.min(Math.max(maxLen + 2, 10), 60);
        }
        ws.columns = widths.map(w => ({ width: w }));

        // Formatos: si hay columna Total, formatear como moneda L
        const totalIdx = headers.findIndex(h => h.toLowerCase().includes('total'));
        if (totalIdx >= 0) {
          // Primera fila de datos: depende si hubo título + espacio (2 filas) y 1 fila de encabezado
          const dataStart = (opts.title ? 4 : 2); // Row 1 title, row 2 blank, row 3 headers => dataStart=4; sino headers en 1 => dataStart=2
          const dataEnd = ws.actualRowCount;
          for (let r = dataStart; r <= dataEnd; r++) {
            const cell = ws.getRow(r).getCell(totalIdx + 1);
            // Intentar convertir a número quitando prefijo L
            const val = String(cell.value ?? '').replace(/^L\s?/, '').replace(/,/g,'');
            const n = Number(val);
            if (!isNaN(n)) {
              cell.value = n;
              cell.numFmt = '"L"#,##0.00';
              cell.alignment = { horizontal: 'right' };
            }
          }
        }

        // Bordes sutiles para todo el rango de datos, si existe
        const lastRow = ws.lastRow?.number || 0;
        if (lastRow >= 1 && headers.length) {
          const startRow = (opts.title ? 3 : 1);
          for (let r = startRow; r <= lastRow; r++) {
            const row = ws.getRow(r);
            row.eachCell(c => {
              c.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
            });
          }
        }
        return ws;
      };

      // Construir hojas desde las tablas visibles
      addSheetFromTable('Detalle de Ventas', document.getElementById('tabla-ventas'), { title: 'Detalle de Ventas' });
      addSheetFromTable('Ventas por Día', document.getElementById('tabla-ventas-por-dia'), { title: 'Ventas por Día' });
      addSheetFromTable('Top Productos', document.getElementById('tabla-top-productos'), { title: 'Productos Más Vendidos' });
      addSheetFromTable('Por Categoría', document.getElementById('tabla-ventas-categorias'), { title: 'Ventas por Categoría' });

      const ahora = new Date();
      const fname = `reporte_ventas_${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}.xlsx`;
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fname; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('No se pudo exportar a Excel');
    }
  }

  // Funciones de filtros avanzados eliminadas

  // (sin cambio de tipo de gráfico)

  function buildQueryParams() {
  const rango = document.getElementById('rango-fecha')?.value || 'hoy';
  const desde = document.getElementById('fecha-desde')?.value || '';
  const hasta = document.getElementById('fecha-hasta')?.value || '';
    const parts = new URLSearchParams();
    parts.set('rango', rango);
    if (rango === 'personalizado') { if (desde) parts.set('desde', desde); if (hasta) parts.set('hasta', hasta); }
    return `?${parts.toString()}`;
  }
}
