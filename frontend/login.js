document.addEventListener('DOMContentLoaded', () => {
  // Mostrar/ocultar contraseña (opcional si existe el botón)
  const passwordInput = document.getElementById('password');
  const togglePassword = document.getElementById('togglePassword');
  let passwordVisible = false;
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
      passwordVisible = !passwordVisible;
      passwordInput.type = passwordVisible ? 'text' : 'password';
    });
  }

  // Login real contra backend
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = document.getElementById('email')?.value.trim();
      const password = document.getElementById('password')?.value.trim();

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo: email, contrasena: password })
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('logueado', '1');
          localStorage.setItem('nombreUsuario', data.user?.nombre || 'Usuario');
          showToast({
            title: 'Bienvenido',
            message: `Hola ${data.user?.nombre || 'Usuario'}`,
            type: 'success',
            timeout: 1200
          });
          setTimeout(() => window.location.replace('index.html'), 800);
        } else {
          const errorText = await res.text();
          showToast({
            title: 'Error de inicio de sesión',
            message: (safeJsonMsg(errorText) || 'Usuario o contraseña incorrectos'),
            type: 'error'
          });
        }
      } catch (err) {
        showToast({
          title: 'Sin conexión',
          message: 'No se pudo conectar con el servidor',
          type: 'error'
        });
      }
    });
  }

  // Helpers de notificación
  function showToast({ title = '', message = '', type = 'success', timeout = 2500 } = {}) {
    const container = document.getElementById('toast-container');
    if (!container) return alert(`${title}\n${message}`); // fallback
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <div>
        <div class="toast-title">${escapeHtml(title)}</div>
        <p class="toast-msg">${escapeHtml(message)}</p>
      </div>
      <button class="toast-close" aria-label="Cerrar">×</button>
    `;
    const close = () => {
      if (!el.parentNode) return;
      el.parentNode.removeChild(el);
    };
    el.querySelector('.toast-close').addEventListener('click', close);
    container.appendChild(el);
    if (timeout > 0) setTimeout(close, timeout);
  }

  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function safeJsonMsg(txt = '') {
    try {
      const j = JSON.parse(txt);
      return j?.message || j?.error || txt;
    } catch (_) {
      return txt;
    }
  }
});