// Auth guard para páginas protegidas (usar en index.html)
// Redirige a login antes de cargar scripts pesados si no hay sesión
(function () {
  try {
    const isLoggedIn = () => localStorage.getItem('logueado') === '1';
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

    // Revalidar en navegación SPA
    window.addEventListener('hashchange', requireAuth);
    window.addEventListener('popstate', requireAuth);

    // Logout y verificación inicial cuando el DOM está listo
    document.addEventListener('DOMContentLoaded', () => {
      const btn = document.getElementById('cerrarSesionBtn');
      if (btn) {
        btn.addEventListener('click', () => {
          localStorage.removeItem('logueado');
          location.replace('login.html');
        });
      }
      requireAuth();
    });
  } catch (e) {
    console.error('Auth guard error:', e);
  }
})();
