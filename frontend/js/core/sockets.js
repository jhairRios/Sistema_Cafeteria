let socket = null;

export function connectSockets() {
  if (socket && socket.connected) return socket;
  const userId = sessionStorage.getItem('userId');
  const sessionId = sessionStorage.getItem('sessionId');
  const userName = sessionStorage.getItem('nombreUsuario') || 'Usuario';
  const roleName = sessionStorage.getItem('rolNombre') || sessionStorage.getItem('roleName') || '';
  // @ts-ignore (io viene de script global)
  socket = window.io({ auth: { userId, sessionId, userName, roleName } });
  socket.on('connect_error', (err) => console.warn('Socket connect_error:', err?.message));
  socket.on('auth:error', (msg) => {
    console.warn('Socket auth error:', msg);
    try { sessionStorage.clear(); localStorage.setItem('forceLogout', Date.now().toString()); setTimeout(() => localStorage.removeItem('forceLogout'), 0); } catch {}
    location.replace('login.html');
  });
  return socket;
}

export function getSocket() { return socket; }

export function on(event, handler) { socket && socket.on(event, handler); }
export function off(event, handler) { socket && socket.off(event, handler); }
export function emit(event, payload, ack) { socket && socket.emit(event, payload, ack); }
