// Auth guard para páginas protegidas (usar en index.html)
// Redirige a login antes de cargar scripts pesados si no hay sesión
(function () {
  try {
    // Asegurar que nunca se use localStorage para sesión (limpiar cualquier residuo)
    try {
      localStorage.removeItem('logueado');
      localStorage.removeItem('nombreUsuario');
    } catch (_) {}

    const isLoggedIn = () => sessionStorage.getItem('logueado') === '1';
    const isLoginPage = /login\.html(\?|#|$)/i.test(location.pathname) || /login\.html(\?|#|$)/i.test(location.href);

    if (!isLoggedIn() && !isLoginPage) {
      location.replace('login.html');
      return;
    }

    const requireAuth = () => {
      if (!isLoggedIn()) {
        location.replace('login.html');
        return false;
      }
      return true;
    };

    // Revalidar en navegación SPA y restauraciones del historial
    window.addEventListener('hashchange', requireAuth);
    window.addEventListener('popstate', requireAuth);
    window.addEventListener('pageshow', (e) => {
      // Si la página se restauró desde bfcache, invalidar sesión de esta pestaña
      if (e && e.persisted) {
        try { sessionStorage.clear(); } catch (_) {}
      }
      requireAuth();
    });

    // Logout cross-tab (opcional): si otra pestaña hace logout, esta también
    window.addEventListener('storage', (e) => {
      if (e.key === 'forceLogout') {
        try { sessionStorage.clear(); } catch (_) {}
        location.replace('login.html');
      }
    });

    // Logout y verificación inicial cuando el DOM está listo
    document.addEventListener('DOMContentLoaded', () => {
      const btn = document.getElementById('cerrarSesionBtn');
      if (btn) {
        btn.addEventListener('click', () => {
          try {
            sessionStorage.removeItem('logueado');
            sessionStorage.removeItem('nombreUsuario');
            // Notificar a otras pestañas
            localStorage.setItem('forceLogout', Date.now().toString());
            setTimeout(() => localStorage.removeItem('forceLogout'), 0);
          } catch (_) {}
          location.replace('login.html');
        });
      }
      requireAuth();
    });
  } catch (e) {
    console.error('Auth guard error:', e);
  }
})();
