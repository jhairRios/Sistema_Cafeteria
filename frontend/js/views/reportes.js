// js/views/reportes.js
export function initReportes() {
  console.log('Inicializando vista Reportes');
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
  const rangoFecha = document.getElementById('rango-fecha');
  const fechasPersonalizadas = document.getElementById('fechas-personalizadas');
  const fechasPersonalizadasHasta = document.getElementById('fechas-personalizadas-hasta');
  const modalCarga = document.getElementById('modal-carga');
  const progresoFill = document.getElementById('progreso-fill');
  const progresoPorcentaje = document.getElementById('progreso-porcentaje');

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
    });
  }

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

  function inicializarGraficos() {
    console.log('Inicializando gráficos...');
    setTimeout(() => { console.log('Gráficos inicializados'); }, 500);
  }

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
          cargarDatosReporte();
          actualizarMetricas();
          actualizarResumen();
        }, 500);
      }
    }, 100);
  }

  function cargarDatosReporte() {
    console.log('Cargando datos del reporte...');
    const tablaVentas = document.getElementById('tabla-ventas');
    if (tablaVentas) {
      const tbody = tablaVentas.querySelector('tbody');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td>15/12/2023</td><td>12:30</td><td>Mesa 2</td><td>María González</td><td>2 Café Americano, 1 Sandwich</td><td>$15.50</td><td>Efectivo</td>
          </tr>
          <tr>
            <td>15/12/2023</td><td>13:45</td><td>Mesa 4</td><td>Carlos Rodríguez</td><td>3 Capuchino, 2 Brownie</td><td>$24.75</td><td>Tarjeta</td>
          </tr>
          <tr>
            <td>15/12/2023</td><td>14:20</td><td>Mesa 1</td><td>Ana Martínez</td><td>1 Expreso, 1 Jugo de Naranja</td><td>$8.50</td><td>Efectivo</td>
          </tr>
          <tr>
            <td>15/12/2023</td><td>15:30</td><td>Mesa 3</td><td>María González</td><td>4 Café Americano, 2 Sandwich</td><td>$31.00</td><td>Transferencia</td>
          </tr>
          <tr>
            <td>15/12/2023</td><td>16:45</td><td>Mesa 5</td><td>Carlos Rodríguez</td><td>2 Capuchino, 1 Tarta de Manzana</td><td>$16.25</td><td>Tarjeta</td>
          </tr>`;
      }
    }
  }

  function actualizarMetricas() {
    console.log('Actualizando métricas...');
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('total-ventas', '$95.00');
    setText('total-pedidos', '5');
    setText('total-clientes', '5');
    setText('promedio-mesa', '$19.00');
  }

  function actualizarResumen() {
    console.log('Actualizando resumen...');
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('resumen-periodo', '15/12/2023 - 15/12/2023');
    setText('resumen-total-ventas', '$95.00');
    setText('resumen-promedio-venta', '$19.00');
    setText('resumen-producto-top', 'Café Americano (6 unidades)');
    setText('resumen-empleado-top', 'María González ($46.50)');
    setText('resumen-mesa-top', 'Mesa 2 ($15.50)');
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
}
