// js/main.js
// Punto de entrada del frontend (ES Modules)

import { loadViewHtml, enhanceAllSelects } from './core/dom.js';
import { connectSockets } from './core/sockets.js';

// Estado global mínimo
const state = {
  currentView: null,
};

function setUserHeader() {
  const name = sessionStorage.getItem('nombreUsuario') || 'Usuario';
  const el = document.getElementById('user-name');
  if (el) el.textContent = name;
}

function setupUserDropdown() {
  const userDropdownBtn = document.getElementById('userDropdownBtn');
  const userDropdown = document.getElementById('userDropdown');
  if (userDropdownBtn && userDropdown) {
    userDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target)) {
        userDropdown.classList.remove('open');
      }
    });
  }
  const verPerfilBtn = document.getElementById('verPerfilBtn');
  const cerrarSesionBtn = document.getElementById('cerrarSesionBtn');
  verPerfilBtn && (verPerfilBtn.onclick = () => alert('Ver perfil (pendiente)'));
  if (cerrarSesionBtn) {
    cerrarSesionBtn.onclick = function () {
      try {
        const userName = sessionStorage.getItem('nombreUsuario');
        const sessionId = sessionStorage.getItem('sessionId');
        const userId = sessionStorage.getItem('userId');
        fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ userId, sessionId }) }).catch(() => {});
      } catch(_) {}
      try {
        sessionStorage.removeItem('logueado');
        sessionStorage.removeItem('nombreUsuario');
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('userId');
        localStorage.setItem('forceLogout', Date.now().toString());
        setTimeout(() => localStorage.removeItem('forceLogout'), 0);
      } catch (_) {}
      window.location.href = 'login.html';
    };
  }
}

function setupSidebar() {
  const sidebar = document.getElementById('sidebarNav');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const menuToggle = document.getElementById('menu-toggle');
  const menuToggleHeader = document.getElementById('menu-toggle-header');

  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('open');
    if (menuToggle) menuToggle.classList.add('active');
    if (menuToggleHeader) menuToggleHeader.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('open');
    if (menuToggle) menuToggle.classList.remove('active');
    if (menuToggleHeader) menuToggleHeader.classList.remove('active');
    document.body.style.overflow = '';
  }
  function toggleSidebar() {
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
      if (sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
    } else {
      sidebar.classList.toggle('collapsed');
      if (menuToggle) menuToggle.classList.toggle('active');
    }
  }
  if (menuToggle) menuToggle.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar(); });
  if (menuToggleHeader) menuToggleHeader.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar(); });
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

  function handleResize() {
    if (window.innerWidth > 768) {
      if (sidebar) sidebar.classList.remove('open');
      if (sidebarOverlay) sidebarOverlay.classList.remove('open');
      document.body.style.overflow = '';
      if (window.innerWidth <= 1024) {
        if (sidebar) sidebar.classList.add('collapsed');
        if (menuToggle) menuToggle.classList.add('active');
      } else {
        if (sidebar) sidebar.classList.remove('collapsed');
        if (menuToggle) menuToggle.classList.remove('active');
      }
    } else {
      if (sidebar) sidebar.classList.remove('collapsed');
      closeSidebar();
    }
  }
  handleResize();
  window.addEventListener('resize', handleResize);

  // Exponer para compatibilidad
  window.toggleSidebar = toggleSidebar;
}

function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  // Función para aplicar permisos actuales al menú
  function applyMenuPermissions() {
    try {
      const permisos = JSON.parse(sessionStorage.getItem('permisos') || '[]');
      const viewPerm = (view) => `view.${view}`;
      navButtons.forEach(btn => {
        const viewName = btn.getAttribute('data-view');
        const allow = permisos.includes(viewPerm(viewName));
        btn.style.display = allow ? '' : 'none';
      });
    } catch(_) {}
  }
  function canView(viewName) {
    try {
      const permisos = JSON.parse(sessionStorage.getItem('permisos') || '[]');
      return permisos.includes(`view.${viewName}`);
    } catch (_) { return false; }
  }
  // Aplicar al inicio y al recibir evento de actualización de permisos
  applyMenuPermissions();
  window.addEventListener('permisosActualizados', applyMenuPermissions);
  window.addEventListener('permisosActualizados', () => {
    // Si la vista actual quedó sin permiso, regresar a home
    const view = state.currentView;
    if (view && !canView(view)) {
      const homeBtn = document.querySelector('.nav-btn[data-view="home"]');
      homeBtn && homeBtn.click();
    }
  });
  navButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const viewName = button.getAttribute('data-view');
      if (!viewName) return;
      if (!canView(viewName)) {
        alert('No tienes permiso para ver esta sección');
        return;
      }
      navButtons.forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      loadView(viewName);
  if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebarNav');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });
}

async function loadView(viewName) {
  // Bloquear carga si no hay permiso
  try {
    const permisos = JSON.parse(sessionStorage.getItem('permisos') || '[]');
    if (!permisos.includes(`view.${viewName}`)) {
      // Permitir home como fallback si no hay permisos
      if (viewName !== 'home') {
        const homeBtn = document.querySelector('.nav-btn[data-view="home"]');
        if (homeBtn) { homeBtn.classList.add('active'); }
        return loadView('home');
      }
    }
  } catch (_) {}
  state.currentView = viewName;
  const root = await loadViewHtml(viewName);
  enhanceAllSelects(root);
  switch (viewName) {
    case 'home': {
      const mod = await import('./views/home.js');
      mod.initHome();
      break;
    }
    case 'productos': {
      const mod = await import('./views/productos.js');
      mod.initProductos();
      break;
    }
    case 'empleados': {
      const mod = await import('./views/empleados.js');
      mod.initEmpleados();
      break;
    }
    case 'ventas-rapidas': {
      const mod = await import('./views/ventas-rapidas.js');
      mod.initVentasRapidas();
      break;
    }
    case 'mesas': {
      const mod = await import('./views/mesas.js');
      mod.initMesas();
      break;
    }
    
    case 'ajustes': {
      const mod = await import('./views/ajustes.js');
      mod.initAjustes();
      break;
    }
    case 'reportes': {
      const mod = await import('./views/reportes.js');
      mod.initReportes();
      break;
    }
  // Extiende aquí con más vistas: ventas-rapidas, mesas, ajustes, reportes
    default:
      console.info(`Vista ${viewName} cargada.`);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setUserHeader();
  // Conectar sockets si hay sesión
  try { if (sessionStorage.getItem('logueado') === '1') connectSockets(); } catch {}
  setupUserDropdown();
  setupSidebar();
  setupNavigation();
  loadView('home');
  const homeButton = document.querySelector('.nav-btn[data-view="home"]');
  homeButton && homeButton.classList.add('active');
});

// Exponer para pruebas manuales
window.__app = { loadView };
