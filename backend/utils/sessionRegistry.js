// Registro simple de sesiones activas por usuario (en memoria)
const active = new Map(); // userId -> { sessionId, sockets: Set<string>, ts }

function isActive(userId) {
  const e = active.get(String(userId));
  return !!e && !!e.sessionId;
}

function setActive(userId, sessionId) {
  const key = String(userId);
  let e = active.get(key);
  if (!e) e = { sessionId, sockets: new Set(), ts: Date.now() };
  e.sessionId = sessionId; e.ts = Date.now();
  active.set(key, e);
  return e;
}

function addSocket(userId, socketId) {
  const e = active.get(String(userId));
  if (!e) return;
  e.sockets.add(socketId);
}

function removeSocket(userId, socketId) {
  const e = active.get(String(userId));
  if (!e) return;
  e.sockets.delete(socketId);
  if (e.sockets.size === 0) {
    // opcional: limpiar sesión al quedarse sin sockets
    // mantener sesión hasta logout explícito
  }
}

function socketsCount(userId) {
  const e = active.get(String(userId));
  return e ? e.sockets.size : 0;
}

function clear(userId) {
  active.delete(String(userId));
}

function validate(userId, sessionId) {
  const e = active.get(String(userId));
  return !!e && e.sessionId === sessionId;
}

module.exports = { isActive, setActive, clear, validate, addSocket, removeSocket, socketsCount };
