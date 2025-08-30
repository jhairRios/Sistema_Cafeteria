// core/api.js
// Cliente HTTP ligero para la SPA

const BASE = '';

async function http(method, url, body, opts = {}) {
  const isFormData = (typeof FormData !== 'undefined') && (body instanceof FormData);
  const headers = isFormData ? { ...(opts.headers || {}) } : { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  let res;
  try {
    res = await fetch(BASE + url, {
      method,
      headers,
      body: isFormData ? body : (body !== undefined && body !== null ? JSON.stringify(body) : undefined),
      credentials: 'same-origin',
    });
  } catch (e) {
    const err = new Error(`Error de conexión: ${e?.message || 'Fallo al conectar'}`);
    err.status = 0; err.data = null; err.url = url; err.method = method; err.cause = e;
    throw err;
  }
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `${res.status} ${res.statusText || ''}`.trim();
    const err = new Error(msg);
    err.status = res.status; err.data = data; err.url = url; err.method = method;
    throw err;
  }
  return data;
}

export const api = {
  get: (url, opts) => http('GET', url, null, opts),
  post: (url, body, opts) => http('POST', url, body, opts),
  put: (url, body, opts) => http('PUT', url, body, opts),
  patch: (url, body, opts) => http('PATCH', url, body, opts),
  del: (url, opts) => http('DELETE', url, null, opts),
};

// Endpoints específicos
export const Roles = {
  all: () => api.get('/api/roles'),
  get: (id) => api.get(`/api/roles/${id}`),
  create: (payload) => api.post('/api/roles', payload),
  update: (id, payload) => api.put(`/api/roles/${id}`, payload),
  remove: (id) => api.del(`/api/roles/${id}`),
  getPermisos: (id) => api.get(`/api/roles/${id}/permisos`),
  setPermisos: (id, permisos) => api.post(`/api/roles/${id}/permisos`, { permisos }),
};

export const Empleados = {
  list: () => api.get('/api/empleados'),
  get: (id) => api.get(`/api/empleados/${id}`),
  create: (payload) => api.post('/api/empleados', payload),
  update: (id, payload) => api.put(`/api/empleados/${id}`, payload),
  remove: (id) => api.del(`/api/empleados/${id}`),
};

export const Mesas = {
  list: () => api.get('/api/mesas'),
  create: (payload) => api.post('/api/mesas', payload),
  update: (id, payload) => api.put(`/api/mesas/${id}`, payload),
  remove: (id) => api.del(`/api/mesas/${id}`),
  setEstado: (id, estado, detalle) => api.patch(`/api/mesas/${id}/estado`, { estado, detalle }),
  bulkGenerate: (payload) => api.post('/api/mesas/bulk-generate', payload),
};

// Opcional: Endpoints de Backup (aprovechando soporte FormData del cliente)
export const Backup = {
  list: () => api.get('/api/backup'),
  create: (mode = 'lite') => api.post('/api/backup/create', { mode }),
  schedule: (payload) => api.post('/api/backup/schedule', payload),
  restore: (file) => api.post('/api/backup/restore', { file }),
  upload: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/api/backup/upload', fd); },
  restoreDefaults: () => api.post('/api/backup/restore-defaults'),
  downloadUrl: (file) => `/api/backup/download/${encodeURIComponent(file)}`,
};
